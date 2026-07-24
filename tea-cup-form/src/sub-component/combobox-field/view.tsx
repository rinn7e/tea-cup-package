/* MIT License

Copyright (c) 2025 Moremi Vannak

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

import * as RD from '@devexperts/remote-data-ts'
import * as O from 'fp-ts/lib/Option'
import type { JSX } from 'react'

import { errorTooltipContainer } from '../error-tooltip/helper'
import { IconX, getContainerClasses, getLabelClasses } from '../shared'
import type { ComboboxTypeUiArg } from './type'

export const defaultComboboxView = ({
  dispatch,
  key,
  query,
  items,
  selectedItems,
  label,
  placeholder,
  showValidation,
  isFocus,
  validationResult,
  config,
}: ComboboxTypeUiArg): JSX.Element => {
  const isError = validationResult._tag === 'Left' && showValidation
  const errorMsg = isError ? O.some(validationResult.left) : O.none
  const isLoading = RD.isPending(items)

  const results = RD.isSuccess(items)
    ? items.value.filter(
        (p) =>
          !selectedItems.some((s) =>
            config ? config.itemEq.equals(s, p) : s === p,
          ),
      )
    : []

  const labelText = config?.labelText || label

  return (
    <div key={key} className='group flex w-full flex-col gap-1'>
      {errorTooltipContainer(errorMsg, 'top', () =>
        dispatch({ _tag: 'HideValidation' }),
      )}

      {labelText !== '' && (
        <label className={getLabelClasses(isError, isFocus)}>{labelText}</label>
      )}

      <div className={getContainerClasses(isError, isFocus)}>
        <div className='flex flex-wrap items-center gap-2 px-3 py-2'>
          {selectedItems.map((item, index) => {
            const itemKey = config ? config.getKey(item) : index
            const chipContent = config?.chipView ? (
              config.chipView(item)
            ) : (
              <span>{typeof item === 'string' ? item : String(itemKey)}</span>
            )

            return (
              <div
                key={itemKey}
                className='flex items-center gap-2 rounded-lg bg-slate-100 py-1 pr-1.5 pl-3 text-[13px] font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-200'
              >
                {chipContent}
                <button
                  type='button'
                  data-test={`combobox-remove-${itemKey}`}
                  className='flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-red-500'
                  onClick={() => dispatch({ _tag: 'DeselectItem', item })}
                >
                  <IconX />
                </button>
              </div>
            )
          })}

          <input
            data-test={key}
            className='min-w-[120px] grow bg-transparent px-1 py-1.5 font-medium text-slate-800 outline-none placeholder:text-slate-300'
            placeholder={
              selectedItems.length > 0 ? '' : placeholder || `Search...`
            }
            value={query}
            onChange={(e) =>
              dispatch({
                _tag: 'SetQuery',
                value: (e.target as HTMLInputElement).value,
              })
            }
            onFocus={() => dispatch({ _tag: 'HandleFocus', isFocus: true })}
            onBlur={() => dispatch({ _tag: 'HandleFocus', isFocus: false })}
          />
        </div>
      </div>

      {isFocus && query.trim().length > 0 && (
        <div className='relative'>
          <div
            className='animate-in fade-in zoom-in-95 absolute top-2 z-50 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl duration-200'
            style={{ maxHeight: '280px' }}
          >
            <div className='scrollbar-hide overflow-y-auto py-1.5'>
              {isLoading ? (
                <div className='p-4 text-center text-sm font-medium text-slate-400'>
                  Loading...
                </div>
              ) : results.length === 0 ? (
                <div className='p-4 text-center text-sm font-medium text-slate-400'>
                  {config?.notFoundText || 'No items found'}
                </div>
              ) : (
                results.map((item, index) => {
                  const itemKey = config ? config.getKey(item) : index
                  const resultContent = config?.resultView ? (
                    config.resultView(item)
                  ) : (
                    <span>
                      {typeof item === 'string' ? item : String(itemKey)}
                    </span>
                  )

                  return (
                    <div
                      key={itemKey}
                      data-test={`combobox-option-${itemKey}`}
                      className='mx-1.5 cursor-pointer rounded-lg px-3 py-2.5 text-[15px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900'
                      onMouseDown={(e) => {
                        e.preventDefault()
                        dispatch({ _tag: 'SelectItem', item })
                      }}
                    >
                      {resultContent}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
