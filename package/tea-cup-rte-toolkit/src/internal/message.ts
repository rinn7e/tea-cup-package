import { Option } from 'fp-ts/lib/Option'

import { Selection } from '../model/selection'
import {
  EditorChange,
  InitEvent,
  InputEvent,
  KeyboardEvent,
  PasteEvent,
} from './event'

export type Message =
  | {
      readonly _tag: 'SelectionEvent'
      readonly selection: Option<Selection>
      readonly force: boolean
    }
  | { readonly _tag: 'ChangeEvent'; readonly change: EditorChange }
  | { readonly _tag: 'BeforeInputEvent'; readonly event: InputEvent }
  | { readonly _tag: 'KeyDownEvent'; readonly event: KeyboardEvent }
  | { readonly _tag: 'CompositionStart' }
  | { readonly _tag: 'CompositionEnd' }
  | { readonly _tag: 'PasteWithDataEvent'; readonly event: PasteEvent }
  | { readonly _tag: 'CutEvent' }
  | { readonly _tag: 'Init'; readonly event: InitEvent }

export type Tagger<Msg> = (message: Message) => Msg
