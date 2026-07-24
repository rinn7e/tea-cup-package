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
import { pipe } from 'fp-ts/lib/function'

import { mkIdFromString } from '../../util/common'
import { IconCheck } from '../shared'
import type { CheckboxTypeUiArg, CheckboxesTypeUiArg } from './type'

export const defaultCheckboxView = (arg: CheckboxTypeUiArg) => {
  const [key, val] = arg.checkboxChoice
  return (
    <div
      id={mkIdFromString(key)}
      key={key}
      className='group flex cursor-pointer flex-row items-center gap-3 py-1.5'
      onClick={(_) =>
        arg.dispatch({
          _tag: 'ToggleCheckbox',
          checkboxKey: key,
          value: !val,
        })
      }
    >
      <div
        className={[
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border shadow-xs transition-all duration-200',
          val
            ? 'border-blue-500 bg-blue-500 text-white'
            : 'border-slate-300 bg-white group-hover:border-blue-400',
        ].join(' ')}
      >
        <div
          className={[
            'transform transition-all duration-200',
            val ? 'scale-100 opacity-100' : 'scale-75 opacity-0',
          ].join(' ')}
        >
          <IconCheck />
        </div>
      </div>
      <span className='text-[15px] font-medium text-slate-700 transition-colors select-none group-hover:text-slate-900'>
        {key}
      </span>
    </div>
  )
}

export const defaultCheckboxesView = ({
  dispatch,
  fieldKey,
  label,
  currentValues,
  isMarkdown,
}: CheckboxesTypeUiArg) => (
  <div id='CheckboxType' className='flex flex-col gap-1'>
    {label !== '' && (
      <label className='mb-1 px-1 text-sm font-bold tracking-tight text-slate-600'>
        {label}
      </label>
    )}
    <div className='flex flex-col gap-1'>
      {pipe(
        currentValues,
        A.map((checkboxChoice) =>
          defaultCheckboxView({
            dispatch,
            fieldKey,
            checkboxChoice,
            isMarkdown,
          }),
        ),
      )}
    </div>
  </div>
)
