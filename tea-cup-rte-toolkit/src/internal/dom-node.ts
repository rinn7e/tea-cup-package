import { Either, left, right } from 'fp-ts/lib/Either'
import { Option, none, some } from 'fp-ts/lib/Option'

import { HtmlNode } from '../model/html-node'
import { Path } from '../model/node'
import { zeroWidthSpace } from './constants'
import { TextChange } from './event'

/**
 * A minimal representation of DomNode. It's purpose is to validate the contents of the DOM for any
 * unexpected structural changes that can happen in a contenteditable node before applying changes that may
 * effect to the virtual DOM.
 */
export interface DomNode {
  readonly nodeType: number
  readonly tagName: string | null
  readonly nodeValue: string | null
  readonly childNodes: Array<DomNode> | null
}

/**
 * The DOM text node nodeType value as specified by the w3c spec
 */
export const domTextNodeType = 3

/**
 * The DOM element node nodeType value as specified by the w3c spec
 */
export const domElementNodeType = 1

/**
 * This method extracts the editor nodes by taking the first child of the root node,
 * and then the first child of that node.  The DomNodes we receive from the change event start
 * at the beginning of the content editable, and it should contain one immediate child node that
 * contains the rendered editor nodes.
 */
export function extractRootEditorBlockNode(domNode: DomNode): Option<DomNode> {
  const childNodes = domNode.childNodes
  if (!childNodes || childNodes.length === 0) {
    return none
  }
  return some(childNodes[0])
}

export function findTextChanges(
  htmlNode: HtmlNode,
  domNode: DomNode,
): Either<string, Array<TextChange>> {
  return findTextChangesRec(htmlNode, domNode, [])
}

function findTextChangesRec(
  htmlNode: HtmlNode,
  domNode: DomNode,
  backwardsNodePath: Path,
): Either<string, Array<TextChange>> {
  if (htmlNode._tag === 'ElementNode') {
    const domChildNodes = domNode.childNodes || []
    if (domNode.nodeType !== domElementNodeType) {
      return left(
        'Dom node is a text node, but I was expecting an element node',
      )
    }
    const htmlTagUpper = htmlNode.name.toUpperCase()
    const domTagUpper = domNode.tagName ? domNode.tagName.toUpperCase() : null
    if (htmlTagUpper !== domTagUpper) {
      return left(
        `Dom node's tag was ${domNode.tagName || ''}, but I was expecting ${htmlNode.name}`,
      )
    }
    if (domChildNodes.length !== htmlNode.children.length) {
      return left(
        `Dom node's children length was ${domChildNodes.length}, but I was expecting ${htmlNode.children.length}`,
      )
    }

    const changes: Array<TextChange> = []
    for (let i = 0; i < htmlNode.children.length; i++) {
      const htmlChild = htmlNode.children[i]
      const domChild = domChildNodes[i]
      const res = findTextChangesRec(htmlChild, domChild, [
        i,
        ...backwardsNodePath,
      ])
      if (res._tag === 'Left') {
        return res
      }
      changes.push(...res.right)
    }
    return right(changes)
  } else {
    // TextNode
    if (domNode.nodeType !== domTextNodeType) {
      return left(
        'Dom node was an element node, but I was expecting a text node',
      )
    }
    if (domNode.nodeValue === null) {
      return left('Dom node is a text node, but has no value')
    }
    const domNodeSanitizedText =
      domNode.nodeValue === zeroWidthSpace ? '' : domNode.nodeValue
    if (domNodeSanitizedText !== htmlNode.text) {
      const path = [...backwardsNodePath].reverse()
      return right([[path, domNodeSanitizedText]])
    }
    return right([])
  }
}
