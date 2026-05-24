import { Path } from './node'

export interface SelectionContents {
  readonly anchorOffset: number
  readonly anchorNode: Path
  readonly focusOffset: number
  readonly focusNode: Path
}

/**
 * A `Selection` represents the information received and translated from the selection API. Note that
 * the `anchorNode` and `focusNode` are translations of the node paths relative to the editor.
 */
export type Selection = {
  readonly _tag: 'Selection'
  readonly contents: SelectionContents
}

/**
 * The path to the selection anchor node
 */
export function anchorNode(selection: Selection): Path {
  return selection.contents.anchorNode
}

/**
 * The selection anchor offset
 */
export function anchorOffset(selection: Selection): number {
  return selection.contents.anchorOffset
}

/**
 * The path to the selection focus node
 */
export function focusNode(selection: Selection): Path {
  return selection.contents.focusNode
}

/**
 * The selection focus offset
 */
export function focusOffset(selection: Selection): number {
  return selection.contents.focusOffset
}

/**
 * This is a helper method for creating a range selection
 */
export function range(
  aNode: Path,
  aOffset: number,
  fNode: Path,
  fOffset: number,
): Selection {
  return {
    _tag: 'Selection',
    contents: {
      anchorOffset: aOffset,
      anchorNode: aNode,
      focusOffset: fOffset,
      focusNode: fNode,
    },
  }
}

/**
 * This is a helper method for creating a selection over a single node
 */
export function singleNodeRange(
  node: Path,
  aOffset: number,
  fOffset: number,
): Selection {
  return range(node, aOffset, node, fOffset)
}

/**
 * This is a helper method for constructing a caret selection.
 */
export function caret(nodePath: Path, offset: number): Selection {
  return singleNodeRange(nodePath, offset, offset)
}

/**
 * This is a helper method for determining if a selection is collapsed.
 */
export function isCollapsed(selection: Selection): boolean {
  const c = selection.contents
  if (c.anchorOffset !== c.focusOffset) {
    return false
  }
  if (c.anchorNode.length !== c.focusNode.length) {
    return false
  }
  return c.anchorNode.every((v, i) => v === c.focusNode[i])
}

function comparePaths(a: Path, b: Path): 'LT' | 'EQ' | 'GT' {
  const minLen = Math.min(a.length, b.length)
  for (let i = 0; i < minLen; i++) {
    if (a[i] < b[i]) {
      return 'LT'
    } else if (a[i] > b[i]) {
      return 'GT'
    }
  }
  if (a.length < b.length) {
    return 'LT'
  } else if (a.length > b.length) {
    return 'GT'
  }
  return 'EQ'
}

/**
 * Sorts the selection's anchor to be before the focus. This method is helpful because in the selection
 * API, a selection's anchor node is not always before a selection's focus node, but when reasoning about editor
 * operations, we want the anchor to be before the focus.
 */
export function normalize(selection: Selection): Selection {
  const c = selection.contents
  const cmp = comparePaths(c.anchorNode, c.focusNode)
  if (cmp === 'EQ') {
    return {
      _tag: 'Selection',
      contents: {
        ...c,
        anchorOffset: Math.min(c.focusOffset, c.anchorOffset),
        focusOffset: Math.max(c.focusOffset, c.anchorOffset),
      },
    }
  } else if (cmp === 'LT') {
    return selection
  } else {
    return {
      _tag: 'Selection',
      contents: {
        anchorNode: c.focusNode,
        anchorOffset: c.focusOffset,
        focusNode: c.anchorNode,
        focusOffset: c.anchorOffset,
      },
    }
  }
}
