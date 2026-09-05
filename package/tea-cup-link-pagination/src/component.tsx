import { cn } from '@rinn7e/tea-cup-prelude'
import * as A from 'fp-ts/lib/Array'
import { pipe } from 'fp-ts/lib/function'
import {
  type JSX,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import {
  type Mode,
  type Props,
  type WithPrevAndNext,
  dataSourceIdAttribute,
  linkItemKeyAttribute,
  mkPropsEq,
  nextButtonId,
  prevButtonId,
} from './type'
import { storeScrollState } from './type/scroll-state'
import { getSelectedA, isInView } from './util'

export const LinkPaginationComponent = <A, ItemMsg>(
  props: Props<A, ItemMsg>,
): JSX.Element => {
  const { model, config, dispatch } = props

  const containerRef = config.logic.refs.containerRef
  const currentScrollHeightRef = config.logic.refs.currentScrollHeightRef
  const currentScrollPosRef = config.logic.refs.currentScrollPosRef

  const [showLatestDataFloater, setShowLatestDataFloater] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!config.ui.customAllItemEffect) return
    if (timerRef.current) clearTimeout(timerRef.current)
    config.ui.customAllItemEffect(containerRef, timerRef, model.isScrolling)
  }, [model.isScrolling, config.ui.customAllItemEffect, containerRef])

  useEffect(() => {
    if (model.mode.overallData.value.length > 0) {
      const lastItem = config.logic.isReversed
        ? model.mode.overallData.value[model.mode.overallData.value.length - 1]!
        : model.mode.overallData.value[0]!
      const lastDataId = config.logic.uniqueKeyField(lastItem)
      const lastDataNode = document.getElementById(lastDataId)

      if (lastDataNode) {
        setShowLatestDataFloater(!isInView(lastDataNode, { margin: -84 }))
      } else {
        setShowLatestDataFloater(true)
      }
    }
  }, [
    currentScrollPosRef.current,
    model.isScrolling,
    model.mode.overallData.value.length,
    model.mode.nextIsMax,
    config.logic,
  ])

  useEffect(() => {
    if (!model.invisWhileScrolling && containerRef.current) {
      currentScrollHeightRef.current = containerRef.current.scrollHeight
    }
  }, [model.invisWhileScrolling, containerRef, currentScrollHeightRef])

  const containerRefOnScrollHandler = useCallback(() => {
    if (containerRef.current) {
      if (!model.isScrolling) {
        dispatch({ _tag: 'ContainerScroll', isScrolling: true })
      }

      currentScrollPosRef.current = containerRef.current.scrollTop

      if (
        currentScrollHeightRef.current !== containerRef.current.scrollHeight
      ) {
        currentScrollHeightRef.current = containerRef.current.scrollHeight
      }

      if (config.logic.scrollStateMap) {
        storeScrollState(config.logic.scrollStateMap)(
          model.mode.dataSourceId,
          containerRef.current,
        )
      }
    }
  }, [
    containerRef,
    model.isScrolling,
    dispatch,
    currentScrollPosRef,
    currentScrollHeightRef,
    config.logic.scrollStateMap,
    model.mode.dataSourceId,
  ])

  useLayoutEffect(() => {
    const manipulateScrollPos = () => {
      if (containerRef.current) {
        const newHeight = containerRef.current.scrollHeight
        const heightChange = newHeight - currentScrollHeightRef.current
        const resultPos = currentScrollPosRef.current + heightChange
        const newPos = resultPos < 0 ? 0 : resultPos

        currentScrollPosRef.current = newPos
        containerRef.current.scrollTo({ top: newPos })
        currentScrollHeightRef.current = newHeight
      }
    }

    switch (model.containerChangeEvent._tag) {
      case 'NoChange':
        return
      case 'ElementModifyInPlace':
      case 'ElementModifyOnBottom':
        if (containerRef.current) {
          currentScrollHeightRef.current = containerRef.current.scrollHeight
          currentScrollPosRef.current = containerRef.current.scrollTop
        }
        dispatch({
          _tag: 'SetContainerChangeEvent',
          value: { _tag: 'NoChange' },
        })
        return
      case 'ElementModifyOnTop':
      case 'ForceManipulateScrollPos':
        manipulateScrollPos()
        dispatch({
          _tag: 'SetContainerChangeEvent',
          value: { _tag: 'NoChange' },
        })
        return
    }
  }, [
    model.containerChangeEvent,
    containerRef,
    currentScrollHeightRef,
    currentScrollPosRef,
    dispatch,
  ])

  return (
    <div className={cn('relative flex h-full w-full flex-col')}>
      {config.ui.loadingView &&
      (model.mode.initialData._tag === 'RemotePending' ||
        model.invisWhileScrolling === true)
        ? config.ui.loadingView()
        : null}

      <div
        onScroll={containerRefOnScrollHandler}
        onScrollEnd={() => {
          dispatch({
            _tag: 'ContainerScroll',
            isScrolling: false,
          })
        }}
        ref={containerRef}
        className={cn(
          'relative flex flex-1 flex-col',
          config.ui.disableScrolling ? '' : 'overflow-y-auto',
          config.ui.scrollbarClass ?? '',
          model.invisWhileScrolling ? 'opacity-0' : 'opacity-100',
        )}
      >
        {config.ui.titleView &&
          model.mode.overallData.value.length > 0 &&
          config.ui.titleView()}

        {renderItems(props)}
      </div>

      {config.ui.scrollToLatestCustomUi &&
        config.ui.scrollToLatestCustomUi({
          isVisible: showLatestDataFloater,
          onClick: () => dispatch({ _tag: 'ScrollToNewest' }),
        })}
    </div>
  )
}

const renderItems = <A, ItemMsg>(props: Props<A, ItemMsg>): JSX.Element[] => {
  const { model, config, dispatch } = props
  const mode = model.mode
  const itemRefs = config.logic.refs.itemRefs

  const customUiWrapper = (
    data: A,
    children: () => JSX.Element,
  ): JSX.Element => {
    const key = config.logic.uniqueKeyField(data)
    return (
      <div
        id={key}
        key={key}
        ref={(el) => {
          itemRefs.current[key] = el
        }}
        className='custom-ui-wrapper'
        {...{
          [dataSourceIdAttribute]: mode.dataSourceId,
          [linkItemKeyAttribute]: key,
        }}
      >
        {children()}
      </div>
    )
  }

  const allDataWithPrevAndNext: WithPrevAndNext<A>[] = pipe(
    mode.overallData.value,
    A.mapWithIndex((i, el) => ({
      prevA: mode.overallData.value[i + 1] ?? null,
      a: el,
      nextA: mode.overallData.value[i - 1] ?? null,
    })),
  )

  const renderAllItemUi = (items: WithPrevAndNext<A>[]): JSX.Element[] =>
    pipe(
      items,
      A.map((withPrevNextA) =>
        customUiWrapper(withPrevNextA.a, () => {
          return config.ui.customItemUi({
            withPrevNextA,
            selectedA: getSelectedA(config.logic, model),
            retriggerCurrentData: mode.retriggerCurrentData,
            animationEnd: mode.animationEnd,
            dataSourceId: mode.dataSourceId,
            allA: pipe(
              items,
              A.map((i) => i.a),
            ),
            dispatch: (itemMsg: ItemMsg) =>
              dispatch({
                _tag: 'ItemMsg',
                item: withPrevNextA.a,
                msg: itemMsg,
              }),
          })
        }),
      ),
    )

  const items: JSX.Element[] = config.ui.customAllItemUi
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

const prevLoadMoreView = <A, ItemMsg>(
  props: Props<A, ItemMsg>,
): JSX.Element => {
  const { model, config, dispatch } = props
  const isReversed = config.logic.isReversed

  if (model.mode.prevIsMax) {
    return (
      <div key='prevLoadMoreView' className='w-full'>
        {config.ui.prevIsMaxCustomView ? config.ui.prevIsMaxCustomView() : null}
      </div>
    )
  }

  const isLoading =
    model.mode.initialData._tag === 'RemoteSuccess' &&
    model.mode.prevData._tag === 'RemotePending'

  return (
    <div key='prevLoadMoreView' className='relative w-full'>
      {/* Invisible Trigger Button for IntersectionObserver */}
      <button
        type='button'
        className={cn(
          'pointer-events-none absolute size-[20px] cursor-pointer opacity-0',
          isReversed ? 'top-0' : 'bottom-0',
        )}
        onClick={() => {
          dispatch({
            _tag: 'GetMorePrevData',
            dataSourceId: model.mode.dataSourceId,
            networkStatus: true,
          })
        }}
        id={prevButtonId(model.mode.dataSourceId)}
      >
        Load Older
      </button>

      {isLoading && config.ui.prevLoadingIndicatorView
        ? config.ui.prevLoadingIndicatorView()
        : null}
    </div>
  )
}

const nextLoadMoreView = <A, ItemMsg>(
  props: Props<A, ItemMsg>,
  mode: Mode<A>,
): JSX.Element => {
  const { model, config, dispatch } = props
  const isReversed = config.logic.isReversed

  if (mode.nextIsMax) {
    return (
      <div key='nextLoadMoreView' className='w-full'>
        {config.ui.nextIsMaxCustomView ? config.ui.nextIsMaxCustomView() : null}
      </div>
    )
  }

  const isLoading =
    model.mode.initialData._tag === 'RemoteSuccess' &&
    mode.nextData._tag === 'RemotePending'

  return (
    <div key='nextLoadMoreView' className='relative w-full'>
      {/* Invisible Trigger Button for IntersectionObserver */}
      <button
        type='button'
        className={cn(
          'pointer-events-none absolute size-[20px] cursor-pointer opacity-0',
          isReversed ? 'bottom-0' : 'top-0',
        )}
        onClick={() => {
          dispatch({
            _tag: 'GetMoreNextData',
            dataSourceId: model.mode.dataSourceId,
            networkStatus: true,
          })
        }}
        id={nextButtonId(model.mode.dataSourceId)}
      >
        Load Newer
      </button>

      {isLoading && config.ui.nextLoadingIndicatorView
        ? config.ui.nextLoadingIndicatorView()
        : null}
    </div>
  )
}

export const LinkPaginationMemo = memo(LinkPaginationComponent, (prev, next) =>
  mkPropsEq(prev.aEq).equals(prev, next),
) as <A, ItemMsg>(props: Props<A, ItemMsg>) => JSX.Element
