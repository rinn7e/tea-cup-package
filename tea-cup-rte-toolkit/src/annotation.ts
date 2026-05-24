import { Either, left } from 'fp-ts/lib/Either'
import { Option, none, some } from 'fp-ts/lib/Option'

import {
  lift as constLift,
  selectable as constSelectable,
  selection as constSelection,
} from './internal/constants'
import { Element, annotations as getElementAnnotations } from './model/element'
import * as InlineElement from './model/inline-element'
import {
  Block,
  Inline,
  Path,
  blockChildren,
  childNodes,
  element,
  toBlockArray,
  withElement,
} from './model/node'
import { Selection, anchorNode, focusNode, range } from './model/selection'
import * as Text from './model/text'
import { Node, concatMap, foldlRange, map, nodeAt, replace } from './node'

/**
 * Represents that a node is currently selected. This annotation is transient, e.g. it
 * should be cleared before a transform or command is complete.
 */
export const selection = constSelection

/**
 * Represents that a node can be selected. This annotation is not transient.
 */
export const selectable = constSelectable

/**
 * Represents that a node should be lifted. This annotation is transient.
 */
export const lift = constLift

/**
 * Helper to add an annotation to a node.
 */
export function add(annotation: string, node: Node): Node {
  return toggle(
    (a, set) => {
      const s = new Set(set)
      s.add(a)
      return s
    },
    annotation,
    node,
  )
}

/**
 * Helper to remove an annotation from a node.
 */
export function remove(annotation: string, node: Node): Node {
  return toggle(
    (a, set) => {
      const s = new Set(set)
      s.delete(a)
      return s
    },
    annotation,
    node,
  )
}

/**
 * Adds an annotation to the node at the given path.
 */
export function addAtPath(
  annotation: string,
  path: Path,
  node: Block,
): Either<string, Block> {
  const nodeOpt = nodeAt(path, { _tag: 'Block', value: node })
  if (nodeOpt._tag === 'None') {
    return left('No block found at path')
  }
  return replace(path, add(annotation, nodeOpt.value), node)
}

/**
 * Removes the given annotation from the node at the given path.
 */
export function removeAtPath(
  annotation: string,
  path: Path,
  node: Block,
): Either<string, Block> {
  const nodeOpt = nodeAt(path, { _tag: 'Block', value: node })
  if (nodeOpt._tag === 'None') {
    return left('No block found at path')
  }
  return replace(path, remove(annotation, nodeOpt.value), node)
}

export function addToBlock(a: string, n: Block): Block {
  const res = add(a, { _tag: 'Block', value: n })
  return res._tag === 'Block' ? res.value : n
}

export function addToInline(a: string, n: Inline): Inline {
  const res = add(a, { _tag: 'Inline', value: n })
  return res._tag === 'Inline' ? res.value : n
}

export function removeFromBlock(a: string, n: Block): Block {
  const res = remove(a, { _tag: 'Block', value: n })
  return res._tag === 'Block' ? res.value : n
}

export function removeFromInline(a: string, n: Inline): Inline {
  const res = remove(a, { _tag: 'Inline', value: n })
  return res._tag === 'Inline' ? res.value : n
}

function toggle(
  func: (a: string, s: Set<string>) => Set<string>,
  annotation: string,
  node: Node,
): Node {
  if (node._tag === 'Block') {
    const bn = node.value
    const newParams = toggleElementParameters(func, annotation, element(bn))
    return {
      _tag: 'Block',
      value: withElement(newParams, bn),
    }
  } else {
    const il = node.value
    if (il._tag === 'InlineElement') {
      const newParams = toggleElementParameters(
        func,
        annotation,
        il.inlineElement.contents.element,
      )
      return {
        _tag: 'Inline',
        value: {
          _tag: 'InlineElement',
          inlineElement: InlineElement.withElement(newParams, il.inlineElement),
        },
      }
    } else {
      // Text
      return {
        _tag: 'Inline',
        value: {
          _tag: 'Text',
          text: Text.withAnnotations(
            func(annotation, Text.annotations(il.text)),
            il.text,
          ),
        },
      }
    }
  }
}

function toggleElementParameters(
  func: (a: string, s: Set<string>) => Set<string>,
  annotation: string,
  parameters: Element,
): Element {
  const oldAnn = getElementAnnotations(parameters)
  return OscarElementWithAnnotations(func(annotation, oldAnn), parameters)
}

function OscarElementWithAnnotations(s: Set<string>, p: Element): Element {
  return {
    _tag: 'ElementParameters',
    contents: { ...p.contents, annotations: s },
  }
}

/**
 * Removes the given annotation from this node and its children.
 */
export function clear(annotation: string, root: Block): Block {
  const res = map((n) => remove(annotation, n), { _tag: 'Block', value: root })
  return res._tag === 'Block' ? res.value : root
}

/**
 * Helper method to extract annotations from a node.
 */
export function fromNode(node: Node): Set<string> {
  if (node._tag === 'Block') {
    return getElementAnnotations(element(node.value))
  } else {
    const il = node.value
    if (il._tag === 'InlineElement') {
      return getElementAnnotations(il.inlineElement.contents.element)
    } else {
      return Text.annotations(il.text)
    }
  }
}

function findPathsWithAnnotation(annotation: string, node: Block): Array<Path> {
  const result: Array<Path> = []
  foldlRange(
    [],
    [],
    (path, n, agg) => {
      const s = fromNode(n)
      if (s.has(annotation)) {
        result.push(path)
      }
      return agg
    },
    null,
    { _tag: 'Block', value: node },
  )
  return result
}

/**
 * Adds the selection annotation to the paths in the selection if they exist.
 */
export function annotateSelection(selection_: Selection, node: Block): Block {
  return addSelectionAnnotationAtPath(
    focusNode(selection_),
    addSelectionAnnotationAtPath(anchorNode(selection_), node),
  )
}

function addSelectionAnnotationAtPath(nodePath: Path, node: Block): Block {
  const res = addAtPath(selection, nodePath, node)
  return res._tag === 'Right' ? res.right : node
}

/**
 * Clears the selection annotation from the editor node.
 */
export function clearSelectionAnnotations(root: Block): Block {
  return clear(selection, root)
}

/**
 * Derives the selection from selection annotations.
 */
export function selectionFromAnnotations(
  node: Block,
  anchorOffset: number,
  focusOffset: number,
): Option<Selection> {
  const rangeOpt = findNodeRangeFromSelectionAnnotations(node)
  if (rangeOpt._tag === 'None') {
    return none
  }
  const [start, end] = rangeOpt.value
  return some(range(start, anchorOffset, end, focusOffset))
}

function findNodeRangeFromSelectionAnnotations(
  node: Block,
): Option<[Path, Path]> {
  const paths = findPathsWithAnnotation(selection, node)
  if (paths.length === 0) {
    return none
  }
  if (paths.length === 1) {
    return some([paths[0], paths[0]])
  }
  return some([paths[1], paths[0]])
}

/**
 * True if a node has the `selectable` annotation or is Text, false otherwise.
 */
export function isSelectable(node: Node): boolean {
  if (node._tag === 'Block') {
    return getElementAnnotations(element(node.value)).has(selectable)
  } else {
    const ln = node.value
    if (ln._tag === 'Text') {
      return true
    } else {
      return getElementAnnotations(ln.inlineElement.contents.element).has(
        selectable,
      )
    }
  }
}

function groupWhile<A>(
  pred: (a: A, b: A) => boolean,
  list: Array<A>,
): Array<[A, Array<A>]> {
  if (list.length === 0) return []
  const result: Array<[A, Array<A>]> = []
  let currentGroup: [A, Array<A>] = [list[0], []]
  for (let i = 1; i < list.length; i++) {
    const item = list[i]
    if (pred(currentGroup[0], item)) {
      currentGroup[1].push(item)
    } else {
      result.push(currentGroup)
      currentGroup = [item, []]
    }
  }
  result.push(currentGroup)
  return result
}

function liftConcatMapFunc(node: Node): Array<Node> {
  if (node._tag === 'Block') {
    const bn = node.value
    const cNodes = childNodes(bn)
    if (cNodes._tag !== 'BlockChildren') {
      return [node]
    }
    const childrenArray = toBlockArray(cNodes.blockChildren.array)
    const groups = groupWhile(
      (n1, n2) =>
        getElementAnnotations(element(n1)).has(lift) ===
        getElementAnnotations(element(n2)).has(lift),
      childrenArray,
    )

    const mappedBlocks: Array<Block> = []
    for (const [first, rest] of groups) {
      if (getElementAnnotations(element(first)).has(lift)) {
        mappedBlocks.push(first)
        for (const item of rest) {
          mappedBlocks.push(item)
        }
      } else {
        mappedBlocks.push({
          _tag: 'Block',
          contents: {
            ...bn.contents,
            childNodes: blockChildren([first, ...rest]),
          },
        })
      }
    }
    return mappedBlocks.map((b) => ({ _tag: 'Block' as const, value: b }))
  }
  return [node]
}

/**
 * Lifts nodes that are marked with the lift annotation if possible.
 */
export function doLift(root: Block): Block {
  return concatMap(liftConcatMapFunc, root)
}
