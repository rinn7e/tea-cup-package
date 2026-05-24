import { Option } from 'fp-ts/lib/Option'

import { Path } from '../model/node'
import { Selection } from '../model/selection'
import { DomNode } from './dom-node'

/**
 * Whenever the elm-editor MutationObserver detects a change, it triggers an editor change event
 * that the editor has to respond to. Note that it's important for the editor to respond to every
 * change event so that the VirtualDOM doesn't try to render when the DOM is not in the state that
 * it's expecting.
 */
export interface EditorChange {
  readonly root: DomNode
  readonly selection: Option<Selection>
  readonly characterDataMutations: Option<Array<TextChange>>
  readonly timestamp: number
  readonly isComposing: boolean
}

/**
 * The attributes parsed from an input event.
 */
export interface InputEvent {
  readonly data: Option<string>
  readonly isComposing: boolean
  readonly inputType: string
}

/**
 * The attributes parsed from a keyboard event.
 */
export interface KeyboardEvent {
  readonly keyCode: number
  readonly key: string
  readonly altKey: boolean
  readonly metaKey: boolean
  readonly ctrlKey: boolean
  readonly shiftKey: boolean
  readonly isComposing: boolean
}

/**
 * The attributes parsed from a `pastewithdata` event.
 */
export interface PasteEvent {
  readonly text: string
  readonly html: string
}

/**
 * The attributes parsed from an `editorinit` event.
 */
export interface InitEvent {
  readonly shortKey: string
}

/**
 * A represents a text change at the given path in an editor node or DOM tree. The string provided
 * is the new text at that path.
 */
export type TextChange = [Path, string]
