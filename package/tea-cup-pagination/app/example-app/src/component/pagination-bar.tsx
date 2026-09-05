import { ChevronLeft, ChevronRight } from 'lucide-react'
import React from 'react'

type Props = {
  currentPage: number
  pageAmount: number
  onPageChange: (page: number) => void
}

/**
 * Generate pagination items with constant width following RealWorld pattern
 */
const getPageNumbers = (
  currentPage: number,
  pageAmount: number,
): ReadonlyArray<number | string> => {
  if (pageAmount <= 7) {
    return Array.from({ length: pageAmount }, (_, i) => i + 1)
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', pageAmount]
  }
  if (currentPage >= pageAmount - 3) {
    return [
      1,
      '...',
      pageAmount - 4,
      pageAmount - 3,
      pageAmount - 2,
      pageAmount - 1,
      pageAmount,
    ]
  }
  return [
    1,
    '...',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    '...',
    pageAmount,
  ]
}

export const PaginationBar: React.FC<Props> = ({
  currentPage,
  pageAmount,
  onPageChange,
}) => {
  if (pageAmount <= 1) {
    return null
  }

  const pageNumbers = getPageNumbers(currentPage, pageAmount)
  const isPrevDisabled = currentPage <= 1
  const isNextDisabled = currentPage >= pageAmount

  return (
    <nav
      data-test='pagination-nav'
      aria-label='Pagination'
      className='mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-200/80 pt-6 sm:flex-row'
    >
      <div className='text-xs font-medium text-slate-500'>
        Page <span className='font-bold text-slate-900'>{currentPage}</span> of{' '}
        <span className='font-bold text-slate-900'>{pageAmount}</span>
      </div>

      <div className='flex items-center gap-1.5'>
        {/* Previous Page Button */}
        <button
          type='button'
          data-test='prev-page-btn'
          disabled={isPrevDisabled}
          onClick={() => {
            if (!isPrevDisabled) {
              onPageChange(currentPage - 1)
            }
          }}
          className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
            isPrevDisabled
              ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed opacity-60'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-2xs cursor-pointer'
          }`}
          aria-label='Previous Page'
        >
          <ChevronLeft className='h-4 w-4' />
          <span className='hidden sm:inline'>Previous</span>
        </button>

        {/* Page Number Pills */}
        <div className='flex items-center gap-1'>
          {pageNumbers.map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  data-test='page-ellipsis'
                  className='px-2 text-xs font-bold text-slate-400 select-none'
                >
                  …
                </span>
              )
            }

            const isActive = p === currentPage

            return (
              <button
                key={`page-${p}`}
                type='button'
                data-test={`page-btn-${p}`}
                disabled={isActive}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  if (!isActive) {
                    onPageChange(p)
                  }
                }}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25 ring-2 ring-indigo-600/20 cursor-default'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-2xs cursor-pointer'
                }`}
              >
                {p}
              </button>
            )
          })}
        </div>

        {/* Next Page Button */}
        <button
          type='button'
          data-test='next-page-btn'
          disabled={isNextDisabled}
          onClick={() => {
            if (!isNextDisabled) {
              onPageChange(currentPage + 1)
            }
          }}
          className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
            isNextDisabled
              ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed opacity-60'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-2xs cursor-pointer'
          }`}
          aria-label='Next Page'
        >
          <span className='hidden sm:inline'>Next</span>
          <ChevronRight className='h-4 w-4' />
        </button>
      </div>
    </nav>
  )
}
