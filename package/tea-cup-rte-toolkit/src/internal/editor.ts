import { Either, left, right } from 'fp-ts/lib/Either'
import { Option, none, some } from 'fp-ts/lib/Option'

import { NamedCommand, NamedCommandList } from '../config/command'
import { meta } from '../config/keys'
import { Spec } from '../config/spec'
import { Mark } from '../model/mark'
import { Block } from '../model/node'
import { Selection } from '../model/selection'
import { State } from '../model/state'
import { reduce, validate } from '../model/state'
import {
  EditorChange,
  InitEvent,
  InputEvent,
  KeyboardEvent,
  PasteEvent,
} from './event'
import { BoundedDeque, History, contents, empty, fromContents } from './history'

export type Tagger<Msg> = (msg: Message) => Msg

export interface EditorContents {
  readonly state: State
  readonly renderCount: number
  readonly selectionCount: number
  readonly shortKey: string
  readonly completeRerenderCount: number
  readonly isComposing: boolean
  readonly bufferedEditorState: Option<State>
  readonly history: History
  readonly changeCount: number
}

/**
 * Represents a rich text editor. The state of the editor, along with render information,
 * tagger function, and command map.
 */
export type Editor = {
  readonly _tag: 'Editor'
  readonly contents: EditorContents
}

export const defaultDequeSize = 64

export function editor(iState: State): Editor {
  return {
    _tag: 'Editor',
    contents: {
      renderCount: 0,
      bufferedEditorState: none,
      completeRerenderCount: 0,
      selectionCount: 0,
      shortKey: meta,
      isComposing: false,
      state: iState,
      history: empty({ size: defaultDequeSize, groupDelayMilliseconds: 500 }),
      changeCount: 0,
    },
  }
}

/**
 * The internal events that an editor has to respond to. These events should be mapped via a Tagger.
 */
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

export function completeRerenderCount(e: Editor): number {
  return e.contents.completeRerenderCount
}

export function selectionCount(e: Editor): number {
  return e.contents.selectionCount
}

export function renderCount(e: Editor): number {
  return e.contents.renderCount
}

export function bufferedEditorState(e: Editor): Option<State> {
  return e.contents.bufferedEditorState
}

export function isComposing(e: Editor): boolean {
  return e.contents.isComposing
}

export function withComposing(composing: boolean, e: Editor): Editor {
  return {
    _tag: 'Editor',
    contents: { ...e.contents, isComposing: composing },
  }
}

export function withBufferedEditorState(s: Option<State>, e: Editor): Editor {
  return {
    _tag: 'Editor',
    contents: { ...e.contents, bufferedEditorState: s },
  }
}

export function state(e: Editor): State {
  return e.contents.state
}

export function withState(s: State, e: Editor): Editor {
  return {
    _tag: 'Editor',
    contents: { ...e.contents, state: s },
  }
}

export function history(e: Editor): History {
  return e.contents.history
}

export function changeCount(e: Editor): number {
  return e.contents.changeCount
}

export function shortKey(e: Editor): string {
  return e.contents.shortKey
}

export function withHistory(h: History, e: Editor): Editor {
  return {
    _tag: 'Editor',
    contents: { ...e.contents, history: h },
  }
}

export function withShortKey(key: string, e: Editor): Editor {
  return {
    _tag: 'Editor',
    contents: { ...e.contents, shortKey: key },
  }
}

export function incrementChangeCount(e: Editor): Editor {
  return {
    _tag: 'Editor',
    contents: { ...e.contents, changeCount: e.contents.changeCount + 1 },
  }
}

export function forceRerender(e: Editor): Editor {
  return {
    _tag: 'Editor',
    contents: { ...e.contents, renderCount: e.contents.renderCount + 1 },
  }
}

export function forceReselection(e: Editor): Editor {
  return {
    _tag: 'Editor',
    contents: { ...e.contents, selectionCount: e.contents.selectionCount + 1 },
  }
}

export function forceCompleteRerender(e: Editor): Editor {
  return {
    _tag: 'Editor',
    contents: {
      ...e.contents,
      completeRerenderCount: e.contents.completeRerenderCount + 1,
    },
  }
}

export function areSelectionsEqual(
  a: Option<Selection>,
  b: Option<Selection>,
): boolean {
  if (a._tag === 'Some' && b._tag === 'Some') {
    const sa = a.value
    const sb = b.value
    if (sa.contents.anchorOffset !== sb.contents.anchorOffset) return false
    if (sa.contents.focusOffset !== sb.contents.focusOffset) return false
    if (sa.contents.anchorNode.join(':') !== sb.contents.anchorNode.join(':'))
      return false
    if (sa.contents.focusNode.join(':') !== sb.contents.focusNode.join(':'))
      return false
    return true
  }
  return a._tag === b._tag
}

function areMarksEqual(a: Array<Mark>, b: Array<Mark>): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].contents.name !== b[i].contents.name) return false
    if (a[i].contents.attributes.length !== b[i].contents.attributes.length)
      return false
    for (let j = 0; j < a[i].contents.attributes.length; j++) {
      if (
        a[i].contents.attributes[j].key !== b[i].contents.attributes[j].key ||
        a[i].contents.attributes[j].value !== b[i].contents.attributes[j].value
      ) {
        return false
      }
    }
  }
  return true
}

function areBlocksEqual(a: Block, b: Block): boolean {
  if (
    a.contents.parameters.contents.name !== b.contents.parameters.contents.name
  ) {
    return false
  }
  const cnA = a.contents.childNodes
  const cnB = b.contents.childNodes
  if (cnA._tag !== cnB._tag) return false
  if (cnA._tag === 'BlockChildren' && cnB._tag === 'BlockChildren') {
    const arrA = cnA.blockChildren.array
    const arrB = cnB.blockChildren.array
    if (arrA.length !== arrB.length) return false
    for (let i = 0; i < arrA.length; i++) {
      if (!areBlocksEqual(arrA[i], arrB[i])) return false
    }
    return true
  } else if (cnA._tag === 'InlineChildren' && cnB._tag === 'InlineChildren') {
    const arrA = cnA.inlineChildren.contents.array
    const arrB = cnB.inlineChildren.contents.array
    if (arrA.length !== arrB.length) return false
    for (let i = 0; i < arrA.length; i++) {
      const leafA = arrA[i]
      const leafB = arrB[i]
      if (leafA._tag !== leafB._tag) return false
      if (leafA._tag === 'Text' && leafB._tag === 'Text') {
        if (leafA.text.contents.text !== leafB.text.contents.text) return false
        if (
          !areMarksEqual(leafA.text.contents.marks, leafB.text.contents.marks)
        )
          return false
      } else if (
        leafA._tag === 'InlineElement' &&
        leafB._tag === 'InlineElement'
      ) {
        if (
          leafA.inlineElement.contents.element.contents.name !==
          leafB.inlineElement.contents.element.contents.name
        ) {
          return false
        }
      }
    }
    return true
  }
  return true
}

export function areStatesEqual(a: State, b: State): boolean {
  return (
    areSelectionsEqual(a.contents.selection, b.contents.selection) &&
    areBlocksEqual(a.contents.root, b.contents.root)
  )
}

function findNextState(
  editorState: State,
  undoDeque: BoundedDeque<[string, State]>,
): [Option<State>, BoundedDeque<[string, State]>] {
  const [popOpt, rest] = undoDeque.popFront()
  if (popOpt._tag === 'None') {
    return [none, rest]
  }
  const [_, state_] = popOpt.value
  if (!areStatesEqual(state_, editorState)) {
    return [some(state_), rest]
  } else {
    return findNextState(editorState, rest)
  }
}

export function handleUndo(editor_: Editor): Editor {
  const editorHistory = contents(history(editor_))
  const editorState = state(editor_)
  const [maybeState, newUndoDeque] = findNextState(
    editorState,
    editorHistory.undoDeque,
  )

  if (maybeState._tag === 'None') {
    return editor_
  }

  const newState = maybeState.value
  const newHistory = {
    ...editorHistory,
    undoDeque: newUndoDeque,
    redoStack: [editorState, ...editorHistory.redoStack],
    lastTextChangeTimestamp: 0,
  }
  return incrementChangeCount(
    withHistory(fromContents(newHistory), withState(newState, editor_)),
  )
}

export function handleRedo(editor_: Editor): Either<string, Editor> {
  const editorHistory = contents(history(editor_))
  if (editorHistory.redoStack.length === 0) {
    return left('There are no states on the redo stack')
  }

  const newState = editorHistory.redoStack[0]
  const xs = editorHistory.redoStack.slice(1)
  const newHistory = {
    ...editorHistory,
    undoDeque: editorHistory.undoDeque.pushFront(['redo', state(editor_)]),
    redoStack: xs,
  }
  return right(
    incrementChangeCount(
      withHistory(fromContents(newHistory), withState(newState, editor_)),
    ),
  )
}

export function updateEditorState(
  action: string,
  newState: State,
  editor_: Editor,
): Editor {
  return updateEditorStateWithTimestamp(none, action, newState, editor_)
}

export function updateEditorStateWithTimestamp(
  maybeTimestamp: Option<number>,
  action: string,
  newState: State,
  editor_: Editor,
): Editor {
  const editorHistory = contents(history(editor_))
  const timestamp = maybeTimestamp._tag === 'Some' ? maybeTimestamp.value : 0

  const firstOpt = editorHistory.undoDeque.first()
  let newUndoDeque: BoundedDeque<[string, State]>
  if (firstOpt._tag === 'None') {
    newUndoDeque = editorHistory.undoDeque.pushFront([action, state(editor_)])
  } else {
    const [lastAction, _] = firstOpt.value
    if (
      lastAction === action &&
      timestamp !== 0 &&
      timestamp - editorHistory.lastTextChangeTimestamp <
        editorHistory.groupDelayMilliseconds
    ) {
      newUndoDeque = editorHistory.undoDeque
    } else {
      newUndoDeque = editorHistory.undoDeque.pushFront([action, state(editor_)])
    }
  }

  const newHistory = {
    ...editorHistory,
    undoDeque: newUndoDeque,
    redoStack: [],
    lastTextChangeTimestamp: timestamp,
  }
  return incrementChangeCount(
    withHistory(fromContents(newHistory), withState(newState, editor_)),
  )
}

export function applyInternalCommand(
  action: 'Undo' | 'Redo',
  editor_: Editor,
): Either<string, Editor> {
  if (action === 'Undo') {
    return right(handleUndo(editor_))
  } else {
    return handleRedo(editor_)
  }
}

export function applyCommand(
  cmd: NamedCommand,
  spec: Spec,
  editor_: Editor,
): Either<string, Editor> {
  const [name, command] = cmd
  if (command._tag === 'InternalCommand') {
    return applyInternalCommand(command.action, editor_)
  } else {
    const transform = command.transform
    const res = transform(state(editor_))
    if (res._tag === 'Left') {
      return res
    }
    const valRes = validate(spec, res.right)
    if (valRes._tag === 'Left') {
      return valRes
    }
    const reducedState = reduce(valRes.right)
    return right(
      forceReselection(updateEditorState(name, reducedState, editor_)),
    )
  }
}

export function applyCommandNoForceSelection(
  cmd: NamedCommand,
  spec: Spec,
  editor_: Editor,
): Either<string, Editor> {
  const [name, command] = cmd
  if (command._tag === 'InternalCommand') {
    return applyInternalCommand(command.action, editor_)
  } else {
    const transform = command.transform
    const res = transform(state(editor_))
    if (res._tag === 'Left') {
      return res
    }
    const valRes = validate(spec, res.right)
    if (valRes._tag === 'Left') {
      return valRes
    }
    const reducedState = reduce(valRes.right)
    return right(updateEditorState(name, reducedState, editor_))
  }
}

export function applyNamedCommandList(
  list: NamedCommandList,
  spec: Spec,
  editor_: Editor,
): Either<string, Editor> {
  let result: Either<string, Editor> = left('No commands found')
  for (const cmd of list) {
    if (result._tag === 'Left') {
      const res = applyCommand(cmd, spec, editor_)
      if (res._tag === 'Right') {
        result = res
      } else {
        result = res
      }
    } else {
      break
    }
  }
  return result
}
