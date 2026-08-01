import { Either, left, right } from 'fp-ts/lib/Either'
import { some } from 'fp-ts/lib/Option'

import { annotateSelection, clearSelectionAnnotations } from '../annotation'
import {
  joinBackward,
  joinForward,
  removeRange,
  splitTextBlock,
} from '../commands'
import { Transform } from '../config/command'
import { Spec } from '../config/spec'
import {
  Block,
  Inline,
  block,
  childNodes,
  inlineChildren,
  parent,
  plainText,
} from '../model/node'
import {
  anchorNode,
  anchorOffset,
  caret,
  isCollapsed,
} from '../model/selection'
import { State, withRoot, withSelection } from '../model/state'
import {
  Fragment,
  findTextBlockNodeAncestor,
  insertAfter,
  nodeAt,
  replaceWithFragment,
  splitTextLeaf,
} from '../node'
import { zeroWidthSpace } from './constants'
import { Editor, applyNamedCommandList } from './editor'
import { PasteEvent } from './event'
import { htmlToElementArray } from './spec'

/**
 * Handle a clipboard paste event by trying to parse the clipboard contents as HTML or text.
 */
export function handlePaste(
  event: PasteEvent,
  spec: Spec,
  editor_: Editor,
): Editor {
  const commandArray: Array<
    [string, { _tag: 'TransformCommand'; transform: Transform }]
  > = [
    [
      'pasteHtml',
      {
        _tag: 'TransformCommand',
        transform: pasteHtml(spec, event.html),
      },
    ],
    [
      'pasteText',
      {
        _tag: 'TransformCommand',
        transform: pasteText(event.text),
      },
    ],
  ]

  const res = applyNamedCommandList(commandArray, spec, editor_)
  if (res._tag === 'Right') {
    return res.right
  }
  return editor_
}

/**
 * Paste plain text at the editor's current selection.
 */
export function pasteText(text: string): Transform {
  return (editorState: State): Either<string, State> => {
    if (text.length === 0) {
      return left('There is no text to paste')
    }

    const selectionOpt = editorState.contents.selection
    if (selectionOpt._tag === 'None') {
      return left('Nothing is selected')
    }

    const selection = selectionOpt.value
    if (!isCollapsed(selection)) {
      const removedRes = removeRange(editorState)
      if (removedRes._tag === 'Left') {
        return removedRes
      }
      return pasteText(text)(removedRes.right)
    }

    const lines = text.replace(new RegExp(zeroWidthSpace, 'g'), '').split('\n')
    const tbOpt = findTextBlockNodeAncestor(
      anchorNode(selection),
      editorState.contents.root,
    )
    if (tbOpt._tag === 'None') {
      return left('I can only paste text if there is a text block ancestor')
    }

    const [, tbNode] = tbOpt.value
    const newLines = lines.map((line) =>
      block(
        {
          _tag: 'ElementParameters' as const,
          contents: {
            name: tbNode.contents.parameters.contents.name,
            attributes: [],
            annotations: new Set(),
          },
        },
        inlineChildren([plainText(line)]),
      ),
    )

    const fragment: Fragment = {
      _tag: 'BlockFragment',
      blockFragment: newLines,
    }

    return pasteFragment(fragment)(editorState)
  }
}

/**
 * Paste HTML contents into the editor, validating it against the spec schema.
 */
export function pasteHtml(spec: Spec, html: string): Transform {
  return (editorState: State): Either<string, State> => {
    if (html.length === 0) {
      return left('There is no html to paste')
    }

    const fragRes = htmlToElementArray(spec, html)
    if (fragRes._tag === 'Left') {
      return fragRes
    }

    let stateAcc: State = editorState
    for (const fragment of fragRes.right) {
      const res = pasteFragment(fragment)(stateAcc)
      if (res._tag === 'Left') {
        return res
      }
      stateAcc = res.right
    }

    return right(stateAcc)
  }
}

/**
 * Paste an editor Fragment at the selection.
 */
export function pasteFragment(fragment: Fragment): Transform {
  return (editorState: State): Either<string, State> => {
    if (fragment._tag === 'InlineFragment') {
      return pasteInlineArray(fragment.inlineFragment)(editorState)
    } else {
      return pasteBlockArray(fragment.blockFragment)(editorState)
    }
  }
}

/**
 * Paste inline nodes at the editor selection.
 */
export function pasteInlineArray(inlineFragment: Array<Inline>): Transform {
  return (editorState: State): Either<string, State> => {
    const selectionOpt = editorState.contents.selection
    if (selectionOpt._tag === 'None') {
      return left('Nothing is selected')
    }

    const selection = selectionOpt.value
    if (!isCollapsed(selection)) {
      const removedRes = removeRange(editorState)
      if (removedRes._tag === 'Left') {
        return removedRes
      }
      return pasteInlineArray(inlineFragment)(removedRes.right)
    }

    const tbOpt = findTextBlockNodeAncestor(
      anchorNode(selection),
      editorState.contents.root,
    )
    if (tbOpt._tag === 'None') {
      return left('I can only paste an inline array into a text block node')
    }

    const [path, node] = tbOpt.value
    const cNodes = childNodes(node)
    if (cNodes._tag !== 'InlineChildren') {
      return left('I cannot add an inline array to a block array')
    }

    const anchorNodePath = anchorNode(selection)
    if (anchorNodePath.length === 0) {
      return left('Invalid state, somehow the anchor node is the root node')
    }

    const index = anchorNodePath[anchorNodePath.length - 1]
    const inlineArray = cNodes.inlineChildren.contents.array
    const inlineNode = inlineArray[index]
    if (!inlineNode) {
      return left('Invalid anchor node path')
    }

    if (inlineNode._tag === 'Text') {
      const [previous, nextText] = splitTextLeaf(
        anchorOffset(selection),
        inlineNode.text,
      )
      const newFragment = [
        { _tag: 'Text' as const, text: previous },
        ...inlineFragment,
        { _tag: 'Text' as const, text: nextText },
      ]

      const replaceResult = replaceWithFragment(
        anchorNodePath,
        { _tag: 'InlineFragment', inlineFragment: newFragment },
        editorState.contents.root,
      )

      if (replaceResult._tag === 'Left') {
        return replaceResult
      }

      const newSelection = caret(
        [...path, index + inlineFragment.length + 1],
        0,
      )
      return right(
        withSelection(
          some(newSelection),
          withRoot(replaceResult.right, editorState),
        ),
      )
    } else {
      const replaceResult = replaceWithFragment(
        anchorNodePath,
        { _tag: 'InlineFragment', inlineFragment },
        editorState.contents.root,
      )

      if (replaceResult._tag === 'Left') {
        return replaceResult
      }

      const newSelection = caret(
        [...path, index + inlineFragment.length - 1],
        0,
      )
      return right(
        withSelection(
          some(newSelection),
          withRoot(replaceResult.right, editorState),
        ),
      )
    }
  }
}

/**
 * Paste block nodes at the editor selection.
 */
export function pasteBlockArray(blockFragment: Array<Block>): Transform {
  return (editorState: State): Either<string, State> => {
    const selectionOpt = editorState.contents.selection
    if (selectionOpt._tag === 'None') {
      return left('Nothing is selected')
    }

    const selection = selectionOpt.value
    if (!isCollapsed(selection)) {
      const removedRes = removeRange(editorState)
      if (removedRes._tag === 'Left') {
        return removedRes
      }
      return pasteBlockArray(blockFragment)(removedRes.right)
    }

    const parentPath = parent(anchorNode(selection))
    const parentNodeOpt = nodeAt(parentPath, {
      _tag: 'Block',
      value: editorState.contents.root,
    })
    if (parentNodeOpt._tag === 'None') {
      return left('I cannot find the parent node of the selection')
    }

    const parentNode = parentNodeOpt.value
    if (parentNode._tag === 'Inline') {
      return left('Invalid parent node')
    }

    const cNodes = childNodes(parentNode.value)
    if (cNodes._tag === 'Leaf') {
      return left('Invalid parent node, somehow the parent node was a leaf')
    }

    if (cNodes._tag === 'BlockChildren') {
      const replaceResult = replaceWithFragment(
        anchorNode(selection),
        { _tag: 'BlockFragment', blockFragment },
        editorState.contents.root,
      )

      if (replaceResult._tag === 'Left') {
        return replaceResult
      }

      const anchorNodePath = anchorNode(selection)
      if (anchorNodePath.length === 0) {
        return left('Invalid anchor node, somehow the parent is root')
      }

      const index = anchorNodePath[anchorNodePath.length - 1]
      const newSelection = caret(
        [...parentPath, index + blockFragment.length - 1],
        0,
      )
      return right(
        withSelection(
          some(newSelection),
          withRoot(replaceResult.right, editorState),
        ),
      )
    } else {
      // InlineChildren
      const splitRes = splitTextBlock(editorState)
      if (splitRes._tag === 'Left') {
        return splitRes
      }

      const splitEditorState = splitRes.right
      const splitSelectionOpt = splitEditorState.contents.selection
      if (splitSelectionOpt._tag === 'None') {
        return left('Invalid editor state selection after split action.')
      }

      const splitSelection = splitSelectionOpt.value
      const annotatedSelectionRoot = annotateSelection(
        splitSelection,
        splitEditorState.contents.root,
      )

      const addedNodesRootRes = insertAfter(
        parentPath,
        { _tag: 'BlockFragment', blockFragment },
        annotatedSelectionRoot,
      )

      if (addedNodesRootRes._tag === 'Left') {
        return addedNodesRootRes
      }

      const addNodesEditorState = withRoot(addedNodesRootRes.right, editorState)
      const joinForwardStateRes = joinForward(
        withSelection(
          some(caret(anchorNode(selection), anchorOffset(selection))),
          addNodesEditorState,
        ),
      )

      const joinBeginningState =
        joinForwardStateRes._tag === 'Right'
          ? joinForwardStateRes.right
          : addNodesEditorState

      const annotatedSelection = clearSelectionAnnotations(
        joinBeginningState.contents.root,
      ) // Wait, selectionFromAnnotations in Elm
      // Let's just find the selection path: we can clear annotations or lookup
      const joinEndStateRes = joinBackward(
        withSelection(some(splitSelection), joinBeginningState),
      )
      const joinEndState =
        joinEndStateRes._tag === 'Right'
          ? joinEndStateRes.right
          : joinBeginningState

      return right(
        withRoot(
          clearSelectionAnnotations(joinEndState.contents.root),
          joinEndState,
        ),
      )
    }
  }
}
