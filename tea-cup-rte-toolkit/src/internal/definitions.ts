import { Option } from 'fp-ts/lib/Option';
import { Attribute } from '../model/attribute';
import { HtmlNode } from '../model/html-node';
import { selectable } from './constants';

export type ContentType =
  | { readonly _tag: 'BlockNodeType'; readonly allowedGroups: Option<Set<string>> }
  | { readonly _tag: 'TextBlockNodeType'; readonly allowedGroups: Option<Set<string>>; readonly allowedMarks: Option<Set<string>> }
  | { readonly _tag: 'BlockLeafNodeType' }
  | { readonly _tag: 'InlineLeafNodeType' };

export interface ElementParametersContents {
  readonly name: string;
  readonly attributes: Array<Attribute>;
  readonly annotations: Set<string>;
}

export type Element = { readonly _tag: 'ElementParameters'; readonly contents: ElementParametersContents };

export type ElementToHtml = (element: Element, children: Array<HtmlNode>) => HtmlNode;
export type HtmlToElement = (definition: ElementDefinition, node: HtmlNode) => Option<[Element, Array<HtmlNode>]>;

export interface ElementDefinitionContents {
  readonly name: string;
  readonly toHtmlNode: ElementToHtml;
  readonly group: string;
  readonly contentType: ContentType;
  readonly fromHtmlNode: HtmlToElement;
  readonly selectable: boolean;
}

export type ElementDefinition = { readonly _tag: 'ElementDefinition'; readonly contents: ElementDefinitionContents };

export interface MarkContents {
  readonly name: string;
  readonly attributes: Array<Attribute>;
}

export type Mark = { readonly _tag: 'Mark'; readonly contents: MarkContents };

export type MarkToHtml = (mark: Mark, children: Array<HtmlNode>) => HtmlNode;
export type HtmlToMark = (definition: MarkDefinition, node: HtmlNode) => Option<[Mark, Array<HtmlNode>]>;

export interface MarkDefinitionContents {
  readonly name: string;
  readonly toHtmlNode: MarkToHtml;
  readonly fromHtmlNode: HtmlToMark;
}

export type MarkDefinition = { readonly _tag: 'MarkDefinition'; readonly contents: MarkDefinitionContents };

export function element(def: ElementDefinition, attrs: Array<Attribute>): Element {
  return {
    _tag: 'ElementParameters',
    contents: {
      name: def.contents.name,
      attributes: attrs,
      annotations: def.contents.selectable ? new Set([selectable]) : new Set(),
    },
  };
}

export function nameFromElement(parameters: Element): string {
  return parameters.contents.name;
}

export function attributesFromElement(parameters: Element): Array<Attribute> {
  return parameters.contents.attributes;
}

export function annotationsFromElement(parameters: Element): Set<string> {
  return parameters.contents.annotations;
}

export function elementWithAnnotations(annotations: Set<string>, parameters: Element): Element {
  return {
    _tag: 'ElementParameters',
    contents: {
      ...parameters.contents,
      annotations,
    },
  };
}

export function elementWithAttributes(attrs: Array<Attribute>, parameters: Element): Element {
  return {
    _tag: 'ElementParameters',
    contents: {
      ...parameters.contents,
      attributes: attrs,
    },
  };
}

export function mark(n: MarkDefinition, a: Array<Attribute>): Mark {
  return {
    _tag: 'Mark',
    contents: {
      name: n.contents.name,
      attributes: a,
    },
  };
}

export function nameFromMark(m: Mark): string {
  return m.contents.name;
}

export function attributesFromMark(m: Mark): Array<Attribute> {
  return m.contents.attributes;
}

export function markWithAttributes(attributes_: Array<Attribute>, m: Mark): Mark {
  return {
    _tag: 'Mark',
    contents: {
      ...m.contents,
      attributes: attributes_,
    },
  };
}

export function toStringContentType(contentType: ContentType): string {
  switch (contentType._tag) {
    case 'TextBlockNodeType':
      return 'TextBlockNodeType';
    case 'InlineLeafNodeType':
      return 'InlineLeafNodeType';
    case 'BlockNodeType':
      return 'BlockNodeType';
    case 'BlockLeafNodeType':
      return 'BlockLeafNodeType';
  }
}
