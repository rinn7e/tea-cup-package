/* MIT License

Copyright (c) 2026 Moremi Vannak

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. */
import { NullableEq, cn } from '@rinn7e/tea-cup-prelude'
import {
  type Range,
  Virtualizer,
  type VirtualizerOptions,
  defaultRangeExtractor,
  elementScroll,
  observeElementOffset,
  observeElementRect,
} from '@tanstack/virtual-core'
import {
  type JSX,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react'
import { flushSync } from 'react-dom'

import {
  type Anchor,
  type Command,
  type Config,
  type Edge,
  type Model,
  type Msg,
  type OverlayView,
  OverlayViewEq,
  type PendingAdjust,
  PendingAdjustEq,
} from './type'
import {
  adjustOnItemResize,
  heldKey,
  isNavigating,
  isPlacing,
  update,
} from './update'
import {
  boundedOffset,
  isEditable,
  isEndRowShown,
  itemsChange,
  rowEstimate,
} from './util'

type Engine = Virtualizer<HTMLDivElement, HTMLDivElement>

export type Props = {
  model: Model
  config: Config

  // The rows: how many, each one's stable key, and its content
  count: number
  getKey: (index: number) => string
  renderRow: (index: number) => JSX.Element
  // A view above the first row (e.g. "Loading history"), and one below the
  // last row. They are no rows: an anchor never lands on them, so rows added
  // under the header keep the reader's row. The view measures them.
  header: ReactNode
  footer: ReactNode
  // Added to a `Key` target's offset when a scroll of ours lands (e.g. a
  // search bar floating over the top of the list)
  keyOffset?: (container: HTMLElement) => number

  // The scroll element, shared with the owner (it reads the rows' DOM)
  containerRef: { current: HTMLDivElement | null }
  className: string
  // The row at the top of the view (`anchorAtTop`), for the owner's own
  // bookkeeping (a stored reading position), never through `update`: on
  // every scroll, and once a placement ends (`Placed`), never while the list
  // is placed (`placing`: the scroll is ours, not the reader's)
  onAnchor?: (anchor: Anchor) => void
  // A view over the list (a floating label, a "go to latest" button), given
  // what the view shows. Drawn next to the scroll element, by a component
  // that follows the scroll itself, so the rows aren't drawn again on scroll.
  // Not drawn while the list is placed (`placing`), nor before the engine
  // has its scroll element: what the view shows isn't known then.
  overlay?: (view: OverlayView) => ReactNode
  // How far past the view's top edge the first row may start, and past its
  // bottom edge the last row may end, and still count as shown
  // (`OverlayView.startShown`, `endShown`; `isEndRowShown`)
  shownMargin?: number
  // The ends the owner loads more rows at: `EdgeShown` is sent only for these
  // (none when not given)
  watchEdges?: { start: boolean; end: boolean }

  dispatch: (msg: Msg) => void
}

// The keys that matter for a navigation key: the reader moves the view with
// them. Others (typing in an editor below the list) don't take over.

const navigationKeys = new Set([
  'PageUp',
  'PageDown',
  'Home',
  'End',
  'ArrowUp',
  'ArrowDown',
  ' ',
])

// Longer than the engine's own reset of its scrolling state (150 ms), so a
// scroll that started meanwhile is seen
const SETTLE_AFTER_INPUT_MS = 250

// The edges, in the order they are checked
const edges: Edge[] = ['Start', 'End']

// At most this many rows added at once are measured right away
// (`toMeasureRef`): a list's first page as it opens (nothing is measured
// then, so its rows above the row it opens at would be laid out at the
// configured estimate), a page of older or newer rows, or a new message. Not
// the rows of a list opened again after reading back many pages, which can be
// hundreds (drawing them all is what virtualizing avoids).
const MEASURE_ADDED_MAX = 30

// Every row, for a list that isn't virtualized: all rows stay in the DOM
// (find in page, the owner's own DOM reads), only their positions come from
// the engine.
const allRows = (range: Range): number[] =>
  Array.from({ length: range.count }, (_, i) => i)

// Whether a row is in the view of `container`, wholly, under `top` px at
// the top (a search bar over the list)
const isRowInView = (
  container: HTMLElement,
  row: Element | undefined,
  top: number,
): boolean => {
  if (!row) {
    return false
  } else {
    const box = container.getBoundingClientRect()
    const rect = row.getBoundingClientRect()
    return rect.top >= box.top + top && rect.bottom <= box.bottom
  }
}

// The engine of each scroll element, for readers outside the view: in a
// virtualized list a row out of view has no DOM, only the engine knows where
// it is
const engineOfElement = new WeakMap<HTMLElement, Engine>()

/**
 * Where the row `key` is, from the top of `container`'s view (negative:
 * above it): from its DOM when it is drawn, from the engine's layout
 * otherwise (estimated for a row never drawn). Null for a row the list
 * doesn't have.
 */
export const rowBounds = (
  container: HTMLElement,
  key: string,
): { top: number; bottom: number } | null => {
  const engine = engineOfElement.get(container)
  const row = engine?.elementsCache.get(key)
  if (row && row.isConnected) {
    const box = container.getBoundingClientRect()
    const rect = row.getBoundingClientRect()
    return { top: rect.top - box.top, bottom: rect.bottom - box.top }
  } else {
    const item = engine?.measurementsCache.find((m) => m.key === key)
    return item
      ? {
          top: item.start - container.scrollTop,
          bottom: item.end - container.scrollTop,
        }
      : null
  }
}

// What a render draws from the engine: the rows in range, the first one's
// offset (a held correction moves it), the total size
const layoutSignature = (engine: Engine): string => {
  const items = engine.getVirtualItems()
  return [
    items.length,
    items[0]?.index,
    items[items.length - 1]?.index,
    items[0]?.start,
    engine.getTotalSize(),
  ].join(':')
}

// The row covering the top edge of the view, and its top from that edge
// (negative: it starts above it), from the engine's layout: no DOM read
const anchorAtTop = (engine: Engine): Anchor | null => {
  const offset = engine.scrollOffset ?? 0
  const item = engine.getVirtualItemForOffset(offset)
  return item ? { key: String(item.key), offset: item.start - offset } : null
}

// The view's top and bottom, in the engine's layout
const viewOf = (engine: Engine): { top: number; bottom: number } => {
  const top = engine.scrollOffset ?? 0
  return { top, bottom: top + (engine.scrollRect?.height ?? 0) }
}

// Whether the row `index`, the first or the last one (`end`), counts as
// shown (`isEndRowShown`)
const isRowShown = (
  engine: Engine,
  index: number,
  end: Edge,
  margin: number,
): boolean => {
  const item = engine.measurementsCache[index]
  return item ? isEndRowShown(end, item, viewOf(engine), margin) : false
}

// What the overlay is given: the row at the top (the first one whose bottom
// is more than 8 px below the top edge), whether the list scrolls, and
// whether its first and last rows are shown
const overlayViewOf = (
  engine: Engine,
  count: number,
  margin: number,
): OverlayView => {
  const top = engine.getVirtualItemForOffset(viewOf(engine).top + 8)
  return {
    topKey: count > 0 && top ? String(top.key) : null,
    isScrolling: engine.isScrolling,
    startShown: count > 0 && isRowShown(engine, 0, 'Start', margin),
    endShown: count > 0 && isRowShown(engine, count - 1, 'End', margin),
  }
}

// Not memoized: `read` and `render` are functions of the container's view.
//
// The owner's overlay, given what the view shows. It follows the engine
// itself (the container calls its listener on every scroll and after every
// commit) and draws again only when what it is given changed. Nothing is
// drawn while `read` gives no view (the view isn't known yet).
const ViewOverlay = (props: {
  listeners: Set<() => void>
  read: () => OverlayView | null
  render: (view: OverlayView) => ReactNode
}) => {
  const readRef = useRef(props.read)
  readRef.current = props.read
  const [view, setView] = useState<OverlayView | null>(props.read)
  // A layout effect: listening before the container's own layout effect,
  // which calls the listeners after each commit
  useLayoutEffect(() => {
    const listener = () => {
      const next = readRef.current()
      setView((prev) =>
        NullableEq(OverlayViewEq).equals(prev, next) ? prev : next,
      )
    }
    props.listeners.add(listener)
    listener()
    return () => {
      props.listeners.delete(listener)
    }
  }, [props.listeners])
  return <>{view === null ? null : props.render(view)}</>
}

// Whether the view is at `offset` already (sub-pixel jitter aside)
const isAt = (engine: Engine, offset: number): boolean =>
  Math.abs(offset - (engine.scrollOffset ?? 0)) < 1

// Applies `command`; false when it left the view where it was. A scroll to
// where the view is already is no scroll: the browser fires no scroll event
// for it, so nothing would settle it, and a scroll of ours would hold the
// position (a resize leaves it alone) with nothing in flight.
const applyCommand = (
  engine: Engine,
  command: Command,
  indexOf: (key: string) => number | undefined,
  keyOffset: number,
  // The scroll to a row aims at it from here on; null: no row (it is in view
  // already, nothing scrolls)
  aimAt: (aim: { key: string; base: number; offset: number } | null) => void,
): boolean => {
  // Rebuild the engine's layout from the sizes measured since its last
  // render: a command reads it as it is (a row measured in this commit would
  // still count at its estimate)
  engine.getVirtualItems()
  switch (command._tag) {
    case 'ScrollToStart':
      if (isAt(engine, 0)) {
        return false
      } else {
        engine.scrollToOffset(0, {
          behavior: command.behavior === 'smooth' ? 'smooth' : 'auto',
        })
        return true
      }
    case 'ScrollToEnd':
      if (engine.isAtEnd(1)) {
        return false
      } else {
        engine.scrollToEnd({
          behavior: command.behavior === 'smooth' ? 'smooth' : 'auto',
        })
        return true
      }
    case 'ScrollToKey': {
      const index = indexOf(command.key)
      const container = engine.scrollElement
      if (index === undefined) {
        console.warn('ScrollContainer: no row with key', command.key)
        return false
      } else if (
        command.onlyIfHidden &&
        container &&
        isRowInView(container, engine.elementsCache.get(command.key), keyOffset)
      ) {
        // In view already: a scroll of ours still aiming at an index that
        // rows added above gave to another row stops too, and an aim at this
        // row of an earlier scroll is no longer this scroll's (the row is
        // left where it is, even if it grows)
        aimAt(null)
        engine.cancelScroll()
        return false
      } else {
        // The engine aligns a row's top at its `scrollPaddingStart`, and keeps
        // re-aiming at it from there while rows measure (the view bounds the
        // offset by the row's size as it learns it, `aimAt`)
        aimAt({
          key: command.key,
          base: command.belowOverlay ? keyOffset : 0,
          offset: command.offset,
        })
        const target = engine.getOffsetForIndex(index, 'start')
        if (target && isAt(engine, target[0])) {
          engine.cancelScroll()
          return false
        } else {
          engine.scrollToIndex(index, {
            align: 'start',
            behavior: command.behavior === 'smooth' ? 'smooth' : 'auto',
          })
          return true
        }
      }
    }
    case 'ScrollBy': {
      // A move past an end the view is at already moves nothing (the viewport
      // grew at the top): no scroll event comes to settle it. Both read from
      // the element: the engine's offset includes a write held on iOS
      const el = engine.scrollElement
      const max = el ? Math.max(el.scrollHeight - el.clientHeight, 0) : 0
      const from = el ? el.scrollTop : 0
      const to = Math.min(Math.max(from + command.delta, 0), max)
      if (Math.abs(to - from) < 1) {
        return false
      } else {
        engine.scrollBy(command.delta, { behavior: 'auto' })
        return true
      }
    }
    case 'Cancel':
      engine.cancelScroll()
      return true
  }
}

// Not memoized: `renderRow`, `header` and `footer` are render functions and
// elements of the owner, with no sound `Eq`.
//
// The engine (`Virtualizer`) is library state kept in a ref: `update` decides
// what it does (`pendingAdjust`), and this view applies each decision once,
// before paint. Its `onChange` re-renders the rows; a state change it implies
// (a scroll that settled, the viewport resized, the rows changed) becomes a
// `Msg`. Such a change needs its decision applied before the browser paints,
// which a dispatched message can't do (a `Cmd` or a document event runs after
// paint), so the view runs `update` on it at once (`step`), applies the
// command, and dispatches the same message for the program's model.
export const ScrollContainer = (props: Props) => {
  const propsRef = useRef(props)
  propsRef.current = props

  // The model as of the last decision: the owner's, or one `step` decided
  // before the owner's model caught up with it
  const modelRef = useRef(props.model)
  const ownerModelRef = useRef(props.model)
  if (ownerModelRef.current !== props.model) {
    ownerModelRef.current = props.model
    modelRef.current = props.model
  }
  // The last decision applied. A view drawn again (another list, or the
  // same one shown again) applies the last decision only while it is a
  // scroll of ours in flight (a restore): an older one (a move by a resize
  // long gone) is done.
  const appliedRef = useRef<PendingAdjust | null>(
    isNavigating(props.model) ? null : props.model.pendingAdjust,
  )
  // Whether this view put back the position of the model it mounted on (see
  // the commit effect)
  const mountedRef = useRef(false)
  // The settle owed when no scroll may come to report one (see
  // `settleIfStill`)
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The decision `step` applied, until the owner's model echoes it
  const echoRef = useRef<PendingAdjust | null>(null)
  // Whether the reader's input was reported since the last settle: once per
  // gesture, not for every wheel event
  const readerReportedRef = useRef(false)
  // The header's and footer's heights: the space before the first row and
  // after the last one
  const headerRef = useRef<HTMLDivElement | null>(null)
  const footerRef = useRef<HTMLDivElement | null>(null)
  const headerSizeRef = useRef(0)
  const footerSizeRef = useRef(0)
  // Where the rows start in the scroll element (after its own top padding):
  // the engine's `scrollMargin`
  const sizerRef = useRef<HTMLDivElement | null>(null)
  const scrollMarginRef = useRef(0)
  // `scrollPaddingStart` of the last scroll to a row, so a render keeps it
  // while the engine still re-aims at the row
  const scrollPaddingRef = useRef(0)
  // The last scroll to a row: its key, the space above it (an overlay) and
  // the offset asked for, bounded by the row's size each time the engine's
  // layout changes while the scroll is in flight (`boundAim`)
  const aimRef = useRef<{ key: string; base: number; offset: number } | null>(
    null,
  )
  const viewportHeightRef = useRef<number | null>(null)
  const wasScrollingRef = useRef(false)
  // `layoutSignature` of what the last render drew
  const drawnSignatureRef = useRef('')
  const keysRef = useRef<string[]>([])
  // Rows just added that are measured right away, wherever they are (a page
  // lands above the view): drawn out of sight in a box of their own for one
  // commit (`measureBoxRef`), not with the rows near the view, which are one
  // run in normal flow and would draw every row between. Laid out at an
  // estimate, they would take their real height only when the reader reaches
  // them, and the position moves by the difference then. On iOS it can't move
  // while a finger or a fling moves the list, so the engine holds the
  // difference back and the rows above stand off by it: a fling going up runs
  // into blank space above them. Measured now, at rest, the move is
  // invisible.
  const toMeasureRef = useRef(new Set<string>())
  const measureBoxRef = useRef<HTMLDivElement | null>(null)
  // The keys the box drew in the last commit: measured in this one. A row
  // settles its height in its own layout effects (a tall message body clamps
  // itself), whose update lands after the commit that drew it, together with
  // the next commit of the list: both before paint.
  const boxDrawnRef = useRef(new Set<string>())
  // The row that was first before a page landed above it, while its new
  // height is taken: it keeps its bottom where it was (`holdBottomOfFirst`)
  const holdBottomKeyRef = useRef<string | null>(null)
  // From this render until its last layout effect: React is rendering or
  // committing (the rows' ref callbacks measure them), and `flushSync` can't
  // run there; an update scheduled then lands before paint anyway
  const inCommitRef = useRef(false)
  inCommitRef.current = true
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  // The engine's total size as last drawn (the sizer's height)
  const totalSizeRef = useRef(0)
  // The overlay's listeners, called on every scroll and after every commit
  const [overlayListeners] = useState(() => new Set<() => void>())
  // Whether each watched edge was shown at the last check: `EdgeShown` is
  // sent when one comes into view
  const edgeShownRef = useRef<Record<Edge, boolean>>({
    Start: false,
    End: false,
  })
  // The wait for a frame to paint the list where a hiding decision put it
  // (`placing`), and whether a hiding decision was applied in this commit
  // (its wait starts again)
  const placingWaitRef = useRef<{ seq: number; frame: number } | null>(null)
  const appliedHidingRef = useRef(false)

  const keys = Array.from({ length: props.count }, (_, i) => props.getKey(i))
  const indexByKey = new Map(keys.map((key, i) => [key, i]))
  const indexByKeyRef = useRef(indexByKey)
  indexByKeyRef.current = indexByKey

  const engineRef = useRef<Engine | null>(null)
  // The estimate each row not measured yet was laid out with, by key
  // (`estimateFor`)
  const estimatesRef = useRef(new Map<string | number, number>())
  // This view's scroll element. The owner's `containerRef` is only told about
  // it: an owner may share that ref between lists (a chat's list, then the
  // next one's), and the engine would take another list's element for its
  // own, and its position with it.
  const elementRef = useRef<HTMLDivElement | null>(null)

  const apply = (command: Command) => {
    const engine = engineRef.current
    const container = elementRef.current
    if (engine && container) {
      // A settle still waiting for the reader's last input (`settleIfStill`)
      // would end this scroll of ours if it fires before its first scroll
      // event (a "go to latest" right after a wheel, a slow machine), and a
      // resize then keeps the bottom line halfway. This scroll settles itself:
      // at its end, or below when it moves nothing.
      if (settleTimerRef.current !== null) {
        clearTimeout(settleTimerRef.current)
        settleTimerRef.current = null
      }
      const moved = applyCommand(
        engine,
        command,
        (key) => indexByKeyRef.current.get(key),
        propsRef.current.keyOffset ? propsRef.current.keyOffset(container) : 0,
        (aim) => {
          aimRef.current = aim
          boundAim(engine, false)
        },
      )
      // No scroll will settle: the position is at rest where it is
      if (!moved) settle(engine, container)
    }
  }

  // A decision is applied once. `update` makes a new object for each
  // decision and passes it on unchanged otherwise, so a decision is known by
  // its identity, not its number or content: the owner can replace the model
  // (a list loaded again under the same view) and number from 1 again, even
  // with the same first command, and a decision of `step` and one of the
  // owner's model can take the same number. The one copy of a decision is the
  // owner's echo of one `step` applied: the program runs the same message on
  // its model and makes the same decision again, which is skipped.
  const applyPending = (model: Model) => {
    const pending = model.pendingAdjust
    if (pending === null || pending === appliedRef.current) {
      return
    } else if (
      echoRef.current !== null &&
      PendingAdjustEq.equals(pending, echoRef.current)
    ) {
      appliedRef.current = pending
      echoRef.current = null
    } else {
      appliedRef.current = pending
      echoRef.current = null
      if (model.placing === pending.seq) appliedHidingRef.current = true
      apply(pending.command)
    }
  }

  const step = (msg: Msg) => {
    const [next] = update(propsRef.current.config)(msg, modelRef.current)
    if (next !== modelRef.current) {
      const decided = next.pendingAdjust !== modelRef.current.pendingAdjust
      modelRef.current = next
      applyPending(next)
      if (decided) echoRef.current = next.pendingAdjust
      propsRef.current.dispatch(msg)
    }
  }

  const settle = (engine: Engine, container: HTMLDivElement) => {
    readerReportedRef.current = false
    step({
      _tag: 'ScrollSettled',
      geometry: {
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
        clientHeight: container.clientHeight,
      },
      anchor: anchorAtTop(engine),
      atEnd: engine.isAtEnd(2),
      now: Date.now(),
    })
  }

  // Settle in `ms` unless a scroll is in progress then (its end settles):
  // reader input that moved nothing (a wheel at the end), or a held jump past
  // its `until`, fires no scroll event, and nothing else would settle it
  const settleIfStill = (ms: number) => {
    if (settleTimerRef.current !== null) clearTimeout(settleTimerRef.current)
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null
      const engine = engineRef.current
      const container = elementRef.current
      if (engine && container && !engine.isScrolling) {
        settle(engine, container)
      }
    }, ms)
  }

  // Whether the area of `edge` (the header, the footer) is in the view, by
  // a pixel either way: a view at its end can stop a fraction short
  const isEdgeInView = (engine: Engine, edge: Edge): boolean => {
    // The engine's position can be past the end once the list got shorter
    // (rows measured shorter than their estimate, a list that now fits the
    // view): the element clamps itself with no scroll event, and the engine
    // keeps the old one. The view is where the element can be, or the top of
    // a list that fits never counts as in view and its older end never loads.
    const engineView = viewOf(engine)
    const container = elementRef.current
    const top = container
      ? Math.min(
          engineView.top,
          Math.max(container.scrollHeight - container.clientHeight, 0),
        )
      : engineView.top
    const view = { top, bottom: top + (engineView.bottom - engineView.top) }
    const margin = scrollMarginRef.current
    const end = margin + totalSizeRef.current
    const [from, to] =
      edge === 'Start'
        ? [margin, margin + headerSizeRef.current]
        : [end - footerSizeRef.current, end]
    return to >= view.top - 1 && from <= view.bottom + 1
  }

  // Tell the owner a watched edge came into view, or is still in view after
  // the rows changed (a short page loads the next one). Never while the list
  // is placed: the view isn't where it lands yet.
  const reportEdges = (rowsChanged: boolean) => {
    const engine = engineRef.current
    const watch = propsRef.current.watchEdges
    if (engine) {
      edges.forEach((edge) => {
        const watched = watch
          ? edge === 'Start'
            ? watch.start
            : watch.end
          : false
        const shown =
          watched && !isPlacing(modelRef.current) && isEdgeInView(engine, edge)
        if (shown && (!edgeShownRef.current[edge] || rowsChanged)) {
          propsRef.current.dispatch({ _tag: 'EdgeShown', edge })
        }
        edgeShownRef.current[edge] = shown
      })
    }
  }

  const refreshView = (rowsChanged: boolean) => {
    overlayListeners.forEach((listener) => listener())
    reportEdges(rowsChanged)
  }

  // The row at the top, for the owner's stored position: not while the list
  // is placed. A scroll then is ours putting it in place, not the reader's:
  // storing it would overwrite the position being put back (a scroll of the
  // fresh list before a restore brings the stored position back)
  const reportAnchor = (engine: Engine) => {
    if (!isPlacing(modelRef.current)) {
      const anchor = anchorAtTop(engine)
      if (anchor) propsRef.current.onAnchor?.(anchor)
    }
  }

  // The engine read a scroll event (`scrolled`), or the end of a scroll
  const onOffset = (scrolled: boolean) => {
    const engine = engineRef.current
    if (engine) {
      if (scrolled) reportAnchor(engine)
      refreshView(false)
    }
  }

  const cancelPlacingWait = () => {
    if (placingWaitRef.current !== null) {
      cancelAnimationFrame(placingWaitRef.current.frame)
      placingWaitRef.current = null
    }
  }

  // The hiding decision `seq` is applied: the list is shown again once a
  // frame painted it there (the first frame can come before that paint)
  const waitPlaced = (seq: number) => {
    cancelPlacingWait()
    const wait = { seq, frame: 0 }
    wait.frame = requestAnimationFrame(() => {
      wait.frame = requestAnimationFrame(() => {
        placingWaitRef.current = null
        placed(seq)
      })
    })
    placingWaitRef.current = wait
  }

  const placed = (seq: number) => {
    step({ _tag: 'Placed', seq })
    const engine = engineRef.current
    if (engine && !isPlacing(modelRef.current)) {
      // Where it landed is the reader's position now
      reportAnchor(engine)
      rerender()
      refreshView(false)
    }
  }

  // The padding a scroll to a row aims with, its offset held inside the row
  // as the engine knows its size now: an estimate first, the measured size
  // once the row is drawn, its new size when it grows or shrinks later (late
  // images). `reaim`: a changed bound aims at the row again (the engine stops
  // re-aiming once the row's start holds still, and its own growth doesn't
  // move its start); the command's own scroll aims once it is set.
  const boundAim = (engine: Engine, reaim: boolean) => {
    const aim = aimRef.current
    if (aim !== null) {
      // The engine tells of a resize before it rebuilds its layout
      engine.getVirtualItems()
      const index = indexByKeyRef.current.get(aim.key)
      const size =
        index === undefined ? undefined : engine.measurementsCache[index]?.size
      const padding = aim.base + boundedOffset(aim.offset, size)
      if (padding !== scrollPaddingRef.current) {
        scrollPaddingRef.current = padding
        engine.options.scrollPaddingStart = padding
        if (reaim && index !== undefined) {
          engine.scrollToIndex(index, { align: 'start', behavior: 'auto' })
        }
      }
    }
  }

  const onEngineChange = (engine: Engine, sync: boolean) => {
    // A row measured or resized while a scroll of ours aims at it bounds its
    // offset again: only while that row is the one held (a later scroll of
    // ours, to the end say, leaves the last aim behind)
    if (
      aimRef.current !== null &&
      heldKey(modelRef.current) === aimRef.current.key
    ) {
      boundAim(engine, true)
    }
    if (wasScrollingRef.current && !engine.isScrolling) {
      const container = elementRef.current
      if (container) settle(engine, container)
    }
    wasScrollingRef.current = engine.isScrolling
    // Draw again only when what is drawn changed (the rows in range, their
    // offset, the total size), not on every scroll event: a list of hundreds
    // of rows drawn on every frame of a scroll can't keep up
    if (layoutSignature(engine) !== drawnSignatureRef.current) {
      // An update scheduled inside a commit lands before paint anyway, and
      // `flushSync` can't run there
      if (sync && !inCommitRef.current) {
        flushSync(rerender)
      } else {
        rerender()
      }
    }
    // Inside a commit, its last layout effect follows the view
    if (!inCommitRef.current) refreshView(false)
  }

  // The scroll element's own top padding can change without the header or
  // the footer resizing (padding under a floating header)
  const measureMargin = () => {
    const margin = sizerRef.current?.offsetTop ?? 0
    const engine = engineRef.current
    if (engine && margin !== scrollMarginRef.current) {
      scrollMarginRef.current = margin
      engine.options.scrollMargin = margin
      if (inCommitRef.current) {
        rerender()
      } else {
        flushSync(rerender)
      }
    }
  }

  const onViewportHeight = (height: number) => {
    measureMargin()
    const prev = viewportHeightRef.current
    viewportHeightRef.current = height
    if (prev !== null && prev !== height) {
      step({ _tag: 'ViewportResized', prev, next: height })
    }
  }

  const config = props.config
  // A row not measured yet is laid out at the median of the rows measured so
  // far (`rowEstimate`). An estimate far from the real heights makes a large
  // correction when the row is measured, and on iOS a fling holds the
  // corrections back until it ends: rows measured above a fling going up
  // leave that much blank space at the top, which the fling runs into.
  const estimateFor = rowEstimate(
    estimatesRef.current,
    engineRef.current?.itemSizeCache ?? new Map(),
    config.virtualize._tag === 'On' ? config.virtualize.estimateSize : 120,
  )
  const options: VirtualizerOptions<HTMLDivElement, HTMLDivElement> = {
    count: props.count,
    getScrollElement: () => elementRef.current,
    estimateSize: (i) => estimateFor(keys[i] ?? i),
    getItemKey: (i) => keys[i] ?? i,
    scrollToFn: elementScroll,
    // Each scroll event (`isScrolling`), and the end of a scroll, read by the
    // engine first: its offset and range are this scroll's
    observeElementOffset: (instance, cb) =>
      observeElementOffset(instance, (offset, isScrolling) => {
        cb(offset, isScrolling)
        onOffset(isScrolling)
      }),
    // The viewport's height is decided in the engine's own resize callback,
    // which runs before paint
    observeElementRect: (instance, cb) =>
      observeElementRect(instance, (rect) => {
        cb(rect)
        onViewportHeight(rect.height)
      }),
    onChange: onEngineChange,
    overscan: config.virtualize._tag === 'On' ? config.virtualize.overscan : 0,
    rangeExtractor:
      config.virtualize._tag === 'On' ? defaultRangeExtractor : allRows,
    paddingStart: headerSizeRef.current,
    scrollMargin: scrollMarginRef.current,
    paddingEnd: footerSizeRef.current,
    scrollPaddingStart: scrollPaddingRef.current,
    // `end` keeps the row at the top still when rows are added above it, and
    // a list at its end at its end when rows grow
    anchorTo: config.onPrepend === 'keepAnchor' ? 'end' : 'start',
    // Rows added at the end never move the position (`itemsChangedHandler`):
    // the owner scrolls to a row the reader adds
    followOnAppend: false,
  }

  if (engineRef.current === null) {
    engineRef.current = new Virtualizer(options)
  }
  const engine = engineRef.current
  engine.setOptions(options)
  // A row resized: `update`'s rule, with the engine's own as the default
  engine.shouldAdjustScrollPositionOnItemSizeChange = (item, _delta, e) => {
    const offset = e.scrollOffset ?? 0
    // A row above the view. The engine also leaves it while the reader
    // scrolls up, against jitter from estimated sizes in a virtualized list;
    // here every row is measured, and rows growing above (late images) while
    // the reader scrolls up would push the rows read
    const defaultAdjust =
      item.key === holdBottomKeyRef.current
        ? true
        : e.itemSizeCache.has(item.key)
          ? item.end <= offset &&
            (propsRef.current.config.virtualize._tag === 'Off' ||
              e.scrollDirection !== 'backward')
          : item.start < offset
    const held = heldKey(modelRef.current)
    const heldIndex =
      held === null ? null : (indexByKeyRef.current.get(held) ?? null)
    return adjustOnItemResize(
      propsRef.current.config,
      item.index,
      heldIndex,
      defaultAdjust,
    )
  }

  useLayoutEffect(() => engine._didMount(), [])

  // The header and the footer changing height move the rows below them. A
  // header above the view (scrolled past) moves the position by as much, so
  // the reader's row stays, unless a scroll of ours is in flight: it re-aims
  // from the new layout. Measured in the observer's callback, before paint.
  useLayoutEffect(() => {
    const measure = () => {
      const header = headerRef.current?.offsetHeight ?? 0
      const footer = footerRef.current?.offsetHeight ?? 0
      const headerDelta = header - headerSizeRef.current
      const margin = sizerRef.current?.offsetTop ?? 0
      const changed =
        headerDelta !== 0 ||
        footer !== footerSizeRef.current ||
        margin !== scrollMarginRef.current
      scrollMarginRef.current = margin
      const headerAboveView =
        (engine.scrollOffset ?? 0) >= headerSizeRef.current &&
        headerSizeRef.current > 0
      headerSizeRef.current = header
      footerSizeRef.current = footer
      // The engine's layout takes them at once (its options are set again
      // from these on the next render): a command in this commit uses them
      engine.options.paddingStart = header
      engine.options.paddingEnd = footer
      engine.options.scrollMargin = margin
      if (changed) {
        if (
          headerDelta !== 0 &&
          headerAboveView &&
          !isNavigating(modelRef.current) &&
          propsRef.current.config.onItemResize === 'keepAnchor'
        ) {
          engine.scrollBy(headerDelta, { behavior: 'auto' })
        }
        if (inCommitRef.current) {
          rerender()
        } else {
          flushSync(rerender)
        }
      }
    }
    measure()
    if (typeof ResizeObserver === 'undefined') {
      return
    } else {
      const observer = new ResizeObserver(measure)
      if (headerRef.current) observer.observe(headerRef.current)
      if (footerRef.current) observer.observe(footerRef.current)
      return () => observer.disconnect()
    }
  }, [])

  // A page landed above the row `key`, the first one until now. The engine
  // kept its top where it was, but the row changes at its top: with a message
  // above it now, it can lose a label it shows only as the first row (its
  // day label).
  // Its new height is taken now, before paint, with its bottom kept where it
  // was: the space it gave up goes to the rows that landed above it, and the
  // message itself stays where the reader sees it.
  const holdBottomOfFirst = (key: string) => {
    const el = engine.elementsCache.get(key)
    const cached = engine.itemSizeCache.get(key)
    if (el?.isConnected && cached !== undefined && el.offsetHeight !== cached) {
      const index = engine.indexFromElement(el)
      holdBottomKeyRef.current = key
      engine.resizeItem(index, el.offsetHeight)
      holdBottomKeyRef.current = null
    }
  }

  // After every commit, before paint: the engine syncs the DOM with its
  // layout (a prepend's anchor), then the decisions of this render apply
  useLayoutEffect(() => {
    // Rows drawn for the first time are measured now, not at the engine's
    // next resize callback: a row lands at its real height in this commit
    // (the engine skips this while the reader scrolls, and older rows land
    // right after a scroll to the top), so the anchor kept for rows added
    // above uses real heights before anything paints
    engine.elementsCache.forEach((el, key) => {
      if (!engine.itemSizeCache.has(key) && el.isConnected) {
        engine.resizeItem(engine.indexFromElement(el), el.offsetHeight)
      }
    })
    // The rows added, drawn in the measuring box: their real heights once
    // they settled (drawn in the last commit, `boxDrawnRef`), then they leave
    // the box (before paint). Those drawn in this commit are measured in the
    // next one.
    const toMeasure = toMeasureRef.current
    if (toMeasure.size > 0) {
      const drawn = new Map<string, HTMLElement>()
      measureBoxRef.current
        ?.querySelectorAll<HTMLElement>(':scope > [data-measure-key]')
        .forEach((el) => drawn.set(el.dataset.measureKey ?? '', el))
      toMeasure.forEach((key) => {
        const el = drawn.get(key)
        const index = indexByKeyRef.current.get(key)
        if (el === undefined) {
          // Not in the box: drawn near the view or measured already
          toMeasure.delete(key)
        } else if (boxDrawnRef.current.has(key)) {
          if (index !== undefined && !engine.itemSizeCache.has(key)) {
            engine.resizeItem(index, el.offsetHeight)
          }
          toMeasure.delete(key)
        } else {
          // Drawn in this commit: measured in the next one
        }
      })
      boxDrawnRef.current = new Set(toMeasure)
      rerender()
    } else {
      boxDrawnRef.current = new Set()
    }
    const wasAttached = engine.scrollElement !== null
    engine._willUpdate()
    // The engine took its scroll element (first mount, or again after an
    // unmount of its effects, as React's StrictMode does once) and wrote its
    // own offset to it: a scroll of ours in flight applies again after that
    if (
      !wasAttached &&
      engine.scrollElement !== null &&
      isNavigating(modelRef.current)
    ) {
      appliedRef.current = null
    }
    // A view mounted on a model that settled before (the owner drew the list
    // again: another layout, a parent that changed) has a fresh engine at the
    // top, with estimated sizes: it puts the settled position back, hidden
    // until it is there. A scroll of ours in flight applies again above; a
    // model still placed is put back too (its own hiding decision replaces the
    // wait); a model that never settled has no position yet.
    if (!mountedRef.current && engine.scrollElement !== null) {
      mountedRef.current = true
      const settled = modelRef.current
      if (settled.geometry !== null && !isNavigating(settled)) {
        // At the end of a list that keeps its end in view (a chat). Rows
        // added at the end free a list at its end (`itemsChangedHandler`), so
        // its end is where it was; a list that keeps its top line (a feed)
        // keeps its top line instead
        if (
          settled.follow._tag === 'AtEnd' &&
          propsRef.current.config.onViewportResize === 'keepEnd'
        ) {
          step({
            _tag: 'ScrollTo',
            target: { _tag: 'End' },
            behavior: 'instant',
            now: Date.now(),
            hide: true,
          })
        } else if (
          settled.follow._tag === 'Free' &&
          settled.follow.anchor !== null
        ) {
          step({ _tag: 'Restore', anchor: settled.follow.anchor, hide: true })
        }
      }
    }

    const prevKeys = keysRef.current
    keysRef.current = keys
    const change = itemsChange(prevKeys, keys)
    if (change.prepended > 0 && prevKeys.length > 0) {
      holdBottomOfFirst(prevKeys[0])
    }
    const rowsChanged = change.prepended + change.appended + change.removed > 0
    if (rowsChanged) {
      step({ _tag: 'ItemsChanged', ...change, anchor: anchorAtTop(engine) })
    }
    // Rows added: measured right away (drawn in the next commit, before
    // paint)
    const added = change.prepended + change.appended
    if (
      propsRef.current.config.virtualize._tag === 'On' &&
      added > 0 &&
      added <= MEASURE_ADDED_MAX
    ) {
      keys
        .slice(0, change.prepended)
        .forEach((key) => toMeasureRef.current.add(key))
      keys
        .slice(keys.length - change.appended)
        .forEach((key) => toMeasureRef.current.add(key))
      rerender()
    }

    applyPending(modelRef.current)
    // A hiding decision applied, or one this view hasn't waited for yet (a
    // list shown again while it was placed): show the list once it is there
    const placing = modelRef.current.placing
    if (placing === null) {
      cancelPlacingWait()
    } else if (
      appliedHidingRef.current ||
      placingWaitRef.current?.seq !== placing
    ) {
      waitPlaced(placing)
    }
    appliedHidingRef.current = false
    inCommitRef.current = false
    refreshView(rowsChanged)
  })

  // The reader takes over from a scroll of ours (a key goes to the document:
  // the list rarely has the focus)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (navigationKeys.has(e.key) && !isEditable(e.target)) {
        readerScrolled('key')
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const readerScrolled = (input: 'wheel' | 'touch' | 'key' | 'pointer') => {
    if (modelRef.current.follow._tag !== 'Free') {
      readerReportedRef.current = true
      step({ _tag: 'ReaderScrolled', input })
      // At the end, a wheel or a touch may move nothing: the settle then
      // says the list is still at its end
      settleIfStill(SETTLE_AFTER_INPUT_MS)
    } else {
      if (!readerReportedRef.current) {
        // Nothing to decide (the position is the reader's already), but the
        // owner may care that the reader moved (the open's provisional
        // scroll, a page held while the reader moves the list): once per
        // gesture
        readerReportedRef.current = true
        propsRef.current.dispatch({ _tag: 'ReaderScrolled', input })
      }
      // A reported gesture always ends in a settle, even one that moves
      // nothing (a wheel at the top): the owner may wait for it
      settleIfStill(SETTLE_AFTER_INPUT_MS)
    }
  }

  // A jump holds its row until `until`: past it, the list settles where it
  // is, whether or not anything scrolls then
  const follow = props.model.follow
  const navigatingUntil = follow._tag === 'Navigating' ? follow.until : null
  // On its own timer: `apply` clears the one of the reader's input, and a
  // scroll of ours aimed again (rows landed above its row) keeps its `until`
  useEffect(() => {
    if (navigatingUntil !== null) {
      const timer = setTimeout(
        () => {
          const engine = engineRef.current
          const container = elementRef.current
          if (engine && container && !engine.isScrolling) {
            settle(engine, container)
          }
        },
        Math.max(0, navigatingUntil - Date.now()) + 50,
      )
      return () => clearTimeout(timer)
    } else {
      return undefined
    }
  }, [navigatingUntil])

  useEffect(
    () => () => {
      if (settleTimerRef.current !== null) clearTimeout(settleTimerRef.current)
      cancelPlacingWait()
    },
    [],
  )

  const virtualItems = engine.getVirtualItems()
  drawnSignatureRef.current = layoutSignature(engine)
  const totalSize = engine.getTotalSize()
  totalSizeRef.current = totalSize
  // Not virtualized: every row, from the first render on. The engine has no
  // scroll element before its first commit and gives no rows then, so a
  // command in that commit (a restore) would land on estimated sizes.
  const indexes =
    config.virtualize._tag === 'On'
      ? virtualItems.map((item) => item.index)
      : keys.map((_, i) => i)
  const first = virtualItems[0]
  // A correction the engine holds (iOS, while a finger moves the list)
  // shifts every row, and the header with them
  const hold = first
    ? (engine.measurementsCache[first.index]?.start ?? first.start) -
      first.start
    : 0

  return (
    <>
      <div
        data-component='ScrollContainer'
        // The rows the list has, drawn or not (a virtualized list draws only
        // those near the view)
        data-count={props.count}
        ref={(el) => {
          // A detach clears the owner's ref only while it still holds ours
          if (
            el !== null ||
            props.containerRef.current === elementRef.current
          ) {
            props.containerRef.current = el
          }
          elementRef.current = el
          if (el !== null) engineOfElement.set(el, engine)
        }}
        className={cn(
          'relative min-h-0 flex-1 overflow-y-auto',
          // The engine keeps the position itself, on every browser: the
          // browser's own anchoring would move it a second time
          '[overflow-anchor:none]',
          props.className,
          // Hidden while a scroll of ours puts it in place (the owner's loader
          // shows meanwhile)
          isPlacing(modelRef.current) ? 'opacity-0' : 'opacity-100',
        )}
        onWheel={() => readerScrolled('wheel')}
        onTouchMove={() => readerScrolled('touch')}
        // A scrollbar drag: the press lands on the container itself
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) readerScrolled('pointer')
        }}
      >
        <div
          ref={sizerRef}
          className='relative w-full'
          style={{ height: `${totalSize}px` }}
        >
          <div
            ref={headerRef}
            className='absolute left-0 w-full'
            style={{ top: `${-hold}px` }}
          >
            {props.header}
          </div>
          {/* The rows in normal flow, moved as one: a row that grows pushes
            the ones below it at once, as in any list */}
          <div
            className='absolute top-0 left-0 w-full'
            style={{
              // Item offsets count from the scroll element's top, the sizer
              // starts at `scrollMargin`
              transform: `translateY(${
                (first ? first.start : headerSizeRef.current) -
                scrollMarginRef.current
              }px)`,
            }}
          >
            {indexes.map((index) => (
              <div
                key={keys[index]}
                data-index={index}
                ref={engine.measureElement}
                // A block formatting context: a margin of the row's content
                // (a top margin of its first child) stays inside the row. One
                // that escaped would push the row down without counting in its
                // measured height, and the drawn rows would jump by it when
                // the first one leaves the overscan
                className='flow-root'
              >
                {props.renderRow(index)}
              </div>
            ))}
          </div>
          <div ref={footerRef} className='absolute bottom-0 left-0 w-full'>
            {props.footer}
          </div>
          {/* The rows added, out of sight for one commit, to be measured
            (`toMeasureRef`): those not drawn near the view nor measured */}
          {toMeasureRef.current.size > 0 ? (
            <div
              ref={measureBoxRef}
              aria-hidden
              className='pointer-events-none invisible absolute top-0 left-0 w-full'
            >
              {Array.from(toMeasureRef.current).flatMap((key) => {
                const index = indexByKey.get(key)
                return index === undefined ||
                  engine.itemSizeCache.has(key) ||
                  indexes.includes(index)
                  ? []
                  : [
                      <div
                        key={key}
                        data-measure-key={key}
                        className='flow-root'
                      >
                        {props.renderRow(index)}
                      </div>,
                    ]
              })}
            </div>
          ) : null}
        </div>
      </div>
      {props.overlay ? (
        <ViewOverlay
          listeners={overlayListeners}
          // No view before the engine has its scroll element, nor while the
          // list is placed: the engine takes the offset of a scroll of ours
          // only from the scroll event after it, so a list opened at its end
          // would say for a paint that its end isn't shown (the "go to latest"
          // button fading in, then out). Read again once placed (`placed`)
          read={() =>
            engine.scrollElement === null || isPlacing(modelRef.current)
              ? null
              : overlayViewOf(
                  engine,
                  propsRef.current.count,
                  propsRef.current.shownMargin ?? 0,
                )
          }
          render={props.overlay}
        />
      ) : null}
    </>
  )
}
