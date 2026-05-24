import { Option, none, some } from 'fp-ts/lib/Option'

import * as ElementDefinition from '../config/element-definition'
import * as MarkDefinition from '../config/mark-definition'
import { Spec } from '../config/spec'
import { Element } from '../model/element'
import { HtmlNode } from '../model/html-node'
import { Mark } from '../model/mark'
import {
  Block,
  Inline,
  InlineTree,
  Path,
  childNodes,
  element,
  reverseLookup,
  toBlockArray,
  toInlineArray,
  toInlineTree,
} from '../model/node'
import { childNodesPlaceholder, isChildNodesPlaceholder } from './html-node'
import { elementDefinitionWithDefault, markDefinitionWithDefault } from './spec'

function domToEditorInlineLeafTree(
  spec: Spec,
  tree: InlineTree,
  path: Path,
): Option<Path> {
  if (tree._tag === 'LeafNode') {
    return some([tree.value])
  } else {
    // MarkNode
    const n = tree.contents
    const markDefinition = markDefinitionWithDefault(n.mark, spec)
    const structure = MarkDefinition.toHtmlNode(markDefinition)(
      n.mark,
      childNodesPlaceholder,
    )

    const remOpt = removePathUpToChildContents(structure, path)
    if (remOpt._tag === 'None') {
      return none
    }
    const rest = remOpt.value
    if (rest.length === 0) {
      return some([])
    }
    const i = rest[0]
    const child = n.children[i]
    if (child === undefined) {
      return none
    }
    return domToEditorInlineLeafTree(spec, child, rest.slice(1))
  }
}

/**
 * Translates a DOM node path to an editor node path. Returns Nothing if the
 * path is invalid.
 */
export function domToEditor(spec: Spec, node: Block, path: Path): Option<Path> {
  if (path.length === 0) {
    return some([])
  }

  const parameters = element(node)
  const elementDefinition = elementDefinitionWithDefault(parameters, spec)
  const structure = ElementDefinition.toHtmlNode(elementDefinition)(
    parameters,
    childNodesPlaceholder,
  )

  const remOpt = removePathUpToChildContents(structure, path)
  if (remOpt._tag === 'None') {
    return none
  }
  const rest = remOpt.value
  if (rest.length === 0) {
    return some([])
  }
  const i = rest[0]
  const cn = childNodes(node)

  if (cn._tag === 'BlockChildren') {
    const arr = toBlockArray(cn.blockChildren)
    const childNode = arr[i]
    if (childNode === undefined) {
      return none
    }
    const subOpt = domToEditor(spec, childNode, rest.slice(1))
    if (subOpt._tag === 'None') {
      return none
    }
    return some([i, ...subOpt.value])
  } else if (cn._tag === 'InlineChildren') {
    const treeArr = toInlineTree(cn.inlineChildren)
    const tree = treeArr[i]
    if (tree === undefined) {
      return none
    }
    return domToEditorInlineLeafTree(spec, tree, rest.slice(1))
  } else {
    // Leaf
    return none
  }
}

/**
 * Translates an editor node path to a DOM node path. Returns Nothing if the
 * path is invalid.
 */
export function editorToDom(spec: Spec, node: Block, path: Path): Option<Path> {
  if (path.length === 0) {
    return some([])
  }

  const x = path[0]
  const xs = path.slice(1)

  const childPathOpt = pathToChildContentsFromElementParameters(
    spec,
    element(node),
  )
  if (childPathOpt._tag === 'None') {
    return none
  }
  const childPath = childPathOpt.value

  const cn = childNodes(node)
  if (cn._tag === 'BlockChildren') {
    const arr = toBlockArray(cn.blockChildren)
    const childNode = arr[x]
    if (childNode === undefined) {
      return none
    }
    const subOpt = editorToDom(spec, childNode, xs)
    if (subOpt._tag === 'None') {
      return none
    }
    return some([...childPath, x, ...subOpt.value])
  } else if (cn._tag === 'InlineChildren') {
    const rev = reverseLookup(cn.inlineChildren)
    const inlineTreePath = rev[x]
    if (inlineTreePath === undefined) {
      return none
    }
    const childInlineTreePathOpt = pathToChildContentsFromInlineTreePath(
      spec,
      toInlineArray(cn.inlineChildren),
      toInlineTree(cn.inlineChildren),
      inlineTreePath,
    )
    if (childInlineTreePathOpt._tag === 'None') {
      return none
    }
    return some([...childPath, ...childInlineTreePathOpt.value])
  } else {
    // Leaf
    return none
  }
}

function removePathUpToChildContents(node: HtmlNode, path: Path): Option<Path> {
  if (node._tag === 'ElementNode') {
    if (isChildNodesPlaceholder(node.children)) {
      return some(path)
    }
    if (path.length === 0) {
      return some(path)
    }
    const x = path[0]
    const xs = path.slice(1)
    const child = node.children[x]
    if (child === undefined) {
      return none
    }
    return removePathUpToChildContents(child, xs)
  }
  return none
}

function pathToChildContents(node: HtmlNode): Option<Path> {
  if (node._tag === 'ElementNode') {
    if (isChildNodesPlaceholder(node.children)) {
      return some([])
    }
    for (let i = 0; i < node.children.length; i++) {
      const childNode = node.children[i]
      const pathOpt = pathToChildContents(childNode)
      if (pathOpt._tag === 'Some') {
        return some([i, ...pathOpt.value])
      }
    }
    return none
  }
  return none
}

function pathToChildContentsFromMark(spec: Spec, mark: Mark): Option<Path> {
  const markDefinition = markDefinitionWithDefault(mark, spec)
  const markStructure = MarkDefinition.toHtmlNode(markDefinition)(
    mark,
    childNodesPlaceholder,
  )
  return pathToChildContents(markStructure)
}

function pathToChildContentsFromElementParameters(
  spec: Spec,
  parameters: Element,
): Option<Path> {
  const elementDefinition = elementDefinitionWithDefault(parameters, spec)
  const nodeStructure = ElementDefinition.toHtmlNode(elementDefinition)(
    parameters,
    childNodesPlaceholder,
  )
  return pathToChildContents(nodeStructure)
}

function pathToChildContentsFromInlineTreePath(
  spec: Spec,
  array: Array<Inline>,
  treeArray: Array<InlineTree>,
  path: Path,
): Option<Path> {
  if (path.length === 0) {
    return none
  }
  const x = path[0]
  const xs = path.slice(1)

  const tree = treeArray[x]
  if (tree === undefined) {
    return none
  }

  if (tree._tag === 'LeafNode') {
    const l = array[tree.value]
    if (l === undefined) {
      return none
    }
    return some([x])
  } else {
    // MarkNode
    const n = tree.contents
    const pOpt = pathToChildContentsFromMark(spec, n.mark)
    if (pOpt._tag === 'None') {
      return none
    }
    const restOpt = pathToChildContentsFromInlineTreePath(
      spec,
      array,
      n.children,
      xs,
    )
    if (restOpt._tag === 'None') {
      return none
    }
    return some([x, ...pOpt.value, ...restOpt.value])
  }
}
