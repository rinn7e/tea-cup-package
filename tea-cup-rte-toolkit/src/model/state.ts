import { Option, none, some } from 'fp-ts/lib/Option';
import { Either, left, right } from 'fp-ts/lib/Either';
import { Spec } from '../config/spec';
import { ContentType, toStringContentType } from '../internal/definitions';
import { elementDefinitionWithDefault } from '../internal/spec';
import { annotateSelection, clearSelectionAnnotations, selection as selectionAnnot } from '../annotation';
import {
  Block,
  Inline,
  Path,
  childNodes,
  element,
  inlineChildren,
  toBlockArray,
  toInlineArray,
  withChildNodes,
  withElement,
  marks as inlineMarks,
} from './node';
import { Selection, anchorNode, anchorOffset, focusNode, focusOffset, range } from './selection';
import * as Text from './text';
import { map, findTextBlockNodeAncestor } from '../node';
import * as ElementDefinition from '../config/element-definition';
import * as InlineElement from './inline-element';
import * as Mark from './mark';

export interface StateContents {
  readonly root: Block;
  readonly selection: Option<Selection>;
}

/**
 * A `State` consists of a root block and a selection. `State` allows you to keep
 * track of and manipulate the contents of the editor.
 */
export type State = { readonly _tag: 'State'; readonly contents: StateContents };

/**
 * Creates a `State`. The arguments are as follows:
 *
 *   - `root` is a block node that represents the root of the editor.
 *
 *   - `selection` is a `Maybe Selection` that is the selected part of the editor
 */
export function state(root_: Block, sel_: Option<Selection>): State {
  return {
    _tag: 'State',
    contents: { root: root_, selection: sel_ },
  };
}

/**
 * the selection from the state
 */
export function selection(st: State): Option<Selection> {
  return st.contents.selection;
}

/**
 * the root node from the state
 */
export function root(st: State): Block {
  return st.contents.root;
}

/**
 * a state with the given selection
 */
export function withSelection(sel: Option<Selection>, st: State): State {
  return {
    _tag: 'State',
    contents: {
      ...st.contents,
      selection: sel,
    },
  };
}

/**
 * a state with the given root
 */
export function withRoot(node: Block, st: State): State {
  return {
    _tag: 'State',
    contents: {
      ...st.contents,
      root: node,
    },
  };
}

function removeExtraEmptyTextLeaves(inlineLeaves: Array<Inline>): Array<Inline> {
  if (inlineLeaves.length < 2) {
    return inlineLeaves;
  }
  const [x, y, ...xs] = inlineLeaves;
  if (x._tag === 'Text') {
    if (y._tag === 'Text') {
      const xText = Text.text(x.text);
      const yText = Text.text(y.text);
      if (xText === '' && !Text.annotations(x.text).has(selectionAnnot)) {
        return removeExtraEmptyTextLeaves([y, ...xs]);
      } else if (yText === '' && !Text.annotations(y.text).has(selectionAnnot)) {
        return removeExtraEmptyTextLeaves([x, ...xs]);
      } else {
        return [x, ...removeExtraEmptyTextLeaves([y, ...xs])];
      }
    } else {
      return [x, ...removeExtraEmptyTextLeaves([y, ...xs])];
    }
  } else {
    return [x, ...removeExtraEmptyTextLeaves([y, ...xs])];
  }
}

function areMarksEqual(a: Array<Mark.Mark>, b: Array<Mark.Mark>): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    const ma = a[i];
    const mb = b[i];
    if (ma.contents.name !== mb.contents.name) {
      return false;
    }
    if (ma.contents.attributes.length !== mb.contents.attributes.length) {
      return false;
    }
    for (let j = 0; j < ma.contents.attributes.length; j++) {
      const attrA = ma.contents.attributes[j];
      const attrB = mb.contents.attributes[j];
      if (attrA.key !== attrB.key || attrA.value !== attrB.value) {
        return false;
      }
    }
  }
  return true;
}

function mergeSimilarInlineLeaves(inlineLeaves: Array<Inline>): Array<Inline> {
  if (inlineLeaves.length < 2) {
    return inlineLeaves;
  }
  const [x, y, ...xs] = inlineLeaves;
  if (x._tag === 'Text') {
    if (y._tag === 'Text') {
      const marksX = Text.marks(x.text);
      const marksY = Text.marks(y.text);
      if (areMarksEqual(marksX, marksY)) {
        const mergedText = Text.withText(Text.text(x.text) + Text.text(y.text), x.text);
        return mergeSimilarInlineLeaves([{ _tag: 'Text', text: mergedText }, ...xs]);
      } else {
        return [x, ...mergeSimilarInlineLeaves([y, ...xs])];
      }
    } else {
      return [x, ...mergeSimilarInlineLeaves([y, ...xs])];
    }
  } else {
    return [x, ...mergeSimilarInlineLeaves([y, ...xs])];
  }
}

function reduceNode(node: Block): Block {
  const mapped = map(
    (x) => {
      if (x._tag === 'Block') {
        const bn = x.value;
        const cn = childNodes(bn);
        if (cn._tag === 'InlineChildren') {
          const arr = toInlineArray(cn.inlineChildren);
          const reducedList = mergeSimilarInlineLeaves(removeExtraEmptyTextLeaves(arr));
          return {
            _tag: 'Block',
            value: withChildNodes(inlineChildren(reducedList), bn),
          };
        }
      }
      return x;
    },
    { _tag: 'Block', value: node },
  );

  if (mapped._tag === 'Block') {
    return mapped.value;
  }
  return node;
}

/**
 * Reduces the state with the following rules:
 *
 *   - Neighboring text nodes with the same marks are merged into one text node
 *   - Empty text nodes (regardless of marks) that are not part of the current collapsed
 *     selection are removed if there is another neighboring text node
 */
export function reduce(editorState: State): State {
  const selOpt = selection(editorState);
  let markedRoot: Block;
  if (selOpt._tag === 'None') {
    markedRoot = root(editorState);
  } else {
    markedRoot = annotateSelection(selOpt.value, root(editorState));
  }
  const reducedRoot = clearSelectionAnnotations(reduceNode(markedRoot));
  return translateReducedTextBlockSelection(reducedRoot, editorState);
}

/**
 * Just the selection translation function that gets called in `reduce`. Note that this is really only
 * useful if you're creating transforms that merge or remove inline nodes and you can't find a way
 * to easily figure out the new selection state.
 */
export function translateReducedTextBlockSelection(rootBlock: Block, st: State): State {
  const selOpt = selection(st);
  if (selOpt._tag === 'None') {
    return withRoot(rootBlock, st);
  }
  const sel = selOpt.value;
  const [aP, aO] = translatePath(root(st), rootBlock, anchorNode(sel), anchorOffset(sel));
  const [fP, fO] = translatePath(root(st), rootBlock, focusNode(sel), focusOffset(sel));
  return withSelection(some(range(aP, aO, fP, fO)), withRoot(rootBlock, st));
}

function areBlocksEqual(a: Block, b: Block): boolean {
  if (a.contents.parameters.contents.name !== b.contents.parameters.contents.name) {
    return false;
  }
  const cnA = childNodes(a);
  const cnB = childNodes(b);
  if (cnA._tag !== cnB._tag) {
    return false;
  }
  if (cnA._tag === 'BlockChildren' && cnB._tag === 'BlockChildren') {
    const arrA = toBlockArray(cnA.blockChildren);
    const arrB = toBlockArray(cnB.blockChildren);
    if (arrA.length !== arrB.length) {
      return false;
    }
    for (let i = 0; i < arrA.length; i++) {
      if (!areBlocksEqual(arrA[i], arrB[i])) {
        return false;
      }
    }
    return true;
  } else if (cnA._tag === 'InlineChildren' && cnB._tag === 'InlineChildren') {
    const arrA = toInlineArray(cnA.inlineChildren);
    const arrB = toInlineArray(cnB.inlineChildren);
    if (arrA.length !== arrB.length) {
      return false;
    }
    for (let i = 0; i < arrA.length; i++) {
      const leafA = arrA[i];
      const leafB = arrB[i];
      if (leafA._tag !== leafB._tag) {
        return false;
      }
      if (leafA._tag === 'Text' && leafB._tag === 'Text') {
        if (Text.text(leafA.text) !== Text.text(leafB.text)) {
          return false;
        }
        if (!areMarksEqual(Text.marks(leafA.text), Text.marks(leafB.text))) {
          return false;
        }
      } else if (leafA._tag === 'InlineElement' && leafB._tag === 'InlineElement') {
        if (
          leafA.inlineElement.contents.element.contents.name !==
          leafB.inlineElement.contents.element.contents.name
        ) {
          return false;
        }
      }
    }
    return true;
  }
  return false;
}

function translatePath(oldBlock: Block, newBlock: Block, path: Path, offset: number): [Path, number] {
  const oldOpt = findTextBlockNodeAncestor(path, oldBlock);
  if (oldOpt._tag === 'None') {
    return [path, offset];
  }
  const newOpt = findTextBlockNodeAncestor(path, newBlock);
  if (newOpt._tag === 'None') {
    return [path, offset];
  }
  const [_, oldN] = oldOpt.value;
  const [__, newN] = newOpt.value;
  if (areBlocksEqual(oldN, newN)) {
    return [path, offset];
  }

  const oldCn = childNodes(oldN);
  if (oldCn._tag === 'InlineChildren') {
    if (path.length === 0) {
      return [path, offset];
    }
    const lastIndex = path[path.length - 1];
    const newCn = childNodes(newN);
    if (newCn._tag === 'InlineChildren') {
      const pOff = parentOffset(toInlineArray(oldCn.inlineChildren), lastIndex, offset);
      const [cI, cO] = childOffset(toInlineArray(newCn.inlineChildren), pOff);
      const newPath = [...path.slice(0, path.length - 1), cI];
      return [newPath, cO];
    }
  }
  return [path, offset];
}

function parentOffset(leaves: Array<Inline>, index: number, offset: number): number {
  let accOffset = offset;
  for (let i = 0; i < leaves.length; i++) {
    const l = leaves[i];
    if (i < index) {
      if (l._tag === 'Text') {
        accOffset += Text.text(l.text).length;
      } else {
        accOffset += 1;
      }
    }
  }
  return accOffset;
}

function childOffset(leaves: Array<Inline>, offset: number): [number, number] {
  let i = 0;
  let accOffset = offset;
  let done = false;
  for (const l of leaves) {
    if (done) {
      break;
    }
    if (accOffset <= 0) {
      done = true;
      break;
    }
    if (l._tag === 'Text') {
      const len = Text.text(l.text).length;
      if (accOffset <= len) {
        done = true;
      } else {
        i += 1;
        accOffset -= len;
      }
    } else {
      i += 1;
      accOffset -= 1;
    }
  }
  return [i, accOffset];
}

/**
 * Validates the state against the spec and returns the valid state if everything is okay, otherwise
 * returns a comma separated string of error messages.
 */
export function validate(spec: Spec, editorState: State): Either<string, State> {
  const rootBlock = root(editorState);
  const errors = validateEditorBlockNode(spec, some(new Set(['root'])), rootBlock);
  if (errors.length === 0) {
    return right(editorState);
  }
  return left(errors.join(', '));
}

function validateAllowedMarks(allowedMarks: Option<Set<string>>, leaf: Inline): Array<string> {
  if (allowedMarks._tag === 'None') {
    return [];
  }
  const allowed = allowedMarks.value;
  const leafMarkNames = inlineMarks(leaf).map((m) => Mark.name(m));
  const notAllowed = leafMarkNames.filter((name) => !allowed.has(name));
  if (notAllowed.length === 0) {
    return [];
  }
  return [
    `Inline node is only allowed the following marks: ${Array.from(allowed).join(',')}, but found ${notAllowed.join(',')}`,
  ];
}

function validateInlineLeaf(
  spec: Spec,
  allowedGroups: Option<Set<string>>,
  allowedMarks: Option<Set<string>>,
  leaf: Inline,
): Array<string> {
  const markErrors = validateAllowedMarks(allowedMarks, leaf);
  if (leaf._tag === 'Text') {
    return markErrors;
  } else {
    const il = leaf.inlineElement;
    const definition = elementDefinitionWithDefault(InlineElement.element(il), spec);
    const groupErrors = validateAllowedGroups(allowedGroups, definition.contents.group, definition.contents.name);
    return [...markErrors, ...groupErrors];
  }
}

function validateAllowedGroups(allowedGroups: Option<Set<string>>, group: string, name: string): Array<string> {
  if (allowedGroups._tag === 'None') {
    return [];
  }
  const groups = allowedGroups.value;
  if (groups.has(group)) {
    return [];
  }
  if (groups.has(name)) {
    return [];
  }
  return [`Group ${group} is not in allowed groups [${Array.from(groups).join(', ')}]`];
}

function validateEditorBlockNode(spec: Spec, allowedGroups: Option<Set<string>>, node: Block): Array<string> {
  const parameters = element(node);
  const definition = elementDefinitionWithDefault(parameters, spec);
  const allowedGroupsErrors = validateAllowedGroups(allowedGroups, definition.contents.group, definition.contents.name);

  if (allowedGroupsErrors.length > 0) {
    return allowedGroupsErrors;
  }

  const contentType = ElementDefinition.contentType(definition);
  const cn = childNodes(node);

  if (cn._tag === 'BlockChildren') {
    if (contentType._tag === 'BlockNodeType') {
      const groups = contentType.allowedGroups;
      const arr = toBlockArray(cn.blockChildren);
      const errors: Array<string> = [];
      for (const b of arr) {
        errors.push(...validateEditorBlockNode(spec, groups, b));
      }
      return errors;
    } else {
      return [`I was expecting textblock content type, but instead I got ${toStringContentType(contentType)}`];
    }
  } else if (cn._tag === 'InlineChildren') {
    if (contentType._tag === 'TextBlockNodeType') {
      const arr = toInlineArray(cn.inlineChildren);
      const errors: Array<string> = [];
      for (const leaf of arr) {
        errors.push(...validateInlineLeaf(spec, contentType.allowedGroups, contentType.allowedMarks, leaf));
      }
      return errors;
    } else {
      return [`I was expecting textblock content type, but instead I got ${toStringContentType(contentType)}`];
    }
  } else {
    if (contentType._tag === 'BlockLeafNodeType') {
      return [];
    } else {
      return [`I was expecting leaf blockleaf content type, but instead I got ${toStringContentType(contentType)}`];
    }
  }
}
