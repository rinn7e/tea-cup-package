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
import { exec } from '@rinn7e/tea-cup-prelude'
import * as O from 'fp-ts/lib/Option'
import type { JSX } from 'react'

import { errorTooltipContainer } from '../error-tooltip/helper'
import {
  IconEye,
  IconEyeOff,
  emptyEl,
  getContainerClasses,
  getLabelClasses,
} from '../shared'
import {
  type UiArg,
  autocompleteToString,
  textInputVariantToString,
} from './type/model'

export const defaultTextView = ({
  dispatch,
  variant,
  key,
  currentValue,
  label,
  showValidation,
  isFocus,
  validationResult,
  placeholder,
  autocomplete,
  onKeyDown,
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
        <div className='flex flex-row items-center'>
          <input
            data-test={key}
            type={textInputVariantToString(variant)}
            className='w-full bg-transparent px-4 py-3 font-medium text-slate-800 outline-none placeholder:text-slate-300'
            placeholder={placeholder}
            value={currentValue}
            onInput={(event) => dispatch({ _tag: 'UpdateEvent', event })}
            onFocus={(_) => dispatch({ _tag: 'HandleFocus', isFocus: true })}
            onBlur={(_) => dispatch({ _tag: 'HandleFocus', isFocus: false })}
            onKeyDown={onKeyDown}
            name={label}
            autoComplete={autocompleteToString(autocomplete)}
          />
          {exec(() => {
            if (variant._tag === 'Password') {
              return (
                <button
                  type='button'
                  className='mr-2 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none'
                  onClick={(event) =>
                    dispatch({
                      _tag: 'SetRevealPassword',
                      reveal: !variant.reveal,
                      event,
                    })
                  }
                >
                  {variant.reveal ? <IconEyeOff /> : <IconEye />}
                </button>
              )
            } else return emptyEl()
          })}
        </div>
      </div>
    </div>
  )
}
