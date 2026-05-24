import { Either, left, right } from 'fp-ts/lib/Either';
import { Spec } from './config/spec';
import { Block } from './model/node';
import { HtmlNode } from './model/html-node';
import { Fragment } from './node';
import { editorBlockNodeToHtmlNode } from './internal/html-node';
import { htmlToElementArray } from './internal/spec';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function htmlNodeToString(node: HtmlNode): string {
  if (node._tag === 'TextNode') {
    return escapeHtml(node.text);
  }
  const attrs = node.attributes.map(([k, v]) => ` ${k}="${escapeHtml(v)}"`).join('');
  const children = node.children.map(htmlNodeToString).join('');
  const selfClosing = ['img', 'br', 'hr', 'input'].includes(node.name.toLowerCase());
  if (selfClosing && children.length === 0) {
    return `<${node.name}${attrs}>`;
  }
  return `<${node.name}${attrs}>${children}</${node.name}>`;
}

/**
 * Converts a block to an HtmlNode.
 */
export function toHtmlNode(spec: Spec, block: Block): HtmlNode {
  return editorBlockNodeToHtmlNode(spec, block);
}

/**
 * Converts a block to an html string.
 */
export function toHtml(spec: Spec, block: Block): string {
  return htmlNodeToString(toHtmlNode(spec, block));
}

/**
 * Decodes an html string to an array of editor fragments.
 */
export function fromHtml(spec: Spec, html: string): Either<string, Array<Fragment>> {
  return htmlToElementArray(spec, html);
}

/**
 * Convenience function that parses html and returns the first editor block that was decoded.
 */
export function blockFromHtml(spec: Spec, html: string): Either<string, Block> {
  const fragRes = htmlToElementArray(spec, html);
  if (fragRes._tag === 'Left') {
    return fragRes;
  }
  const fragment = fragRes.right;
  const f = fragment[0];
  if (!f) {
    return left('There are no fragments to parse');
  }
  if (f._tag === 'BlockFragment') {
    const blockVal = f.blockFragment[0];
    if (!blockVal) {
      return left('Invalid initial fragment');
    }
    return right(blockVal);
  }
  return left('I was expecting a block, but instead I received an inline');
}
