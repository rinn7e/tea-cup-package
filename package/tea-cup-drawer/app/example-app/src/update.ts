import { updateAndCmd } from '@rinn7e/tea-cup-prelude'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import * as ActionsDrawer from './component/actions-drawer'
import * as BasicDrawer from './component/basic-drawer'
import * as DirectionDrawer from './component/direction-drawer'
import * as FeedbackDrawer from './component/feedback-drawer'
import * as HandleOnlyDrawer from './component/handle-only-drawer'
import * as MeasuredSnapDrawer from './component/measured-snap-drawer'
import * as NonDismissibleDrawer from './component/non-dismissible-drawer'
import * as NonModalDrawer from './component/non-modal-drawer'
import * as PayloadDrawer from './component/payload-drawer'
import * as ScrollDrawer from './component/scroll-drawer'
import * as SkipAnimationDrawer from './component/skip-animation-drawer'
import * as SnapDrawer from './component/snap-drawer'
import * as SnapFullscreenDrawer from './component/snap-fullscreen-drawer'
import { type Model, type Msg } from './type'

export const init = (): [Model, Cmd<Msg>] => [
  {
    basicDrawer: BasicDrawer.defaultModel(),
    nonDismissibleDrawer: NonDismissibleDrawer.defaultModel(),
    snapDrawer: SnapDrawer.defaultModel(),
    snapFullscreenDrawer: SnapFullscreenDrawer.defaultModel(),
    topDrawer: DirectionDrawer.defaultModel('top'),
    leftDrawer: DirectionDrawer.defaultModel('left'),
    rightDrawer: DirectionDrawer.defaultModel('right'),
    scrollDrawer: ScrollDrawer.defaultModel(),
    nonModalDrawer: NonModalDrawer.defaultModel(),
    payloadDrawer: PayloadDrawer.defaultModel(),
    handleOnlyDrawer: HandleOnlyDrawer.defaultModel(),
    actionsDrawer: ActionsDrawer.defaultModel(),
    feedbackDrawer: FeedbackDrawer.defaultModel(),
    measuredSnapDrawer: MeasuredSnapDrawer.defaultModel(),
    skipAnimationDrawer: SkipAnimationDrawer.defaultModel(),
    openLog: [],
  },
  Cmd.none(),
]

const addLog =
  (entry: string) =>
  (model: Model): Model => ({ ...model, openLog: [entry, ...model.openLog] })

// Delegate to a child drawer component, then react like vaul's
// `onOpenChange`: the parent also notices closes the drawer decided itself
// (swipe, overlay) by comparing the child before and after.
const childDrawerHandler =
  <Child, ChildMsg>(child: {
    // Shown in the log
    name: string
    get: (model: Model) => Child
    set: (model: Model, value: Child) => Model
    update: (msg: ChildMsg, model: Child) => [Child, Cmd<ChildMsg>]
    isOpen: (model: Child) => boolean
    toMsg: (msg: ChildMsg) => Msg
    // Reaction to the child's message itself, before the open change
    intercept?: (msg: ChildMsg) => (model: Model) => Model
  }) =>
  (subMsg: ChildMsg) =>
  (model: Model): [Model, Cmd<Msg>] => {
    const before = child.get(model)
    const [after, cmd] = child.update(subMsg, before)
    return pipe(
      [child.set(model, after), cmd.map(child.toMsg)],
      updateAndCmd((m: Model): [Model, Cmd<Msg>] => [
        child.intercept ? child.intercept(subMsg)(m) : m,
        Cmd.none(),
      ]),
      updateAndCmd((m: Model): [Model, Cmd<Msg>] => {
        const wasOpen = child.isOpen(before)
        const isOpen = child.isOpen(after)
        if (wasOpen !== isOpen) {
          return [
            addLog(`${child.name} ${isOpen ? 'opened' : 'closed'}`)(m),
            Cmd.none(),
          ]
        } else {
          return [m, Cmd.none()]
        }
      }),
    )
  }

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'BasicDrawerMsg':
      return childDrawerHandler({
        name: 'basic',
        get: (m) => m.basicDrawer,
        set: (m, basicDrawer) => ({ ...m, basicDrawer }),
        update: BasicDrawer.update,
        isOpen: BasicDrawer.isOpen,
        toMsg: (subMsg): Msg => ({ _tag: 'BasicDrawerMsg', subMsg }),
      })(msg.subMsg)(model)
    case 'NonDismissibleDrawerMsg':
      return childDrawerHandler({
        name: 'nonDismissible',
        get: (m) => m.nonDismissibleDrawer,
        set: (m, nonDismissibleDrawer) => ({ ...m, nonDismissibleDrawer }),
        update: NonDismissibleDrawer.update,
        isOpen: NonDismissibleDrawer.isOpen,
        toMsg: (subMsg): Msg => ({ _tag: 'NonDismissibleDrawerMsg', subMsg }),
      })(msg.subMsg)(model)
    case 'SnapDrawerMsg':
      return childDrawerHandler({
        name: 'snap',
        get: (m) => m.snapDrawer,
        set: (m, snapDrawer) => ({ ...m, snapDrawer }),
        update: SnapDrawer.update,
        isOpen: SnapDrawer.isOpen,
        toMsg: (subMsg): Msg => ({ _tag: 'SnapDrawerMsg', subMsg }),
      })(msg.subMsg)(model)
    case 'SnapFullscreenDrawerMsg':
      return childDrawerHandler({
        name: 'snapFullscreen',
        get: (m) => m.snapFullscreenDrawer,
        set: (m, snapFullscreenDrawer) => ({ ...m, snapFullscreenDrawer }),
        update: SnapFullscreenDrawer.update,
        isOpen: SnapFullscreenDrawer.isOpen,
        toMsg: (subMsg): Msg => ({ _tag: 'SnapFullscreenDrawerMsg', subMsg }),
      })(msg.subMsg)(model)
    case 'TopDrawerMsg':
      return childDrawerHandler({
        name: 'top',
        get: (m) => m.topDrawer,
        set: (m, topDrawer) => ({ ...m, topDrawer }),
        update: DirectionDrawer.update,
        isOpen: DirectionDrawer.isOpen,
        toMsg: (subMsg): Msg => ({ _tag: 'TopDrawerMsg', subMsg }),
      })(msg.subMsg)(model)
    case 'LeftDrawerMsg':
      return childDrawerHandler({
        name: 'left',
        get: (m) => m.leftDrawer,
        set: (m, leftDrawer) => ({ ...m, leftDrawer }),
        update: DirectionDrawer.update,
        isOpen: DirectionDrawer.isOpen,
        toMsg: (subMsg): Msg => ({ _tag: 'LeftDrawerMsg', subMsg }),
      })(msg.subMsg)(model)
    case 'RightDrawerMsg':
      return childDrawerHandler({
        name: 'right',
        get: (m) => m.rightDrawer,
        set: (m, rightDrawer) => ({ ...m, rightDrawer }),
        update: DirectionDrawer.update,
        isOpen: DirectionDrawer.isOpen,
        toMsg: (subMsg): Msg => ({ _tag: 'RightDrawerMsg', subMsg }),
      })(msg.subMsg)(model)
    case 'ScrollDrawerMsg':
      return childDrawerHandler({
        name: 'scroll',
        get: (m) => m.scrollDrawer,
        set: (m, scrollDrawer) => ({ ...m, scrollDrawer }),
        update: ScrollDrawer.update,
        isOpen: ScrollDrawer.isOpen,
        toMsg: (subMsg): Msg => ({ _tag: 'ScrollDrawerMsg', subMsg }),
      })(msg.subMsg)(model)
    case 'NonModalDrawerMsg':
      return childDrawerHandler({
        name: 'nonModal',
        get: (m) => m.nonModalDrawer,
        set: (m, nonModalDrawer) => ({ ...m, nonModalDrawer }),
        update: NonModalDrawer.update,
        isOpen: NonModalDrawer.isOpen,
        toMsg: (subMsg): Msg => ({ _tag: 'NonModalDrawerMsg', subMsg }),
      })(msg.subMsg)(model)
    case 'PayloadDrawerMsg':
      return childDrawerHandler({
        name: 'payload',
        get: (m) => m.payloadDrawer,
        set: (m, payloadDrawer) => ({ ...m, payloadDrawer }),
        update: PayloadDrawer.update,
        isOpen: PayloadDrawer.isOpen,
        toMsg: (subMsg): Msg => ({ _tag: 'PayloadDrawerMsg', subMsg }),
      })(msg.subMsg)(model)
    case 'HandleOnlyDrawerMsg':
      return childDrawerHandler({
        name: 'handleOnly',
        get: (m) => m.handleOnlyDrawer,
        set: (m, handleOnlyDrawer) => ({ ...m, handleOnlyDrawer }),
        update: HandleOnlyDrawer.update,
        isOpen: HandleOnlyDrawer.isOpen,
        toMsg: (subMsg): Msg => ({ _tag: 'HandleOnlyDrawerMsg', subMsg }),
      })(msg.subMsg)(model)
    case 'ActionsDrawerMsg':
      return childDrawerHandler({
        name: 'actions',
        get: (m) => m.actionsDrawer,
        set: (m, actionsDrawer) => ({ ...m, actionsDrawer }),
        update: ActionsDrawer.update,
        isOpen: ActionsDrawer.isOpen,
        toMsg: (subMsg): Msg => ({ _tag: 'ActionsDrawerMsg', subMsg }),
        // The parent also sees what was picked in the menu (a grandchild
        // message), in the same step as the drawer closing
        intercept: (subMsg) => (m) => {
          if (
            subMsg._tag === 'DrawerMsg' &&
            subMsg.subMsg._tag === 'ContentMsg' &&
            subMsg.subMsg.msg._tag === 'ActionMenuMsg' &&
            subMsg.subMsg.msg.subMsg._tag === 'Pick'
          ) {
            return addLog(`moved to ${subMsg.subMsg.msg.subMsg.folder}`)(m)
          } else {
            return m
          }
        },
      })(msg.subMsg)(model)
    case 'FeedbackDrawerMsg':
      return childDrawerHandler({
        name: 'feedback',
        get: (m) => m.feedbackDrawer,
        set: (m, feedbackDrawer) => ({ ...m, feedbackDrawer }),
        update: FeedbackDrawer.update,
        isOpen: FeedbackDrawer.isOpen,
        toMsg: (subMsg): Msg => ({ _tag: 'FeedbackDrawerMsg', subMsg }),
      })(msg.subMsg)(model)
    case 'SkipAnimationDrawerMsg':
      return childDrawerHandler({
        name: 'skipAnimation',
        get: (m) => m.skipAnimationDrawer,
        set: (m, skipAnimationDrawer) => ({ ...m, skipAnimationDrawer }),
        update: SkipAnimationDrawer.update,
        isOpen: SkipAnimationDrawer.isOpen,
        toMsg: (subMsg): Msg => ({ _tag: 'SkipAnimationDrawerMsg', subMsg }),
      })(msg.subMsg)(model)
    case 'MeasuredSnapDrawerMsg':
      return childDrawerHandler({
        name: 'measuredSnap',
        get: (m) => m.measuredSnapDrawer,
        set: (m, measuredSnapDrawer) => ({ ...m, measuredSnapDrawer }),
        update: MeasuredSnapDrawer.update,
        isOpen: MeasuredSnapDrawer.isOpen,
        toMsg: (subMsg): Msg => ({ _tag: 'MeasuredSnapDrawerMsg', subMsg }),
      })(msg.subMsg)(model)
  }
}
