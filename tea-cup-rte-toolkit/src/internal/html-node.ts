import * as ElementDefinition from '../config/element-definition'
import * as MarkDefinition from '../config/mark-definition'
import { Spec } from '../config/spec'
import { Element } from '../model/element'
import { HtmlNode } from '../model/html-node'
import * as InlineElement from '../model/inline-element'
import { Mark } from '../model/mark'
import {
  Block,
  Children,
  Inline,
  InlineTree,
  element as blockElement,
  childNodes,
  toBlockArray,
  toInlineArray,
  toInlineTree,
} from '../model/node'
import { text as getText } from '../model/text'
import { elementDefinitionWithDefault, markDefinitionWithDefault } from './spec'

export const childNodesPlaceholder: Array<HtmlNode> = [
  {
    _tag: 'ElementNode',
    name: '__child_node_marker__',
    attributes: [],
    children: [],
  },
]

export function isChildNodesPlaceholder(nodes: Array<HtmlNode>): boolean {
  if (nodes.length !== 1) {
    return false
  }
  const first = nodes[0]
  return (
    first._tag === 'ElementNode' &&
    first.name === '__child_node_marker__' &&
    first.attributes.length === 0 &&
    first.children.length === 0
  )
}

export const errorNode: HtmlNode = {
  _tag: 'ElementNode',
  name: 'div',
  attributes: [['class', 'rte-error']],
  children: [],
}

/**
 * Renders marks to their HtmlNode representation.
 */
export function markToHtmlNode(
  spec: Spec,
  mark: Mark,
  children: Array<HtmlNode>,
): HtmlNode {
  const markDefinition = markDefinitionWithDefault(mark, spec)
  return MarkDefinition.toHtmlNode(markDefinition)(mark, children)
}

/**
 * Renders element parameters to their HtmlNode representation.
 */
export function elementToHtmlNode(
  spec: Spec,
  parameters: Element,
  children: Array<HtmlNode>,
): HtmlNode {
  const elementDefinition = elementDefinitionWithDefault(parameters, spec)
  return ElementDefinition.toHtmlNode(elementDefinition)(parameters, children)
}

/**
 * Renders element block nodes to their HtmlNode representation.
 */
export function editorBlockNodeToHtmlNode(spec: Spec, node: Block): HtmlNode {
  return elementToHtmlNode(
    spec,
    blockElement(node),
    childNodesToHtmlNode(spec, childNodes(node)),
  )
}

/**
 * Renders child nodes to their HtmlNode representation.
 */
export function childNodesToHtmlNode(
  spec: Spec,
  childNodesVal: Children,
): Array<HtmlNode> {
  if (childNodesVal._tag === 'BlockChildren') {
    return toBlockArray(childNodesVal.blockChildren).map((b) =>
      editorBlockNodeToHtmlNode(spec, b),
    )
  } else if (childNodesVal._tag === 'InlineChildren') {
    const inlineLeafArray = childNodesVal.inlineChildren
    const array = toInlineArray(inlineLeafArray)
    return toInlineTree(inlineLeafArray).map((tree) =>
      editorInlineLeafTreeToHtmlNode(spec, array, tree),
    )
  } else {
    return []
  }
}

/**
 * Renders text nodes to their HtmlNode representation.
 */
export function textToHtmlNode(text: string): HtmlNode {
  return {
    _tag: 'TextNode',
    text,
  }
}

export function editorInlineLeafTreeToHtmlNode(
  spec: Spec,
  array: Array<Inline>,
  tree: InlineTree,
): HtmlNode {
  if (tree._tag === 'LeafNode') {
    const l = array[tree.value]
    if (l === undefined) {
      return errorNode
    }
    return editorInlineLeafToHtmlNode(spec, l)
  } else {
    const n = tree.contents
    return markToHtmlNode(
      spec,
      n.mark,
      n.children.map((c) => editorInlineLeafTreeToHtmlNode(spec, array, c)),
    )
  }
}

/**
 * Renders inline leaf nodes to their HtmlNode representation.
 */
export function editorInlineLeafToHtmlNode(spec: Spec, node: Inline): HtmlNode {
  if (node._tag === 'Text') {
    return textToHtmlNode(getText(node.text))
  } else {
    return elementToHtmlNode(
      spec,
      InlineElement.element(node.inlineElement),
      [],
    )
  }
}
