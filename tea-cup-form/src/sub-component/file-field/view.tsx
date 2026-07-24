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

import { IconUpload, getLabelClasses } from '../shared'
import type { FileTypeUiArg } from './type'

export const defaultFileView = ({
  dispatch,
  fieldKey,
  label,
  validationResult,
  isMultiple,
  isDrag,
  showValidation,
}: FileTypeUiArg) => {
  const isError = validationResult._tag === 'Left' && showValidation

  return (
    <div className='flex w-full flex-col gap-1'>
      {label !== '' && (
        <label className={getLabelClasses(isError, false)}>{label}</label>
      )}
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
          type='file'
          multiple={isMultiple}
          className='absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0'
          onInput={(event) =>
            dispatch({ _tag: 'AddFile', event })
          }
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
              Support for {isMultiple ? 'multiple files' : 'single file'}. Max
              size 10MB per file.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
