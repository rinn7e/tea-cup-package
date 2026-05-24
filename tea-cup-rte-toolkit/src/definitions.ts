import { Option, none, some, fromNullable } from 'fp-ts/lib/Option';
import { ElementDefinition, elementDefinition, blockNode, blockLeaf, textBlock, inlineLeaf, defaultElementToHtml, defaultHtmlToElement } from './config/element-definition';
import { MarkDefinition, markDefinition, defaultHtmlToMark } from './config/mark-definition';
import { Spec, emptySpec, withElementDefinitions, withMarkDefinitions } from './config/spec';
import { Attribute, findIntegerAttribute, findStringAttribute } from './model/attribute';
import { Element, element } from './model/element';
import { Mark, mark } from './model/mark';
import { HtmlNode } from './model/html-node';
import { selectable } from './annotation';

// Doc definition
export const doc: ElementDefinition = elementDefinition({
  name: 'doc',
  group: 'root',
  contentType: blockNode(['block']),
  toHtmlNode: (el, children) => ({
    _tag: 'ElementNode',
    name: 'div',
    attributes: [['data-rte-doc', 'true']],
    children,
  }),
  fromHtmlNode: (def, node) => {
    if (
      node._tag === 'ElementNode' &&
      node.name === 'div' &&
      node.attributes.length === 1 &&
      node.attributes[0][0] === 'data-rte-doc' &&
      node.attributes[0][1] === 'true'
    ) {
      return some([element(def, []), node.children]);
    }
    return none;
  },
  selectable: false,
});

// Paragraph definition
export const paragraph: ElementDefinition = elementDefinition({
  name: 'paragraph',
  group: 'block',
  contentType: textBlock({ allowedGroups: ['inline'], allowedMarks: [] }),
  toHtmlNode: (el, children) => ({
    _tag: 'ElementNode',
    name: 'p',
    attributes: [],
    children,
  }),
  fromHtmlNode: (def, node) => {
    if (node._tag === 'ElementNode' && node.name === 'p') {
      return some([element(def, []), node.children]);
    }
    return none;
  },
  selectable: false,
});

// Blockquote definition
export const blockquote: ElementDefinition = elementDefinition({
  name: 'blockquote',
  group: 'block',
  contentType: blockNode(['block']),
  toHtmlNode: defaultElementToHtml('blockquote'),
  fromHtmlNode: defaultHtmlToElement('blockquote'),
  selectable: false,
});

// Horizontal rule definition
export const horizontalRule: ElementDefinition = elementDefinition({
  name: 'horizontal_rule',
  group: 'block',
  contentType: blockLeaf,
  toHtmlNode: defaultElementToHtml('hr'),
  fromHtmlNode: (def, node) => {
    if (node._tag === 'ElementNode' && node.name === 'hr') {
      const el = element(def, []);
      // Add selectable annotation
      el.contents.annotations.add(selectable);
      return some([el, []]);
    }
    return none;
  },
  selectable: true,
});

// Heading definition
export const heading: ElementDefinition = elementDefinition({
  name: 'heading',
  group: 'block',
  contentType: textBlock({ allowedGroups: ['inline'], allowedMarks: [] }),
  toHtmlNode: (params, children) => {
    const levelOpt = findIntegerAttribute('level', params.contents.attributes);
    const level = levelOpt._tag === 'Some' ? levelOpt.value : 1;
    return {
      _tag: 'ElementNode',
      name: `h${level}`,
      attributes: [],
      children,
    };
  },
  fromHtmlNode: (def, node) => {
    if (node._tag === 'ElementNode') {
      const match = node.name.match(/^h([1-6])$/);
      if (match) {
        const level = parseInt(match[1], 10);
        return some([
          element(def, [{ _tag: 'IntegerAttribute', key: 'level', value: level }]),
          node.children,
        ]);
      }
    }
    return none;
  },
  selectable: false,
});

// Code block definition
export const codeBlock: ElementDefinition = elementDefinition({
  name: 'code_block',
  group: 'block',
  contentType: textBlock({ allowedGroups: ['text'], allowedMarks: ['__nothing__'] }),
  toHtmlNode: (params, children) => ({
    _tag: 'ElementNode',
    name: 'pre',
    attributes: [],
    children: [
      {
        _tag: 'ElementNode',
        name: 'code',
        attributes: [],
        children,
      },
    ],
  }),
  fromHtmlNode: (def, node) => {
    if (node._tag === 'ElementNode' && node.name === 'pre' && node.children.length === 1) {
      const codeNode = node.children[0];
      if (codeNode._tag === 'ElementNode' && codeNode.name === 'code') {
        return some([element(def, []), codeNode.children]);
      }
    }
    return none;
  },
  selectable: false,
});

function filterAttributesToHtml(attrs: Array<[string, Option<string>]>): Array<[string, string]> {
  const res: Array<[string, string]> = [];
  for (const [k, vOpt] of attrs) {
    if (vOpt._tag === 'Some') {
      res.push([k, vOpt.value]);
    }
  }
  return res;
}

// Image definition
export const image: ElementDefinition = elementDefinition({
  name: 'image',
  group: 'inline',
  contentType: inlineLeaf,
  toHtmlNode: (params, children) => {
    const srcOpt = findStringAttribute('src', params.contents.attributes);
    const altOpt = findStringAttribute('alt', params.contents.attributes);
    const titleOpt = findStringAttribute('title', params.contents.attributes);

    const attributes = filterAttributesToHtml([
      ['src', some(srcOpt._tag === 'Some' ? srcOpt.value : '')],
      ['alt', altOpt],
      ['title', titleOpt],
    ]);

    return {
      _tag: 'ElementNode',
      name: 'img',
      attributes,
      children: [],
    };
  },
  fromHtmlNode: (def, node) => {
    if (node._tag === 'ElementNode' && node.name === 'img') {
      const elementNodeAttributes: Array<Attribute> = [];
      let hasSrc = false;
      for (const [k, v] of node.attributes) {
        if (k === 'src') {
          hasSrc = true;
          elementNodeAttributes.push({ _tag: 'StringAttribute', key: 'src', value: v });
        } else if (k === 'alt') {
          elementNodeAttributes.push({ _tag: 'StringAttribute', key: 'alt', value: v });
        } else if (k === 'title') {
          elementNodeAttributes.push({ _tag: 'StringAttribute', key: 'title', value: v });
        }
      }
      if (hasSrc) {
        const el = element(def, elementNodeAttributes);
        el.contents.annotations.add(selectable);
        return some([el, []]);
      }
    }
    return none;
  },
  selectable: true,
});

// Hard break definition
export const hardBreak: ElementDefinition = elementDefinition({
  name: 'hard_break',
  group: 'inline',
  contentType: inlineLeaf,
  toHtmlNode: defaultElementToHtml('br'),
  fromHtmlNode: defaultHtmlToElement('br'),
  selectable: false,
});

// Lists definitions
export const orderedList: ElementDefinition = elementDefinition({
  name: 'ordered_list',
  group: 'block',
  contentType: blockNode(['list_item']),
  toHtmlNode: (el, children) => ({ _tag: 'ElementNode', name: 'ol', attributes: [], children }),
  fromHtmlNode: defaultHtmlToElement('ol'),
  selectable: false,
});

export const unorderedList: ElementDefinition = elementDefinition({
  name: 'unordered_list',
  group: 'block',
  contentType: blockNode(['list_item']),
  toHtmlNode: (el, children) => ({ _tag: 'ElementNode', name: 'ul', attributes: [], children }),
  fromHtmlNode: defaultHtmlToElement('ul'),
  selectable: false,
});

export const listItem: ElementDefinition = elementDefinition({
  name: 'list_item',
  group: 'list_item',
  contentType: blockNode(['block']),
  toHtmlNode: (el, children) => ({ _tag: 'ElementNode', name: 'li', attributes: [], children }),
  fromHtmlNode: defaultHtmlToElement('li'),
  selectable: false,
});

// Mark definitions
export const link: MarkDefinition = markDefinition({
  name: 'link',
  toHtmlNode: (m, children) => {
    const hrefOpt = findStringAttribute('href', m.contents.attributes);
    const titleOpt = findStringAttribute('title', m.contents.attributes);

    const attributes = filterAttributesToHtml([
      ['href', some(hrefOpt._tag === 'Some' ? hrefOpt.value : '')],
      ['title', titleOpt],
    ]);

    return {
      _tag: 'ElementNode',
      name: 'a',
      attributes,
      children,
    };
  },
  fromHtmlNode: (def, node) => {
    if (node._tag === 'ElementNode' && node.name === 'a') {
      const elementNodeAttributes: Array<Attribute> = [];
      let hasHref = false;
      for (const [k, v] of node.attributes) {
        if (k === 'href') {
          hasHref = true;
          elementNodeAttributes.push({ _tag: 'StringAttribute', key: 'href', value: v });
        } else if (k === 'title') {
          elementNodeAttributes.push({ _tag: 'StringAttribute', key: 'title', value: v });
        }
      }
      if (hasHref) {
        return some([mark(def, elementNodeAttributes), node.children]);
      }
    }
    return none;
  },
});

export const bold: MarkDefinition = markDefinition({
  name: 'bold',
  toHtmlNode: (m, children) => ({ _tag: 'ElementNode', name: 'b', attributes: [], children }),
  fromHtmlNode: defaultHtmlToMark('b'),
});

export const italic: MarkDefinition = markDefinition({
  name: 'italic',
  toHtmlNode: (m, children) => ({ _tag: 'ElementNode', name: 'i', attributes: [], children }),
  fromHtmlNode: defaultHtmlToMark('i'),
});

export const code: MarkDefinition = markDefinition({
  name: 'code',
  toHtmlNode: (m, children) => ({ _tag: 'ElementNode', name: 'code', attributes: [], children }),
  fromHtmlNode: defaultHtmlToMark('code'),
});

// Markdown spec
export const markdown: Spec = withMarkDefinitions(
  [link, bold, italic, code],
  withElementDefinitions(
    [
      doc,
      paragraph,
      blockquote,
      horizontalRule,
      heading,
      codeBlock,
      image,
      hardBreak,
      unorderedList,
      orderedList,
      listItem,
    ],
    emptySpec,
  ),
);
