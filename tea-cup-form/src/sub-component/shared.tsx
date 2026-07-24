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
import * as M from 'fp-ts/lib/Map'
import { type Option } from 'fp-ts/lib/Option'
import * as S from 'fp-ts/lib/string'
import React, { type JSX } from 'react'

export const emptyEl = (): JSX.Element => <div></div>

export const CalendarInput = React.forwardRef<HTMLInputElement, any>((props, ref) => (
  <input
    {...props}
    ref={ref}
    className='w-full bg-transparent px-4 py-3 font-medium text-slate-800 outline-none'
  />
))

// Icons
// ------------------------------------------

export const IconChevronDown = () => (
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

export const IconCalendar = () => (
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

export const IconUpload = () => (
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

export const IconFile = () => (
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

export const IconX = () => (
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

export const IconEye = () => (
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

export const IconEyeOff = () => (
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

export const IconCheck = () => (
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

export const getContainerClasses = (isError: boolean, isFocus: boolean) =>
  [
    'flex flex-col rounded-xl border transition-all duration-200 relative',
    isError
      ? 'border-red-300 bg-red-50/30'
      : isFocus
        ? 'border-blue-500 ring-[3px] ring-blue-100 shadow-sm'
        : 'border-slate-200 hover:border-slate-300 bg-white shadow-xs',
  ].join(' ')

export const getLabelClasses = (isError: boolean, isFocus: boolean) =>
  [
    'text-sm font-bold tracking-tight mb-1 px-1',
    isError ? 'text-red-500' : isFocus ? 'text-blue-500' : 'text-slate-600',
  ].join(' ')

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
