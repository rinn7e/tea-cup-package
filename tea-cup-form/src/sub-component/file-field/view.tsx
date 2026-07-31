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
import { Dispatcher } from 'tea-cup-fp'

import { errorTooltipContainer } from '../error-tooltip/helper'
import { IconFile, IconUpload, IconX, getLabelClasses } from '../shared'
import type { FileTypeUiArg, Msg } from './type/model'

const limitDecimal2Digit = (num: number): number => Math.round(num * 100) / 100

export const fileDropzoneView = ({
  dispatch,
  fieldKey,
  isMultiple,
  isDrag,
  isError,
}: {
  dispatch: Dispatcher<Msg>
  fieldKey: string
  isMultiple: boolean
  isDrag: boolean
  isError: boolean
}) => (
  <div
    className={[
      'relative flex min-h-[160px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300',
      isDrag
        ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-50'
        : isError
          ? 'border-red-300 bg-red-50 hover:border-red-400'
          : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50',
    ].join(' ')}
  >
    <input
      data-test={fieldKey}
      type='file'
      multiple={isMultiple}
      className='absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0'
      onInput={(event) => dispatch({ _tag: 'AddFile', event })}
    />
    <div className='flex flex-col items-center gap-4 px-6 text-center'>
      <div
        className={[
          'rounded-2xl p-3 transition-colors duration-200',
          isDrag
            ? 'bg-blue-500 text-white shadow-lg shadow-blue-200'
            : 'bg-white text-slate-400 shadow-sm',
        ].join(' ')}
      >
        <IconUpload />
      </div>
      <div className='flex flex-col gap-1.5'>
        <p className='text-[15px] font-bold text-slate-700'>
          {isDrag ? 'Drop to upload' : 'Click or drop files here'}
        </p>
        <p className='max-w-[240px] text-xs leading-relaxed font-medium text-slate-400'>
          Support for {isMultiple ? 'multiple files' : 'single file'}. Max size
          10MB per file.
        </p>
      </div>
    </div>
  </div>
)

export const defaultFileView = ({
  dispatch,
  fieldKey,
  label,
  currentValues,
  validationResult,
  isMultiple,
  isDrag,
  showValidation,
}: FileTypeUiArg) => {
  const isError = validationResult._tag === 'Left' && showValidation
  const errorMsg = isError ? O.some(validationResult.left) : O.none

  const currentFilesView = () => {
    if (currentValues.length > 0) {
      return pipe(
        currentValues,
        A.mapWithIndex((i, file) => (
          <div className='flex w-full items-center gap-4' key={i}>
            <div className='flex h-[42px] w-[60px] shrink-0 items-center justify-center rounded bg-slate-50'>
              {file.type.startsWith('image/') ? (
                <img
                  className='h-full w-full object-contain'
                  src={URL.createObjectURL(file)}
                />
              ) : (
                <IconFile />
              )}
            </div>
            <div className='min-w-0 grow'>
              <p className='truncate text-[13px] font-semibold text-slate-700'>
                {file.name}
              </p>
              <div className='flex text-xs text-slate-400'>
                <p>{limitDecimal2Digit(file.size / 1000)} KB</p>
                <p className='px-2 font-semibold'>⋅</p>
                <p className='uppercase'>
                  {file.type
                    ? file.type.split('/')[1] || file.type
                    : file.name.split('.').pop() || 'FILE'}
                </p>
              </div>
            </div>
            <button
              type='button'
              data-test={`file-remove-${file.name}`}
              className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500'
              onClick={() => dispatch({ _tag: 'RemoveFile', index: i })}
            >
              <IconX />
            </button>
          </div>
        )),
      )
    }
    return []
  }

  return (
    <div className='relative flex w-full flex-col gap-4'>
      {errorTooltipContainer(errorMsg, 'bottom', () =>
        dispatch({ _tag: 'HideValidation' }),
      )}
      <div className='flex w-full flex-col gap-1'>
        {label !== '' && (
          <label className={getLabelClasses(isError, false)}>{label}</label>
        )}
        {fileDropzoneView({ dispatch, fieldKey, isMultiple, isDrag, isError })}
      </div>
      {currentValues.length > 0 && (
        <div className='flex w-full flex-col gap-2'>{currentFilesView()}</div>
      )}
    </div>
  )
}
