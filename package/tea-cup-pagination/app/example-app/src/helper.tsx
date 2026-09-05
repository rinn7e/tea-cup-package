import * as RD from '@devexperts/remote-data-ts'
import type * as Pagination from '@rinn7e/tea-cup-pagination'
import * as TE from 'fp-ts/lib/TaskEither'
import { pipe } from 'fp-ts/lib/function'
import { PackageOpen } from 'lucide-react'
import React from 'react'

import * as Api from './api'
import { ErrorView } from './component/error-view'
import { LoadingSkeleton } from './component/loading-skeleton'
import { PaginationBar } from './component/pagination-bar'
import { ProductCard } from './component/product-card'
import { type Model, type Msg, type Product, type ProductMsg } from './type'

export const mkPaginationConfig = (
  model: Model,
  dispatch: (msg: Msg) => void,
): Pagination.Config<Product, ProductMsg, string> => ({
  limit: model.limit,
  scrollContainerId: 'product-scroll-container',

  handler: (
    offset: number,
    limit: number,
  ): TE.TaskEither<string, { items: Product[]; totalCount: number }> =>
    pipe(
      Api.getProducts({
        offset,
        limit,
        category: model.tab,
        query: model.searchQuery,
        sortBy: model.sortBy,
        simulateError: model.simulateError,
        latencyMs: model.simulateLatencyMs,
      }),
      TE.mapLeft((httpErr) => httpErr.actualErr),
    ),

  renderItems: (itemsRd, itemDispatch) => {
    return pipeRemoteData(itemsRd, {
      onPending: () => <LoadingSkeleton count={model.limit} />,
      onFailure: (err) => (
        <ErrorView
          message={err}
          onRetry={() => dispatch({ _tag: 'RetryFetch' })}
        />
      ),
      onSuccess: (items) => {
        if (items.length === 0) {
          return (
            <div
              data-test='empty-state'
              className='flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/50 p-12 text-center'
            >
              <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3'>
                <PackageOpen className='h-6 w-6' />
              </div>
              <h3 className='text-base font-bold text-slate-800'>
                No products found
              </h3>
              <p className='mt-1 text-xs text-slate-500 max-w-sm'>
                Try clearing your search or switching to a different category
                tab.
              </p>
              <button
                type='button'
                data-test='clear-filters-btn'
                onClick={() => dispatch({ _tag: 'ResetFilters' })}
                className='mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-600 transition-colors'
              >
                Reset Filters
              </button>
            </div>
          )
        }

        return (
          <div
            data-test='products-grid'
            className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'
          >
            {items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                dispatch={(productMsg) => itemDispatch(product, productMsg)}
              />
            ))}
          </div>
        )
      },
    })
  },

  renderPagination: (currentPage, pageAmount, onPageChange) => (
    <PaginationBar
      currentPage={currentPage}
      pageAmount={pageAmount}
      onPageChange={onPageChange}
    />
  ),
})

function pipeRemoteData<E, A>(
  rd: RD.RemoteData<E, A>,
  handlers: {
    onPending: () => React.ReactNode
    onFailure: (err: E) => React.ReactNode
    onSuccess: (val: A) => React.ReactNode
  },
): React.ReactNode {
  switch (rd._tag) {
    case 'RemoteInitial':
    case 'RemotePending':
      return handlers.onPending()
    case 'RemoteFailure':
      return handlers.onFailure(rd.error)
    case 'RemoteSuccess':
      return handlers.onSuccess(rd.value)
  }
}
