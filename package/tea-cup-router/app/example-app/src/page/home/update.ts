import { Cmd, Task, Time } from 'tea-cup-fp'

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
        isFirstInitialized: false,
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
      isFirstInitialized: true,
    },
    Task.perform(
      Time.in(800),
      (): Msg => ({ _tag: 'SetIsFirstInitialized', value: false }),
    ),
  ]
}

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'Increment':
      return [{ ...model, counter: model.counter + 1 }, Cmd.none()]

    case 'ChangeNotes':
      return [{ ...model, notes: msg.notes }, Cmd.none()]

    // Partially handled by parent: updates local tab state, then parent intercepts to sync router route & URL
    case 'ChangeTab':
      return [{ ...model, tab: msg.tab, page: 1 }, Cmd.none()]

    // Partially handled by parent: updates local page state, then parent intercepts to sync router route & URL
    case 'ChangePage':
      return [{ ...model, page: msg.page }, Cmd.none()]

    // Purely handled by parent: parent intercepts to dispatch ChangeRoute with forceRefresh: true
    case 'ForceRefreshViaChangeRoute':
      return [model, Cmd.none()]

    case 'SetIsFirstInitialized':
      return [{ ...model, isFirstInitialized: msg.value }, Cmd.none()]

    // Purely handled by parent: parent intercepts to dispatch TeaRouter.modifyRoute
    case 'ModifyPageViaRouter':
      return [model, Cmd.none()]

    // Partially handled by parent: toggles local tab state, then parent intercepts to dispatch TeaRouter.modifyRouteNoReload
    case 'ModifyTabNoReloadViaRouter': {
      const nextTab: HomeTab = model.tab === 'tag' ? 'global' : 'tag'
      return [{ ...model, tab: nextTab }, Cmd.none()]
    }

    // Purely handled by parent: parent intercepts to dispatch TeaRouter.modifyRouteUrlNoReload
    case 'ModifyUrlNoReloadViaRouter':
      return [model, Cmd.none()]

    // Purely handled by parent: parent intercepts to dispatch TeaRouter.refresh
    case 'RefreshViaRouter':
      return [model, Cmd.none()]
  }
}
