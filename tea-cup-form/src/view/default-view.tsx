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
import { type Either } from 'fp-ts/lib/Either'
import * as M from 'fp-ts/lib/Map'
import * as O from 'fp-ts/lib/Option'
import { type Option } from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import * as S from 'fp-ts/lib/string'
import React, { type JSX } from 'react'
import DatePicker from 'react-datepicker'
// Custom CSS for calendar
import 'react-datepicker/dist/react-datepicker.css'
import { Dispatcher } from 'tea-cup-fp'

import { errorTooltipContainer } from '../error-tooltip/helper'
import {
  type CalendarTypeUiArg,
  type CheckboxChoice,
  type CheckboxesTypeUiArg,
  type DropdownTypeUiArg,
  type FileTypeUiArg,
  type Msg,
  type RadioChoice,
  type RadiosTypeUiArg,
  type TextPillTypeUiArg,
  TextTypeUiArg,
  autocompleteToString,
  textInputVariantToString,
} from '../type'
import { exec, mkIdFromString } from '../util/common'
import './../form.css'
import { emptyEl } from './common'

const CalendarInput = React.forwardRef<HTMLInputElement, any>((props, ref) => (
  <input
    {...props}
    ref={ref}
    className='w-full bg-transparent px-4 py-3 font-medium text-slate-800 outline-none'
  />
))

// Icons
// ------------------------------------------

const IconChevronDown = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    className='h-5 w-5'
  >
    <polyline points='6 9 12 15 18 9' />
  </svg>
)

const IconCalendar = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    className='h-5 w-5'
  >
    <rect x='3' y='4' width='18' height='18' rx='2' ry='2' />
    <line x1='16' y1='2' x2='16' y2='6' />
    <line x1='8' y1='2' x2='8' y2='6' />
    <line x1='3' y1='10' x2='21' y2='10' />
  </svg>
)

const IconUpload = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    className='h-8 w-8'
  >
    <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
    <polyline points='17 8 12 3 7 8' />
    <line x1='12' y1='3' x2='12' y2='15' />
  </svg>
)

const IconEye = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    className='h-5 w-5'
  >
    <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
    <circle cx='12' cy='12' r='3' />
  </svg>
)

const IconEyeOff = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    className='h-5 w-5'
  >
    <path d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24' />
    <line x1='1' y1='1' x2='23' y2='23' />
  </svg>
)

const IconCheck = () => (
  <svg
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='3'
    strokeLinecap='round'
    strokeLinejoin='round'
    className='h-3 w-3'
  >
    <polyline points='20 6 9 17 4 12' />
  </svg>
)

// Helpers
// ------------------------------------------

const getContainerClasses = (isError: boolean, isFocus: boolean) =>
  [
    'flex flex-col rounded-xl border transition-all duration-200 relative',
    isError
      ? 'border-red-300 bg-red-50/30'
      : isFocus
        ? 'border-blue-500 ring-[3px] ring-blue-100 shadow-sm'
        : 'border-slate-200 hover:border-slate-300 bg-white shadow-xs',
  ].join(' ')

const getLabelClasses = (isError: boolean, isFocus: boolean) =>
  [
    'text-sm font-bold tracking-tight mb-1 px-1',
    isError ? 'text-red-500' : isFocus ? 'text-blue-500' : 'text-slate-600',
  ].join(' ')

// Input box for text type
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
}: TextTypeUiArg): JSX.Element => {
  const isError = validationResult._tag === 'Left' && showValidation
  const errorMsg = isError ? O.some(validationResult.left) : O.none

  return (
    <div key={key} className='group flex w-full flex-col gap-1'>
      {errorTooltipContainer(errorMsg, 'top', () =>
        dispatch({ _tag: 'HideValidation', key }),
      )}

      {label !== '' && (
        <label className={getLabelClasses(isError, isFocus)}>{label}</label>
      )}
      <div className={getContainerClasses(isError, isFocus)}>
        <div className='flex flex-row items-center'>
          <input
            type={textInputVariantToString(variant)}
            className='w-full bg-transparent px-4 py-3 font-medium text-slate-800 outline-none placeholder:text-slate-300'
            placeholder={placeholder}
            value={currentValue}
            onInput={(event) => dispatch({ _tag: 'UpdateForm', key, event })}
            onFocus={(_) =>
              dispatch({ _tag: 'HandleFocus', key, isFocus: true })
            }
            onBlur={(_) =>
              dispatch({ _tag: 'HandleFocus', key, isFocus: false })
            }
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
                      key,
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

type CheckboxTypeUiArg = {
  dispatch: Dispatcher<Msg>
  fieldKey: string
  checkboxChoice: CheckboxChoice
  isMarkdown: boolean
}

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
          key: arg.fieldKey,
          checkbox_key: key,
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

type RadioTypeUiArg = {
  dispatch: Dispatcher<Msg>
  fieldKey: string
  radioChoice: RadioChoice
  isActive: boolean
}

export const defaultRadioView = (arg: RadioTypeUiArg) => {
  return (
    <div
      id={mkIdFromString(arg.radioChoice.key)}
      key={arg.radioChoice.key}
      className='group flex cursor-pointer flex-row items-center gap-3 py-1.5'
      onClick={(_) =>
        arg.dispatch({
          _tag: 'UpdateRadio',
          key: arg.fieldKey,
          radio_key: arg.radioChoice.key,
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
  const isFloating = isFocus || (currentValue !== null && currentValue !== '')
  const errorMsg = isError ? O.some(validationResult.left) : O.none

  return (
    <div key={fieldKey} className='group flex w-full flex-col gap-1'>
      {errorTooltipContainer(errorMsg, 'top', () =>
        dispatch({ _tag: 'HideValidation', key: fieldKey }),
      )}

      {label !== '' && (
        <label className={getLabelClasses(isError, isFocus)}>{label}</label>
      )}
      <div className={getContainerClasses(isError, isFocus)}>
        <div className='flex flex-row items-center'>
          <input
            id={mkIdFromString(label)}
            className='w-full cursor-pointer bg-transparent px-4 py-3 font-medium text-slate-800 outline-none placeholder:text-slate-300'
            placeholder={placeholder}
            value={currentValue ? currentValue : ''}
            readOnly
            onKeyDown={(event) => event.preventDefault()}
            onClick={(_) =>
              dispatch({ _tag: 'HandleFocus', key: fieldKey, isFocus: true })
            }
            onFocus={(_) =>
              dispatch({ _tag: 'HandleFocus', key: fieldKey, isFocus: true })
            }
            onBlur={(_) =>
              dispatch({ _tag: 'HandleFocus', key: fieldKey, isFocus: false })
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
                        key: fieldKey,
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

export const disableInputView = (arg: {
  label: string
  val: string
  icon: Option<string>
}) => {
  return (
    <div className='group flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3'>
      <div className='flex flex-col'>
        <span className='text-[10px] font-bold tracking-wider text-slate-400 uppercase'>
          {arg.label}
        </span>
        <span className='text-[15px] font-semibold text-slate-500'>
          {arg.val}
        </span>
      </div>
      <div className='grow'></div>
      {arg.icon._tag === 'Some' && (
        <div className='text-slate-300'>
          <IconChevronDown />
        </div>
      )}
    </div>
  )
}

export const lookupWithDefaultHtml = (
  formEls: Map<string, JSX.Element | null>,
  key: string,
) => {
  const result = M.lookup(S.Ord)(key)(formEls)
  switch (result._tag) {
    case 'Some':
      return result.value ?? <div>Empty</div>
    default:
      return (
        <div className='rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-500'>
          Internal error: {key} not found
        </div>
      )
  }
}

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
        dispatch({ _tag: 'HideValidation', key: fieldKey }),
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
                  { _tag: 'HandleFocus', key: fieldKey, isFocus: true },
                  false,
                )
              }
              onCalendarClose={() =>
                dispatch(
                  { _tag: 'HandleFocus', key: fieldKey, isFocus: false },
                  false,
                )
              }
              onChange={(date) =>
                dispatch(
                  { _tag: 'UpdateCalendar', key: fieldKey, value: date },
                  false,
                )
              }
            />
            {/* <DatePicker /> */}
          </div>
          <div className='pointer-events-none pr-3 text-slate-400 transition-colors group-hover:text-slate-600'>
            <IconCalendar />
          </div>
        </div>
      </div>
    </div>
  )
}

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
  const isFocus = isDrag

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
            dispatch({ _tag: 'AddFile', key: fieldKey, event })
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
}: TextPillTypeUiArg): JSX.Element => {
  const isError = validationResult._tag === 'Left' && showValidation
  const isFloating = isFocus || allValues.length > 0 || currentValue !== ''
  const errorMsg = isError ? O.some(validationResult.left) : O.none

  return (
    <div key={key} className='group flex w-full flex-col gap-1'>
      {errorTooltipContainer(errorMsg, 'top', () =>
        dispatch({ _tag: 'HideValidation', key }),
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
                  className='flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-red-500'
                  onClick={() =>
                    dispatch({
                      _tag: 'TextPillMsg',
                      key,
                      subMsg: { _tag: 'RemovePill', index },
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
            className='min-w-[140px] grow bg-transparent px-1 py-1.5 font-medium text-slate-800 outline-none placeholder:text-slate-300'
            value={currentValue}
            onInput={(event) =>
              dispatch({
                _tag: 'TextPillMsg',
                key,
                subMsg: { _tag: 'UpdateTextPill', event },
              })
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter' && currentValue.trim() !== '') {
                event.preventDefault()
                dispatch({
                  _tag: 'TextPillMsg',
                  key,
                  subMsg: { _tag: 'AddPill', value: currentValue },
                })
              }
            }}
            onFocus={(_) =>
              dispatch({ _tag: 'HandleFocus', key, isFocus: true })
            }
            onBlur={(_) =>
              dispatch({ _tag: 'HandleFocus', key, isFocus: false })
            }
            placeholder={placeholder}
            autoComplete={autocompleteToString(autocomplete)}
          />
        </div>
      </div>
    </div>
  )
}
