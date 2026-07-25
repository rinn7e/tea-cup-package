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

import { type Msg, type SliderTypeUiArg } from './type'
import { getValueFromX } from './util'

export const defaultSliderView = ({
  dispatch,
  value,
  isDragging,
  min,
  max,
  step,
  label,
  unit,
  showValue,
  id,
  anchorName,
  customThumbView,
}: SliderTypeUiArg<Msg>): JSX.Element => {
  const config = { min, max, step, id, anchorName, customThumbView }

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
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      {hasHeader && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 2px',
          }}
        >
          {label ? (
            <label
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#334155',
                userSelect: 'none',
              }}
            >
              {label}
            </label>
          ) : (
            <div />
          )}
          {showValue !== false && (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#2563EB',
                backgroundColor: '#EFF6FF',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #DBEAFE',
                userSelect: 'none',
              }}
            >
              {value} {unit ?? ''}
            </span>
          )}
        </div>
      )}

      <div
        style={{
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: '0 10px',
          boxSizing: 'border-box',
        }}
      >
        <div
          id={id}
          onMouseDown={handleTrackMouseDown}
          onTouchStart={handleTrackTouchStart}
          style={{
            position: 'relative',
            height: '8px',
            width: '100%',
            borderRadius: '9999px',
            background: trackBg,
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.06)',
            cursor: isDragging ? 'grabbing' : 'pointer',
          }}
        >
          {thumbView(anchorName, customThumbView, pct, isDragging, dispatch)}
        </div>
      </div>
    </div>
  )
}

const thumbView = (
  anchorName: string,
  customThumbView: SliderTypeUiArg['customThumbView'],
  pct: number,
  isDragging: boolean,
  dispatch: (msg: Msg) => void,
): ReactNode => {
  const handleThumbMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    dispatch({ _tag: 'SetDragging', value: true })
  }

  const handleThumbTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation()
    dispatch({ _tag: 'SetDragging', value: true })
  }

  if (customThumbView) {
    return customThumbView({
      pct,
      anchorName,
      onMouseDown: handleThumbMouseDown,
      onTouchStart: handleThumbTouchStart,
    })
  } else {
    return (
      <div
        onMouseDown={handleThumbMouseDown}
        onTouchStart={handleThumbTouchStart}
        style={
          {
            position: 'absolute',
            left: `calc(${pct}% - 10px)`,
            top: '50%',
            transform: isDragging
              ? 'translateY(-50%) scale(1.15)'
              : 'translateY(-50%)',
            height: '20px',
            width: '20px',
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            border: '2px solid #2563EB',
            boxShadow: isDragging
              ? '0 0 0 4px rgba(37, 99, 235, 0.25), 0 2px 6px rgba(0, 0, 0, 0.15)'
              : '0 2px 5px rgba(0, 0, 0, 0.12), 0 0 0 2px rgba(37, 99, 235, 0.05)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            outline: 'none',
            cursor: isDragging ? 'grabbing' : 'grab',
            'anchor-name': anchorName,
          } as React.CSSProperties
        }
      />
    )
  }
}
