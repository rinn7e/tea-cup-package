import * as O from 'fp-ts/lib/Option'
import { type Option } from 'fp-ts/lib/Option'
import { Cmd } from 'tea-cup-fp'

import { type RightSidebarParam } from '../../common/route/type'
import { type Model, type Msg } from './type'

export const init = (
  param: Option<RightSidebarParam> = O.none,
): [Model, Cmd<Msg>] => {
  let activeTab: Model['activeTab'] = 'members'
  let selectedMemberId: string | null = null

  if (O.isSome(param)) {
    if (param.value._tag === 'RoomDetail') {
      activeTab = param.value.tab
    } else if (param.value._tag === 'MemberProfile') {
      selectedMemberId = param.value.userId
    }
  }

  return [
    {
      activeTab,
      selectedMemberId,
    },
    Cmd.none(),
  ]
}

export const reInit = (
  param: Option<RightSidebarParam>,
  prevModel: Model,
): [Model, Cmd<Msg>] => {
  let activeTab = prevModel.activeTab
  let selectedMemberId = prevModel.selectedMemberId

  if (O.isSome(param)) {
    if (param.value._tag === 'RoomDetail') {
      activeTab = param.value.tab
    } else if (param.value._tag === 'MemberProfile') {
      selectedMemberId = param.value.userId
    }
  }

  return [
    {
      ...prevModel,
      activeTab,
      selectedMemberId,
    },
    Cmd.none(),
  ]
}

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'SetTab':
      return [{ ...model, activeTab: msg.tab }, Cmd.none()]

    case 'SelectMember':
      return [{ ...model, selectedMemberId: msg.userId }, Cmd.none()]
  }
}
