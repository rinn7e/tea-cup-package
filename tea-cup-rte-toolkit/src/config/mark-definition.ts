import { none, some } from 'fp-ts/lib/Option'

import * as Internal from '../internal/definitions'
import { ElementNode } from '../model/html-node'

export type MarkDefinition = Internal.MarkDefinition
export type MarkToHtml = Internal.MarkToHtml
export type HtmlToMark = Internal.HtmlToMark

export function markDefinition(
  contents: Internal.MarkDefinitionContents,
): MarkDefinition {
  return {
    _tag: 'MarkDefinition',
    contents,
  }
}

export function name(definition_: MarkDefinition): string {
  return definition_.contents.name
}

export function toHtmlNode(definition_: MarkDefinition): MarkToHtml {
  return definition_.contents.toHtmlNode
}

export function fromHtmlNode(definition_: MarkDefinition): HtmlToMark {
  return definition_.contents.fromHtmlNode
}

export function defaultMarkDefinition(name_: string): MarkDefinition {
  return markDefinition({
    name: name_,
    toHtmlNode: defaultMarkToHtml(name_),
    fromHtmlNode: defaultHtmlToMark(name_),
  })
}

export function defaultMarkToHtml(tag: string): MarkToHtml {
  return (mark_, children) => {
    const attrs: Array<[string, string]> = []
    for (const attr of mark_.contents.attributes) {
      if (attr._tag === 'StringAttribute') {
        attrs.push([attr.key, attr.value])
      }
    }
    return ElementNode(tag, attrs, children)
  }
}

export function defaultHtmlToMark(htmlTag: string): HtmlToMark {
  return (def, node) => {
    if (node._tag === 'ElementNode' && node.name === htmlTag) {
      return some([Internal.mark(def, []), node.children])
    }
    return none
  }
}
