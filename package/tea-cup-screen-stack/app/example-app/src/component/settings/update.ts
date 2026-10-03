import { updateAndCmd } from '@rinn7e/tea-cup-prelude'
import * as ScreenStack from '@rinn7e/tea-cup-screen-stack'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import { type Model, type Msg, type Page, type PageMsg } from './type'

// A page appears at most once in the tree, so its name is its key
const config = ScreenStack.defaultConfig('settings', (page: Page) => page)

export const defaultModel = (): Model => ({
  pages: ScreenStack.defaultModel<Page>(config, 'Settings'),
})

const withStack = ([pages, cmd]: [
  ScreenStack.Model<Page>,
  Cmd<ScreenStack.Msg<Page, PageMsg>>,
]): [Model, Cmd<Msg>] => [
  { pages },
  cmd.map((subMsg): Msg => ({ _tag: 'ScreenStackMsg', subMsg })),
]

// Intercepted page messages: every one moves the stack
const pageMsgHandler =
  (msg: PageMsg) =>
  (model: Model): [Model, Cmd<Msg>] => {
    switch (msg._tag) {
      case 'Go':
        return withStack(
          ScreenStack.pushHandler(msg.page)<PageMsg>(model.pages),
        )
      case 'Back':
        return withStack(ScreenStack.popHandler<Page, PageMsg>(model.pages))
      case 'Top':
        // To the root in one slide
        return withStack(
          ScreenStack.popToHandler(0)<Page, PageMsg>(model.pages),
        )
    }
  }

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'ScreenStackMsg': {
      const subMsg = msg.subMsg
      return pipe(
        withStack(ScreenStack.update(subMsg, model.pages)),
        updateAndCmd((m: Model): [Model, Cmd<Msg>] => {
          if (subMsg._tag === 'ScreenMsg') {
            return pageMsgHandler(subMsg.msg)(m)
          } else {
            return [m, Cmd.none()]
          }
        }),
      )
    }
  }
}
