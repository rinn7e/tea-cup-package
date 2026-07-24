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
import * as O from 'fp-ts/lib/Option'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

import { errorTooltipContainer } from '../../error-tooltip/helper'
import {
  CalendarInput,
  IconCalendar,
  getContainerClasses,
  getLabelClasses,
} from '../shared'
import type { CalendarTypeUiArg } from './type'

export const defaultCalendarView = ({
  dispatch,
  fieldKey,
  label,
  placeholder,
  currentValue,
  isFocus,
  validationResult,
  showValidation,
}: CalendarTypeUiArg) => {
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
          <div className='w-full' onClick={(e) => e.stopPropagation()}>
            <DatePicker
              className='z-[100]'
              showYearDropdown
              scrollableYearDropdown
              yearDropdownItemNumber={100}
              selected={currentValue}
              placeholderText={placeholder}
              dateFormat='dd.MM.yyyy'
              customInput={<CalendarInput />}
              onCalendarOpen={() =>
                dispatch(
                  { _tag: 'HandleFocus', isFocus: true },
                  false,
                )
              }
              onCalendarClose={() =>
                dispatch(
                  { _tag: 'HandleFocus', isFocus: false },
                  false,
                )
              }
              onChange={(date) =>
                dispatch(
                  { _tag: 'UpdateCalendar', value: date },
                  false,
                )
              }
            />
          </div>
          <div className='pointer-events-none pr-3 text-slate-400 transition-colors group-hover:text-slate-600'>
            <IconCalendar />
          </div>
        </div>
      </div>
    </div>
  )
}
