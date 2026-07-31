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

import { mkIdFromString } from '../../util/common'
import { errorTooltipContainer } from '../error-tooltip/helper'
import {
  IconChevronDown,
  getContainerClasses,
  getLabelClasses,
} from '../shared'
import type { DropdownTypeUiArg } from './type/model'

export const defaultDropdownView = ({
  dispatch,
  label,
  currentValue,
  fieldKey,
  isFocus,
  choices,
  placeholder,
  validationResult,
  showValidation,
}: DropdownTypeUiArg) => {
  const isError = validationResult._tag === 'Left' && showValidation
  const errorMsg = isError ? O.some(validationResult.left) : O.none

  return (
    <div key={fieldKey} className='group flex w-full flex-col gap-1'>
      {errorTooltipContainer(errorMsg, 'top', () =>
        dispatch({ _tag: 'HideValidation' }),
      )}

      {label !== '' && (
        <label className={getLabelClasses(isError, isFocus)}>{label}</label>
      )}
      <div className={getContainerClasses(isError, isFocus)}>
        <div className='flex flex-row items-center'>
          <input
            data-test={fieldKey}
            id={mkIdFromString(label)}
            className='w-full cursor-pointer bg-transparent px-4 py-3 font-medium text-slate-800 outline-none placeholder:text-slate-300'
            placeholder={placeholder}
            value={currentValue ? currentValue : ''}
            readOnly
            onKeyDown={(event) => event.preventDefault()}
            onClick={(_) =>
              dispatch({ _tag: 'HandleFocus', isFocus: true })
            }
            onFocus={(_) =>
              dispatch({ _tag: 'HandleFocus', isFocus: true })
            }
            onBlur={(_) =>
              dispatch({ _tag: 'HandleFocus', isFocus: false })
            }
          />
          <div className='pointer-events-none pr-3 text-slate-400 transition-colors group-hover:text-slate-600'>
            <IconChevronDown />
          </div>
        </div>
      </div>

      {isFocus && (
        <div className='relative'>
          <div
            className='animate-in fade-in zoom-in-95 absolute top-2 z-50 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl duration-200'
            style={{ maxHeight: '350px' }}
          >
            <div className='scrollbar-hide overflow-y-auto py-1.5'>
              {pipe(
                choices,
                A.map((choice) => (
                  <div
                    id={mkIdFromString(choice)}
                    data-test={choice}
                    key={choice}
                    className={[
                      'mx-1.5 cursor-pointer rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors',
                      currentValue === choice
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900',
                    ].join(' ')}
                    onMouseDown={(event) =>
                      dispatch({
                        _tag: 'UpdateDropdownType',
                        value: choice,
                        event,
                      })
                    }
                  >
                    {choice}
                  </div>
                )),
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
