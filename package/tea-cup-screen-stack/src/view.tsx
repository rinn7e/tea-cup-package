/* MIT License

Copyright (c) 2026 Moremi Vannak

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
import { pipe } from 'fp-ts/lib/function'
import {
  type CSSProperties,
  type ReactNode,
  type TransitionEventHandler,
  useLayoutEffect,
  useRef,
} from 'react'

import { type Model } from './type'
import {
  type PanelRole,
  containerHeight,
  easing,
  panelOffsetPercent,
} from './util'

// The mechanics (positions, transforms, heights) are inline styles: they are
// dynamic, and the package ships no stylesheet. The screens style themselves.

export const containerStyle = <Item,>(model: Model<Item>): CSSProperties => {
  const transition = model.transition
  // Pinned at the start height (an interrupted transition snaps to it),
  // animated otherwise
  const isStart = transition._tag !== 'Idle' && transition.phase === 'Start'
  return {
    position: 'relative',
    overflow: 'hidden',
    height: pipe(
      containerHeight(model),
      O.fold(
        (): string => 'auto',
        (px) => `${px}px`,
      ),
    ),
    transition: isStart
      ? 'none'
      : `height ${model.config.durationMs}ms ${easing}`,
  }
}

export const panelStyle = <Item,>(
  model: Model<Item>,
  role: PanelRole,
): CSSProperties => {
  const transition = model.transition
  const offset = panelOffsetPercent(transition, role)
  const isRunning = transition._tag !== 'Idle' && transition.phase === 'Run'
  // The screen on show stays in the flow, so the container falls back to
  // its natural height; the outgoing one is laid over it
  const position: CSSProperties =
    role === 'Top'
      ? { position: 'relative' }
      : { position: 'absolute', top: 0, left: 0, right: 0 }
  return {
    ...position,
    transform: offset === 0 ? undefined : `translateX(${offset}%)`,
    transition: isRunning
      ? `transform ${model.config.durationMs}ms ${easing}`
      : 'none',
    // Programmatic focus target only
    outline: 'none',
  }
}

// A screen panel that reports its height whenever it changes. Measured in
// the view: a subscription would be created right after `update`, before
// React has mounted a newly pushed screen.
export const MeasuredPanel = ({
  id,
  index,
  role,
  knownHeight,
  onHeight,
  onTransitionEnd,
  style,
  children,
}: {
  id: string
  index: number
  role: PanelRole
  knownHeight: number | undefined
  onHeight: (height: number) => void
  onTransitionEnd: TransitionEventHandler<HTMLDivElement> | undefined
  style: CSSProperties
  children: ReactNode
}) => {
  const ref = useRef<HTMLDivElement>(null)
  // Read by the observer callback, which outlives this render
  const known = useRef(knownHeight)
  known.current = knownHeight
  const report = useRef(onHeight)
  report.current = onHeight

  useLayoutEffect(() => {
    const element = ref.current
    if (element === null) {
      return undefined
    } else {
      // Only report changes: reporting the same height would re-render,
      // re-observe and report again
      const measure = () => {
        const height = element.getBoundingClientRect().height
        if (height !== known.current) {
          known.current = height
          report.current(height)
        } else {
          // Unchanged
        }
      }
      // Measured before the first paint, so a pushed screen's height is
      // known when its transition starts
      measure()
      const observer = new ResizeObserver(measure)
      observer.observe(element)
      return () => observer.disconnect()
    }
  }, [index])

  return (
    <div
      ref={ref}
      id={id}
      tabIndex={-1}
      data-screen-depth={index}
      data-screen-role={role}
      aria-hidden={role === 'From' ? true : undefined}
      inert={role === 'From' ? true : undefined}
      style={style}
      onTransitionEnd={onTransitionEnd}
    >
      {children}
    </div>
  )
}
