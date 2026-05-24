import { Either, left, right } from 'fp-ts/lib/Either'
import { some } from 'fp-ts/lib/Option'

import {
  annotateSelection,
  clearSelectionAnnotations,
  selection,
} from './annotation'
import * as ElementDefinition from './config/element-definition'
import { Spec } from './config/spec'
import { elementDefinitionWithDefault } from './internal/spec'
import * as InlineElement from './model/inline-element'
import {
  Block,
  Inline,
  Path,
  childNodes,
  inlineChildren,
  marks,
  toBlockArray,
  toInlineArray,
  withChildNodes,
} from './model/node'
import {
  anchorNode,
  anchorOffset,
  focusNode,
  focusOffset,
  range,
} from './model/selection'
import { State, withRoot, withSelection } from './model/state'
import * as Text from './model/text'
import { findTextBlockNodeAncestor, map } from './node'

function removeExtraEmptyTextLeaves(
  inlineLeaves: Array<Inline>,
): Array<Inline> {
  if (inlineLeaves.length <= 1) {
    return inlineLeaves
  }
  const result: Array<Inline> = []
  let i = 0
  while (i < inlineLeaves.length) {
    const x = inlineLeaves[i]
    const y = inlineLeaves[i + 1]
    if (y && x._tag === 'Text' && y._tag === 'Text') {
      const xText = x.text.contents.text
      const yText = y.text.contents.text
      if (xText.length === 0 && !Text.annotations(x.text).has(selection)) {
        i++ // skip x
        continue
      }
      if (yText.length === 0 && !Text.annotations(y.text).has(selection)) {
        // skip y, but keep x
        result.push(x)
        i += 2
        continue
      }
    }
    result.push(x)
    i++
  }
  return result
}

function mergeSimilarInlineLeaves(inlineLeaves: Array<Inline>): Array<Inline> {
  if (inlineLeaves.length <= 1) {
    return inlineLeaves
  }
  const result: Array<Inline> = []
  let current = inlineLeaves[0]
  for (let i = 1; i < inlineLeaves.length; i++) {
    const next = inlineLeaves[i]
    if (current._tag === 'Text' && next._tag === 'Text') {
      const cMarks = Text.marks(current.text)
      const nMarks = Text.marks(next.text)
      if (
        cMarks.length === nMarks.length &&
        cMarks.every((m, j) => m.contents.name === nMarks[j].contents.name)
      ) {
        current = {
          _tag: 'Text',
          text: Text.withText(
            current.text.contents.text + next.text.contents.text,
            current.text,
          ),
        }
      } else {
        result.push(current)
        current = next
      }
    } else {
      result.push(current)
      current = next
    }
  }
  result.push(current)
  return result
}

function reduceNode(node: Block): Block {
  const res = map(
    (x) => {
      if (x._tag === 'Block') {
        const bn = x.value
        const c = childNodes(bn)
        if (c._tag === 'InlineChildren') {
          const list = toInlineArray(c.inlineChildren)
          return {
            _tag: 'Block',
            value: withChildNodes(
              inlineChildren(
                mergeSimilarInlineLeaves(removeExtraEmptyTextLeaves(list)),
              ),
              bn,
            ),
          }
        }
      }
      return x
    },
    { _tag: 'Block', value: node },
  )

  return res._tag === 'Block' ? res.value : node
}

/**
 * Reduces the state by merging neighboring text nodes and removing extra empty nodes.
 */
export function reduce(editorState: State): State {
  const selectionOpt = editorState.contents.selection
  const markedRoot =
    selectionOpt._tag === 'None'
      ? editorState.contents.root
      : annotateSelection(selectionOpt.value, editorState.contents.root)

  const reducedRoot = clearSelectionAnnotations(reduceNode(markedRoot))
  return translateReducedTextBlockSelection(reducedRoot, editorState)
}

export function translateReducedTextBlockSelection(
  root: Block,
  state: State,
): State {
  const selectionOpt = state.contents.selection
  if (selectionOpt._tag === 'None') {
    return withRoot(root, state)
  }
  const sel = selectionOpt.value
  const [aP, aO] = translatePath(
    state.contents.root,
    root,
    anchorNode(sel),
    anchorOffset(sel),
  )
  const [fP, fO] = translatePath(
    state.contents.root,
    root,
    focusNode(sel),
    focusOffset(sel),
  )
  return withSelection(some(range(aP, aO, fP, fO)), withRoot(root, state))
}

function translatePath(
  oldBlock: Block,
  newBlock: Block,
  path: Path,
  offset: number,
): [Path, number] {
  const oldTbOpt = findTextBlockNodeAncestor(path, oldBlock)
  if (oldTbOpt._tag === 'None') return [path, offset]
  const newTbOpt = findTextBlockNodeAncestor(path, newBlock)
  if (newTbOpt._tag === 'None') return [path, offset]

  const oldN = oldTbOpt.value[1]
  const newN = newTbOpt.value[1]

  // If node tree representation matches, keep path
  const cOld = childNodes(oldN)
  const cNew = childNodes(newN)
  if (cOld._tag === 'InlineChildren' && cNew._tag === 'InlineChildren') {
    const lastIndex = path[path.length - 1]
    if (lastIndex !== undefined) {
      const pOff = parentOffset(
        toInlineArray(cOld.inlineChildren),
        lastIndex,
        offset,
      )
      const [cI, cO] = childOffset(toInlineArray(cNew.inlineChildren), pOff)
      const newPath = [...path.slice(0, -1), cI]
      return [newPath, cO]
    }
  }
  return [path, offset]
}

function parentOffset(
  leaves: Array<Inline>,
  index: number,
  offset: number,
): number {
  let accOffset = offset
  for (let i = 0; i < index && i < leaves.length; i++) {
    const l = leaves[i]
    if (l._tag === 'Text') {
      accOffset += l.text.contents.text.length
    } else {
      accOffset += 1
    }
  }
  return accOffset
}

function childOffset(leaves: Array<Inline>, offset: number): [number, number] {
  let accOffset = offset
  for (let i = 0; i < leaves.length; i++) {
    const l = leaves[i]
    if (l._tag === 'Text') {
      const len = l.text.contents.text.length
      if (accOffset <= len) {
        return [i, accOffset]
      }
      accOffset -= len
    } else {
      if (accOffset <= 1) {
        return [i, accOffset]
      }
      accOffset -= 1
    }
  }
  return [leaves.length - 1, accOffset]
}

/**
 * Validates the state against the spec rules.
 */
export function validate(
  spec: Spec,
  editorState: State,
): Either<string, State> {
  const root = editorState.contents.root
  const errors = validateEditorBlockNode(spec, new Set(['root']), root)
  if (errors.length === 0) {
    return right(editorState)
  }
  return left(errors.join(', '))
}

function validateAllowedGroups(
  allowedGroups: Set<string> | null,
  group: string,
  name: string,
): Array<string> {
  if (!allowedGroups) return []
  if (allowedGroups.has(group) || allowedGroups.has(name)) {
    return []
  }
  return [
    `Group ${group} is not in allowed groups [${Array.from(allowedGroups).join(', ')}]`,
  ]
}

function validateAllowedMarks(
  allowedMarks: Set<string> | null,
  leaf: Inline,
): Array<string> {
  if (!allowedMarks) return []
  const marksList = marks(leaf)
  const notAllowed = marksList.filter((m) => !allowedMarks.has(m.contents.name))
  if (notAllowed.length === 0) return []
  return [
    `Inline node is only allowed the following marks: ${Array.from(
      allowedMarks,
    ).join(
      ',',
    )}, but found ${notAllowed.map((m) => m.contents.name).join(',')}`,
  ]
}

function validateInlineLeaf(
  spec: Spec,
  allowedGroups: Set<string> | null,
  allowedMarks: Set<string> | null,
  leaf: Inline,
): Array<string> {
  const markErrors = validateAllowedMarks(allowedMarks, leaf)
  if (leaf._tag === 'Text') {
    return markErrors
  }
  const definition = elementDefinitionWithDefault(
    InlineElement.element(leaf.inlineElement),
    spec,
  )
  const groupErrors = validateAllowedGroups(
    allowedGroups,
    definition.contents.group,
    definition.contents.name,
  )
  return [...markErrors, ...groupErrors]
}

function validateEditorBlockNode(
  spec: Spec,
  allowedGroups: Set<string> | null,
  node: Block,
): Array<string> {
  const parameters = node.contents.parameters
  const definition = elementDefinitionWithDefault(parameters, spec)
  const groupErrors = validateAllowedGroups(
    allowedGroups,
    definition.contents.group,
    definition.contents.name,
  )

  if (groupErrors.length > 0) {
    return groupErrors
  }

  const contentType = ElementDefinition.contentType(definition)
  const c = childNodes(node)

  if (c._tag === 'BlockChildren') {
    if (contentType._tag === 'BlockNodeType') {
      const groups =
        contentType.allowedGroups._tag === 'Some'
          ? contentType.allowedGroups.value
          : null
      const results: Array<string> = []
      for (const child of toBlockArray(c.blockChildren)) {
        results.push(...validateEditorBlockNode(spec, groups, child))
      }
      return results
    }
    return [
      `I was expecting blocknode content type, but instead I got ${contentType._tag}`,
    ]
  } else if (c._tag === 'InlineChildren') {
    if (contentType._tag === 'TextBlockNodeType') {
      const groups =
        contentType.allowedGroups._tag === 'Some'
          ? contentType.allowedGroups.value
          : null
      const marks =
        contentType.allowedMarks._tag === 'Some'
          ? contentType.allowedMarks.value
          : null
      const results: Array<string> = []
      for (const child of toInlineArray(c.inlineChildren)) {
        results.push(...validateInlineLeaf(spec, groups, marks, child))
      }
      return results
    }
    return [
      `I was expecting textblock content type, but instead I got ${contentType._tag}`,
    ]
  } else {
    // Leaf
    if (contentType._tag === 'BlockLeafNodeType') {
      return []
    }
    return [
      `I was expecting leaf content type, but instead I got ${contentType._tag}`,
    ]
  }
}
