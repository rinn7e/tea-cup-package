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
import {
  cn,
  exec,
  isInView,
  memoStrategy,
  useDebouncedCallback,
} from '@rinn7e/tea-cup-prelude'
import * as A from 'fp-ts/lib/Array'
import { pipe } from 'fp-ts/lib/function'
import {
  type JSX,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import { IconAdd } from './sub-component/add-icon'
import { loadingIcon } from './sub-component/loading-icon'
import {
  type Mode,
  type Msg,
  type Props,
  PropsEq,
  type WithPrevAndNext,
  defaultDataSourceIdAttribute,
  nextButtonId,
  prevButtonId,
} from './type'
import { getSelectedItem } from './util'

// -------------------------------------------------------------------------
// View helpers
// -------------------------------------------------------------------------

// Convert component msg to parent msg.
const dispatch =
  <Item, ParentMsg, ItemMsg, Route>(props: {
    dispatchParent: (p: ParentMsg) => void
    mkParentMsg: (m: Msg<Item, ItemMsg, Route>) => ParentMsg
  }) =>
  (subMsg: Msg<Item, ItemMsg, Route>): void =>
    props.dispatchParent(props.mkParentMsg(subMsg))

// -------------------------------------------------------------------------
// View
// -------------------------------------------------------------------------

const LinkPaginationComponent = <Item, Parent, ParentMsg, ItemMsg, Route>(
  props: Props<Item, Parent, ParentMsg, ItemMsg, Route>,
) => {
  const { model, config } = props

  const containerRef = config.logic.refs.containerRef

  // -------------------------------------------
  // State that only affects the UI so we don't have to put into Model
  // -------------------------------------------
  const [showLatestDataFloater, setShowLatestDataFloater] = useState(false)

  // -------------------------------------------
  // Effect
  // -------------------------------------------

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The container's height as of the last scroll, media load or change of
  // ours, so a media load can tell how much it grew.
  const knownHeightRef = useRef(0)

  // make time floaters disappear after 2 seconds of no scrolling
  useEffect(() => {
    if (!config.ui.customAllItemEffect) return
    if (timerRef.current) clearTimeout(timerRef.current)
    config.ui.customAllItemEffect(containerRef, timerRef, model.isScrolling)
  }, [model.isScrolling, config.ui.customAllItemEffect])

  const updateLatestDataFloater = useDebouncedCallback(() => {
    if (model.mode.overallData.value.length > 0) {
      const isLastDataInView = () => {
        const lastDataId = config.logic.uniqueKeyField(
          model.mode.overallData.value[0],
        )

        // If the next end is exhausted, there is no next data,
        // and we can pick the last data as the actual latest data
        const lastDataNode =
          model.mode.next._tag === 'Exhausted'
            ? document.getElementById(lastDataId)
            : null

        if (!lastDataNode) return false
        return isInView(lastDataNode, { margin: -84 })
      }

      if (isLastDataInView()) {
        setShowLatestDataFloater(false)
      } else {
        setShowLatestDataFloater(true)
      }
    }
  }, 124)

  // Listen to LinkPagin scrolling. If it is, check if last message is in view.
  useEffect(() => {
    updateLatestDataFloater()
  }, [
    model.isScrolling,
    model.mode.overallData.value.length,
    model.mode.next._tag,
  ])

  // Keep the reading position when an image or a video above the view gets its
  // size late (it fires no scroll event). Browsers with scroll anchoring (not
  // WebKit) already keep the position themselves.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    knownHeightRef.current = container.scrollHeight
    // Read on this container: WebKit has no such property, and a stylesheet
    // can turn anchoring off (`overflow-anchor: none`); either way the browser
    // won't keep the position, so we do.
    const nativeAnchoring =
      (
        getComputedStyle(container) as CSSStyleDeclaration & {
          overflowAnchor?: string
        }
      ).overflowAnchor === 'auto'
    const onMediaLoad = (e: Event) => {
      const media = e.target as HTMLElement
      const growth = container.scrollHeight - knownHeightRef.current
      // It grows downwards from its top, so everything below it moves.
      const startsAboveView =
        media.getBoundingClientRect().top <
        container.getBoundingClientRect().top
      if (!nativeAnchoring && startsAboveView) {
        container.scrollTop += growth
      }
      knownHeightRef.current = container.scrollHeight
    }
    // `load` and `loadedmetadata` don't bubble, so listen in the capture phase.
    container.addEventListener('load', onMediaLoad, true)
    container.addEventListener('loadedmetadata', onMediaLoad, true)
    return () => {
      container.removeEventListener('load', onMediaLoad, true)
      container.removeEventListener('loadedmetadata', onMediaLoad, true)
    }
  }, [containerRef.current])

  // Note: Since `containerRefOnScrollHandler` is used with `onScroll`, instead of addEventListener,
  // throttle doesn't work.
  const containerRefOnScrollHandler = useCallback(() => {
    if (containerRef.current) {
      if (!model.isScrolling)
        dispatch(props)({ _tag: 'SetIsScrolling', value: true })

      knownHeightRef.current = containerRef.current.scrollHeight

      if (model.onContainerScroll) {
        model.onContainerScroll(model.mode.dataSourceId, containerRef.current)()
      }
    }
  }, [model.mode.dataSourceId, containerRef.current, model.isScrolling])

  // Apply a change of ours before the browser paints it. A change on top keeps
  // the scroll position: it moves by the height the change added or removed,
  // measured against the snapshot `update` took before the change.
  useLayoutEffect(() => {
    const container = containerRef.current
    if (model.pendingChange._tag === 'None') return
    if (container) {
      const snapshot =
        model.pendingChange._tag === 'KeepPosition'
          ? model.pendingChange.before
          : null
      if (snapshot) {
        // The height can shrink (rows removed); the position stops at 0.
        const newPos = Math.max(
          0,
          snapshot.scrollTop + container.scrollHeight - snapshot.scrollHeight,
        )
        container.scrollTo({ top: newPos })
      }
      knownHeightRef.current = container.scrollHeight
    }
    dispatch(props)({
      _tag: 'PendingChangeApplied',
      change: model.pendingChange,
    })
  }, [model.pendingChange])

  // A render can change the content without a pending change (a message that
  // expands): measure a later media load's growth from the height after it.
  useLayoutEffect(() => {
    if (containerRef.current)
      knownHeightRef.current = containerRef.current.scrollHeight
  })

  // Only while the open's scroll to the cached target may still be redone.
  const readerScrolled = () => {
    if (
      model.initialScroll._tag === 'FromCache' &&
      model.visibility._tag === 'Visible'
    )
      dispatch(props)({ _tag: 'ReaderScrolled' })
  }

  // -------------------------------------------
  // View
  // -------------------------------------------

  return (
    <div className={cn(`relative flex h-full w-full flex-col`)}>
      {config.ui.loadingView &&
      (model.mode.initial._tag === 'Loading' ||
        model.visibility._tag !== 'Visible')
        ? config.ui.loadingView()
        : null}
      <div
        onScroll={containerRefOnScrollHandler}
        onWheel={readerScrolled}
        onTouchMove={readerScrolled}
        onKeyDown={readerScrolled}
        onScrollEnd={() => {
          dispatch(props)({ _tag: 'SetIsScrolling', value: false })
        }}
        ref={containerRef}
        className={cn(
          `relative flex flex-1 pb-[52px] lg:pb-0`,
          config.ui.disableScrolling ? '' : 'overflow-y-auto',
          config.ui.scrollbarClass,
          'flex-col',
          model.visibility._tag === 'Visible' ? 'opacity-100' : 'opacity-0',
        )}
      >
        {/* Debugging purpose */}
        {/* <div className='fixed top-0 p-[10px] bg-white border-black text-black'>
          <div>height {model.currentScrollHeight}</div>
        </div> */}
        {config.ui.titleView &&
          model.mode.overallData.value.length > 0 &&
          config.ui.titleView()}

        {view(props)}
      </div>

      {scrollToLatestCustomUi(props, showLatestDataFloater)}
    </div>
  )
}

export const LinkPaginationMemo = memoStrategy(
  LinkPaginationComponent,
  // Manual props comparison, to avoid unnecessary re-rendering.
  (prev, next) => {
    // console.log('LinkPagination prev', prev)
    // console.log('LinkPagination next', next)
    // console.log(
    //   'LinkPagination PropsEq.equals(prev, next)',
    //   PropsEq.equals(prev, next),
    // )
    return PropsEq(prev.itemEq, prev.parentEq).equals(prev, next)
  },
) as <Item, Parent, ParentMsg, ItemMsg, Route>(
  props: Props<Item, Parent, ParentMsg, ItemMsg, Route>,
) => JSX.Element

// -------------------------------------------
// Helper views
// -------------------------------------------

const prevLoadMoreView = <Item, Parent, ParentMsg, ItemMsg, Route>(
  props: Props<Item, Parent, ParentMsg, ItemMsg, Route>,
) => {
  const { model, config } = props
  const isReversed = config.logic.isReversed
  const showPrevLoadHeight = 'h-[72px]'

  const isMaxView = () =>
    config.ui.prevIsMaxCustomView
      ? config.ui.prevIsMaxCustomView(props.parent)
      : null

  const loadingView = () =>
    config.ui.prevLoadingIndicatorView
      ? config.ui.prevLoadingIndicatorView()
      : defaultPrevLoadingIndicator()
  // The trigger that loads the end when it comes into view
  const idleView = () => (
    <div
      className={`relative flex w-full items-center justify-center ${showPrevLoadHeight}`}
    >
      <div
        className={cn(
          `pointer-events-none absolute size-[20px] cursor-pointer opacity-0`,
          isReversed ? 'top-0' : 'bottom-0',
        )}
        onClick={() => {
          dispatch(props)({ _tag: 'GetMorePrevData' })
        }}
      >
        <IconAdd
          className='text-gray-6-cf text-[20px]'
          id={prevButtonId(model.mode.dataSourceId)}
        />
      </div>
    </div>
  )

  const retry = () => dispatch(props)({ _tag: 'GetMorePrevData' })
  const failedView = () =>
    config.ui.prevFailedCustomView
      ? config.ui.prevFailedCustomView(props.parent, retry)
      : defaultFailedView(retry)

  return (
    <div
      key={'prevLoadMoreView'}
      className='flex w-full items-center justify-center'
    >
      {exec(() => {
        switch (model.mode.prev._tag) {
          case 'Exhausted':
            return isMaxView()
          case 'Loading':
            return loadingView()
          case 'Failed':
            return failedView()
          case 'Idle':
            return model.mode.initial._tag === 'Loaded' ? idleView() : null
        }
      })}
    </div>
  )
}

const nextLoadMoreView = <Item, Parent, ParentMsg, ItemMsg, Route>(
  props: Props<Item, Parent, ParentMsg, ItemMsg, Route>,
  mode: Mode<Item>,
) => {
  const { model, config } = props
  const isReversed = config.logic.isReversed
  const spinnerClass = isReversed
    ? 'bottom-[20px] right-[20px]'
    : 'top-[20px] right-[20px]'
  const isMaxView = () =>
    config.ui.nextIsMaxCustomView ? (
      config.ui.nextIsMaxCustomView(props.parent)
    ) : (
      <div></div>
    )
  const loadingView = () =>
    config.ui.nextLoadingIndicatorView
      ? config.ui.nextLoadingIndicatorView()
      : defaultNextLoadingIndicator(spinnerClass)
  const retry = () => dispatch(props)({ _tag: 'GetMoreNextData' })
  const failedView = () =>
    config.ui.nextFailedCustomView
      ? config.ui.nextFailedCustomView(props.parent, retry)
      : defaultFailedView(retry)
  // The trigger that loads the end when it comes into view
  const idleView = () => (
    <div className='relative flex h-0 w-full items-center justify-center'>
      <div
        className={cn(
          `pointer-events-none absolute size-[20px] cursor-pointer opacity-0`,
          isReversed ? 'bottom-0' : 'top-0',
        )}
        onClick={() => {
          dispatch(props)({ _tag: 'GetMoreNextData' })
        }}
      >
        <IconAdd
          className='text-gray-6-cf text-[20px]'
          id={nextButtonId(model.mode.dataSourceId)}
        />
      </div>
    </div>
  )

  return (
    <div
      key={'nextLoadMoreView'}
      className='flex w-full items-center justify-center'
    >
      {exec(() => {
        switch (mode.next._tag) {
          case 'Exhausted':
            return isMaxView()
          case 'Loading':
            return loadingView()
          case 'Failed':
            return failedView()
          case 'Idle':
            return model.mode.initial._tag === 'Loaded' ? idleView() : null
        }
      })}
    </div>
  )
}

const view = <Item, Parent, ParentMsg, ItemMsg, Route>(
  props: Props<Item, Parent, ParentMsg, ItemMsg, Route>,
): JSX.Element[] => {
  const { model, config } = props
  const mode = model.mode
  const itemRefs = config.logic.refs.itemRefs
  const dataSourceIdAttributeFinal =
    config.logic.dataSourceIdAttribute ?? defaultDataSourceIdAttribute

  const customUiWrapper = (data: Item, children: () => JSX.Element) => (
    <div
      id={config.logic.uniqueKeyField(data)}
      key={config.logic.uniqueKeyField(data)}
      ref={(el) => {
        itemRefs.current[config.logic.uniqueKeyField(data)] = el
      }}
      className='custom-ui-wrapper'
      {...{ [dataSourceIdAttributeFinal]: mode.dataSourceId }}
    >
      {children()}
    </div>
  )

  const allDataWithPrevAndNext: WithPrevAndNext<Item>[] = pipe(
    mode.overallData.value,
    A.mapWithIndex(
      (i: number, el: Item): WithPrevAndNext<Item> => ({
        prevItem: mode.overallData.value[i + 1] ?? null,
        item: el,
        nextItem: mode.overallData.value[i - 1] ?? null,
      }),
    ),
  )

  const renderAllItemUi = (items: WithPrevAndNext<Item>[]) =>
    pipe(
      items,
      A.map((withPrevNextItem) =>
        customUiWrapper(withPrevNextItem.item, () => {
          return config.ui.customItemUi({
            withPrevNextItem,
            parent: props.parent,
            selectedItem: getSelectedItem(config.logic, model),
            dataSourceId: mode.dataSourceId,
            // Note: BundleShort comoonent needs access to all items
            // Re-consider why this.
            allItems: pipe(
              items,
              A.map((i) => i.item),
            ),
          })
        }),
      ),
    )

  const items = config.ui.customAllItemUi
    ? config.ui.customAllItemUi(
        allDataWithPrevAndNext,
        renderAllItemUi,
        config.logic.isReversed,
      )
    : renderAllItemUi(allDataWithPrevAndNext)

  return config.logic.isReversed
    ? pipe(
        [prevLoadMoreView(props)],
        A.concat([...items].reverse()),
        A.concat([nextLoadMoreView(props, mode)]),
      )
    : pipe(
        [nextLoadMoreView(props, mode)],
        A.concat(items),
        A.concat([prevLoadMoreView(props)]),
      )
}

const scrollToLatestCustomUi = <Item, Parent, ParentMsg, ItemMsg, Route>(
  props: Props<Item, Parent, ParentMsg, ItemMsg, Route>,
  isVisible: boolean,
) => {
  const { config } = props
  if (config.ui.scrollToLatestCustomUi) {
    return config.ui.scrollToLatestCustomUi({
      parent: props.parent,
      isVisible,
      onClick: () => dispatch(props)({ _tag: 'ScrollToNewest' }),
    })
  } else {
    return null
  }
}

const defaultPrevLoadingIndicator = () => {
  const showPrevLoadHeight = 'h-[72px]'

  return (
    <div
      className={`text-gray-7-cf flex w-full items-center justify-center gap-[8px] text-center ${showPrevLoadHeight}`}
    >
      <div className='h-[15px] w-[15px] animate-spin'>
        {loadingIcon('#b2bbc6', 15)}
      </div>
      <span className='pl-0'>Loading history...</span>
    </div>
  )
}

const defaultNextLoadingIndicator = (spinnerClass: string) => {
  return (
    <div className='relative w-full opacity-0'>
      <div className={`absolute ${spinnerClass}`}>
        <div className='h-[15px] w-[15px] animate-spin'>
          {loadingIcon('#b2bbc6', 15)}
        </div>
      </div>
    </div>
  )
}

// A failed load of an end, with a button that loads it again. It isn't
// retried on its own: offline, it would fail again right away.
const defaultFailedView = (retry: () => void) => (
  <div className='text-gray-7-cf flex h-[72px] w-full items-center justify-center gap-[8px] text-center'>
    <span>Couldn't load more.</span>
    <button
      type='button'
      className='text-blue-5-cf font-medium active:opacity-30'
      onClick={retry}
    >
      Retry
    </button>
  </div>
)
