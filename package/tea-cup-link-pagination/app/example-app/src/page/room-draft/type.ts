import { type Room } from '../../api'

export type DraftItem = {
  readonly id: string
  readonly roomId: string
  readonly content: string
  readonly updatedAt: number
}

export type Model = {
  readonly roomId: string
  readonly draftContent: string
  readonly drafts: DraftItem[]
}

export type Msg =
  | { readonly _tag: 'UpdateDraftContent'; readonly text: string }
  | { readonly _tag: 'SaveDraft' }
  | { readonly _tag: 'SaveDraftSuccess'; readonly draft: DraftItem }
  | { readonly _tag: 'GetDraftsSuccess'; readonly drafts: DraftItem[] }
  | { readonly _tag: 'DeleteDraft'; readonly draftId: string }
  | { readonly _tag: 'SendDraft'; readonly draftId: string }
  | { readonly _tag: 'NoOp' }

export type Props = {
  readonly model: Model
  readonly room: Room | undefined
  readonly dispatch: (msg: Msg) => void
}
