import { Option, none, some } from 'fp-ts/lib/Option';
import * as Internal from '../internal/definitions';
import { ElementNode } from '../model/html-node';

export type ContentType = Internal.ContentType;
export type ElementDefinition = Internal.ElementDefinition;
export type ElementToHtml = Internal.ElementToHtml;
export type HtmlToElement = Internal.HtmlToElement;

export function elementDefinition(contents: Internal.ElementDefinitionContents): ElementDefinition {
  return {
    _tag: 'ElementDefinition',
    contents,
  };
}

export function selectable(definition_: ElementDefinition): boolean {
  return definition_.contents.selectable;
}

export function name(definition_: ElementDefinition): string {
  return definition_.contents.name;
}

export function group(definition_: ElementDefinition): string {
  return definition_.contents.group;
}

export function toHtmlNode(definition_: ElementDefinition): ElementToHtml {
  return definition_.contents.toHtmlNode;
}

export function fromHtmlNode(definition_: ElementDefinition): HtmlToElement {
  return definition_.contents.fromHtmlNode;
}

export function contentType(definition_: ElementDefinition): ContentType {
  return definition_.contents.contentType;
}

export const inlineLeaf: ContentType = { _tag: 'InlineLeafNodeType' };
export const blockLeaf: ContentType = { _tag: 'BlockLeafNodeType' };

export function blockNode(allowedGroups: Array<string>): ContentType {
  return {
    _tag: 'BlockNodeType',
    allowedGroups: allowedGroups.length === 0 ? none : some(new Set(allowedGroups)),
  };
}

export function textBlock(config: { allowedGroups: Array<string>; allowedMarks: Array<string> }): ContentType {
  return {
    _tag: 'TextBlockNodeType',
    allowedGroups: config.allowedGroups.length === 0 ? none : some(new Set(config.allowedGroups)),
    allowedMarks: config.allowedMarks.length === 0 ? none : some(new Set(config.allowedMarks)),
  };
}

export function defaultElementDefinition(name_: string, group_: string, contentType_: ContentType): ElementDefinition {
  return elementDefinition({
    name: name_,
    group: group_,
    contentType: contentType_,
    toHtmlNode: defaultElementToHtml(name_),
    fromHtmlNode: defaultHtmlToElement(name_),
    selectable: false,
  });
}

export function defaultElementToHtml(tagName: string): ElementToHtml {
  return (elementParameters, children) => {
    const attrs: Array<[string, string]> = [];
    for (const attr of elementParameters.contents.attributes) {
      if (attr._tag === 'StringAttribute') {
        attrs.push([attr.key, attr.value]);
      }
    }
    return ElementNode(tagName, attrs, children);
  };
}

export function defaultHtmlToElement(htmlTag: string): HtmlToElement {
  return (def, node) => {
    if (node._tag === 'ElementNode' && node.name === htmlTag) {
      return some([Internal.element(def, []), node.children]);
    }
    return none;
  };
}
