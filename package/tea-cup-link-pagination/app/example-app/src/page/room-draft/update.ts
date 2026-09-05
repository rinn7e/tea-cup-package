import { attemptTE } from '@rinn7e/tea-cup-prelude'
import { Cmd } from 'tea-cup-fp'

import * as Api from '../../api'
import { type Model, type Msg } from './type'

export const init = (roomId: string): [Model, Cmd<Msg>] => {
  const model: Model = {
    roomId,
    draftContent: '',
    drafts: [],
  }

  return [
    model,
    attemptTE(Api.getDrafts(roomId), (result): Msg => {
      if (result.tag === 'Ok') {
        return { _tag: 'GetDraftsSuccess', drafts: result.value }
      }
      return { _tag: 'NoOp' }
    }),
  ]
}

export const reInit = (roomId: string, oldModel: Model): [Model, Cmd<Msg>] => {
  if (oldModel.roomId === roomId) {
    return [oldModel, Cmd.none()]
  }
  return init(roomId)
}

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'NoOp':
      return [model, Cmd.none()]

    case 'GetDraftsSuccess':
      return [{ ...model, drafts: msg.drafts }, Cmd.none()]

    case 'UpdateDraftContent':
      return [{ ...model, draftContent: msg.text }, Cmd.none()]

    case 'SaveDraft': {
      const content = model.draftContent.trim()
      if (!content) return [model, Cmd.none()]

      return [
        { ...model, draftContent: '' },
        attemptTE(Api.saveDraft(model.roomId, content), (result): Msg => {
          if (result.tag === 'Ok') {
            return { _tag: 'SaveDraftSuccess', draft: result.value }
          }
          return { _tag: 'NoOp' }
        }),
      ]
    }

    case 'SaveDraftSuccess':
      return [{ ...model, drafts: [msg.draft, ...model.drafts] }, Cmd.none()]

    case 'DeleteDraft': {
      return [
        {
          ...model,
          drafts: model.drafts.filter((d) => d.id !== msg.draftId),
        },
        attemptTE(
          Api.deleteDraft(model.roomId, msg.draftId),
          (): Msg => ({ _tag: 'NoOp' }),
        ),
      ]
    }

    case 'SendDraft': {
      const targetDraft = model.drafts.find((d) => d.id === msg.draftId)
      if (!targetDraft) return [model, Cmd.none()]

      return [
        {
          ...model,
          drafts: model.drafts.filter((d) => d.id !== msg.draftId),
        },
        Cmd.batch([
          attemptTE(
            Api.deleteDraft(model.roomId, msg.draftId),
            (): Msg => ({ _tag: 'NoOp' }),
          ),
          attemptTE(
            Api.sendChat({
              roomId: model.roomId,
              content: targetDraft.content,
              authorId: 'user-master',
            }),
            (): Msg => ({ _tag: 'NoOp' }),
          ),
        ]),
      ]
    }
  }
}
