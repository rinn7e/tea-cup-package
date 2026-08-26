import { Cmd } from 'tea-cup-fp'

import type { HomeTab } from '@/common/route'

import type { Model, Msg } from './type'

export const init = (
  route: { readonly tab: HomeTab; readonly page: number },
  prevModel?: Model,
): [Model, Cmd<Msg>] => {
  if (prevModel) {
    return [
      {
        ...prevModel,
        tab: route.tab,
        page: route.page,
      },
      Cmd.none(),
    ]
  }

  return [
    {
      tab: route.tab,
      page: route.page,
      counter: 0,
      notes: '',
    },
    Cmd.none(),
  ]
}

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'Increment':
      return [{ ...model, counter: model.counter + 1 }, Cmd.none()]

    case 'ChangeNotes':
      return [{ ...model, notes: msg.notes }, Cmd.none()]

    case 'ChangeTab':
      return [{ ...model, tab: msg.tab, page: 1 }, Cmd.none()]

    case 'ChangePage':
      return [{ ...model, page: msg.page }, Cmd.none()]
  }
}
