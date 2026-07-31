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
import * as A from 'fp-ts/lib/Array'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import type { JSX } from 'react'

import { errorTooltipContainer } from '../error-tooltip/helper'
import { getContainerClasses, getLabelClasses } from '../shared'
import { autocompleteToString } from '../text-field/type/model'
import type { UiArg } from './type/model'

export const defaultTextPillView = ({
  dispatch,
  key,
  currentValue,
  label,
  showValidation,
  isFocus,
  validationResult,
  placeholder,
  autocomplete,
  allValues,
}: UiArg): JSX.Element => {
  const isError = validationResult._tag === 'Left' && showValidation
  const errorMsg = isError ? O.some(validationResult.left) : O.none

  return (
    <div key={key} className='group flex w-full flex-col gap-1'>
      {errorTooltipContainer(errorMsg, 'top', () =>
        dispatch({ _tag: 'HideValidation' }),
      )}
      {label !== '' && (
        <label className={getLabelClasses(isError, isFocus)}>{label}</label>
      )}
      <div className={getContainerClasses(isError, isFocus)}>
        <div className='flex flex-wrap items-center gap-2 px-3 py-2'>
          {pipe(
            allValues,
            A.mapWithIndex((index, val) => (
              <div
                key={index}
                className='flex items-center gap-2 rounded-lg bg-slate-100 py-1 pr-1.5 pl-3 text-[13px] font-bold text-slate-700 shadow-xs transition-all hover:bg-slate-200 hover:text-slate-900'
              >
                <span>{val}</span>
                <button
                  type='button'
                  data-test={`pill-remove-${val}`}
                  className='flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-red-500'
                  onClick={() =>
                    dispatch({
                      _tag: 'RemovePill',
                      index,
                    })
                  }
                >
                  <svg
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='3'
                    className='h-3 w-3'
                  >
                    <line x1='18' y1='6' x2='6' y2='18' />
                    <line x1='6' y1='6' x2='18' y2='18' />
                  </svg>
                </button>
              </div>
            )),
          )}
          <input
            data-test={key}
            className='min-w-[140px] grow bg-transparent px-1 py-1.5 font-medium text-slate-800 outline-none placeholder:text-slate-300'
            value={currentValue}
            onInput={(event) =>
              dispatch({
                _tag: 'UpdateTextPill',
                event,
              })
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter' && currentValue.trim() !== '') {
                event.preventDefault()
                dispatch({
                  _tag: 'AddPill',
                  value: currentValue,
                })
              }
            }}
            onFocus={(_) => dispatch({ _tag: 'HandleFocus', isFocus: true })}
            onBlur={(_) => dispatch({ _tag: 'HandleFocus', isFocus: false })}
            placeholder={placeholder}
            autoComplete={autocompleteToString(autocomplete)}
          />
        </div>
      </div>
    </div>
  )
}
