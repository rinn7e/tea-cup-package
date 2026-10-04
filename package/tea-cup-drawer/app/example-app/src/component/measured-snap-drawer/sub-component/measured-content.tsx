import type * as Drawer from '@rinn7e/tea-cup-drawer'
import { DrawerHandle } from '@rinn7e/tea-cup-drawer/component'
import { useLayoutEffect, useRef } from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import { secondaryButtonClassName } from '../../../view/drawer-body'
import { type MeasuredContentMsg, type Summary, titleId } from '../type'

// Measures the compact part (handle, title and summary) and reports its
// height whenever it changes, so the parent can move the compact snap point.
//
// Not memoized: rendered inside `DrawerMemo`, which already skips renders
// when the drawer model didn't change.
export const MeasuredContent = ({
  summary,
  dispatch,
  drawerDispatch,
}: {
  summary: Summary
  dispatch: Dispatcher<MeasuredContentMsg>
  drawerDispatch: Dispatcher<Drawer.Msg<Summary, MeasuredContentMsg>>
}) => {
  const compactRef = useRef<HTMLDivElement>(null)
  // The latest dispatch, so the observer is created once
  const dispatchRef = useRef(dispatch)
  dispatchRef.current = dispatch

  useLayoutEffect(() => {
    const element = compactRef.current
    if (element === null) {
      return undefined
    } else {
      const observer = new ResizeObserver(() =>
        dispatchRef.current({
          _tag: 'Measured',
          px: Math.ceil(element.getBoundingClientRect().height),
        }),
      )
      observer.observe(element)
      return () => observer.disconnect()
    }
  }, [])

  return (
    <div
      data-test='content-measuredSnap'
      className='flex min-h-0 flex-1 flex-col'
    >
      <div ref={compactRef} data-test='compact-measuredSnap'>
        <DrawerHandle dispatch={drawerDispatch} />
        <div className='flex flex-col gap-2 px-6 pt-2 pb-4'>
          <h2 id={titleId} className='text-lg font-bold text-slate-900'>
            Measured snap point
          </h2>
          {Array.from({ length: summary.lines }, (_, i) => (
            <p key={i} className='text-sm text-slate-600'>
              Summary line {i + 1}
            </p>
          ))}
          <div className='flex gap-2'>
            <button
              type='button'
              data-test='add-line'
              className={secondaryButtonClassName}
              onClick={() => dispatch({ _tag: 'AddLine' })}
            >
              Add line
            </button>
            <button
              type='button'
              data-test='remove-line'
              className={secondaryButtonClassName}
              onClick={() => dispatch({ _tag: 'RemoveLine' })}
            >
              Remove line
            </button>
          </div>
        </div>
      </div>
      <div className='flex flex-col gap-3 border-t border-slate-200 px-6 pt-4 pb-8'>
        <p className='text-sm text-slate-600'>
          The compact snap point is the height of the part above, measured with
          a ResizeObserver and sent with `SetSnapPoints`. Add or remove lines
          and the drawer follows; drag up for full screen.
        </p>
        <button
          type='button'
          data-test='close-measuredSnap'
          className={secondaryButtonClassName}
          onClick={() => drawerDispatch({ _tag: 'Close' })}
        >
          Close
        </button>
      </div>
    </div>
  )
}
