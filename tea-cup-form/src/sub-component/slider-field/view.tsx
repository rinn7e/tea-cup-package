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
import { type JSX, type ReactNode } from 'react'

import { mkIdFromString } from '../../util/common'
import { type Msg, type SliderTypeUiArg, type ThumbViewUiArg } from './type'
import { getValueFromX } from './util'

export const defaultThumbView = ({
  fieldKey,
  anchorName,
  pct,
  isDragging,
  dispatch,
}: ThumbViewUiArg<Msg>): ReactNode => {
  const handleThumbMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    dispatch({ _tag: 'SetDragging', value: true })
  }

  const handleThumbTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation()
    dispatch({ _tag: 'SetDragging', value: true })
  }

  return (
    <div
      data-test={`slider-thumb-${fieldKey}`}
      onMouseDown={handleThumbMouseDown}
      onTouchStart={handleThumbTouchStart}
      className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-blue-600 bg-white outline-none ${
        isDragging
          ? 'scale-115 cursor-grabbing shadow-lg shadow-blue-500/25 ring-4 ring-blue-500/25 transition-none'
          : 'cursor-grab shadow-xs hover:scale-105 transition-transform duration-150'
      }`}
      style={
        {
          left: `calc(${pct}% - 10px)`,
          'anchor-name': anchorName,
        } as React.CSSProperties
      }
    />
  )
}

export const defaultSliderView =
  (thumbView: (props: ThumbViewUiArg<Msg>) => ReactNode) =>
  ({
    dispatch,
    fieldKey,
    value,
    isDragging,
    config,
  }: SliderTypeUiArg<Msg>): JSX.Element => {
    const { min, max, label, unit, showValue } = config
    const trackId = mkIdFromString(fieldKey)
    const anchorName = config.anchorName ?? `--${trackId}-thumb`

    const handleTrackMouseDown = (e: React.MouseEvent) => {
      e.preventDefault()
      dispatch({ _tag: 'SetDragging', value: true })
      const rect = e.currentTarget.getBoundingClientRect()
      dispatch({
        _tag: 'SetValue',
        value: getValueFromX(e.clientX, rect, config),
      })
    }

    const handleTrackTouchStart = (e: React.TouchEvent) => {
      dispatch({ _tag: 'SetDragging', value: true })
      if (e.touches.length > 0) {
        const rect = e.currentTarget.getBoundingClientRect()
        dispatch({
          _tag: 'SetValue',
          value: getValueFromX(e.touches[0].clientX, rect, config),
        })
      }
    }

    const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
    const trackBg = `linear-gradient(to right, #3B82F6 0%, #2563EB ${pct}%, #E2E8F0 ${pct}%, #E2E8F0 100%)`

    const hasHeader = Boolean(label || showValue !== false)

    return (
      <div className='flex w-full flex-col gap-1.5'>
        {hasHeader && (
          <div className='flex items-center justify-between px-0.5'>
            {label ? (
              <label className='text-sm font-medium text-slate-700 select-none'>
                {label}
              </label>
            ) : (
              <div />
            )}
            {showValue !== false && (
              <span
                data-test={`slider-value-${fieldKey}`}
                className='rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600 select-none'
              >
                {value} {unit ?? ''}
              </span>
            )}
          </div>
        )}

        <div className='box-border flex h-7 w-full items-center px-2.5'>
          <div
            id={trackId}
            data-test={fieldKey}
            onMouseDown={handleTrackMouseDown}
            onTouchStart={handleTrackTouchStart}
            className='relative h-2 w-full rounded-full shadow-inner'
            style={{
              background: trackBg,
              cursor: isDragging ? 'grabbing' : 'pointer',
            }}
          >
            {thumbView({ fieldKey, anchorName, pct, isDragging, dispatch })}
          </div>
        </div>
      </div>
    )
  }
