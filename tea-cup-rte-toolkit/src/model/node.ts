import { Element } from './element'
import * as InlineElementMod from './inline-element'
import { Mark, name } from './mark'
import * as Text from './text'

/**
 * A node path is a list of indexes that represent the path from a node to a child. It's
 * the main type used to identify where a node is in the editor.
 */
export type Path = Array<number>

/**
 * Returns the parent path of the given path
 */
export function parent(path: Path): Path {
  return path.slice(0, path.length - 1)
}

/**
 * Increments the last index in a node path if one exists.
 */
export function increment(np: Path): Path {
  if (np.length === 0) {
    return []
  }
  const last = np[np.length - 1]
  return [...np.slice(0, np.length - 1), last + 1]
}

/**
 * Decrements the last index in a node path if one exists.
 */
export function decrement(np: Path): Path {
  if (np.length === 0) {
    return []
  }
  const last = np[np.length - 1]
  return [...np.slice(0, np.length - 1), last - 1]
}

/**
 * String representation of a path.
 */
export function toString(nodePath: Path): string {
  return nodePath.join(':')
}

/**
 * Returns the common ancestor of the two paths.
 */
export function commonAncestor(xPath: Path, yPath: Path): Path {
  const result: Path = []
  const minLen = Math.min(xPath.length, yPath.length)
  for (let i = 0; i < minLen; i++) {
    if (xPath[i] === yPath[i]) {
      result.push(xPath[i])
    } else {
      break
    }
  }
  return result
}

/**
 * A `Block` represents a block element in your document. A block can either
 * have other block nodes as children, have all inline leaf nodes as children (e.g a text block),
 * or be a leaf node.
 */
export type Block = {
  readonly _tag: 'Block'
  readonly contents: {
    readonly parameters: Element
    readonly childNodes: Children
  }
}

/**
 * Creates a block node.
 */
export function block(parameters: Element, cn: Children): Block {
  return {
    _tag: 'Block',
    contents: { parameters, childNodes: cn },
  }
}

/**
 * the element from a block node
 */
export function element(node: Block): Element {
  return node.contents.parameters
}

/**
 * the childNodes from a block node.
 */
export function childNodes(node: Block): Children {
  return node.contents.childNodes
}

/**
 * a block node with the given element set
 */
export function withElement(parameters: Element, node: Block): Block {
  return {
    _tag: 'Block',
    contents: {
      ...node.contents,
      parameters,
    },
  }
}

/**
 * a block node with the given children set
 */
export function withChildNodes(cn: Children, node: Block): Block {
  return {
    _tag: 'Block',
    contents: {
      ...node.contents,
      childNodes: cn,
    },
  }
}

/**
 * `BlockChildren` are child nodes that are all blocks.
 */
export type BlockChildren = {
  readonly _tag: 'BlockArray'
  readonly array: Array<Block>
}

/**
 * `InlineChildren` are child nodes that are all inline. Internally, it's represented as both
 * a flat structure (which can be accessed via `inlineArray`), and a hierarchical structure
 * (which can be accessed via `inlineTree`).
 */
export type InlineChildren = {
  readonly _tag: 'InlineLeafArray'
  readonly contents: InlineLeafArrayContents
}

export interface InlineLeafArrayContents {
  readonly array: Array<Inline>
  readonly tree: Array<InlineTree>
  readonly reverseLookup: Array<Path>
}

/**
 * Children represents what children an editor block node can have. A block node may have
 * other block nodes as children, inline leaf nodes as children, or it may be a leaf itself.
 */
export type Children =
  | { readonly _tag: 'BlockChildren'; readonly blockChildren: BlockChildren }
  | { readonly _tag: 'InlineChildren'; readonly inlineChildren: InlineChildren }
  | { readonly _tag: 'Leaf' }

export const Leaf: Children = { _tag: 'Leaf' }

/**
 * Creates children from a block array
 */
export function blockChildren(arr: Array<Block>): Children {
  return {
    _tag: 'BlockChildren',
    blockChildren: { _tag: 'BlockArray', array: arr },
  }
}

/**
 * Returns a block array from block children
 */
export function toBlockArray(arr: BlockChildren | Array<Block>): Array<Block> {
  if (Array.isArray(arr)) {
    return arr
  }
  return arr.array
}

/**
 * an array of inline nodes (flat structure)
 */
export function toInlineArray(
  arr: InlineChildren | Array<Inline>,
): Array<Inline> {
  if (Array.isArray(arr)) {
    return arr
  }
  return arr.contents.array
}

/**
 * a tree of mark nodes with inline leaf indices
 */
export function toInlineTree(arr: InlineChildren): Array<InlineTree> {
  return arr.contents.tree
}

/**
 * a lookup array that maps the index of the inline array to its path in the inline tree
 */
export function reverseLookup(arr: InlineChildren): Array<Path> {
  return arr.contents.reverseLookup
}

/**
 * An inline tree is the nested structure of an inline array. Because marks when rendered can span
 * multiple inline nodes, inline content is still technically hierarchical. When rendering or
 * parsing, it can be useful to see this information as a tree instead of an array.
 */
export type InlineTree =
  | {
      readonly _tag: 'MarkNode'
      readonly contents: {
        readonly mark: Mark
        readonly children: Array<InlineTree>
      }
    }
  | { readonly _tag: 'LeafNode'; readonly value: number }

/**
 * An inline leaf node represents an inline element in your document. It can either be an inline
 * leaf node, like an image or line break, or a text node.
 */
export type Inline =
  | {
      readonly _tag: 'InlineElement'
      readonly inlineElement: InlineElementMod.InlineElement
    }
  | { readonly _tag: 'Text'; readonly text: Text.Text }

/**
 * A Inline that represents plain text
 */
export function plainText(s: string): Inline {
  return {
    _tag: 'Text',
    text: Text.withText(s, Text.empty),
  }
}

/**
 * Creates an `Inline` from an `Element` and `Mark`
 */
export function inlineElement(parameters: Element, marks: Array<Mark>): Inline {
  return {
    _tag: 'InlineElement',
    inlineElement: InlineElementMod.inlineElement(parameters, marks),
  }
}

/**
 * Creates an inline that represents some text with marks
 */
export function markedText(s: string, marks_: Array<Mark>): Inline {
  return {
    _tag: 'Text',
    text: Text.withMarks(marks_, Text.withText(s, Text.empty)),
  }
}

/**
 * Derives the marks from an inline node
 */
export function marks(leaf: Inline): Array<Mark> {
  if (leaf._tag === 'Text') {
    return Text.marks(leaf.text)
  } else {
    return InlineElementMod.marks(leaf.inlineElement)
  }
}

function groupWhile<A>(
  pred: (x: A, y: A) => boolean,
  list: Array<A>,
): Array<[A, Array<A>]> {
  const result: Array<[A, Array<A>]> = []
  if (list.length === 0) {
    return result
  }
  let currentHead = list[0]
  let currentGroup: Array<A> = []
  for (let i = 1; i < list.length; i++) {
    const item = list[i]
    if (pred(currentHead, item)) {
      currentGroup.push(item)
    } else {
      result.push([currentHead, currentGroup])
      currentHead = item
      currentGroup = []
    }
  }
  result.push([currentHead, currentGroup])
  return result
}

interface Prepared {
  readonly index: number
  readonly head: Mark | null
  readonly tail: Array<Mark>
}

interface RecElement {
  readonly index: number
  readonly marks: Array<Mark>
}

/**
 * Transforms a list of list of marks to an array of inline tree nodes
 */
export function marksToMarkNodeList(
  markLists: Array<Array<Mark>>,
): Array<InlineTree> {
  const indexed = markLists.map((marks, i) => ({ index: i, marks }))
  return marksToMarkNodeListRec(indexed)
}

function marksToMarkNodeListRec(list: Array<RecElement>): Array<InlineTree> {
  const prepared: Array<Prepared> = list.map((item) => ({
    index: item.index,
    head: item.marks.length > 0 ? item.marks[0] : null,
    tail: item.marks.slice(1),
  }))

  const groups = groupWhile((a, b) => {
    if (a.head === null) {
      return b.head === null
    }
    if (b.head === null) {
      return false
    }
    return name(a.head) === name(b.head)
  }, prepared)

  const result: Array<InlineTree> = []
  for (const [headGroup, restGroup] of groups) {
    if (headGroup.head === null) {
      result.push({ _tag: 'LeafNode', value: headGroup.index })
      for (const item of restGroup) {
        result.push({ _tag: 'LeafNode', value: item.index })
      }
    } else {
      const recurseList: Array<RecElement> = [
        { index: headGroup.index, marks: headGroup.tail },
        ...restGroup.map((item) => ({ index: item.index, marks: item.tail })),
      ]
      result.push({
        _tag: 'MarkNode',
        contents: {
          mark: headGroup.head,
          children: marksToMarkNodeListRec(recurseList),
        },
      })
    }
  }
  return result
}

export function inlineTreeToPaths(
  forwardsPath: Path,
  tree: Array<InlineTree>,
): Array<Path> {
  const paths: Array<Path> = []
  tree.forEach((n, i) => {
    if (n._tag === 'LeafNode') {
      paths.push([...forwardsPath, i])
    } else {
      const childPaths = inlineTreeToPaths(
        [...forwardsPath, i],
        n.contents.children,
      )
      paths.push(...childPaths)
    }
  })
  return paths
}

/**
 * Creates children derived from an inline array.
 */
export function inlineChildren(arr: Array<Inline>): Children {
  const tree = marksToMarkNodeList(arr.map(marks))
  return {
    _tag: 'InlineChildren',
    inlineChildren: {
      _tag: 'InlineLeafArray',
      contents: {
        array: arr,
        tree: tree,
        reverseLookup: inlineTreeToPaths([], tree),
      },
    },
  }
}
