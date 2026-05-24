import { Element } from './element';
import { Mark } from './mark';

export interface InlineElementContents {
  readonly marks: Array<Mark>;
  readonly element: Element;
}

/**
 * `InlineElement` is an element with marks. It represents the contents of an inline node that is
 * not a text node.
 */
export type InlineElement = { readonly _tag: 'InlineElement'; readonly contents: InlineElementContents };

/**
 * Marks from an inline element
 */
export function marks(parameters: InlineElement): Array<Mark> {
  return parameters.contents.marks;
}

/**
 * `Element` from an inline element
 */
export function element(parameters: InlineElement): Element {
  return parameters.contents.element;
}

/**
 * Creates an inline element from an element and a list of marks
 */
export function inlineElement(parameters: Element, m: Array<Mark>): InlineElement {
  return {
    _tag: 'InlineElement',
    contents: {
      element: parameters,
      marks: m,
    },
  };
}

/**
 * Creates an inline element with the new `Element`
 */
export function withElement(e: Element, iparams: InlineElement): InlineElement {
  return {
    _tag: 'InlineElement',
    contents: {
      ...iparams.contents,
      element: e,
    },
  };
}

/**
 * Creates an inline element with the new marks
 */
export function withMarks(m: Array<Mark>, iparams: InlineElement): InlineElement {
  return {
    _tag: 'InlineElement',
    contents: {
      ...iparams.contents,
      marks: m,
    },
  };
}
