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
import { type JSX, useCallback, useEffect, useRef, useState } from 'react'

import { IconAdd } from './sub-component/add-icon'
import { loadingIcon } from './sub-component/loading-icon'
import {
  type Mode,
  type Msg,
  type Props,
  PropsEq,
  type WithPrevAndNext,
  dataSourceIdAttribute,
  nextButtonId,
  prevButtonId,
} from './type'
import { getSelectedA } from './util'

// -------------------------------------------------------------------------
// View helpers
// -------------------------------------------------------------------------

// Convert component msg to parent msg.
const dispatch =
  <A, pmsg, amsg, Route>(props: {
    dispatchP: (p: pmsg) => void
    mkPmsg: (m: Msg<A, amsg, Route>) => pmsg
  }) =>
  (subMsg: Msg<A, amsg, Route>): void =>
    props.dispatchP(props.mkPmsg(subMsg))

// -------------------------------------------------------------------------
// View
// -------------------------------------------------------------------------

const LinkPaginationComponent = <A, B, pmsg, amsg, Route>(
  props: Props<A, B, pmsg, amsg, Route>,
) => {
  const { model, config } = props

  const containerRef = config.logic.refs.containerRef
  const currentScrollHeightRef = config.logic.refs.currentScrollHeightRef
  const currentScrollPosRef = config.logic.refs.currentScrollPosRef

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
        const lastDataNode = model.mode.nextIsMax
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
    currentScrollPosRef.current,
    model.isScrolling,
    model.mode.overallData.value.length,
    model.mode.nextIsMax,
  ])

  useEffect(() => {
    // Set current height
    if (!model.invisWhileScrolling && containerRef.current) {
      currentScrollHeightRef.current = containerRef.current.scrollHeight
    }
  }, [containerRef.current, model.invisWhileScrolling])

  // Note: Since `containerRefOnScrollHandler` is used with `onScroll`, instead of addEventListener,
  // throttle doesn't work.
  const containerRefOnScrollHandler = useCallback(() => {
    if (containerRef.current) {
      if (!model.isScrolling)
        dispatch(props)({ _tag: 'SetIsScrolling', value: true })

      // Note: A more performant approach might be to record
      // the scrollTop and scrollHeight at the moment that we know an element
      // will be added/removed instead of on scroll.

      // Record current scrollTop
      currentScrollPosRef.current = containerRef.current.scrollTop

      // We already record `currentScrollHeightRef.current` during manipulateScrollPos
      // but for data like HTML messages, there is a delay (like loading image)
      // In this case, we try to synchronize the scroll height here again:
      if (
        currentScrollHeightRef.current !== containerRef.current.scrollHeight
      ) {
        currentScrollHeightRef.current = containerRef.current.scrollHeight
      }

      if (model.onContainerScroll) {
        model.onContainerScroll(model.mode.dataSourceId, containerRef.current)
      }
    }
  }, [model.mode.dataSourceId, containerRef.current, model.isScrolling])

  useEffect(() => {
    // console.log('containerChangeEvent', model.containerChangeEvent)
    const manipulateScrollPos = () => {
      if (containerRef.current) {
        const newHeight = containerRef.current.scrollHeight

        const heightChange = newHeight - currentScrollHeightRef.current
        const resultPos = currentScrollPosRef.current + heightChange

        // The `heightChange` can be negative (in case of removal of element)
        // When that happen, we force the pos to be 0.
        const newPos = resultPos < 0 ? 0 : resultPos

        currentScrollPosRef.current = newPos

        containerRef.current.scrollTo({
          top: newPos,
        })

        currentScrollHeightRef.current = newHeight
      }
    }

    switch (model.containerChangeEvent._tag) {
      case 'NoChange':
        return
      case 'ElementModifyInPlace': {
        // no scroll pos manipulation but record new scroll pos and height
        if (containerRef.current) {
          currentScrollHeightRef.current = containerRef.current.scrollHeight
          currentScrollPosRef.current = containerRef.current.scrollTop
        }
        dispatch(props)({
          _tag: 'SetContainerChangeEvent',
          value: { _tag: 'NoChange' },
        })
        return
      }
      case 'ElementModifyOnBottom': {
        // no scroll pos manipulation but record new scroll pos and height
        if (containerRef.current) {
          currentScrollHeightRef.current = containerRef.current.scrollHeight
          currentScrollPosRef.current = containerRef.current.scrollTop
        }
        dispatch(props)({
          _tag: 'SetContainerChangeEvent',
          value: { _tag: 'NoChange' },
        })
        return
      }
      case 'ElementModifyOnTop': {
        manipulateScrollPos()
        dispatch(props)({
          _tag: 'SetContainerChangeEvent',
          value: { _tag: 'NoChange' },
        })
        return
      }
      case 'ForceManipulateScrollPos': {
        manipulateScrollPos()
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
      (model.mode.initialData._tag === 'RemotePending' ||
        model.invisWhileScrolling === true)
        ? config.ui.loadingView()
        : null}
      {/* <div className='fixed z-[1000] bg-black p-[30px] text-white'>
        {JSON.stringify(model.savedScrollPos)}
      </div> */}
      <div
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
        ref={containerRef}
        className={cn(
          `relative flex flex-1 pb-[52px] lg:pb-0`,
          config.ui.disableScrolling ? '' : 'overflow-y-auto',
          config.ui.scrollbarClass,
          'flex-col',
          model.invisWhileScrolling ? 'opacity-0' : 'opacity-100',
        )}
      >
        {/* Note: debugging purpose */}
        {/* <div className='fixed bottom-0 bg-white border-black text-black'>
          <div>prev index: {JSON.stringify(model.mode.prevIndex)}</div>
          <div>prev isMax: {JSON.stringify(model.mode.prevIsMax)}</div>
          <div>allowRetryPrev: {JSON.stringify(model.mode.allowRetryPrev)}</div>
        </div> */}

        {/* Debugging purpose */}
        {/* <div className='fixed top-0 p-[10px] bg-white border-black text-black'>
          <div>height {model.currentScrollHeight}</div>
        </div> */}
        {config.ui.titleView &&
          model.mode.overallData.value.length > 0 &&
          config.ui.titleView()}

        {view(props)}
        {/* <div className='fixed top-0'>{model.mode.initialData._tag}</div> */}
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
    return PropsEq(prev.aEq, prev.bEq).equals(prev, next)
  },
) as <A, B, pmsg, amsg, Route>(
  props: Props<A, B, pmsg, amsg, Route>,
) => JSX.Element

// -------------------------------------------
// Helper views
// -------------------------------------------

const prevLoadMoreView = <A, B, pmsg, amsg, Route>(
  props: Props<A, B, pmsg, amsg, Route>,
) => {
  const { model, config } = props
  const isReversed = config.logic.isReversed
  const showPrevLoadHeight = 'h-[72px]'

  const isMaxView = () =>
    config.ui.prevIsMaxCustomView
      ? config.ui.prevIsMaxCustomView(props.b)
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

  return (
    <div
      key={'prevLoadMoreView'}
      className='flex w-full items-center justify-center'
    >
      {model.mode.prevIsMax
        ? isMaxView()
        : exec(() => {
            if (model.mode.initialData._tag === 'RemoteSuccess') {
              switch (model.mode.prevData._tag) {
                case 'RemotePending':
                  return loadingView()
                case 'RemoteSuccess':
                  return successView()
                default:
                  return successView()
              }
            }
          })}
    </div>
  )
}

const nextLoadMoreView = <A, B, pmsg, amsg, Route>(
  props: Props<A, B, pmsg, amsg, Route>,
  mode: Mode<A>,
) => {
  const { model, config } = props
  const isReversed = config.logic.isReversed
  const spinnerClass = isReversed
    ? 'bottom-[20px] right-[20px]'
    : 'top-[20px] right-[20px]'
  const isMaxView = () =>
    config.ui.nextIsMaxCustomView ? (
      config.ui.nextIsMaxCustomView(props.b)
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
      className='flex w-full items-center justify-center'
    >
      {mode.nextIsMax
        ? isMaxView()
        : (() => {
            if (model.mode.initialData._tag === 'RemoteSuccess') {
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

              switch (mode.nextData._tag) {
                case 'RemotePending':
                  return loadingView()
                case 'RemoteSuccess':
                  return successView()
                case 'RemoteInitial':
                  return successView()
                case 'RemoteFailure':
                  // return <div>error: {JSON.stringify(mode.nextData)}</div>
                  return <div></div>
              }
            }
          })()}
    </div>
  )
}

const view = <A, B, pmsg, amsg, Route>(
  props: Props<A, B, pmsg, amsg, Route>,
): JSX.Element[] => {
  const { model, config } = props
  const mode = model.mode
  const itemRefs = config.logic.refs.itemRefs

  const customUiWrapper = (data: A, children: () => JSX.Element) => (
    <div
      id={config.logic.uniqueKeyField(data)}
      key={config.logic.uniqueKeyField(data)}
      ref={(b) => {
        itemRefs.current[config.logic.uniqueKeyField(data)] = b
      }}
      className='custom-ui-wrapper'
      {...{ [dataSourceIdAttribute]: mode.dataSourceId }}
    >
      {children()}
    </div>
  )

  const allDataWithPrevAndNext: WithPrevAndNext<A>[] = pipe(
    mode.overallData.value,
    A.mapWithIndex(
      (i: number, el: A): WithPrevAndNext<A> => ({
        prevA: mode.overallData.value[i + 1] ?? null,
        a: el,
        nextA: mode.overallData.value[i - 1] ?? null,
      }),
    ),
  )

  const renderAllItemUi = (items: WithPrevAndNext<A>[]) =>
    pipe(
      items,
      A.map((withPrevNextA) =>
        customUiWrapper(withPrevNextA.a, () => {
          return config.ui.customItemUi({
            withPrevNextA,
            b: props.b,
            selectedA: getSelectedA(config.logic, model),
            retriggerCurrentData: mode.retriggerCurrentData,
            animationEnd: mode.animationEnd,
            dataSourceId: mode.dataSourceId,
            // Note: BundleShort comoonent needs access to all A
            // Re-consider why this.
            allA: pipe(
              items,
              A.map((i) => i.a),
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

const scrollToLatestCustomUi = <A, B, pmsg, amsg, Route>(
  props: Props<A, B, pmsg, amsg, Route>,
  isVisible: boolean,
) => {
  const { config } = props
  if (config.ui.scrollToLatestCustomUi) {
    return config.ui.scrollToLatestCustomUi({
      parentSt: props.b,
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
