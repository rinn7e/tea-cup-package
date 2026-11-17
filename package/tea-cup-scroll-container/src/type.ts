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
import { NullableEq } from '@rinn7e/tea-cup-prelude'
import * as EqClass from 'fp-ts/lib/Eq'
import * as B from 'fp-ts/lib/boolean'
import * as N from 'fp-ts/lib/number'
import * as S from 'fp-ts/lib/string'

// -------------------------------------------
// Positions
// -------------------------------------------

/**
 * How a scroll of ours moves: at once, or animated. `instant` is the
 * DOM's own name, so a value goes to `scrollTo` as it is.
 */
export type Behavior = 'instant' | 'smooth'

/**
 * A row kept still in the view: its `key`, and its top from the viewport's
 * top edge (negative when it starts above the view).
 */
export type Anchor = { key: string; offset: number }

export const AnchorEq: EqClass.Eq<Anchor> = EqClass.struct({
  key: S.Eq,
  offset: N.Eq,
})

/**
 * Where a scroll of ours goes: the start or the end of the list (the newest
 * row of a chat is at its end, of a feed at its start), or a row, its top
 * `offset` px below the viewport's top edge (plus the owner's `keyOffset`,
 * e.g. under a search bar floating over the list). `onlyIfHidden`: leave the
 * view where it is when the row is in view already.
 */
export type Target =
  | { _tag: 'Start' }
  | { _tag: 'End' }
  | { _tag: 'Key'; key: string; offset: number; onlyIfHidden: boolean }

export const TargetEq: EqClass.Eq<Target> = {
  equals: (a, b) => {
    if (a._tag === 'Key' && b._tag === 'Key') {
      return (
        a.key === b.key &&
        a.offset === b.offset &&
        a.onlyIfHidden === b.onlyIfHidden
      )
    } else {
      return a._tag === b._tag
    }
  },
}

/**
 * Who the position belongs to, and what keeps it.
 */
export type Follow =
  // At the end: a smaller viewport keeps the end in view (by the policies of
  // `Config`). Rows added at the end move nothing, and the position is then
  // the reader's (`Free`)
  | { _tag: 'AtEnd' }
  // The reader reads here: `anchor` is the row at the top when the position
  // last settled (null before it first settles). The engine keeps the row at
  // the top still while rows are added above it or grow above the view.
  | { _tag: 'Free'; anchor: Anchor | null }
  // A scroll of ours is in flight. The engine re-aims at `target` while rows
  // load and grow, so nothing else moves the position until it settles,
  // the reader takes over, or `until` (a time in ms) passes.
  | { _tag: 'Navigating'; target: Target; behavior: Behavior; until: number }
  // A stored position is being put back (a list shown again): like a
  // navigation to the anchor's row, instant
  | { _tag: 'Restoring'; anchor: Anchor }

export const FollowEq: EqClass.Eq<Follow> = {
  equals: (a, b) => {
    if (a._tag === 'Free' && b._tag === 'Free') {
      return NullableEq(AnchorEq).equals(a.anchor, b.anchor)
    } else if (a._tag === 'Navigating' && b._tag === 'Navigating') {
      return (
        TargetEq.equals(a.target, b.target) &&
        a.behavior === b.behavior &&
        a.until === b.until
      )
    } else if (a._tag === 'Restoring' && b._tag === 'Restoring') {
      return AnchorEq.equals(a.anchor, b.anchor)
    } else {
      return a._tag === b._tag
    }
  },
}

/**
 * The container as last seen by `update` (when a scroll settled or the
 * viewport resized): not kept fresh on every scroll.
 */
export type Geometry = {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
}

export const GeometryEq: EqClass.Eq<Geometry> = EqClass.struct({
  scrollTop: N.Eq,
  scrollHeight: N.Eq,
  clientHeight: N.Eq,
})

// -------------------------------------------
// Commands to the engine
// -------------------------------------------

/**
 * What the view does to the engine, decided by `update`. The view applies a
 * command once, before the browser paints (a layout effect, or the engine's
 * own resize callback), and nothing else writes the scroll offset.
 */
export type Command =
  | { _tag: 'ScrollToStart'; behavior: Behavior }
  | { _tag: 'ScrollToEnd'; behavior: Behavior }
  | {
      _tag: 'ScrollToKey'
      key: string
      offset: number
      onlyIfHidden: boolean
      // Whether the row lands under the owner's `keyOffset` (a search bar over
      // the list) too: a jump does, a restore of a position measured from the
      // viewport's top edge does not
      belowOverlay: boolean
      behavior: Behavior
    }
  // Move by `delta` at once (keep the bottom line when the viewport resized)
  | { _tag: 'ScrollBy'; delta: number }
  // Drop the target of the scroll in flight: the reader took over. The offset
  // is left where it is (a write would stop an iOS momentum scroll)
  | { _tag: 'Cancel' }

export const CommandEq: EqClass.Eq<Command> = {
  equals: (a, b) => {
    if (a._tag === 'ScrollToStart' && b._tag === 'ScrollToStart') {
      return a.behavior === b.behavior
    } else if (a._tag === 'ScrollToEnd' && b._tag === 'ScrollToEnd') {
      return a.behavior === b.behavior
    } else if (a._tag === 'ScrollToKey' && b._tag === 'ScrollToKey') {
      return (
        a.key === b.key &&
        a.offset === b.offset &&
        a.onlyIfHidden === b.onlyIfHidden &&
        a.belowOverlay === b.belowOverlay &&
        a.behavior === b.behavior
      )
    } else if (a._tag === 'ScrollBy' && b._tag === 'ScrollBy') {
      return a.delta === b.delta
    } else {
      return a._tag === b._tag
    }
  },
}

/**
 * The last command `update` decided, numbered: the view applies each decision
 * (each object) once, so a command needs no message back to be cleared; the
 * number tells the owner's echo of a decision the view took itself.
 */
export type PendingAdjust = { seq: number; command: Command }

export const PendingAdjustEq: EqClass.Eq<PendingAdjust> = EqClass.struct({
  seq: N.Eq,
  command: CommandEq,
})

// -------------------------------------------
// Config: the policies the owner chooses
// -------------------------------------------

/**
 * Static, like the rest of an owner's config: given to `update` and the view,
 * not kept in the model (a copy in every list's model could disagree with it)
 */
export type Config = {
  // Rows added above the view: keep the row the reader reads still, or
  // let them push it down
  onPrepend: 'keepAnchor' | 'none'
  // The viewport changed height (the on-screen keyboard, an editor below the
  // list): keep its bottom line (at the end: stay at the end), its top line,
  // or the anchor row (the same as the top line, as rows don't move)
  onViewportResize: 'keepEnd' | 'keepStart' | 'keepAnchor'
  // A row above the view changed height: keep the reader's row still, or
  // let it move
  onItemResize: 'keepAnchor' | 'none'
  // Render only the rows near the view (with `overscan` rows around it, and
  // `estimateSize` for a row not measured yet), or every row
  virtualize:
    | { _tag: 'Off' }
    | { _tag: 'On'; overscan: number; estimateSize: number }
}

export const ConfigEq: EqClass.Eq<Config> = {
  equals: (a, b) =>
    a.onPrepend === b.onPrepend &&
    a.onViewportResize === b.onViewportResize &&
    a.onItemResize === b.onItemResize &&
    (a.virtualize._tag === 'On' && b.virtualize._tag === 'On'
      ? a.virtualize.overscan === b.virtualize.overscan &&
        a.virtualize.estimateSize === b.virtualize.estimateSize
      : a.virtualize._tag === b.virtualize._tag),
}

/**
 * A chat: newest at the end. Rows added at the end never move the position:
 * the owner scrolls to them when the reader adds one (a message sent),
 * with `ScrollTo`. Only the rows near the view are drawn: a reader scrolled
 * back many pages has hundreds of rows loaded, and drawing them all (opening
 * the list again mounts every one) stalls the page for a second. A message
 * row is about 400 px on average (an HTML body is taller than a text one).
 */
export const chatConfig: Config = {
  onPrepend: 'keepAnchor',
  onViewportResize: 'keepEnd',
  onItemResize: 'keepAnchor',
  virtualize: { _tag: 'On', overscan: 5, estimateSize: 400 },
}

/**
 * A feed: newest at the start, the reader's row kept still whatever is
 * added at either end.
 */
export const feedConfig: Config = {
  onPrepend: 'keepAnchor',
  onViewportResize: 'keepStart',
  onItemResize: 'keepAnchor',
  virtualize: { _tag: 'Off' },
}

// -------------------------------------------
// Model
// -------------------------------------------

export type Model = {
  follow: Follow
  geometry: Geometry | null
  pendingAdjust: PendingAdjust | null
  // The list is hidden (`opacity-0`, the owner's loader on top) while an
  // instant scroll of ours puts it in place: `seq` of the decision that hid
  // it. Only that decision's `Placed` shows it again, so a newer hiding
  // decision keeps the list hidden until it lands too.
  placing: number | null
}

export const ModelEq: EqClass.Eq<Model> = EqClass.struct({
  follow: FollowEq,
  geometry: NullableEq(GeometryEq),
  pendingAdjust: NullableEq(PendingAdjustEq),
  placing: NullableEq(N.Eq),
})

// -------------------------------------------
// What the view knows of the position
// -------------------------------------------

/**
 * An end of the list: its header (`Start`) or its footer (`End`)
 */
export type Edge = 'Start' | 'End'

/**
 * What the view shows, for the owner's overlay over the list (a floating
 * label, a "go to latest" button): the row at the top of the view, whether
 * the list scrolls, and whether its first and last rows are shown (in the
 * view, past its edge at their end by at most the owner's `shownMargin`:
 * `isEndRowShown`)
 */
export type OverlayView = {
  topKey: string | null
  isScrolling: boolean
  startShown: boolean
  endShown: boolean
}

export const OverlayViewEq: EqClass.Eq<OverlayView> = EqClass.struct({
  topKey: NullableEq(S.Eq),
  isScrolling: B.Eq,
  startShown: B.Eq,
  endShown: B.Eq,
})

// -------------------------------------------
// Msg: each one carries its cause
// -------------------------------------------

/**
 * What moved the view when the reader took over
 */
export type ReaderInput = 'wheel' | 'touch' | 'key' | 'pointer'

export type Msg =
  | { _tag: 'NoOp' }
  // The rows changed: how many were added above, added below, removed
  // `anchor`: the row at the top once the rows changed
  | {
      _tag: 'ItemsChanged'
      prepended: number
      appended: number
      removed: number
      anchor: Anchor | null
    }
  // The viewport changed height (`prev` and `next` client heights)
  | { _tag: 'ViewportResized'; prev: number; next: number }
  // (A row changing height is no message: the engine decides it in its
  // resize callback, before paint, with `adjustOnItemResize`.)
  // The reader moved the view (wheel, touch, key, scrollbar)
  | { _tag: 'ReaderScrolled'; input: ReaderInput }
  // The scroll came to rest: where it is, and whether that is the end
  | {
      _tag: 'ScrollSettled'
      geometry: Geometry
      anchor: Anchor | null
      atEnd: boolean
      now: number
    }
  // A scroll of ours, asked for by the owner (`now` is when, for `until`).
  // `hide`: the list is hidden until it lands (`placing`)
  | {
      _tag: 'ScrollTo'
      target: Target
      behavior: Behavior
      now: number
      hide: boolean
    }
  // Put a stored position back, hidden until it is there when `hide`
  | { _tag: 'Restore'; anchor: Anchor; hide: boolean }
  // The view applied the hiding decision `seq` and a frame painted the list
  // there: the list is shown again, unless a newer decision hid it
  | { _tag: 'Placed'; seq: number }
  // The header (`Start`) or the footer (`End`) came into view, or is still
  // in view after the rows changed: for the owner (it loads more rows
  // there). Nothing for the container to decide.
  | { _tag: 'EdgeShown'; edge: Edge }
