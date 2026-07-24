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
import { type Option } from 'fp-ts/lib/Option'

import { Direction } from './type'

export const arrowTop = () => (
  <div className='relative'>
    <div
      className='absolute z-20'
      style={{
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderBottom: '6px solid #ef4444',
        top: '-6px',
      }}
    ></div>
  </div>
)

export const arrowDown = () => (
  <div className='relative'>
    <div
      className='absolute z-20'
      style={{
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: '6px solid #ef4444',
      }}
    ></div>
  </div>
)

export const errorTooltipContainer = (
  errorText: Option<string>,
  direction: Direction,
  onClick: () => void,
) => {
  const position = direction === 'bottom' ? 'top-[10px]' : 'bottom-[-20px]'

  return (
    <div className='relative w-full'>
      <div className={`pointer-events-none absolute z-100 w-full ${position}`}>
        <div className='flex w-full flex-col items-center'>
          {errorText._tag === 'Some'
            ? errorPopup(errorText.value, direction, onClick)
            : null}
        </div>
      </div>
    </div>
  )
}

export const errorPopup = (
  errorText: string,
  direction: Direction,
  onClick: () => void,
) => {
  return (
    <div
      className='pointer-events-auto flex cursor-pointer flex-col items-center'
      onClick={onClick}
    >
      {direction === 'bottom' ? arrowTop() : null}
      <div className='z-10 rounded bg-red-500 px-[8px] py-[5px] text-white drop-shadow-lg'>
        <p className='text-center text-[14px] leading-[20px] whitespace-pre-line'>
          {errorText}
        </p>
      </div>
      {direction === 'top' ? arrowDown() : null}
    </div>
  )
}
