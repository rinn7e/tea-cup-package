import { map as E_map, Either, left, right } from 'fp-ts/lib/Either'
import { Option, none, some } from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'

import {
  CommandMap,
  Transform,
  emptyCommandMap,
  inputEvent,
  key,
  set,
  withDefaultInputEventCommand,
  withDefaultKeyCommand,
} from './config/command'
import {
  backspace,
  delete as deleteKey,
  enter,
  return as returnKey,
  shift,
  short,
} from './config/keys'
import { Element, element } from './model/element'
import * as InlineElement from './model/inline-element'
import { hardBreak } from './definitions'
import {
  Add,
  Mark,
  MarkOrder,
  Remove,
  ToggleAction,
  hasMarkWithName,
  name as markName,
  toggle,
} from './model/mark'
import {
  Block,
  Inline,
  Path,
  block,
  blockChildren,
  childNodes,
  decrement,
  increment,
  inlineChildren,
  inlineElement,
  marks,
  parent,
  toBlockArray,
  toInlineArray,
  withChildNodes,
  withElement,
} from './model/node'
import {
  anchorNode,
  anchorOffset,
  caret,
  focusNode,
  focusOffset,
  isCollapsed,
  normalize,
  range,
  singleNodeRange,
} from './model/selection'
import { State, withRoot, withSelection } from './model/state'
import * as Text from './model/text'
import {
  Node,
  allRange,
  findBackwardFromExclusive,
  findClosestBlockPath,
  findForwardFromExclusive,
  findTextBlockNodeAncestor,
  indexedMap,
  insertAfter,
  isEmptyTextBlock,
  last,
  next,
  nodeAt,
  joinBlocks as nodeJoinBlocks,
  previous,
  removeInRange,
  removeNodeAndEmptyParents,
  replace,
  replaceWithFragment,
  selectionIsBeginningOfTextBlock,
  selectionIsEndOfTextBlock,
  splitBlockAtPathAndOffset,
  splitTextLeaf,
} from './node'

export const backspaceCommands: Array<
  [string, { _tag: 'TransformCommand'; transform: Transform }]
> = [
  ['removeRange', { _tag: 'TransformCommand', transform: removeRange }],
  ['backspaceText', { _tag: 'TransformCommand', transform: backspaceText }],
]

export const deleteCommands: Array<
  [string, { _tag: 'TransformCommand'; transform: Transform }]
> = [
  ['removeRange', { _tag: 'TransformCommand', transform: removeRange }],
  ['deleteText', { _tag: 'TransformCommand', transform: deleteText }],
]

let cmdMap = emptyCommandMap
cmdMap = set(
  [inputEvent('insertParagraph'), key([enter]), key([returnKey])],
  [
    ['liftEmpty', { _tag: 'TransformCommand', transform: liftEmpty }],
    ['splitTextBlock', { _tag: 'TransformCommand', transform: splitTextBlock }],
  ],
  cmdMap,
)
cmdMap = set(
  [inputEvent('insertLineBreak'), key([shift, enter]), key([shift, returnKey])],
  [['insertLineBreak', { _tag: 'TransformCommand', transform: insertLineBreak }]],
  cmdMap,
)
cmdMap = set(
  [inputEvent('deleteContentBackward'), key([backspace])],
  backspaceCommands,
  cmdMap,
)
cmdMap = set(
  [inputEvent('deleteContentForward'), key([deleteKey])],
  deleteCommands,
  cmdMap,
)
cmdMap = set(
  [key([short, 'a'])],
  [['selectAll', { _tag: 'TransformCommand', transform: selectAll }]],
  cmdMap,
)
cmdMap = set(
  [inputEvent('historyUndo'), key([short, 'z'])],
  [['undo', { _tag: 'InternalCommand', action: 'Undo' }]],
  cmdMap,
)
cmdMap = set(
  [inputEvent('historyRedo'), key([short, shift, 'z'])],
  [['redo', { _tag: 'InternalCommand', action: 'Redo' }]],
  cmdMap,
)

cmdMap = withDefaultKeyCommand((event) => {
  if (
    !event.altKey &&
    !event.metaKey &&
    !event.ctrlKey &&
    event.key.length === 1
  ) {
    return [
      [
        'removeRangeAndInsert',
        {
          _tag: 'TransformCommand',
          transform: removeRangeAndInsert(event.key),
        },
      ],
    ]
  }
  return []
}, cmdMap)

cmdMap = withDefaultInputEventCommand((event) => {
  if (event.inputType === 'insertText' && event.data._tag === 'Some') {
    return [
      [
        'removeRangeAndInsert',
        {
          _tag: 'TransformCommand',
          transform: removeRangeAndInsert(event.data.value),
        },
      ],
    ]
  }
  return []
}, cmdMap)

export const defaultCommandMap: CommandMap = cmdMap

export function removeRangeAndInsert(s: string): Transform {
  return (editorState: State): Either<string, State> => {
    const rangeRes = removeRange(editorState)
    const resolvedState =
      rangeRes._tag === 'Right' ? rangeRes.right : editorState
    const insertRes = insertText(s)(resolvedState)
    if (insertRes._tag === 'Right') {
      return insertRes
    }
    return right(resolvedState)
  }
}

export function insertText(s: string): Transform {
  return (editorState: State): Either<string, State> => {
    const selectionOpt = editorState.contents.selection
    if (selectionOpt._tag === 'None') {
      return left('Nothing is selected')
    }
    const sel = selectionOpt.value
    if (!isCollapsed(sel)) {
      const removedRes = removeRange(editorState)
      if (removedRes._tag === 'Left') return removedRes
      return insertText(s)(removedRes.right)
    }

    const path = anchorNode(sel)
    const nodeOpt = nodeAt(path, {
      _tag: 'Block',
      value: editorState.contents.root,
    })
    if (nodeOpt._tag === 'None') {
      return left('Invalid selection')
    }

    const n = nodeOpt.value
    if (n._tag === 'Block') {
      return left('I was expecting a text leaf, but found a block')
    }

    const il = n.value
    if (il._tag === 'InlineElement') {
      return left('I was expecting a text leaf, but found inline element')
    }

    const tl = il.text
    const originalText = tl.contents.text
    const offset = anchorOffset(sel)
    const newText =
      originalText.substring(0, offset) + s + originalText.substring(offset)
    const newLeaf: Inline = {
      _tag: 'Text',
      text: Text.withText(newText, tl),
    }

    const res = replace(
      path,
      { _tag: 'Inline', value: newLeaf },
      editorState.contents.root,
    )
    if (res._tag === 'Left') {
      return res
    }
    return right(
      withSelection(
        some(caret(path, offset + s.length)),
        withRoot(res.right, editorState),
      ),
    )
  }
}

export function removeRange(editorState: State): Either<string, State> {
  const selectionOpt = editorState.contents.selection
  if (selectionOpt._tag === 'None') {
    return left('Nothing is selected')
  }
  const sel = selectionOpt.value
  if (isCollapsed(sel)) {
    return left('Cannot remove collapsed range')
  }

  const norm = normalize(sel)
  const aN = anchorNode(norm)
  const fN = focusNode(norm)

  if (aN.join(':') === fN.join(':')) {
    const nodeOpt = nodeAt(aN, {
      _tag: 'Block',
      value: editorState.contents.root,
    })
    if (
      nodeOpt._tag === 'None' ||
      nodeOpt.value._tag !== 'Inline' ||
      nodeOpt.value.value._tag !== 'Text'
    ) {
      return left('Anchor node is not a text leaf')
    }
    const tl = nodeOpt.value.value.text
    const t = tl.contents.text
    const aO = anchorOffset(norm)
    const fO = focusOffset(norm)
    const newText = t.substring(0, aO) + t.substring(fO)
    const newLeaf: Inline = {
      _tag: 'Text',
      text: Text.withText(newText, tl),
    }
    const res = replace(
      aN,
      { _tag: 'Inline', value: newLeaf },
      editorState.contents.root,
    )
    if (res._tag === 'Left') return res
    return right(
      withSelection(some(caret(aN, aO)), withRoot(res.right, editorState)),
    )
  } else {
    // Multi-node delete
    const removedEndRoot = removeNodeOrTextWithRange(
      fN,
      0,
      focusOffset(norm),
      editorState.contents.root,
    )
    if (removedEndRoot._tag === 'Left') return removedEndRoot

    // Helper: increment path
    const incPath = (p: Path): Path => {
      if (p.length === 0) return p
      const res = [...p]
      res[res.length - 1]++
      return res
    }
    // Helper: decrement path
    const decPath = (p: Path): Path => {
      if (p.length === 0) return p
      const res = [...p]
      res[res.length - 1]--
      return res
    }

    const removedMiddle = removeInRange(
      incPath(aN),
      decPath(fN),
      removedEndRoot.right[0],
    )
    const finalRes = removeNodeOrTextWithRange(
      aN,
      anchorOffset(norm),
      null,
      removedMiddle,
    )
    if (finalRes._tag === 'Left') return finalRes

    const [finalRoot, maybePath] = finalRes.right
    let newSelection = caret(aN, anchorOffset(norm))
    if (maybePath._tag === 'Some') {
      const [p, n] = maybePath.value
      const offset =
        n._tag === 'Inline' && n.value._tag === 'Text'
          ? n.value.text.contents.text.length
          : 0
      newSelection = caret(p, offset)
    }
    return right(
      withSelection(some(newSelection), withRoot(finalRoot, editorState)),
    )
  }
}

function removeNodeOrTextWithRange(
  path: Path,
  start: number,
  end: number | null,
  root: Block,
): Either<string, [Block, Option<[Path, Node]>]> {
  const nodeOpt = nodeAt(path, { _tag: 'Block', value: root })
  if (nodeOpt._tag === 'None') return left('Node not found')
  const n = nodeOpt.value
  if (n._tag === 'Inline' && n.value._tag === 'Text') {
    const tl = n.value.text
    const t = tl.contents.text
    const finalEnd = end === null ? t.length : end
    const newText = t.substring(0, start) + t.substring(finalEnd)
    const newLeaf: Inline = {
      _tag: 'Text',
      text: Text.withText(newText, tl),
    }
    const replaceRes = replace(path, { _tag: 'Inline', value: newLeaf }, root)
    if (replaceRes._tag === 'Left') return replaceRes
    return right([
      replaceRes.right,
      some([path, { _tag: 'Inline' as const, value: newLeaf }]),
    ])
  } else {
    // block leaf or inline element
    const cleared = removeNodeAndEmptyParents(path, root)
    return right([cleared, none])
  }
}

export function backspaceText(editorState: State): Either<string, State> {
  const selectionOpt = editorState.contents.selection
  if (selectionOpt._tag === 'None') return left('No selection')
  const sel = selectionOpt.value
  if (!isCollapsed(sel)) return removeRange(editorState)

  const offset = anchorOffset(sel)
  if (offset === 0) {
    return joinBackward(editorState)
  }

  const path = anchorNode(sel)
  const nodeOpt = nodeAt(path, {
    _tag: 'Block',
    value: editorState.contents.root,
  })
  if (
    nodeOpt._tag === 'None' ||
    nodeOpt.value._tag !== 'Inline' ||
    nodeOpt.value.value._tag !== 'Text'
  ) {
    return left('Expected text leaf')
  }

  const tl = nodeOpt.value.value.text
  const t = tl.contents.text
  const newText = t.substring(0, offset - 1) + t.substring(offset)
  const newLeaf: Inline = {
    _tag: 'Text',
    text: Text.withText(newText, tl),
  }
  const res = replace(
    path,
    { _tag: 'Inline', value: newLeaf },
    editorState.contents.root,
  )
  if (res._tag === 'Left') return res
  return right(
    withSelection(
      some(caret(path, offset - 1)),
      withRoot(res.right, editorState),
    ),
  )
}

export function deleteText(editorState: State): Either<string, State> {
  const selectionOpt = editorState.contents.selection
  if (selectionOpt._tag === 'None') return left('No selection')
  const sel = selectionOpt.value
  if (!isCollapsed(sel)) return removeRange(editorState)

  const path = anchorNode(sel)
  const nodeOpt = nodeAt(path, {
    _tag: 'Block',
    value: editorState.contents.root,
  })
  if (
    nodeOpt._tag === 'None' ||
    nodeOpt.value._tag !== 'Inline' ||
    nodeOpt.value.value._tag !== 'Text'
  ) {
    return left('Expected text leaf')
  }

  const tl = nodeOpt.value.value.text
  const t = tl.contents.text
  const offset = anchorOffset(sel)
  if (offset === t.length) {
    return joinForward(editorState)
  }

  const newText = t.substring(0, offset) + t.substring(offset + 1)
  const newLeaf: Inline = {
    _tag: 'Text',
    text: Text.withText(newText, tl),
  }
  const res = replace(
    path,
    { _tag: 'Inline', value: newLeaf },
    editorState.contents.root,
  )
  if (res._tag === 'Left') return res
  return right(
    withSelection(some(caret(path, offset)), withRoot(res.right, editorState)),
  )
}

export function joinBackward(editorState: State): Either<string, State> {
  const selectionOpt = editorState.contents.selection
  if (selectionOpt._tag === 'None') return left('Nothing selected')
  const sel = selectionOpt.value
  if (!selectionIsBeginningOfTextBlock(sel, editorState.contents.root)) {
    return left('Not at beginning of text block')
  }

  const tbOpt = findTextBlockNodeAncestor(
    anchorNode(sel),
    editorState.contents.root,
  )
  if (tbOpt._tag === 'None') return left('No text block ancestor')

  const [textBlockPath, n] = tbOpt.value
  const prevOpt = findPreviousTextBlock(
    textBlockPath,
    editorState.contents.root,
  )
  if (prevOpt._tag === 'None') return left('No previous block')

  const [p, prevN] = prevOpt.value
  const prevChilds = childNodes(prevN)
  if (prevChilds._tag !== 'InlineChildren')
    return left('Expected inline children')

  const prevArr = toInlineArray(prevChilds.inlineChildren.contents.array)
  const lastIndex = prevArr.length - 1
  const lastLeaf = prevArr[lastIndex]

  let newSel = caret(p, 0)
  if (lastLeaf) {
    if (lastLeaf._tag === 'Text') {
      newSel = caret([...p, lastIndex], lastLeaf.text.contents.text.length)
    } else {
      newSel = caret([...p, lastIndex], 0)
    }
  }

  return joinForward(withSelection(some(newSel), editorState))
}

export function joinForward(editorState: State): Either<string, State> {
  const selectionOpt = editorState.contents.selection
  if (selectionOpt._tag === 'None') return left('Nothing selected')
  const sel = selectionOpt.value
  if (!selectionIsEndOfTextBlock(sel, editorState.contents.root)) {
    return left('Not at end of text block')
  }

  const tbOpt = findTextBlockNodeAncestor(
    anchorNode(sel),
    editorState.contents.root,
  )
  if (tbOpt._tag === 'None') return left('No text block ancestor')

  const [p1, n1] = tbOpt.value
  const nextOpt = findNextTextBlock(anchorNode(sel), editorState.contents.root)
  if (nextOpt._tag === 'None') return left('No next block')

  const [p2, n2] = nextOpt.value
  const joinedOpt = nodeJoinBlocks(n1, n2)
  if (joinedOpt._tag === 'None') return left('Cannot join blocks')

  const removed = removeNodeAndEmptyParents(p2, editorState.contents.root)
  const replacedRes = replace(
    p1,
    { _tag: 'Block', value: joinedOpt.value },
    removed,
  )
  if (replacedRes._tag === 'Left') return replacedRes

  return right(withRoot(replacedRes.right, editorState))
}

function findPreviousTextBlock(path: Path, root: Block): Option<[Path, Block]> {
  const res = findBackwardFromExclusive(
    (p, node) =>
      node._tag === 'Block' && childNodes(node.value)._tag === 'InlineChildren',
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

function findNextTextBlock(path: Path, root: Block): Option<[Path, Block]> {
  const res = findForwardFromExclusive(
    (p, node) =>
      node._tag === 'Block' && childNodes(node.value)._tag === 'InlineChildren',
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

export function selectAll(editorState: State): Either<string, State> {
  const root = editorState.contents.root
  const lastRes = last(root)
  let finalEndOffset = 0
  const [lastPath, lastNode] = lastRes
  if (lastNode._tag === 'Inline' && lastNode.value._tag === 'Text') {
    finalEndOffset = lastNode.value.text.contents.text.length
  }
  return right(
    withSelection(some(range([0], 0, lastPath, finalEndOffset)), editorState),
  )
}

export function splitBlock(
  ancestorFunc: (path: Path, root: Block) => Option<[Path, Block]>,
): Transform {
  return (editorState: State): Either<string, State> => {
    const selectionOpt = editorState.contents.selection
    if (selectionOpt._tag === 'None') {
      return left('Nothing is selected')
    }
    const selection = selectionOpt.value
    if (!isCollapsed(selection)) {
      const removedRes = removeRange(editorState)
      if (removedRes._tag === 'Left') return removedRes
      return splitBlock(ancestorFunc)(removedRes.right)
    }

    const ancOpt = ancestorFunc(
      anchorNode(selection),
      editorState.contents.root,
    )
    if (ancOpt._tag === 'None') {
      return left('I cannot find a proper ancestor to split')
    }
    const [ancestorPath, ancestorNode] = ancOpt.value
    const relativePath = anchorNode(selection).slice(ancestorPath.length)

    const splitOpt = splitBlockAtPathAndOffset(
      relativePath,
      anchorOffset(selection),
      ancestorNode,
    )
    if (splitOpt._tag === 'None') {
      return left(
        `Can not split block at path ${anchorNode(selection).join(',')}`,
      )
    }

    const [before, after] = splitOpt.value
    const replaceRes = replaceWithFragment(
      ancestorPath,
      {
        _tag: 'BlockFragment',
        blockFragment: [before, after],
      },
      editorState.contents.root,
    )

    if (replaceRes._tag === 'Left') {
      return replaceRes
    }

    const newSelectionPath = [
      ...increment(ancestorPath),
      ...Array(anchorNode(selection).length - ancestorPath.length).fill(0),
    ]

    const newSelection = caret(newSelectionPath, 0)
    return right(
      withSelection(
        some(newSelection),
        withRoot(replaceRes.right, editorState),
      ),
    )
  }
}

export function splitTextBlock(editorState: State): Either<string, State> {
  return splitBlock(findTextBlockNodeAncestor)(editorState)
}

export function liftEmpty(editorState: State): Either<string, State> {
  // If block is empty list item or quote, lift it
  const selectionOpt = editorState.contents.selection
  if (selectionOpt._tag === 'None') return left('No selection')
  const sel = selectionOpt.value

  const tbOpt = findTextBlockNodeAncestor(
    anchorNode(sel),
    editorState.contents.root,
  )
  if (tbOpt._tag === 'None') return left('No text block')
  const [tbPath, tbNode] = tbOpt.value

  if (isEmptyTextBlock(tbNode)) {
    // Hacky lift empty command: if we're inside list item (len > 2), we can lift.
    if (tbPath.length > 2) {
      return lift(editorState)
    }
  }
  return left('Not an empty block that can be lifted')
}

export function lift(editorState: State): Either<string, State> {
  // Simple lift command that hoists blocks up a level
  const selectionOpt = editorState.contents.selection
  if (selectionOpt._tag === 'None') return left('No selection')
  const sel = selectionOpt.value

  const tbOpt = findTextBlockNodeAncestor(
    anchorNode(sel),
    editorState.contents.root,
  )
  if (tbOpt._tag === 'None') return left('No text block')
  const [tbPath] = tbOpt.value

  if (tbPath.length <= 1) return left('Cannot lift root node')

  const parentPath = parent(tbPath)
  const grandparentPath = parent(parentPath)

  const parentOpt = nodeAt(parentPath, {
    _tag: 'Block',
    value: editorState.contents.root,
  })
  const nodeToLiftOpt = nodeAt(tbPath, {
    _tag: 'Block',
    value: editorState.contents.root,
  })

  if (
    parentOpt._tag === 'None' ||
    nodeToLiftOpt._tag === 'None' ||
    parentOpt.value._tag !== 'Block' ||
    nodeToLiftOpt.value._tag !== 'Block'
  ) {
    return left('Parents not found')
  }

  const nodeToLift = nodeToLiftOpt.value.value
  // Lift node: insert it before or after parent in grandparent
  const parentIndex = parentPath[parentPath.length - 1]
  const idx = tbPath[tbPath.length - 1]

  const grandparentOpt = nodeAt(grandparentPath, {
    _tag: 'Block',
    value: editorState.contents.root,
  })
  if (grandparentOpt._tag === 'None' || grandparentOpt.value._tag !== 'Block') {
    return left('Grandparent not found')
  }

  const grandparent = grandparentOpt.value.value
  const gpC = childNodes(grandparent)
  if (gpC._tag !== 'BlockChildren')
    return left('Expected block children in grandparent')

  const gpArr = [...toBlockArray(gpC.blockChildren.array)]
  gpArr.splice(parentIndex + 1, 0, nodeToLift)

  // Remove the node from the parent
  const parentBlock = parentOpt.value.value
  const pC = childNodes(parentBlock)
  if (pC._tag !== 'BlockChildren')
    return left('Expected block children in parent')
  const pArr = [...toBlockArray(pC.blockChildren.array)]
  pArr.splice(idx, 1)

  if (pArr.length === 0) {
    // If parent is empty, remove it from grandparent too
    gpArr.splice(parentIndex, 1)
  } else {
    gpArr[parentIndex] = withChildNodes(blockChildren(pArr), parentBlock)
  }

  const newGp = withChildNodes(blockChildren(gpArr), grandparent)
  const replacedRes = replace(
    grandparentPath,
    { _tag: 'Block', value: newGp },
    editorState.contents.root,
  )

  if (replacedRes._tag === 'Left') return replacedRes

  const newPath = [...grandparentPath, parentIndex + 1, 0]
  return right(
    withSelection(
      some(caret(newPath, 0)),
      withRoot(replacedRes.right, editorState),
    ),
  )
}

export function wrap(func: (n: Node) => Node, wrapper: Element): Transform {
  return (editorState: State): Either<string, State> => {
    const selectionOpt = editorState.contents.selection
    if (selectionOpt._tag === 'None') return left('No selection')
    const sel = selectionOpt.value

    const tbOpt = findTextBlockNodeAncestor(
      anchorNode(sel),
      editorState.contents.root,
    )
    if (tbOpt._tag === 'None') return left('No text block')
    const [tbPath] = tbOpt.value

    const nodeToWrapOpt = nodeAt(tbPath, {
      _tag: 'Block',
      value: editorState.contents.root,
    })
    if (nodeToWrapOpt._tag === 'None' || nodeToWrapOpt.value._tag !== 'Block') {
      return left('Node not found')
    }

    const nodeToWrap = nodeToWrapOpt.value.value
    const newBlock = block(wrapper, blockChildren([nodeToWrap]))
    const res = replace(
      tbPath,
      { _tag: 'Block', value: newBlock },
      editorState.contents.root,
    )
    if (res._tag === 'Left') return res

    const newSelection = caret([...tbPath, 0, 0], anchorOffset(sel))
    return right(
      withSelection(some(newSelection), withRoot(res.right, editorState)),
    )
  }
}

export function toggleMark(
  order: MarkOrder,
  markVal: Mark,
  action: ToggleAction,
): Transform {
  return (editorState: State): Either<string, State> => {
    return toggleMarkFull(order, markVal, action)(hug(editorState))
  }
}

export function toggleMarkFull(
  markOrder: MarkOrder,
  mark: Mark,
  action: ToggleAction,
): Transform {
  return (editorState: State): Either<string, State> => {
    const selectionOpt = editorState.contents.selection
    if (selectionOpt._tag === 'None') {
      return left('Nothing is selected')
    }
    const selection = selectionOpt.value
    const aN = anchorNode(selection)
    const fN = focusNode(selection)

    if (aN.join(':') === fN.join(':')) {
      return toggleMarkSingleInlineNode(markOrder, mark, action)(editorState)
    }

    const normalizedSelection = normalize(selection)
    const normAN = anchorNode(normalizedSelection)
    const normFN = focusNode(normalizedSelection)

    let toggleAction: ToggleAction
    if (action._tag !== 'Flip') {
      toggleAction = action
    } else {
      const allHaveMark = allRange(
        (node) => isBlockOrInlineNodeWithMark(markName(mark), node),
        normAN,
        normFN,
        editorState.contents.root,
      )
      toggleAction = allHaveMark ? Remove : Add
    }

    // betweenRoot: toggle marks on all inline nodes strictly between anchor and focus
    let betweenRoot: Block = editorState.contents.root
    const afterAnchorOpt = next(normAN, editorState.contents.root)
    if (afterAnchorOpt._tag === 'Some') {
      const [afterAnchor] = afterAnchorOpt.value
      const beforeFocusOpt = previous(normFN, editorState.contents.root)
      if (beforeFocusOpt._tag === 'Some') {
        const [beforeFocus] = beforeFocusOpt.value
        const mappedNode = indexedMap(
          (path, node) => {
            if (
              comparePath(path, afterAnchor) < 0 ||
              comparePath(path, beforeFocus) > 0
            ) {
              return node
            }
            if (node._tag === 'Block') {
              return node
            }
            // inline node: toggle mark
            const il = node.value
            const newMarks = toggle(toggleAction, markOrder, mark, marks(il))
            if (il._tag === 'Text') {
              return {
                _tag: 'Inline' as const,
                value: {
                  _tag: 'Text' as const,
                  text: Text.withMarks(newMarks, il.text),
                },
              }
            } else {
              return {
                _tag: 'Inline' as const,
                value: {
                  _tag: 'InlineElement' as const,
                  inlineElement: InlineElement.withMarks(
                    newMarks,
                    il.inlineElement,
                  ),
                },
              }
            }
          },
          { _tag: 'Block', value: editorState.contents.root },
        )

        if (mappedNode._tag === 'Block') {
          betweenRoot = mappedNode.value
        }
      }
    }

    // modifiedEndNodeEditorState
    const endSel = singleNodeRange(normFN, 0, focusOffset(normalizedSelection))
    const endStateRes = toggleMarkSingleInlineNode(
      markOrder,
      mark,
      toggleAction,
    )(withSelection(some(endSel), withRoot(betweenRoot, editorState)))
    const modifiedEndNodeEditorState =
      endStateRes._tag === 'Right'
        ? endStateRes.right
        : withRoot(betweenRoot, editorState)

    // modifiedStartNodeEditorState
    let modifiedStartNodeEditorState = modifiedEndNodeEditorState
    const startNodeOpt = nodeAt(normAN, {
      _tag: 'Block',
      value: modifiedEndNodeEditorState.contents.root,
    })
    if (startNodeOpt._tag === 'Some') {
      const startNode = startNodeOpt.value
      if (startNode._tag === 'Inline') {
        const il = startNode.value
        const startFocusOffset =
          il._tag === 'Text' ? il.text.contents.text.length : 0
        const startSel = singleNodeRange(
          normAN,
          anchorOffset(normalizedSelection),
          startFocusOffset,
        )
        const startStateRes = toggleMarkSingleInlineNode(
          markOrder,
          mark,
          toggleAction,
        )(withSelection(some(startSel), modifiedEndNodeEditorState))
        if (startStateRes._tag === 'Right') {
          modifiedStartNodeEditorState = startStateRes.right
        }
      }
    }

    const incrementAnchorOffset = anchorOffset(normalizedSelection) !== 0
    const anchorAndFocusHaveSameParent =
      parent(normAN).join(':') === parent(normFN).join(':')

    const newSelection = range(
      incrementAnchorOffset ? increment(normAN) : normAN,
      0,
      incrementAnchorOffset && anchorAndFocusHaveSameParent
        ? increment(normFN)
        : normFN,
      focusOffset(normalizedSelection),
    )

    return right(
      withSelection(some(newSelection), modifiedStartNodeEditorState),
    )
  }
}

export function toggleMarkSingleInlineNode(
  markOrder: MarkOrder,
  mark: Mark,
  action: ToggleAction,
): Transform {
  return (editorState: State): Either<string, State> => {
    const selectionOpt = editorState.contents.selection
    if (selectionOpt._tag === 'None') {
      return left('Nothing is selected')
    }
    const selection = selectionOpt.value
    if (anchorNode(selection).join(':') !== focusNode(selection).join(':')) {
      return left('I can only toggle a single inline node')
    }

    const normalizedSelection = normalize(selection)
    const anchorPath = anchorNode(normalizedSelection)
    const nodeOpt = nodeAt(anchorPath, {
      _tag: 'Block',
      value: editorState.contents.root,
    })
    if (nodeOpt._tag === 'None') {
      return left('No node at selection')
    }

    const node = nodeOpt.value
    if (node._tag === 'Block') {
      return left('Cannot toggle a block node')
    }

    const il = node.value
    const newMarks = toggle(action, markOrder, mark, marks(il))

    let leaves: Array<Inline>
    if (il._tag === 'InlineElement') {
      leaves = [
        {
          _tag: 'InlineElement',
          inlineElement: InlineElement.withMarks(newMarks, il.inlineElement),
        },
      ]
    } else {
      // il._tag === 'Text'
      const leafText = il.text.contents.text
      const fO = focusOffset(normalizedSelection)
      const aO = anchorOffset(normalizedSelection)
      if (leafText.length === fO && aO === 0) {
        leaves = [{ _tag: 'Text', text: Text.withMarks(newMarks, il.text) }]
      } else {
        const newNode: Inline = {
          _tag: 'Text',
          text: Text.withMarks(
            newMarks,
            Text.withText(leafText.substring(aO, fO), il.text),
          ),
        }
        const leftNode: Inline = {
          _tag: 'Text',
          text: Text.withText(leafText.substring(0, aO), il.text),
        }
        const rightNode: Inline = {
          _tag: 'Text',
          text: Text.withText(leafText.substring(fO), il.text),
        }

        if (aO === 0) {
          leaves = [newNode, rightNode]
        } else if (leafText.length === fO) {
          leaves = [leftNode, newNode]
        } else {
          leaves = [leftNode, newNode, rightNode]
        }
      }
    }

    const path =
      anchorOffset(normalizedSelection) === 0
        ? anchorPath
        : increment(anchorPath)
    const newSelection = singleNodeRange(
      path,
      0,
      focusOffset(normalizedSelection) - anchorOffset(normalizedSelection),
    )

    const replaceRes = replaceWithFragment(
      anchorPath,
      {
        _tag: 'InlineFragment',
        inlineFragment: leaves,
      },
      editorState.contents.root,
    )

    if (replaceRes._tag === 'Left') {
      return replaceRes
    }

    return right(
      withSelection(
        some(newSelection),
        withRoot(replaceRes.right, editorState),
      ),
    )
  }
}

export function hugLeft(state: State): State {
  const selectionOpt = state.contents.selection
  if (selectionOpt._tag === 'None') return state
  const selection = selectionOpt.value
  if (isCollapsed(selection)) return state

  const normalizedSelection = normalize(selection)
  const anchorPath = anchorNode(normalizedSelection)
  const root = state.contents.root

  const nodeOpt = nodeAt(anchorPath, { _tag: 'Block', value: root })
  if (nodeOpt._tag === 'None') return state

  const node = nodeOpt.value
  if (node._tag !== 'Inline') return state

  const il = node.value
  if (il._tag !== 'Text') return state

  if (il.text.contents.text.length === anchorOffset(normalizedSelection)) {
    const nextPath = increment(anchorPath)
    const nextNodeOpt = nodeAt(nextPath, { _tag: 'Block', value: root })
    if (nextNodeOpt._tag === 'None') return state

    const nextNode = nextNodeOpt.value
    if (nextNode._tag === 'Inline' && nextNode.value._tag === 'Text') {
      return withSelection(
        some(
          range(
            nextPath,
            0,
            focusNode(normalizedSelection),
            focusOffset(normalizedSelection),
          ),
        ),
        state,
      )
    }
  }

  return state
}

export function hugRight(state: State): State {
  const selectionOpt = state.contents.selection
  if (selectionOpt._tag === 'None') return state
  const selection = selectionOpt.value
  if (isCollapsed(selection)) return state

  const normalizedSelection = normalize(selection)
  const focusPath = focusNode(normalizedSelection)
  const root = state.contents.root

  const nodeOpt = nodeAt(focusPath, { _tag: 'Block', value: root })
  if (nodeOpt._tag === 'None') return state

  const node = nodeOpt.value
  if (node._tag !== 'Inline') return state

  const il = node.value
  if (il._tag !== 'Text') return state

  if (0 === focusOffset(normalizedSelection)) {
    const prevPath = decrement(focusPath)
    const prevNodeOpt = nodeAt(prevPath, { _tag: 'Block', value: root })
    if (prevNodeOpt._tag === 'None') return state

    const prevNode = prevNodeOpt.value
    if (prevNode._tag === 'Inline' && prevNode.value._tag === 'Text') {
      return withSelection(
        some(
          range(
            anchorNode(normalizedSelection),
            anchorOffset(normalizedSelection),
            prevPath,
            prevNode.value.text.contents.text.length,
          ),
        ),
        state,
      )
    }
  }

  return state
}

export function hug(state: State): State {
  return hugRight(hugLeft(state))
}

function isBlockOrInlineNodeWithMark(markNameStr: string, node: Node): boolean {
  if (node._tag === 'Inline') {
    return hasMarkWithName(markNameStr, marks(node.value))
  }
  return true
}

function comparePath(p1: Path, p2: Path): number {
  const len = Math.min(p1.length, p2.length)
  for (let i = 0; i < len; i++) {
    if (p1[i] !== p2[i]) {
      return p1[i] - p2[i]
    }
  }
  return p1.length - p2.length
}

export function toggleTextBlock(
  onParams: Element,
  offParams: Element,
  isCodeBlock: boolean,
): Transform {
  return (editorState: State): Either<string, State> => {
    const selectionOpt = editorState.contents.selection
    if (selectionOpt._tag === 'None') return left('No selection')
    const sel = selectionOpt.value

    const tbOpt = findTextBlockNodeAncestor(
      anchorNode(sel),
      editorState.contents.root,
    )
    if (tbOpt._tag === 'None') return left('No text block')
    const [tbPath, tbNode] = tbOpt.value

    const currentName = tbNode.contents.parameters.contents.name
    const targetName = onParams.contents.name

    const newParams = currentName === targetName ? offParams : onParams
    const newBlock = {
      _tag: 'Block' as const,
      contents: {
        ...tbNode.contents,
        parameters: newParams,
      },
    }

    return pipe(
      replace(
        tbPath,
        { _tag: 'Block', value: newBlock },
        editorState.contents.root,
      ),
      E_map((root) => withRoot(root, editorState)),
    )
  }
}

export function insertNewline(allowedGroups: Array<string>): Transform {
  return (editorState: State): Either<string, State> => {
    const rangeRes = removeRange(editorState)
    const removedRangeEditorState =
      rangeRes._tag === 'Right' ? rangeRes.right : editorState
    const selectionOpt = removedRangeEditorState.contents.selection
    if (selectionOpt._tag === 'None') {
      return left('Invalid selection')
    }
    const selection = selectionOpt.value
    if (!isCollapsed(selection)) {
      return left(
        'I can only try to insert a newline if the selection is collapsed',
      )
    }
    const tbOpt = findTextBlockNodeAncestor(
      anchorNode(selection),
      removedRangeEditorState.contents.root,
    )
    if (tbOpt._tag === 'None') {
      return left('No textblock node ancestor found')
    }
    const [, textblock] = tbOpt.value
    if (allowedGroups.includes(textblock.contents.parameters.contents.name)) {
      return insertText('\n')(removedRangeEditorState)
    }
    return left('Selection is not in a whitelisted textblock element')
  }
}

export function insertAfterBlockLeaf(newBlock: Block): Transform {
  return (editorState: State): Either<string, State> => {
    const selectionOpt = editorState.contents.selection
    if (selectionOpt._tag === 'None') return left('No selection')
    const sel = selectionOpt.value
    const parentPath = parent(anchorNode(sel))
    return pipe(
      insertAfter(
        parentPath,
        { _tag: 'BlockFragment', blockFragment: [newBlock] },
        editorState.contents.root,
      ),
      E_map((root) => withRoot(root, editorState)),
    )
  }
}

export function splitBlockHeaderToNewParagraph(
  headerGroup: Array<string>,
  paragraphBlock: Element,
): Transform {
  return (editorState: State): Either<string, State> => {
    const splitRes = splitTextBlock(editorState)
    if (splitRes._tag === 'Left') {
      return splitRes
    }
    const splitEditorState = splitRes.right
    const selectionOpt = splitEditorState.contents.selection
    if (selectionOpt._tag === 'None') {
      return right(splitEditorState)
    }
    const selection = selectionOpt.value
    if (!isCollapsed(selection) || anchorOffset(selection) !== 0) {
      return right(splitEditorState)
    }

    const p = findClosestBlockPath(
      anchorNode(selection),
      splitEditorState.contents.root,
    )
    const nodeOpt = nodeAt(p, {
      _tag: 'Block',
      value: splitEditorState.contents.root,
    })
    if (nodeOpt._tag === 'None') {
      return right(splitEditorState)
    }

    const node = nodeOpt.value
    if (node._tag !== 'Block') {
      return right(splitEditorState)
    }

    const bn = node.value
    const parameters = bn.contents.parameters
    if (
      headerGroup.includes(parameters.contents.name) &&
      isEmptyTextBlock(bn)
    ) {
      const replacedRes = replace(
        p,
        {
          _tag: 'Block',
          value: withElement(paragraphBlock, bn),
        },
        splitEditorState.contents.root,
      )
      if (replacedRes._tag === 'Left') {
        return right(splitEditorState)
      }
      return right(withRoot(replacedRes.right, splitEditorState))
    }

    return right(splitEditorState)
  }
}

export function insertLineBreak(editorState: State): Either<string, State> {
  return insertInline(inlineElement(element(hardBreak, []), []))(editorState)
}

export function insertInline(inlineNode: Inline): Transform {
  return (editorState: State): Either<string, State> => {
    const selectionOpt = editorState.contents.selection
    if (selectionOpt._tag === 'None') return left('No selection')
    const sel = selectionOpt.value
    const path = anchorNode(sel)
    const offset = anchorOffset(sel)

    const nodeOpt = nodeAt(path, {
      _tag: 'Block',
      value: editorState.contents.root,
    })
    if (
      nodeOpt._tag === 'None' ||
      nodeOpt.value._tag !== 'Inline' ||
      nodeOpt.value.value._tag !== 'Text'
    ) {
      return left('Expected text node')
    }

    const textNode = nodeOpt.value.value.text
    const [t1, t2] = splitTextLeaf(offset, textNode)

    const parentPath = parent(path)
    const parentOpt = nodeAt(parentPath, {
      _tag: 'Block',
      value: editorState.contents.root,
    })
    if (parentOpt._tag === 'None' || parentOpt.value._tag !== 'Block')
      return left('Parent not found')

    const parentBlock = parentOpt.value.value
    const c = childNodes(parentBlock)
    if (c._tag !== 'InlineChildren') return left('Expected inline children')

    const arr = toInlineArray(c.inlineChildren.contents.array)
    const idx = path[path.length - 1]

    const newInlines = [
      ...arr.slice(0, idx),
      { _tag: 'Text' as const, text: t1 },
      inlineNode,
      { _tag: 'Text' as const, text: t2 },
      ...arr.slice(idx + 1),
    ]

    const newBlock = withChildNodes(inlineChildren(newInlines), parentBlock)
    return pipe(
      replace(
        parentPath,
        { _tag: 'Block', value: newBlock },
        editorState.contents.root,
      ),
      E_map((root) => {
        const newSelection = caret([...parentPath, idx + 2], 0)
        return withSelection(some(newSelection), withRoot(root, editorState))
      }),
    )
  }
}

export function insertBlock(newBlock: Block): Transform {
  return (editorState: State): Either<string, State> => {
    const selectionOpt = editorState.contents.selection
    if (selectionOpt._tag === 'None') return left('No selection')
    const sel = selectionOpt.value
    const parentPath = parent(anchorNode(sel))
    return pipe(
      replaceWithFragment(
        parentPath,
        {
          _tag: 'BlockFragment',
          blockFragment: [newBlock],
        },
        editorState.contents.root,
      ),
      E_map((root) => withRoot(root, editorState)),
    )
  }
}
