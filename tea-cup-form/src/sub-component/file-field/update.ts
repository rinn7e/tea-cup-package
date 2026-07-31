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
import * as S from 'fp-ts/lib/string'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import type { FormType, Forms } from '../../common/type'
import { MapExtra, exec } from '@rinn7e/tea-cup-prelude'
import type { Model, Msg } from './type/model'

// Helper convert `FileList` to array.
export const toFileArray = (files: FileList): File[] => {
  const a = [] as File[]
  for (let i = 0; i < files.length; i++) {
    a[i] = files[i]
  }
  return a
}

// Add files to the file input form
export const addFiles = (
  msg: { key: string },
  model: { forms: Forms },
  files: FileList | null | undefined,
): { forms: Forms } => {
  const newForm = exec(() => {
    if (files) {
      return pipe(
        model.forms,
        MapExtra.modifyAtIfExist(S.Eq)(msg.key, (form): FormType => {
          if (form._tag === 'FileType') {
            return {
              _tag: 'FileType',
              model: {
                ...form.model,
                currentValues: form.model.currentValues.concat(toFileArray(files)),
                showValidation: true,
              },
            }
          } else {
            console.log('FileType: Try to update a field that is not FileType')
            return form
          }
        }),
      )
    } else return model.forms
  })

  return { ...model, forms: newForm }
}

export const update = (msg: Msg, field: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'AddFile': {
      msg.event.preventDefault()
      const files = (msg.event.target as HTMLInputElement).files
      if (files) {
        return [
          {
            ...field,
            currentValues: field.currentValues.concat(toFileArray(files)),
            showValidation: true,
          },
          Cmd.none(),
        ]
      }
      return [field, Cmd.none()]
    }
    case 'RemoveFile': {
      const result = pipe(field.currentValues, A.deleteAt(msg.index))
      return [
        {
          ...field,
          currentValues: result._tag === 'Some' ? result.value : field.currentValues,
          showValidation: true,
        },
        Cmd.none(),
      ]
    }
    case 'HideValidation':
      return [
        {
          ...field,
          showValidation: false,
        },
        Cmd.none(),
      ]
  }
}
