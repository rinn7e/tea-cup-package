import { Either } from 'fp-ts/lib/Either'

import {
  CommandMap,
  namedCommandListFromKeyboardEvent,
} from '../config/command'
import { Spec } from '../config/spec'
import {
  Editor,
  Message,
  applyNamedCommandList,
  isComposing,
  shortKey,
} from './editor'
import { KeyboardEvent } from './event'

export function preventDefaultOn(
  commandMap: CommandMap,
  spec: Spec,
  editorInstance: Editor,
  msg: Message,
): [Message, boolean] {
  if (msg._tag === 'KeyDownEvent') {
    const key = msg.event
    if (key.isComposing || isComposing(editorInstance)) {
      return [msg, false]
    } else {
      return [msg, shouldPreventDefault(commandMap, spec, editorInstance, key)]
    }
  }
  return [msg, false]
}

export function shouldPreventDefault(
  commandMap: CommandMap,
  spec: Spec,
  editorInstance: Editor,
  keyboardEvent: KeyboardEvent,
): boolean {
  const res = handleKeyDownEvent(
    commandMap,
    spec,
    editorInstance,
    keyboardEvent,
  )
  return res._tag === 'Right'
}

export function handleKeyDownEvent(
  commandMap: CommandMap,
  spec: Spec,
  editorInstance: Editor,
  event: KeyboardEvent,
): Either<string, Editor> {
  const namedCommandList = namedCommandListFromKeyboardEvent(
    shortKey(editorInstance),
    event,
    commandMap,
  )
  return applyNamedCommandList(namedCommandList, spec, editorInstance)
}

export function handleKeyDown(
  keyboardEvent: KeyboardEvent,
  commandMap: CommandMap,
  spec: Spec,
  editorInstance: Editor,
): Editor {
  if (keyboardEvent.isComposing || isComposing(editorInstance)) {
    return editorInstance
  }
  const res = handleKeyDownEvent(
    commandMap,
    spec,
    editorInstance,
    keyboardEvent,
  )
  if (res._tag === 'Right') {
    return res.right
  }
  return editorInstance
}
