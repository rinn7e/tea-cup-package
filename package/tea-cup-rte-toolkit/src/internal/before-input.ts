import { Either, isRight } from 'fp-ts/lib/Either'
import { fromNullable } from 'fp-ts/lib/Option'

import { CommandMap, namedCommandListFromInputEvent } from '../config/command'
import { Spec } from '../config/spec'
import {
  Editor,
  Message,
  applyNamedCommandList,
  forceRerender,
  isComposing,
} from './editor'
import { InputEvent } from './event'

export function preventDefaultOn(
  commandMap: CommandMap,
  spec: Spec,
  editor: Editor,
  msg: Message,
): [Message, boolean] {
  if (msg._tag === 'BeforeInputEvent') {
    const inputEvent = msg.event
    if (inputEvent.isComposing || isComposing(editor)) {
      return [msg, false]
    } else {
      return [msg, shouldPreventDefault(commandMap, spec, editor, inputEvent)]
    }
  }
  return [msg, false]
}

export function shouldPreventDefault(
  commandMap: CommandMap,
  spec: Spec,
  editor: Editor,
  inputEvent: InputEvent,
): boolean {
  const result = handleInputEvent(commandMap, spec, editor, inputEvent)
  return isRight(result)
}

export function beforeInputDecoder(event: {
  readonly data: string | null
  readonly isComposing?: boolean
  readonly inputType?: string
}): Message {
  return {
    _tag: 'BeforeInputEvent',
    event: {
      data: fromNullable(event.data),
      isComposing: event.isComposing || false,
      inputType: event.inputType || '',
    },
  }
}

export function preventDefaultOnBeforeInputDecoder<Msg>(
  tagger: (msg: Message) => Msg,
  commandMap: CommandMap,
  spec: Spec,
  editor: Editor,
): (event: {
  readonly data: string | null
  readonly isComposing?: boolean
  readonly inputType?: string
}) => [Msg, boolean] {
  return (event) => {
    const msg = beforeInputDecoder(event)
    const [outMsg, prevent] = preventDefaultOn(commandMap, spec, editor, msg)
    return [tagger(outMsg), prevent]
  }
}

export function handleInputEvent(
  commandMap: CommandMap,
  spec: Spec,
  editor: Editor,
  inputEvent: InputEvent,
): Either<string, Editor> {
  const namedCommandList = namedCommandListFromInputEvent(
    inputEvent,
    commandMap,
  )
  return applyNamedCommandList(namedCommandList, spec, editor)
}

export function handleBeforeInput(
  inputEvent: InputEvent,
  commandMap: CommandMap,
  spec: Spec,
  editor: Editor,
): Editor {
  if (inputEvent.isComposing || isComposing(editor)) {
    return editor
  }
  const result = handleInputEvent(commandMap, spec, editor, inputEvent)
  if (result._tag === 'Left') {
    return editor
  }
  return forceRerender(result.right)
}
