import * as Drawer from '@rinn7e/tea-cup-drawer'
import { DrawerComponent, DrawerHandle } from '@rinn7e/tea-cup-drawer/component'
import { cn } from '@rinn7e/tea-cup-prelude'
import { type ReactNode } from 'react'
import { type Dispatcher, map } from 'tea-cup-fp'

import { type DemoKey, type Model, type Msg } from './type'

const fruits = ['Apple', 'Banana', 'Cherry']

const buttonClassName =
  'rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700'

const secondaryButtonClassName =
  'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100'

// Shared content layout: handle, title, description and actions
const drawerBody = (args: {
  key: DemoKey
  dispatch: Dispatcher<Drawer.Msg<string>>
  title: string
  description: string
  children?: ReactNode
}) => (
  <div
    data-test={`content-${args.key}`}
    className='flex min-h-0 flex-1 flex-col'
  >
    <DrawerHandle dispatch={args.dispatch} />
    <div className='flex min-h-0 flex-1 flex-col gap-3 px-6 pt-2 pb-8'>
      <h2 className='text-lg font-bold text-slate-900'>{args.title}</h2>
      <p className='text-sm text-slate-600'>{args.description}</p>
      {args.children}
      <div className='flex gap-2'>
        <button
          type='button'
          data-test={`close-${args.key}`}
          className={secondaryButtonClassName}
          onClick={() => args.dispatch({ _tag: 'Close' })}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)

// Content and drawer class names per scenario
const drawerContent = (
  key: DemoKey,
  model: Drawer.Model<string>,
  dispatch: Dispatcher<Drawer.Msg<string>>,
  internal: string,
): ReactNode => {
  switch (key) {
    case 'basic':
      return drawerBody({
        key,
        dispatch,
        title: 'Basic drawer',
        description:
          'Drag it down, tap the overlay or press Escape to close it.',
      })
    case 'nonDismissible':
      return drawerBody({
        key,
        dispatch,
        title: 'Non-dismissible',
        description:
          'Overlay taps, Escape and swipes are ignored; only the button closes it.',
        children: (
          <button
            type='button'
            data-test='dismiss-button'
            className={buttonClassName}
            onClick={() => dispatch({ _tag: 'Close' })}
          >
            Dismiss
          </button>
        ),
      })
    case 'snap':
      return drawerBody({
        key,
        dispatch,
        title: 'Snap points',
        description:
          'Rests at 148px, 50% or 100%. Drag between them or tap the handle.',
        children: (
          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-sm text-slate-600'>
              Active snap:{' '}
              <span data-test='active-snap-index' className='font-bold'>
                {model.activeSnap}
              </span>
            </span>
            {[0, 1, 2].map((index) => (
              <button
                key={index}
                type='button'
                data-test={`set-snap-${index}`}
                className={secondaryButtonClassName}
                onClick={() => dispatch({ _tag: 'SetSnap', index })}
              >
                Snap {index}
              </button>
            ))}
          </div>
        ),
      })
    case 'snapFullscreen':
      return drawerBody({
        key,
        dispatch,
        title: 'Snap to full screen',
        description:
          'Starts as a short sheet. Drag it up or tap the handle to go full screen; drag down or tap the overlay to close.',
        children: (
          <>
            <span className='text-sm text-slate-600'>
              Active snap:{' '}
              <span data-test='fullscreen-snap-index' className='font-bold'>
                {model.activeSnap}
              </span>
            </span>
            <div className='flex flex-col gap-3 text-sm text-slate-600'>
              {Array.from({ length: 12 }, (_, i) => (
                <p key={i}>
                  Paragraph {i + 1}: only visible once the drawer is expanded.
                </p>
              ))}
            </div>
          </>
        ),
      })
    case 'top':
    case 'left':
    case 'right':
      return drawerBody({
        key,
        dispatch,
        title: `From the ${key}`,
        description: `Swipe it ${key === 'top' ? 'up' : key} to close.`,
      })
    case 'scroll':
      return drawerBody({
        key,
        dispatch,
        title: 'Scrollable content',
        description:
          'Scrolled content scrolls back first; only at the top does a swipe drag the drawer.',
        children: (
          <ul
            data-test='scroll-area'
            className='max-h-[40dvh] overflow-y-auto rounded-lg border border-slate-200'
          >
            {Array.from({ length: 60 }, (_, i) => (
              <li
                key={i}
                className='border-b border-slate-100 px-4 py-3 text-sm last:border-b-0'
              >
                Item {i + 1}
              </li>
            ))}
          </ul>
        ),
      })
    case 'nonModal':
      return drawerBody({
        key,
        dispatch,
        title: 'Non-modal sheet',
        description:
          'No overlay: the page behind stays interactive. Drag it up to expand.',
        children: (
          <span className='text-sm text-slate-600'>
            Active snap:{' '}
            <span data-test='non-modal-snap-index' className='font-bold'>
              {model.activeSnap}
            </span>
          </span>
        ),
      })
    case 'payload':
      return drawerBody({
        key,
        dispatch,
        title: 'Payload',
        description:
          'The drawer keeps the payload it was opened with until it has fully slid away.',
        children: (
          <p className='text-2xl font-bold'>
            <span data-test='payload-text'>{internal}</span>
          </p>
        ),
      })
    case 'handleOnly':
      return drawerBody({
        key,
        dispatch,
        title: 'Handle only',
        description: 'Only the handle at the top starts a drag.',
      })
  }
}

const drawerClassName = (key: DemoKey): string | undefined => {
  switch (key) {
    case 'snap':
    case 'nonModal':
      // Snap points need the drawer to span the whole screen
      return 'h-full max-h-[97%] border-t border-slate-200'
    case 'snapFullscreen':
      // Full height so the last snap point covers the whole screen
      return 'h-full max-h-none'
    case 'top':
      return 'min-h-[40dvh]'
    case 'basic':
    case 'nonDismissible':
    case 'left':
    case 'right':
    case 'scroll':
    case 'payload':
    case 'handleOnly':
      return undefined
  }
}

const demoCard = (args: {
  key: DemoKey
  title: string
  description: string
  children: ReactNode
  model: Model
}) => (
  <div
    key={args.key}
    className='flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200'
  >
    <div className='flex items-center justify-between gap-2'>
      <h2 className='font-bold text-slate-900'>{args.title}</h2>
      <span
        data-test={`state-${args.key}`}
        className='rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600'
      >
        {args.model.drawers[args.key].animate._tag}
      </span>
    </div>
    <p className='text-sm text-slate-600'>{args.description}</p>
    <div className='flex flex-wrap gap-2'>{args.children}</div>
  </div>
)

const openButton = (
  key: DemoKey,
  dispatch: Dispatcher<Msg>,
  label: string = 'Open',
  internal: string = key,
) => (
  <button
    type='button'
    data-test={`trigger-${key}`}
    className={buttonClassName}
    onClick={() =>
      dispatch({ _tag: 'DrawerMsg', key, subMsg: { _tag: 'Open', internal } })
    }
  >
    {label}
  </button>
)

export const view = (dispatch: Dispatcher<Msg>, model: Model) => {
  const drawerDispatch = (key: DemoKey) =>
    map(
      dispatch,
      (subMsg: Drawer.Msg<string>): Msg => ({
        _tag: 'DrawerMsg',
        key,
        subMsg,
      }),
    )

  const cards: { key: DemoKey; title: string; description: string }[] = [
    {
      key: 'basic',
      title: 'Basic',
      description: 'Bottom sheet with an overlay.',
    },
    {
      key: 'nonDismissible',
      title: 'Non-dismissible',
      description: 'Only a programmatic Close works.',
    },
    {
      key: 'snap',
      title: 'Snap points',
      description: 'Three resting positions, opens at 50%.',
    },
    {
      key: 'snapFullscreen',
      title: 'Snap to full screen',
      description: 'Starts like Basic, drag up to go full screen.',
    },
    { key: 'top', title: 'Top', description: 'Slides from the top edge.' },
    { key: 'left', title: 'Left', description: 'Side panel on the left.' },
    { key: 'right', title: 'Right', description: 'Side panel on the right.' },
    {
      key: 'scroll',
      title: 'Scrollable',
      description: 'Long content inside the drawer.',
    },
    {
      key: 'handleOnly',
      title: 'Handle only',
      description: 'Dragging starts from the handle.',
    },
  ]

  return (
    <div className='h-full'>
      {/* The page scrolls inside this container, not the body: its scrollbar
          stays visible, and the drawers' body scroll lock never shifts it */}
      <div
        data-test='page-scroll'
        className='h-full overflow-y-scroll px-6 py-12 pb-48'
      >
        <div className='mx-auto flex max-w-4xl flex-col gap-8'>
          <div className='text-center'>
            <h1 className='text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl'>
              TeaCup Drawer Kitchen Sink
            </h1>
            <p className='mt-3 text-lg text-slate-600'>
              vaul, rebuilt as a TEA component: every animation phase is a state
              in the model.
            </p>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            {cards.map((card) =>
              demoCard({
                ...card,
                model,
                children: openButton(card.key, dispatch),
              }),
            )}

            {demoCard({
              key: 'payload',
              title: 'Payload',
              description: 'Open the same drawer with different data.',
              model,
              children: fruits.map((fruit) => (
                <button
                  key={fruit}
                  type='button'
                  data-test={`fruit-${fruit}`}
                  className={secondaryButtonClassName}
                  onClick={() =>
                    dispatch({
                      _tag: 'DrawerMsg',
                      key: 'payload',
                      subMsg: { _tag: 'Open', internal: fruit },
                    })
                  }
                >
                  {fruit}
                </button>
              )),
            })}

            {demoCard({
              key: 'nonModal',
              title: 'Non-modal',
              description: 'Persistent sheet; the page stays interactive.',
              model,
              children: (
                <>
                  {openButton('nonModal', dispatch, 'Show')}
                  <button
                    type='button'
                    data-test='hide-nonModal'
                    className={secondaryButtonClassName}
                    onClick={() =>
                      dispatch({
                        _tag: 'DrawerMsg',
                        key: 'nonModal',
                        subMsg: { _tag: 'Close' },
                      })
                    }
                  >
                    Hide
                  </button>
                </>
              ),
            })}
          </div>

          <div className='rounded-2xl bg-slate-900 p-5 text-sm text-emerald-400 shadow-sm'>
            <h2 className='mb-2 text-xs font-bold tracking-widest text-slate-400 uppercase'>
              Open changes seen by the parent
            </h2>
            <ul data-test='open-log' className='font-mono'>
              {model.openLog.map((entry, i) => (
                <li key={i}>{entry}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {Object.entries(model.drawers).map(([k, drawer]) => {
        const key = k as DemoKey
        const dispatchDrawer = drawerDispatch(key)
        return (
          <DrawerComponent
            key={key}
            model={drawer}
            dispatch={dispatchDrawer}
            className={cn(drawerClassName(key))}
          >
            {(internal) => drawerContent(key, drawer, dispatchDrawer, internal)}
          </DrawerComponent>
        )
      })}
    </div>
  )
}
