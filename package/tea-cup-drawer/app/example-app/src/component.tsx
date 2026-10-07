import { type ReactNode } from 'react'
import { type Dispatcher, map } from 'tea-cup-fp'

import { ActionsDrawer } from './component/actions-drawer/component'
import { BasicDrawer } from './component/basic-drawer/component'
import { DirectionDrawer } from './component/direction-drawer/component'
import { FeedbackDrawer } from './component/feedback-drawer/component'
import { HandleOnlyDrawer } from './component/handle-only-drawer/component'
import { MeasuredSnapDrawer } from './component/measured-snap-drawer/component'
import { NestedDrawer } from './component/nested-drawer/component'
import { NonDismissibleDrawer } from './component/non-dismissible-drawer/component'
import { NonModalDrawer } from './component/non-modal-drawer/component'
import { PayloadDrawer } from './component/payload-drawer/component'
import { ScrollDrawer } from './component/scroll-drawer/component'
import { ScrollXDrawer } from './component/scroll-x-drawer/component'
import { SkipAnimationDrawer } from './component/skip-animation-drawer/component'
import { SnapDrawer } from './component/snap-drawer/component'
import { SnapFullscreenDrawer } from './component/snap-fullscreen-drawer/component'
import { type Model, type Msg } from './type'
import { buttonClassName, secondaryButtonClassName } from './view/drawer-body'

const fruits = ['Apple', 'Banana', 'Cherry']

const demoCard = (args: {
  // The drawer's config id, used for the `data-test` ids
  id: string
  title: string
  description: string
  // The drawer's animation state
  state: string
  // The states of other drawers in the demo (e.g. one shown inside it)
  extraStates?: { id: string; state: string }[]
  children: ReactNode
}) => (
  <div
    key={args.id}
    className='flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200'
  >
    <div className='flex items-center justify-between gap-2'>
      <h2 className='font-bold text-slate-900'>{args.title}</h2>
      <span
        data-test={`state-${args.id}`}
        className='rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600'
      >
        {args.state}
      </span>
      {(args.extraStates ?? []).map((extra) => (
        <span
          key={extra.id}
          data-test={`state-${extra.id}`}
          className='rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600'
        >
          {extra.state}
        </span>
      ))}
    </div>
    <p className='text-sm text-slate-600'>{args.description}</p>
    <div className='flex flex-wrap gap-2'>{args.children}</div>
  </div>
)

const openButton = (args: {
  id: string
  onClick: () => void
  label?: string
}) => (
  <button
    type='button'
    data-test={`trigger-${args.id}`}
    className={buttonClassName}
    onClick={args.onClick}
  >
    {args.label ?? 'Open'}
  </button>
)

export const view = (dispatch: Dispatcher<Msg>, model: Model) => {
  // Every simple demo is opened with its own `Open` message
  const simpleCards: {
    id: string
    title: string
    description: string
    state: string
    extraStates?: { id: string; state: string }[]
    open: Msg
  }[] = [
    {
      id: 'basic',
      title: 'Basic',
      description: 'Bottom sheet with an overlay.',
      state: model.basicDrawer.drawer.animate._tag,
      open: { _tag: 'BasicDrawerMsg', subMsg: { _tag: 'Open' } },
    },
    {
      id: 'nonDismissible',
      title: 'Non-dismissible',
      description: 'Only a programmatic Close works.',
      state: model.nonDismissibleDrawer.drawer.animate._tag,
      open: { _tag: 'NonDismissibleDrawerMsg', subMsg: { _tag: 'Open' } },
    },
    {
      id: 'snap',
      title: 'Snap points',
      description: 'Three resting positions, opens at 50%.',
      state: model.snapDrawer.drawer.animate._tag,
      open: { _tag: 'SnapDrawerMsg', subMsg: { _tag: 'Open' } },
    },
    {
      id: 'snapFullscreen',
      title: 'Snap to full screen',
      description: 'Starts like Basic, drag up to go full screen.',
      state: model.snapFullscreenDrawer.drawer.animate._tag,
      open: { _tag: 'SnapFullscreenDrawerMsg', subMsg: { _tag: 'Open' } },
    },
    {
      id: 'top',
      title: 'Top',
      description: 'Slides from the top edge.',
      state: model.topDrawer.drawer.animate._tag,
      open: { _tag: 'TopDrawerMsg', subMsg: { _tag: 'Open' } },
    },
    {
      id: 'left',
      title: 'Left',
      description: 'Side panel on the left.',
      state: model.leftDrawer.drawer.animate._tag,
      open: { _tag: 'LeftDrawerMsg', subMsg: { _tag: 'Open' } },
    },
    {
      id: 'right',
      title: 'Right',
      description: 'Side panel on the right.',
      state: model.rightDrawer.drawer.animate._tag,
      open: { _tag: 'RightDrawerMsg', subMsg: { _tag: 'Open' } },
    },
    {
      id: 'scroll',
      title: 'Scrollable',
      description: 'Long content inside the drawer.',
      state: model.scrollDrawer.drawer.animate._tag,
      open: { _tag: 'ScrollDrawerMsg', subMsg: { _tag: 'Open' } },
    },
    {
      id: 'scrollX',
      title: 'Sideways content',
      description:
        'A right drawer with a wide table: swipes on the table scroll it, never the drawer.',
      state: model.scrollXDrawer.drawer.animate._tag,
      open: { _tag: 'ScrollXDrawerMsg', subMsg: { _tag: 'Open' } },
    },
    {
      id: 'nested',
      title: 'Nested drawer',
      description:
        'A right drawer with a bottom sheet inside it: each keeps its own handle.',
      state: model.nestedDrawer.page.animate._tag,
      extraStates: [
        {
          id: 'nestedSheet',
          state: model.nestedDrawer.sheet.animate._tag,
        },
      ],
      open: { _tag: 'NestedDrawerMsg', subMsg: { _tag: 'Open' } },
    },
    {
      id: 'handleOnly',
      title: 'Handle only',
      description: 'Dragging starts from the handle.',
      state: model.handleOnlyDrawer.drawer.animate._tag,
      open: { _tag: 'HandleOnlyDrawerMsg', subMsg: { _tag: 'Open' } },
    },
    {
      id: 'measuredSnap',
      title: 'Measured snap point',
      description: 'The compact point follows the content height.',
      state: model.measuredSnapDrawer.drawer.animate._tag,
      open: { _tag: 'MeasuredSnapDrawerMsg', subMsg: { _tag: 'Open' } },
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
            {simpleCards.map((card) =>
              demoCard({
                ...card,
                children: openButton({
                  id: card.id,
                  onClick: () => dispatch(card.open),
                }),
              }),
            )}

            {demoCard({
              id: 'payload',
              title: 'Payload',
              description: 'Open the same drawer with different data.',
              state: model.payloadDrawer.drawer.animate._tag,
              children: fruits.map((fruit) => (
                <button
                  key={fruit}
                  type='button'
                  data-test={`fruit-${fruit}`}
                  className={secondaryButtonClassName}
                  onClick={() =>
                    dispatch({
                      _tag: 'PayloadDrawerMsg',
                      subMsg: { _tag: 'Open', fruit },
                    })
                  }
                >
                  {fruit}
                </button>
              )),
            })}

            {demoCard({
              id: 'nonModal',
              title: 'Non-modal',
              description: 'Persistent sheet; the page stays interactive.',
              state: model.nonModalDrawer.drawer.animate._tag,
              children: (
                <>
                  {openButton({
                    id: 'nonModal',
                    label: 'Show',
                    onClick: () =>
                      dispatch({
                        _tag: 'NonModalDrawerMsg',
                        subMsg: { _tag: 'Open' },
                      }),
                  })}
                  <button
                    type='button'
                    data-test='hide-nonModal'
                    className={secondaryButtonClassName}
                    onClick={() =>
                      dispatch({
                        _tag: 'NonModalDrawerMsg',
                        subMsg: {
                          _tag: 'DrawerMsg',
                          subMsg: { _tag: 'Close' },
                        },
                      })
                    }
                  >
                    Hide
                  </button>
                </>
              ),
            })}

            {demoCard({
              id: 'actions',
              title: 'TEA content',
              description:
                'A TEA menu in the payload, keyed by its message (resets on open), and a draft outside it (kept on close).',
              state: model.actionsDrawer.drawer.animate._tag,
              children: (
                <>
                  {openButton({
                    id: 'actions',
                    label: 'Message A',
                    onClick: () =>
                      dispatch({
                        _tag: 'ActionsDrawerMsg',
                        subMsg: { _tag: 'Open', messageId: 'A' },
                      }),
                  })}
                  {openButton({
                    id: 'actions-b',
                    label: 'Message B',
                    onClick: () =>
                      dispatch({
                        _tag: 'ActionsDrawerMsg',
                        subMsg: { _tag: 'Open', messageId: 'B' },
                      }),
                  })}
                </>
              ),
            })}

            {demoCard({
              id: 'skipAnimation',
              title: 'Skip animation',
              description:
                'A page from the right. "Open at once" shows it without sliding in (`skipAnimation`), e.g. for a page an app restores on load; "Open" slides it in.',
              state: model.skipAnimationDrawer.drawer.animate._tag,
              children: (
                <>
                  {openButton({
                    id: 'skipAnimation',
                    onClick: () =>
                      dispatch({
                        _tag: 'SkipAnimationDrawerMsg',
                        subMsg: { _tag: 'Open' },
                      }),
                  })}
                  <button
                    type='button'
                    data-test='trigger-skipAnimation-at-once'
                    className={secondaryButtonClassName}
                    onClick={() =>
                      dispatch({
                        _tag: 'SkipAnimationDrawerMsg',
                        subMsg: { _tag: 'OpenAtOnce' },
                      })
                    }
                  >
                    Open at once
                  </button>
                </>
              ),
            })}

            {demoCard({
              id: 'feedback',
              title: 'Side by side',
              description:
                'No payload: the form lives next to the drawer (via `parent`), so it survives closing and is cleared only once fully closed.',
              state: model.feedbackDrawer.drawer.animate._tag,
              children: (
                <>
                  <p className='w-full text-sm text-slate-600'>
                    Last sent:{' '}
                    <span
                      data-test='feedback-last-sent'
                      className='font-semibold'
                    >
                      {model.feedbackDrawer.lastFeedback ?? '—'}
                    </span>
                  </p>
                  {openButton({
                    id: 'feedback',
                    onClick: () =>
                      dispatch({
                        _tag: 'FeedbackDrawerMsg',
                        subMsg: { _tag: 'Open' },
                      }),
                  })}
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

      <BasicDrawer
        model={model.basicDrawer}
        dispatch={map(
          dispatch,
          (subMsg): Msg => ({ _tag: 'BasicDrawerMsg', subMsg }),
        )}
      />
      <NonDismissibleDrawer
        model={model.nonDismissibleDrawer}
        dispatch={map(
          dispatch,
          (subMsg): Msg => ({ _tag: 'NonDismissibleDrawerMsg', subMsg }),
        )}
      />
      <SnapDrawer
        model={model.snapDrawer}
        dispatch={map(
          dispatch,
          (subMsg): Msg => ({ _tag: 'SnapDrawerMsg', subMsg }),
        )}
      />
      <SnapFullscreenDrawer
        model={model.snapFullscreenDrawer}
        dispatch={map(
          dispatch,
          (subMsg): Msg => ({ _tag: 'SnapFullscreenDrawerMsg', subMsg }),
        )}
      />
      <DirectionDrawer
        model={model.topDrawer}
        dispatch={map(
          dispatch,
          (subMsg): Msg => ({ _tag: 'TopDrawerMsg', subMsg }),
        )}
      />
      <DirectionDrawer
        model={model.leftDrawer}
        dispatch={map(
          dispatch,
          (subMsg): Msg => ({ _tag: 'LeftDrawerMsg', subMsg }),
        )}
      />
      <DirectionDrawer
        model={model.rightDrawer}
        dispatch={map(
          dispatch,
          (subMsg): Msg => ({ _tag: 'RightDrawerMsg', subMsg }),
        )}
      />
      <ScrollDrawer
        model={model.scrollDrawer}
        dispatch={map(
          dispatch,
          (subMsg): Msg => ({ _tag: 'ScrollDrawerMsg', subMsg }),
        )}
      />
      <ScrollXDrawer
        model={model.scrollXDrawer}
        dispatch={map(
          dispatch,
          (subMsg): Msg => ({ _tag: 'ScrollXDrawerMsg', subMsg }),
        )}
      />
      <NestedDrawer
        model={model.nestedDrawer}
        dispatch={map(
          dispatch,
          (subMsg): Msg => ({ _tag: 'NestedDrawerMsg', subMsg }),
        )}
      />
      <NonModalDrawer
        model={model.nonModalDrawer}
        dispatch={map(
          dispatch,
          (subMsg): Msg => ({ _tag: 'NonModalDrawerMsg', subMsg }),
        )}
      />
      <PayloadDrawer
        model={model.payloadDrawer}
        dispatch={map(
          dispatch,
          (subMsg): Msg => ({ _tag: 'PayloadDrawerMsg', subMsg }),
        )}
      />
      <HandleOnlyDrawer
        model={model.handleOnlyDrawer}
        dispatch={map(
          dispatch,
          (subMsg): Msg => ({ _tag: 'HandleOnlyDrawerMsg', subMsg }),
        )}
      />
      <ActionsDrawer
        model={model.actionsDrawer}
        dispatch={map(
          dispatch,
          (subMsg): Msg => ({ _tag: 'ActionsDrawerMsg', subMsg }),
        )}
      />
      <FeedbackDrawer
        model={model.feedbackDrawer}
        dispatch={map(
          dispatch,
          (subMsg): Msg => ({ _tag: 'FeedbackDrawerMsg', subMsg }),
        )}
      />
      <MeasuredSnapDrawer
        model={model.measuredSnapDrawer}
        dispatch={map(
          dispatch,
          (subMsg): Msg => ({ _tag: 'MeasuredSnapDrawerMsg', subMsg }),
        )}
      />
      <SkipAnimationDrawer
        model={model.skipAnimationDrawer}
        dispatch={map(
          dispatch,
          (subMsg): Msg => ({ _tag: 'SkipAnimationDrawerMsg', subMsg }),
        )}
      />
    </div>
  )
}
