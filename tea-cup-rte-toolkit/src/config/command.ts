import { Either } from 'fp-ts/lib/Either';
import { Option } from 'fp-ts/lib/Option';
import { State } from '../model/state';
import { alt, ctrl, meta, shift, short } from './keys';

export type Transform = (state: State) => Either<string, State>;

export type InternalAction = 'Undo' | 'Redo';

export type Command =
  | { readonly _tag: 'TransformCommand'; readonly transform: Transform }
  | { readonly _tag: 'InternalCommand'; readonly action: InternalAction };

export function transform(t: Transform): Command {
  return { _tag: 'TransformCommand', transform: t };
}

export function internal(i: InternalAction): Command {
  return { _tag: 'InternalCommand', action: i };
}

export type NamedCommand = [string, Command];
export type NamedCommandList = Array<NamedCommand>;

export type KeyMap = Map<string, NamedCommandList>;
export type InputEventTypeMap = Map<string, NamedCommandList>;

export interface CommandMapContents {
  readonly keyMap: KeyMap;
  readonly inputEventTypeMap: InputEventTypeMap;
  readonly defaultKeyCommand: (event: KeyboardEvent) => NamedCommandList;
  readonly defaultInputEventCommand: (event: InputEvent) => NamedCommandList;
}

export type CommandMap = { readonly _tag: 'CommandMap'; readonly contents: CommandMapContents };

export interface InputEvent {
  readonly data: Option<string>;
  readonly isComposing: boolean;
  readonly inputType: string;
}

export interface KeyboardEvent {
  readonly keyCode: number;
  readonly key: string;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly isComposing: boolean;
}

export function namedCommandListFromInputEvent(event: InputEvent, map: CommandMap): NamedCommandList {
  const contents = map.contents;
  const list = contents.inputEventTypeMap.get(event.inputType);
  return list !== undefined ? list : contents.defaultInputEventCommand(event);
}

function keyboardEventToDictKey(keyboardEvent: KeyboardEvent): Array<string> {
  const keys = [keyboardEvent.key];
  if (keyboardEvent.shiftKey) {
    keys.push(shift);
  }
  if (keyboardEvent.metaKey) {
    keys.push(meta);
  }
  if (keyboardEvent.ctrlKey) {
    keys.push(ctrl);
  }
  if (keyboardEvent.altKey) {
    keys.push(alt);
  }
  return keys.sort();
}

export function namedCommandListFromKeyboardEvent(
  shortKey: string,
  event: KeyboardEvent,
  map: CommandMap,
): NamedCommandList {
  const contents = map.contents;
  const mapping = keyboardEventToDictKey(event);
  const shortKeyReplaced = mapping.map((v) => (v === shortKey ? short : v));

  const key1 = shortKeyReplaced.join(',');
  const key2 = mapping.join(',');

  const v = contents.keyMap.get(key1);
  const v2 = contents.keyMap.get(key2);

  if (v === undefined) {
    if (v2 === undefined) {
      return contents.defaultKeyCommand(event);
    } else {
      return v2;
    }
  } else {
    if (v2 === undefined) {
      return v;
    } else {
      return [...v, ...v2];
    }
  }
}

export type CommandBinding =
  | { readonly _tag: 'Key'; readonly keys: Array<string> }
  | { readonly _tag: 'InputEventType'; readonly type: string };

export function inputEvent(type_: string): CommandBinding {
  return { _tag: 'InputEventType', type: type_ };
}

export function key(keys: Array<string>): CommandBinding {
  const uniqueSorted = Array.from(new Set(keys)).sort();
  return { _tag: 'Key', keys: uniqueSorted };
}

export function set(bindings: Array<CommandBinding>, func: NamedCommandList, map: CommandMap): CommandMap {
  const newKeyMap = new Map(map.contents.keyMap);
  const newInputEventTypeMap = new Map(map.contents.inputEventTypeMap);

  for (const binding of bindings) {
    if (binding._tag === 'Key') {
      newKeyMap.set(binding.keys.join(','), func);
    } else {
      newInputEventTypeMap.set(binding.type, func);
    }
  }

  return {
    _tag: 'CommandMap',
    contents: {
      ...map.contents,
      keyMap: newKeyMap,
      inputEventTypeMap: newInputEventTypeMap,
    },
  };
}

export function defaultKeyCommand(map: CommandMap): (event: KeyboardEvent) => NamedCommandList {
  return map.contents.defaultKeyCommand;
}

export function defaultInputEventCommand(map: CommandMap): (event: InputEvent) => NamedCommandList {
  return map.contents.defaultInputEventCommand;
}

export function withDefaultKeyCommand(
  func: (event: KeyboardEvent) => NamedCommandList,
  map: CommandMap,
): CommandMap {
  return {
    _tag: 'CommandMap',
    contents: {
      ...map.contents,
      defaultKeyCommand: func,
    },
  };
}

export function withDefaultInputEventCommand(
  func: (event: InputEvent) => NamedCommandList,
  map: CommandMap,
): CommandMap {
  return {
    _tag: 'CommandMap',
    contents: {
      ...map.contents,
      defaultInputEventCommand: func,
    },
  };
}

function combineMaps(
  map1: Map<string, NamedCommandList>,
  map2: Map<string, NamedCommandList>,
): Map<string, NamedCommandList> {
  const result = new Map(map2);
  for (const [k, v1] of map1.entries()) {
    const v2 = result.get(k);
    if (v2 === undefined) {
      result.set(k, v1);
    } else {
      result.set(k, [...v1, ...v2]);
    }
  }
  return result;
}

export function combine(m1: CommandMap, m2: CommandMap): CommandMap {
  const map1 = m1.contents;
  const map2 = m2.contents;
  return {
    _tag: 'CommandMap',
    contents: {
      inputEventTypeMap: combineMaps(map1.inputEventTypeMap, map2.inputEventTypeMap),
      keyMap: combineMaps(map1.keyMap, map2.keyMap),
      defaultKeyCommand: (e) => [...map1.defaultKeyCommand(e), ...map2.defaultKeyCommand(e)],
      defaultInputEventCommand: (e) => [...map1.defaultInputEventCommand(e), ...map2.defaultInputEventCommand(e)],
    },
  };
}

const emptyFunction = () => [];

export const emptyCommandMap: CommandMap = {
  _tag: 'CommandMap',
  contents: {
    keyMap: new Map(),
    inputEventTypeMap: new Map(),
    defaultKeyCommand: emptyFunction,
    defaultInputEventCommand: emptyFunction,
  },
};
