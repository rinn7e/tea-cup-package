import { formView } from '@rinn7e/tea-cup-form'
import { cn } from '@rinn7e/tea-cup-prelude'
import * as React from 'react'
import { Dispatcher, map } from 'tea-cup-fp'

import { Model, Msg } from './type'

export const view = (dispatch: Dispatcher<Msg>, model: Model) => {
  const renderField = (key: string) => {
    const field = model.form.forms.get(key)
    if (!field) return null
    return (
      <div className='mb-6'>
        {formView(
          key,
          field,
          map(
            dispatch,
            (subMsg) => ({ _tag: 'FormMsg', subMsg }) satisfies Msg,
          ),
          model.form,
        )}
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-slate-50 px-6 py-12'>
      <div className='mx-auto max-w-2xl'>
        <div className='mb-10 text-center'>
          <h1 className='text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl'>
            TeaCup Form Kitchen Sink
          </h1>
          <p className='mt-3 text-lg text-slate-600'>
            A demonstration of the modular and fully customizable form library.
          </p>
        </div>

        <div className='overflow-hidden rounded-3xl bg-white shadow-xl ring-1 shadow-slate-200/50 ring-slate-200'>
          <form
            className='space-y-6 p-8'
            onSubmit={(e) => {
              e.preventDefault()
              if (model.isFormValid) {
                dispatch({ _tag: 'Submit' })
              } else {
                dispatch({ _tag: 'ShowAllValidation' })
              }
            }}
          >
            {renderField('text')}
            {renderField('pill')}

            <div className='relative py-4'>
              <div
                className='absolute inset-0 flex items-center'
                aria-hidden='true'
              >
                <div className='w-full border-t border-slate-100'></div>
              </div>
              <div className='relative flex justify-center text-sm leading-6 font-medium'>
                <span className='bg-white px-4 text-[10px] tracking-widest text-slate-400 uppercase'>
                  Selections
                </span>
              </div>
            </div>

            {renderField('checkbox')}

            <div className='relative py-4'>
              <div
                className='absolute inset-0 flex items-center'
                aria-hidden='true'
              >
                <div className='w-full border-t border-slate-100'></div>
              </div>
            </div>

            {renderField('radio')}

            <div className='relative py-4'>
              <div
                className='absolute inset-0 flex items-center'
                aria-hidden='true'
              >
                <div className='w-full border-t border-slate-100'></div>
              </div>
              <div className='relative flex justify-center text-sm leading-6 font-medium'>
                <span className='bg-white px-4 text-[10px] tracking-widest text-slate-400 uppercase'>
                  Details
                </span>
              </div>
            </div>

            {renderField('dropdown')}
            {renderField('calendar')}
            {renderField('file')}

            <button
              type='submit'
              className={cn(
                'group relative mt-8 flex w-full justify-center rounded-xl px-3 py-4 text-sm font-bold text-white transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none',
                model.isFormValid
                  ? 'bg-blue-600 shadow-lg shadow-blue-200 hover:bg-blue-700'
                  : 'cursor-not-allowed bg-slate-300',
              )}
            >
              Submit Form
            </button>
          </form>
        </div>

        {model.submittedValues && (
          <div className='animate-in fade-in slide-in-from-bottom-4 mt-12 duration-500'>
            <div className='overflow-hidden rounded-2xl bg-slate-900 shadow-2xl'>
              <div className='flex items-center justify-between border-b border-slate-700 bg-slate-800 px-6 py-3'>
                <h2 className='text-xs font-bold tracking-widest text-slate-400 uppercase'>
                  Payload Output
                </h2>
                <div className='flex gap-1.5'>
                  <div className='h-2.5 w-2.5 rounded-full bg-red-500/50'></div>
                  <div className='h-2.5 w-2.5 rounded-full bg-amber-500/50'></div>
                  <div className='h-2.5 w-2.5 rounded-full bg-emerald-500/50'></div>
                </div>
              </div>
              <div className='p-6'>
                <pre className='overflow-auto font-mono text-sm leading-relaxed text-emerald-400'>
                  {model.submittedValues}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
