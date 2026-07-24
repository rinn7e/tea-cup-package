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
import { type JSX, memo } from 'react'

import { errorTooltipContainer } from '../../error-tooltip/helper'
import { limitDecimal2Digit } from '../../util/common'
import { defaultFileView } from '../../view/default-view'
import { Props, PropsEq } from './type'

const IconFile = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    className='h-8 w-8 text-slate-400'
  >
    <path d='M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z' />
    <polyline points='13 2 13 9 20 9' />
  </svg>
)

const IconX = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    className='h-4 w-4'
  >
    <line x1='18' y1='6' x2='6' y2='18' />
    <line x1='6' y1='6' x2='18' y2='18' />
  </svg>
)

export const FileField = ({ fieldKey, model, dispatch, isDrag }: Props) => {
  const currentFilesView = (): JSX.Element[] => {
    if (model.currentValues.length) {
      const results = pipe(
        model.currentValues,
        A.mapWithIndex((i, file) => {
          return (
            <div className='flex gap-4' key={i}>
              <div className='flex h-[42px] w-[60px] items-center justify-center rounded bg-slate-50'>
                {file.type.startsWith('image/') ? (
                  <img
                    className='h-full w-full object-contain'
                    src={URL.createObjectURL(file)}
                  />
                ) : (
                  <IconFile />
                )}
              </div>
              <div className='grow' style={{ maxWidth: '257px' }}>
                <p className='truncate text-[13px] font-semibold text-slate-700'>
                  {file.name}
                </p>
                <div className='flex text-xs text-slate-400'>
                  <p>{limitDecimal2Digit(file.size / 1000)} KB</p>
                  <p className='px-2 font-semibold'>⋅</p>
                  <p className='uppercase'>
                    {file.type.split('/')[1] || file.type}
                  </p>
                </div>
              </div>
              <button
                type='button'
                className='flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500'
                onClick={() =>
                  dispatch({ _tag: 'RemoveFile', index: i })
                }
              >
                <IconX />
              </button>
            </div>
          )
        }),
      )
      return results
    } else return []
  }

  const validationResult = model.validation(model.currentValues)
  const view = model.ui ? model.ui : defaultFileView
  const dropZoneView = view({
    dispatch,
    fieldKey,
    label: model.label,
    validationResult,
    isMultiple: model.isMultiple,
    isDrag,
    showValidation: model.showValidation,
  })

  const showValidation =
    validationResult._tag === 'Left' && model.showValidation
      ? O.some(validationResult.left)
      : O.none

  return (
    <div className='flex flex-col'>
      <div className='flex flex-col items-center justify-stretch gap-6'>
        {dropZoneView}
        {currentFilesView()}
      </div>

      {errorTooltipContainer(showValidation, 'bottom', () =>
        dispatch({ _tag: 'HideValidation' }),
      )}
    </div>
  )
}

export const FileFieldMemo = memo(FileField, (prev, next) => {
  return PropsEq.equals(prev, next)
})
