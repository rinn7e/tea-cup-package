import { Either, left, right } from 'fp-ts/lib/Either';
import { Option, none, some } from 'fp-ts/lib/Option';
import { Spec, elementDefinitions, markDefinitions, elementDefinition, markDefinition } from '../config/spec';
import { defaultElementDefinition, blockNode } from '../config/element-definition';
import { defaultMarkDefinition } from '../config/mark-definition';
import { zeroWidthSpace } from './constants';
import { ContentType, nameFromElement, nameFromMark } from './definitions';
import { Element } from '../model/element';
import { HtmlNode } from '../model/html-node';
import { inlineElement } from '../model/node';
import { Mark, markOrderFromSpec, toggle, Add } from '../model/mark';
import { Block, Children, Inline, blockChildren, inlineChildren } from '../model/node';
import * as Text from '../model/text';
import { Fragment } from '../node';
import * as ElementDefinition from '../config/element-definition';
import * as MarkDefinition from '../config/mark-definition';

function resultFilterMap<A, B>(f: (x: A) => Either<string, B>, xs: Array<A>): [Array<B>, Array<string>] {
  const successes: Array<B> = [];
  const errors: Array<string> = [];
  for (const x of xs) {
    const res = f(x);
    if (res._tag === 'Right') {
      successes.push(res.right);
    } else {
      errors.push(res.left);
    }
  }
  return [successes, errors];
}

export function htmlToElementArray(spec: Spec, html: string): Either<string, Array<Fragment>> {
  const htmlNodeArray = stringToHtmlNodeArray(html);
  const [newArray, errList] = resultFilterMap((node) => htmlNodeToEditorFragment(spec, [], node), htmlNodeArray);

  if (newArray.length !== htmlNodeArray.length) {
    return left(
      'Could not create a valid editor node array from html node array:\n' +
        errList.map((err) => '\n' + err).join(''),
    );
  }
  return right(reduceEditorFragmentArray(newArray));
}

export function htmlNodeToEditorFragment(
  spec: Spec,
  marks: Array<Mark>,
  node: HtmlNode,
): Either<string, Fragment> {
  if (node._tag === 'TextNode') {
    return right({
      _tag: 'InlineFragment',
      inlineFragment: [
        {
          _tag: 'Text',
          text: Text.withMarks(
            marks,
            Text.withText(node.text.replace(new RegExp(zeroWidthSpace, 'g'), ''), Text.empty),
          ),
        },
      ],
    });
  }

  // ElementNode
  const definitions = elementDefinitions(spec);
  let maybeElementAndChildren: [ElementDefinition.ElementDefinition, [Element, Array<HtmlNode>]] | null = null;
  for (const definition of definitions) {
    const fromHtmlNode = definition.contents.fromHtmlNode;
    const vOpt = fromHtmlNode(definition, node);
    if (vOpt._tag === 'Some') {
      maybeElementAndChildren = [definition, vOpt.value];
      break;
    }
  }

  if (maybeElementAndChildren !== null) {
    const [definition, [elementVal, children]] = maybeElementAndChildren;
    const contentType = ElementDefinition.contentType(definition);
    if (contentType._tag === 'InlineLeafNodeType') {
      return right({
        _tag: 'InlineFragment',
        inlineFragment: [inlineElement(elementVal, marks)],
      });
    } else {
      const childArr = children.map((child) => htmlNodeToEditorFragment(spec, [], child));
      const childNodesRes = arrayToChildNodes(contentType, childArr);
      if (childNodesRes._tag === 'Left') {
        return childNodesRes;
      }
      return right({
        _tag: 'BlockFragment',
        blockFragment: [
          {
            _tag: 'Block',
            contents: {
              parameters: elementVal,
              childNodes: childNodesRes.right,
            },
          },
        ],
      });
    }
  }

  // Check if it's a mark
  const markOpt = htmlNodeToMark(spec, node);
  if (markOpt._tag === 'None') {
    return left('No mark or node matches the spec');
  }

  const [markVal, children] = markOpt.value;
  const newMarks = toggle(Add, markOrderFromSpec(spec), markVal, marks);
  const newChildren = children.map((child) => htmlNodeToEditorFragment(spec, newMarks, child));
  return arrayToFragment(newChildren);
}

export function htmlNodeToMark(spec: Spec, node: HtmlNode): Option<[Mark, Array<HtmlNode>]> {
  const definitions = markDefinitions(spec);
  for (const definition of definitions) {
    const fromHtmlNode = definition.contents.fromHtmlNode;
    const mOpt = fromHtmlNode(definition, node);
    if (mOpt._tag === 'Some') {
      return mOpt;
    }
  }
  return none;
}

export function reduceEditorFragmentArray(fragmentArray: Array<Fragment>): Array<Fragment> {
  const result: Array<Fragment> = [];
  for (const fragment of fragmentArray) {
    if (result.length === 0) {
      result.push(fragment);
    } else {
      const prevFragment = result[result.length - 1];
      if (prevFragment._tag === 'InlineFragment') {
        if (fragment._tag === 'InlineFragment') {
          result[result.length - 1] = {
            _tag: 'InlineFragment',
            inlineFragment: [...prevFragment.inlineFragment, ...fragment.inlineFragment],
          };
        } else {
          result.push(fragment);
        }
      } else {
        // BlockFragment
        if (fragment._tag === 'BlockFragment') {
          result[result.length - 1] = {
            _tag: 'BlockFragment',
            blockFragment: [...prevFragment.blockFragment, ...fragment.blockFragment],
          };
        } else {
          result.push(fragment);
        }
      }
    }
  }
  return result;
}

export function arrayToChildNodes(
  contentType: ContentType,
  results: Array<Either<string, Fragment>>,
): Either<string, Children> {
  if (results.length === 0) {
    if (contentType._tag === 'BlockLeafNodeType') {
      return right({ _tag: 'Leaf' });
    } else {
      return left('Invalid node type for empty fragment result array');
    }
  }

  const fragmentRes = arrayToFragment(results);
  if (fragmentRes._tag === 'Left') {
    return fragmentRes;
  }

  const fragment = fragmentRes.right;
  if (fragment._tag === 'InlineFragment') {
    if (contentType._tag === 'TextBlockNodeType') {
      return right(inlineChildren(fragment.inlineFragment));
    } else {
      return left("I received an inline leaf fragment, but the node I parsed doesn't accept this child type");
    }
  } else {
    // BlockFragment
    if (contentType._tag === 'BlockNodeType') {
      return right(blockChildren(fragment.blockFragment));
    } else {
      return left("I received a block node fragment, but the node I parsed doesn't accept this child type");
    }
  }
}

export function arrayToFragment(results: Array<Either<string, Fragment>>): Either<string, Fragment> {
  const resultList: Array<Fragment> = [];
  for (const res of results) {
    if (res._tag === 'Left') {
      return res;
    }
    resultList.push(res.right);
  }

  const reducedArray = reduceEditorFragmentArray(resultList);
  if (reducedArray.length === 0) {
    return left('Unable to parse an editor fragment from the results');
  }

  const fragment = reducedArray[0];
  if (reducedArray.length !== 1) {
    return left('I received both inline and block fragments, which is invalid.');
  }

  return right(fragment);
}

export function stringToHtmlNodeArray(html: string): Array<HtmlNode> {
  if (typeof document === 'undefined') {
    return [];
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return domNodeListToHtmlNodeArray(doc.body.childNodes);
}

function domNodeListToHtmlNodeArray(nodes: NodeListOf<Node>): Array<HtmlNode> {
  const result: Array<HtmlNode> = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const name = element.tagName.toLowerCase();
      if (name !== 'meta') {
        const attributes: Array<[string, string]> = [];
        for (let j = 0; j < element.attributes.length; j++) {
          const attr = element.attributes[j];
          attributes.push([attr.name, attr.value]);
        }
        result.push({
          _tag: 'ElementNode',
          name,
          attributes,
          children: domNodeListToHtmlNodeArray(element.childNodes),
        });
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      result.push({
        _tag: 'TextNode',
        text: node.nodeValue || '',
      });
    }
  }
  return result;
}

export function markDefinitionWithDefault(markVal: Mark, spec: Spec): MarkDefinition.MarkDefinition {
  const name = nameFromMark(markVal);
  const defOpt = markDefinition(name, spec);
  if (defOpt._tag === 'Some') {
    return defOpt.value;
  }
  return defaultMarkDefinition(name);
}

export function elementDefinitionWithDefault(ele: Element, spec: Spec): ElementDefinition.ElementDefinition {
  const name = nameFromElement(ele);
  const defOpt = elementDefinition(name, spec);
  if (defOpt._tag === 'Some') {
    return defOpt.value;
  }
  return defaultElementDefinition(name, 'block', blockNode([]));
}
