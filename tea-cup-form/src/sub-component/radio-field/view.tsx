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
import type { RadioChoice, RadioTypeUiArg, RadiosTypeUiArg } from './type/model'

export const radioView = (
  isSelected: boolean,
  onClick: (isSelected: boolean) => void,
) => {
  return (
    <div
      className={[
        'flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all duration-200',
        isSelected
          ? 'border-blue-500 bg-blue-500'
          : 'border-slate-300 bg-white group-hover:border-blue-400 hover:border-blue-400',
      ].join(' ')}
      onClick={() => onClick(isSelected)}
    >
      <div
        className={[
          'h-2 w-2 rounded-full bg-white transition-transform duration-200',
          isSelected ? 'scale-100' : 'scale-0',
        ].join(' ')}
      ></div>
    </div>
  )
}

export const defaultRadioView = (arg: RadioTypeUiArg) => {
  return (
    <div
      id={mkIdFromString(arg.radioChoice.key)}
      data-test={`radio-${arg.fieldKey}-${arg.radioChoice.key}`}
      key={arg.radioChoice.key}
      className='group flex cursor-pointer flex-row items-center gap-3 py-1.5'
      onClick={(_) =>
        arg.dispatch({
          _tag: 'UpdateRadio',
          radioKey: arg.radioChoice.key,
          allowUnselected: false,
        })
      }
    >
      {radioView(arg.isActive, () => null)}
      <div className='flex flex-col'>
        <span className='text-[15px] font-medium text-slate-700 transition-colors select-none group-hover:text-slate-900'>
          {arg.radioChoice.label}
        </span>
        {arg.radioChoice.desc && (
          <span className='text-xs text-slate-400'>{arg.radioChoice.desc}</span>
        )}
      </div>
    </div>
  )
}

export const defaultRadiosView = ({
  dispatch,
  fieldKey,
  label,
  choices,
  currentValue,
  isMarkdown,
}: RadiosTypeUiArg) => (
  <div id='RadioType' className='flex flex-col gap-1'>
    {label !== '' && (
      <label className='mb-1 px-1 text-sm font-bold tracking-tight text-slate-600'>
        {label}
      </label>
    )}
    <div className='flex flex-col gap-1'>
      {pipe(
        choices,
        A.map((radioChoice) => {
          const isActive =
            currentValue._tag === 'Some' &&
            currentValue.value === radioChoice.key
          return defaultRadioView({ dispatch, fieldKey, radioChoice, isActive })
        }),
      )}
    </div>
  </div>
)
