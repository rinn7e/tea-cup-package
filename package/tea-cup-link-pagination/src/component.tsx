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
import { type HttpErrorString } from '@rinn7e/tea-cup-prelude/type/http-error'
import * as A from 'fp-ts/lib/Array'
import { pipe } from 'fp-ts/lib/function'
import { type JSX, useCallback, useEffect, useRef, useState } from 'react'

import { ScrollPort } from './scroll-port'
import { IconAdd } from './sub-component/add-icon'
import { loadingIcon } from './sub-component/loading-icon'
import {
  type FailedViewParam,
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

        // If nextIsMax is true, there is no next data,
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

  // Check if last message is in view when the list changes. Scrolling checks
  // it from the scroll handler.
  useEffect(() => {
    updateLatestDataFloater()
  }, [
    model.isScrolling,
    model.mode.overallData.value.length,
    model.mode.next._tag,
  ])

  // Note: Since `containerRefOnScrollHandler` is used with `onScroll`, instead of addEventListener,
  // throttle doesn't work.
  const containerRefOnScrollHandler = useCallback(() => {
    if (containerRef.current) {
      if (!model.isScrolling)
        dispatch(props)({ _tag: 'SetIsScrolling', value: true })

      // Listen to LinkPagin scrolling. If it is, check if last message is in view.
      updateLatestDataFloater()

      // The scroll position is not recorded here: `ScrollPort` measures the
      // rows themselves whenever the list changes (see `scroll-anchor.ts`).

      if (model.onContainerScroll) {
        model.onContainerScroll(model.mode.dataSourceId, containerRef.current)
      }
    }
  }, [
    model.mode.dataSourceId,
    containerRef.current,
    model.isScrolling,
    updateLatestDataFloater,
  ])

  useEffect(() => {
    // console.log('containerChangeEvent', model.containerChangeEvent)
    // The position itself is held by `ScrollPort` on every commit (before
    // paint), whatever the event; the event only has to be consumed.
    switch (model.containerChangeEvent._tag) {
      case 'NoChange':
        return
      case 'ElementModifyInPlace':
      case 'ElementModifyOnBottom':
      case 'ElementModifyOnTop':
      case 'ForceManipulateScrollPos': {
        dispatch(props)({
          _tag: 'SetContainerChangeEvent',
          value: { _tag: 'NoChange' },
        })
        return
      }
    }
  }, [model.containerChangeEvent])

  // -------------------------------------------
  // View
  // -------------------------------------------

  return (
    <div className={cn(`relative flex h-full w-full flex-col`)}>
      {config.ui.loadingView &&
      (model.mode.initial._tag === 'Loading' ||
        model.invisWhileScrolling === true)
        ? config.ui.loadingView()
        : null}
      {/* <div className='fixed z-[1000] bg-black p-[30px] text-white'>
        {JSON.stringify(model.savedScrollPos)}
      </div> */}
      <ScrollPort
        containerRef={containerRef}
        itemRefs={config.logic.refs.itemRefs}
        dataSourceId={model.mode.dataSourceId}
        onScroll={containerRefOnScrollHandler}
        onScrollEnd={() => {
          dispatch(props)({
            _tag: 'SetIsScrolling',
            value: false,
            savedScrollPos: containerRef.current
              ? containerRef.current.scrollTop
              : undefined,
          })
        }}
        className={cn(
          `relative flex flex-1 pb-[52px] lg:pb-0`,
          config.ui.disableScrolling ? '' : 'overflow-y-auto',
          // The list anchors itself in every browser (see `scroll-anchor.ts`)
          '[overflow-anchor:none]',
          config.ui.scrollbarClass,
          'flex-col',
          model.invisWhileScrolling ? 'opacity-0' : 'opacity-100',
        )}
      >
        {/* Note: debugging purpose */}
        {/* <div className='fixed bottom-0 bg-white border-black text-black'>
          <div>prev index: {JSON.stringify(model.mode.prevIndex)}</div>
          <div>prev: {JSON.stringify(model.mode.prev)}</div>
        </div> */}

        {/* Debugging purpose */}
        {/* <div className='fixed top-0 p-[10px] bg-white border-black text-black'>
          <div>height {model.currentScrollHeight}</div>
        </div> */}
        {config.ui.titleView &&
          model.mode.overallData.value.length > 0 &&
          config.ui.titleView()}

        {model.mode.initial._tag === 'Failed'
          ? initialFailedView(props, model.mode.initial.error)
          : null}

        {view(props)}
        {/* <div className='fixed top-0'>{model.mode.initial._tag}</div> */}
      </ScrollPort>

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
  const successView = () => (
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

  const failedView = (error: HttpErrorString) => {
    const param = {
      parent: props.parent,
      error,
      retry: () => dispatch(props)({ _tag: 'GetMorePrevData' }),
    }
    return config.ui.prevFailedView
      ? config.ui.prevFailedView(param)
      : defaultFailedView(param, `Couldn't load older items.`)
  }

  return (
    <div
      key={'prevLoadMoreView'}
      data-link-pagin-edge='prev'
      className='flex w-full items-center justify-center'
    >
      {exec(() => {
        const prev = model.mode.prev
        if (prev._tag === 'Exhausted') {
          return isMaxView()
        } else if (model.mode.initial._tag === 'Loaded') {
          switch (prev._tag) {
            case 'Loading':
              return loadingView()
            // A visible retry, not the in-view trigger: a failing endpoint
            // would otherwise be called again every time the trigger shows.
            case 'Failed':
              return failedView(prev.error)
            case 'Idle':
            case 'Loaded':
              return successView()
          }
        } else {
          return null
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
  return (
    <div
      key={'nextLoadMoreView'}
      data-link-pagin-edge='next'
      className='flex w-full items-center justify-center'
    >
      {mode.next._tag === 'Exhausted'
        ? isMaxView()
        : (() => {
            if (model.mode.initial._tag === 'Loaded') {
              const successView = () => (
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

              const next = mode.next
              switch (next._tag) {
                case 'Loading':
                  return loadingView()
                case 'Loaded':
                  return successView()
                case 'Idle':
                  return successView()
                case 'Failed': {
                  // return <div>error: {JSON.stringify(mode.nextData)}</div>
                  const param = {
                    parent: props.parent,
                    error: next.error,
                    retry: () => dispatch(props)({ _tag: 'GetMoreNextData' }),
                  }
                  return config.ui.nextFailedView
                    ? config.ui.nextFailedView(param)
                    : defaultFailedView(param, `Couldn't load newer items.`)
                }
              }
            }
          })()}
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
            retriggerCurrentData: mode.retriggerCurrentData,
            animationEnd: mode.animationEnd,
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

const initialFailedView = <Item, Parent, ParentMsg, ItemMsg, Route>(
  props: Props<Item, Parent, ParentMsg, ItemMsg, Route>,
  error: HttpErrorString,
) => {
  const { config } = props
  const param = {
    parent: props.parent,
    error,
    // `GetInitialData`, not `RefreshInitialData`: nothing is on show, so the
    // retry is a fresh load and still owes the initial scroll.
    retry: () => dispatch(props)({ _tag: 'GetInitialData' }),
  }
  return config.ui.initialFailedView
    ? config.ui.initialFailedView(param)
    : defaultFailedView(param, `Couldn't load.`, 'flex-1')
}

const defaultFailedView = <Parent,>(
  param: FailedViewParam<Parent>,
  message: string,
  // `flex-1` for the first page: fill the empty list, centred
  className = '',
) => (
  <div
    className={cn(
      'flex w-full flex-col items-center justify-center gap-[8px] p-[16px] text-center text-sm text-gray-500',
      className,
    )}
  >
    <span>{message}</span>
    <button
      type='button'
      className='cursor-pointer rounded-md border border-gray-300 px-[12px] py-[4px] text-gray-700'
      onClick={param.retry}
    >
      Retry
    </button>
  </div>
)

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
