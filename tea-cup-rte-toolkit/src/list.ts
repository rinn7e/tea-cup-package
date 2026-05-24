import { Either, left, right } from 'fp-ts/lib/Either'
import { Option, none, some } from 'fp-ts/lib/Option'

import {
  annotateSelection,
  clear,
  clearSelectionAnnotations,
  doLift,
  selectionFromAnnotations,
} from './annotation'
import { splitBlock, wrap as wrapBlock } from './commands'
import {
  CommandMap,
  Transform,
  emptyCommandMap,
  inputEvent,
  key,
  set,
} from './config/command'
import { enter, return as returnKey } from './config/keys'
import { listItem, orderedList, unorderedList } from './definitions'
import { Element, element } from './model/element'
import {
  Block,
  Path,
  block,
  blockChildren,
  childNodes,
  toBlockArray,
} from './model/node'
import {
  anchorNode,
  anchorOffset,
  focusOffset,
  isCollapsed,
  normalize,
} from './model/selection'
import { State, withRoot, withSelection } from './model/state'
import { Node, findAncestor, isEmptyTextBlock } from './node'

export type ListType = 'Ordered' | 'Unordered'

export interface ListDefinitionContents {
  readonly ordered: Element
  readonly unordered: Element
  readonly item: Element
}

export type ListDefinition = {
  readonly _tag: 'ListDefinition'
  readonly contents: ListDefinitionContents
}

export function listDefinition(
  contents: ListDefinitionContents,
): ListDefinition {
  return { _tag: 'ListDefinition', contents }
}

export const defaultListDefinition: ListDefinition = listDefinition({
  ordered: element(orderedList, []),
  unordered: element(unorderedList, []),
  item: element(listItem, []),
})

export function item(def: ListDefinition): Element {
  return def.contents.item
}

export function ordered(def: ListDefinition): Element {
  return def.contents.ordered
}

export function unordered(def: ListDefinition): Element {
  return def.contents.unordered
}

function addListItem(def: ListDefinition, node: Block): Block {
  return block(item(def), blockChildren([node]))
}

/**
 * Wraps the selection in a list of the specified type.
 */
export function wrap(def: ListDefinition, type_: ListType): Transform {
  const wrapper = type_ === 'Ordered' ? ordered(def) : unordered(def)
  return wrapBlock((node) => {
    if (node._tag === 'Block') {
      return { _tag: 'Block', value: addListItem(def, node.value) }
    }
    return node
  }, wrapper)
}

export function findListItemAncestor(
  itemParams: Element,
  path: Path,
  root: Block,
): Option<[Path, Block]> {
  const res = findAncestor(
    (p, node) =>
      node._tag === 'Block' &&
      node.value.contents.parameters.contents.name === itemParams.contents.name,
    path,
    root,
  )
  if (res._tag === 'Some') {
    const [p, node] = res.value
    if (node._tag === 'Block') {
      return some([p, node.value])
    }
  }
  return none
}

/**
 * Split the current list item.
 */
export function split(def: ListDefinition): Transform {
  return splitBlock((path: Path, root: Block) =>
    findListItemAncestor(item(def), path, root),
  )
}

export function isListNode(def: ListDefinition, node: Node): boolean {
  if (node._tag === 'Inline') return false
  const name = node.value.contents.parameters.contents.name
  return (
    name === ordered(def).contents.name || name === unordered(def).contents.name
  )
}

export function defaultCommandMap(def: ListDefinition): CommandMap {
  return set(
    [inputEvent('insertParagraph'), key([enter]), key([returnKey])],
    [
      [
        'liftEmptyListItem',
        { _tag: 'TransformCommand', transform: liftEmpty(def) },
      ],
      ['splitListItem', { _tag: 'TransformCommand', transform: split(def) }],
    ],
    emptyCommandMap,
  )
}

export function lift(def: ListDefinition): Transform {
  return (editorState: State): Either<string, State> => {
    const selectionOpt = editorState.contents.selection
    if (selectionOpt._tag === 'None') return left('Nothing is selected')
    const sel = selectionOpt.value
    const norm = normalize(sel)

    const startOpt = findListItemAncestor(
      item(def),
      anchorNode(norm),
      editorState.contents.root,
    )
    if (startOpt._tag === 'None') return left('No list item ancestor at anchor')
    const [startPath] = startOpt.value

    const markedRoot = annotateSelection(norm, editorState.contents.root)
    // Add lift annotation at path and children
    const liftedRoot = doLift(doLift(markedRoot))
    const newSelection = selectionFromAnnotations(
      liftedRoot,
      anchorOffset(norm),
      focusOffset(norm),
    )

    return right(
      withSelection(
        newSelection,
        withRoot(
          clear('lift', clearSelectionAnnotations(liftedRoot)),
          editorState,
        ),
      ),
    )
  }
}

export function liftEmpty(def: ListDefinition): Transform {
  return (editorState: State): Either<string, State> => {
    const selectionOpt = editorState.contents.selection
    if (selectionOpt._tag === 'None') return left('Nothing is selected')
    const sel = selectionOpt.value

    if (!isCollapsed(sel) || anchorOffset(sel) !== 0) {
      return left(
        'I can only lift collapsed selections at the beginning of a text node',
      )
    }

    const itemOpt = findListItemAncestor(
      item(def),
      anchorNode(sel),
      editorState.contents.root,
    )
    if (itemOpt._tag === 'None') return left('No list item ancestor to lift')

    const [, node] = itemOpt.value
    const c = childNodes(node)
    if (c._tag === 'BlockChildren') {
      const arr = toBlockArray(c.blockChildren.array)
      if (arr.length === 0) return left('Cannot lift empty list item')
      if (!isEmptyTextBlock(arr[0])) {
        return left('I cannot lift a node that is not an empty text block')
      }
      return lift(def)(editorState)
    }
    return left('Expected block children in list item')
  }
}
