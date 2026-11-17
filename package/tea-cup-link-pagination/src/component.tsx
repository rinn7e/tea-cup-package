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
import { cn, exec, memoStrategy } from '@rinn7e/tea-cup-prelude'
import * as ScrollContainerModel from '@rinn7e/tea-cup-scroll-container'
import { ScrollContainer } from '@rinn7e/tea-cup-scroll-container/component'
import * as A from 'fp-ts/lib/Array'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { type JSX } from 'react'

import { loadingIcon } from './sub-component/loading-icon'
import { type Msg, type Props, PropsEq, type WithPrevAndNext } from './type'
import { getSelectedItem, isEdgeWatched, isLatestButtonVisible } from './util'

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

// How far past the view's edge (its bottom in a reversed list) the newest
// row may reach for the "go to latest" button to stay away: the button shows
// once the reader is further than this from the newest row's end
const LATEST_ROW_MARGIN = 84

// -------------------------------------------------------------------------
// View
// -------------------------------------------------------------------------

const LinkPaginationComponent = <Item, Parent, ParentMsg, ItemMsg, Route>(
  props: Props<Item, Parent, ParentMsg, ItemMsg, Route>,
) => {
  const { model, config } = props

  const containerRef = config.logic.refs.containerRef

  // -------------------------------------------
  // View
  // -------------------------------------------

  const rows = rowsOf(props)
  const isReversed = config.logic.isReversed
  // The ends at the start and at the end of the view
  const startEdge = isReversed ? model.mode.prev : model.mode.next
  const endEdge = isReversed ? model.mode.next : model.mode.prev
  const hasOverlay =
    config.ui.topItemOverlayUi !== undefined ||
    config.ui.scrollToLatestCustomUi !== null
  return (
    <div className={cn(`relative flex h-full w-full flex-col`)}>
      {config.ui.loadingView &&
      (model.mode.initial._tag === 'Loading' ||
        ScrollContainerModel.isPlacing(model.scrollContainer))
        ? config.ui.loadingView()
        : null}
      <ScrollContainer
        // A list of another data source is another scroll: its decisions
        // are numbered from its own model
        key={model.mode.dataSourceId}
        model={model.scrollContainer}
        config={config.logic.scrollContainer}
        count={rows.length}
        getKey={(i) => config.logic.uniqueKeyField(rows[i].item)}
        renderRow={(i) => rowView(props, rows, rows[i])}
        header={isReversed ? prevLoadMoreView(props) : nextLoadMoreView(props)}
        footer={isReversed ? nextLoadMoreView(props) : prevLoadMoreView(props)}
        keyOffset={config.logic.scrollToKeyOffset}
        containerRef={containerRef}
        className={cn('pb-[52px] lg:pb-0', config.ui.scrollbarClass)}
        onAnchor={(anchor) => {
          if (model.onAnchor) model.onAnchor(model.mode.dataSourceId, anchor)()
        }}
        overlay={
          hasOverlay
            ? (view) => (
                <>
                  {config.ui.topItemOverlayUi
                    ? config.ui.topItemOverlayUi(
                        view.topKey === null
                          ? null
                          : pipe(
                              model.mode.overallData.value,
                              A.findFirst(
                                (item) =>
                                  config.logic.uniqueKeyField(item) ===
                                  view.topKey,
                              ),
                              O.toNullable,
                            ),
                        view.isScrolling,
                      )
                    : null}
                  {scrollToLatestCustomUi(
                    props,
                    isLatestButtonVisible(model, isReversed, view),
                  )}
                </>
              )
            : undefined
        }
        shownMargin={LATEST_ROW_MARGIN}
        watchEdges={{
          start: isEdgeWatched(model, startEdge),
          end: isEdgeWatched(model, endEdge),
        }}
        dispatch={(subMsg) =>
          dispatch(props)({ _tag: 'ScrollContainerMsg', subMsg })
        }
      />
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
  const showPrevLoadHeight = 'h-[72px]'

  const isMaxView = () =>
    config.ui.prevIsMaxCustomView
      ? config.ui.prevIsMaxCustomView(props.parent)
      : null

  const loadingView = () =>
    config.ui.prevLoadingIndicatorView
      ? config.ui.prevLoadingIndicatorView()
      : defaultPrevLoadingIndicator()
  // The end can load: its space, which loads it when it comes into view
  // (the scroll container's `EdgeShown`)
  const idleView = () => (
    <div
      className={`relative flex w-full items-center justify-center ${showPrevLoadHeight}`}
    />
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
            // Before the first page is `Loaded` (e.g. `Cached` rows shown while
            // the API decides) the end must not load yet (`isEdgeWatched`).
            // Keep its space anyway: an empty slot made the rows jump down by
            // its height once the first page arrived.
            return model.mode.initial._tag === 'Loaded' ? (
              idleView()
            ) : (
              <div className={showPrevLoadHeight} />
            )
        }
      })}
    </div>
  )
}

const nextLoadMoreView = <Item, Parent, ParentMsg, ItemMsg, Route>(
  props: Props<Item, Parent, ParentMsg, ItemMsg, Route>,
) => {
  const mode = props.model.mode
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
  // The end can load: it loads when it comes into view (the scroll
  // container's `EdgeShown`)
  const idleView = () => (
    <div className='relative flex h-0 w-full items-center justify-center' />
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

// The items in the order they are shown, each with its neighbors in time
const rowsOf = <Item, Parent, ParentMsg, ItemMsg, Route>(
  props: Props<Item, Parent, ParentMsg, ItemMsg, Route>,
): WithPrevAndNext<Item>[] => {
  const mode = props.model.mode
  const items: WithPrevAndNext<Item>[] = pipe(
    mode.overallData.value,
    A.mapWithIndex(
      (i: number, el: Item): WithPrevAndNext<Item> => ({
        prevItem: mode.overallData.value[i + 1] ?? null,
        item: el,
        nextItem: mode.overallData.value[i - 1] ?? null,
      }),
    ),
  )
  return props.config.logic.isReversed ? A.reverse(items) : items
}

const rowView = <Item, Parent, ParentMsg, ItemMsg, Route>(
  props: Props<Item, Parent, ParentMsg, ItemMsg, Route>,
  rows: WithPrevAndNext<Item>[],
  withPrevNextItem: WithPrevAndNext<Item>,
): JSX.Element => {
  const { model, config } = props
  const mode = model.mode
  const key = config.logic.uniqueKeyField(withPrevNextItem.item)
  // A search result's row fades from the highlight color (`flash`) while it
  // is highlighted: from its start when it is drawn, cut where it is when the
  // highlight's timer clears it (`FLASH_MS`, as long as the fade). Its React
  // key has the highlight's `seq`, so a second highlight of the same row is
  // a new element and fades from the start again
  const flash =
    model.flash !== null && model.flash.key === key ? model.flash : null
  return (
    <div
      key={flash ? `${key}:${flash.seq}` : key}
      id={key}
      className={cn('custom-ui-wrapper', flash ? 'bg-fade-out' : null)}
    >
      {config.ui.itemPrefixUi ? config.ui.itemPrefixUi(withPrevNextItem) : null}
      {config.ui.customItemUi({
        withPrevNextItem,
        parent: props.parent,
        selectedItem: getSelectedItem(config.logic, model),
        dataSourceId: mode.dataSourceId,
        // For an item view that needs the other items too
        allItems: pipe(
          rows,
          A.map((i) => i.item),
        ),
      })}
    </div>
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
