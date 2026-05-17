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
import * as S from 'fp-ts/lib/string'
import { type JSX } from 'react'
import { Dispatcher } from 'tea-cup-fp'

import { errorTooltipContainer } from './error-tooltip/helper'
import { type FileType, type FormType, type Model, type Msg } from './type'
import { exec, limitDecimal2Digit, modifyAtIfExist } from './util/common'
import { runValidationAndLink } from './validation'
import {
  defaultCalendarView,
  defaultCheckboxesView,
  defaultDropdownView,
  defaultFileView,
  defaultRadiosView,
  defaultTextPillView,
  defaultTextView,
} from './view/default-view'

export {
  defaultCalendarType,
  defaultCheckboxType,
  defaultDropdownType,
  defaultFileType,
  defaultRadioType,
  defaultTextPillType,
  defaultTextType,
} from './util/default-config'

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

// UI for individual input field
// Model is needed to do validation on input field that depend on another input field
export const formView = (
  key: string,
  val: FormType,
  dispatch: Dispatcher<Msg>,
  model: Model,
) => {
  switch (val._tag) {
    case 'TextType': {
      const validationResult = runValidationAndLink(val, model.forms)
      const view = val.ui ? val.ui : defaultTextView
      return view({
        key,
        dispatch,
        label: val.label,
        validationResult,
        isFocus: val.isFocus,
        placeholder: val.placeholder,
        validation: val.validation,
        currentValue: val.currentValue,
        showValidation: val.showValidation,
        variant: val.variant,
        autocomplete: val.autocomplete,
        isTextarea: val.isTextarea,
        onKeyDown: val.onKeyDown,
      })
    }
    case 'TextPillType': {
      const validationResult = val.validation(val.allValues)
      const view = val.ui ? val.ui : defaultTextPillView
      return view({
        key,
        dispatch,
        label: val.label,
        validationResult,
        isFocus: val.isFocus,
        placeholder: val.placeholder,
        validation: val.validation,
        allValues: val.allValues,
        currentValue: val.currentValue,
        showValidation: val.showValidation,
        autocomplete: val.autocomplete,
        isTextarea: val.isTextarea,
      })
    }
    case 'CalendarType': {
      const validationResult = val.validation(val.currentValue)
      const view = val.ui ? val.ui : defaultCalendarView
      return view({
        dispatch,
        fieldKey: key,
        label: val.label,
        placeholder: val.placeholder,
        currentValue: val.currentValue,
        isFocus: val.isFocus,
        validationResult,
        validation: val.validation,
        showValidation: val.showValidation,
      })
    }
    case 'DropdownType': {
      const validationResult = val.validation(val.currentValue)
      const view = val.ui ? val.ui : defaultDropdownView
      return view({
        fieldKey: key,
        dispatch,
        label: val.label,
        choices: val.choices,
        validationResult,
        isFocus: val.isFocus,
        placeholder: val.placeholder,
        validation: val.validation,
        currentValue: val.currentValue,
        showValidation: val.showValidation,
      })
    }
    case 'CheckboxType': {
      const view = val.ui ? val.ui : defaultCheckboxesView
      return view({
        dispatch,
        fieldKey: key,
        label: val.label,
        currentValues: val.currentValues,
        isMarkdown: val.isMarkdown,
      })
    }
    case 'RadioType': {
      const view = val.ui ? val.ui : defaultRadiosView
      return view({
        dispatch,
        fieldKey: key,
        label: val.label,
        choices: val.choices,
        currentValue: val.currentValue,
        isMarkdown: val.isMarkdown,
      })
    }

    case 'FileType': {
      const currentFilesView = (): JSX.Element[] => {
        if (val.currentValues.length) {
          const results = pipe(
            val.currentValues,
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
                      <p className='uppercase'>{file.type.split('/')[1] || file.type}</p>
                    </div>
                  </div>
                  <button
                    type='button'
                    className='flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500'
                    onClick={() =>
                      dispatch({ _tag: 'RemoveFile', key, index: i })
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

      const validationResult = val.validation(val.currentValues)
      const view = val.ui ? val.ui : defaultFileView
      const dropZoneView = view({
        dispatch,
        fieldKey: key,
        label: val.label,
        validationResult,
        isMultiple: val.isMultiple,
        isDrag: model.isDrag,
        showValidation: val.showValidation,
      })

      const showValidation =
        validationResult._tag == 'Left' && val.showValidation
          ? O.some(validationResult.left)
          : O.none

      return (
        <div className='flex flex-col'>
          <div className='flex flex-col items-center justify-stretch gap-6'>
            {dropZoneView}
            {currentFilesView()}
          </div>

          {errorTooltipContainer(showValidation, 'bottom', () =>
            dispatch({ _tag: 'HideValidation', key }),
          )}
        </div>
      )
    }
    default:
      return <div>Internal error: form item not found</div>
  }
}

// Add files to the file input form
export const addFiles = (
  msg: { key: string },
  model: Model,
  files: FileList | null | undefined,
): Model => {
  const newForm = exec(() => {
    if (files) {
      return pipe(
        model.forms,
        modifyAtIfExist(S.Eq)(msg.key, (form) => {
          if (form._tag === 'FileType')
            return {
              ...form,
              currentValues: form.currentValues.concat(toFileArray(files)),
              showValidation: true,
            } as FileType
          else {
            console.log('FileType: Try to update a field that is not FileType')
            return form
          }
        }),
      )
    } else return model.forms
  })

  return { ...model, forms: newForm }
}

// Helper convert `FileList` to array.
const toFileArray = (files: FileList): File[] => {
  const a = [] as File[]
  for (let i = 0; i < files.length; i++) {
    a[i] = files[i]
  }
  return a
}
