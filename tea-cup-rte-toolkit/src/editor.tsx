import * as React from 'react';
import { Option, none, some } from 'fp-ts/lib/Option';
import * as O from 'fp-ts/lib/Option';
import { Either, left, right } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';

import type { Spec } from './config/spec';
import type { CommandMap, NamedCommand, NamedCommandList } from './config/command';
import {
  topLevelAttributes,
  elementDecorations,
  markDecorations,
} from './config/decorations';
import type {
  Decorations,
  Attribute,
} from './config/decorations';
import type { Message } from './internal/message';
import * as BeforeInput from './internal/before-input';
import * as KeyDown from './internal/key-down';
import * as Paste from './internal/paste';
import * as DomNodeInternal from './internal/dom-node';
import * as TextMod from './model/text';
import * as NodeMod from './model/node';
import type { EditorChange } from './internal/event';
import * as InternalEditor from './internal/editor';
import type { Editor } from './internal/editor';
import { state, applyCommand, areSelectionsEqual } from './internal/editor';
import type { State } from './model/state';
import {
  withRoot,
  withSelection,
  selection as stateSelection,
  root as stateRoot,
} from './model/state';
import type { History } from './model/history';
import type { SelectionObject } from './web-component';
import type { Selection } from './model/selection';
import {
  range,
  anchorOffset,
  anchorNode,
  focusOffset,
  focusNode,
  isCollapsed,
} from './model/selection';
import type { Block, Inline, Path, InlineTree } from './model/node';
import {
  childNodes,
  toBlockArray,
  toInlineArray,
  toInlineTree,
  toString as pathToString,
  withChildNodes,
  blockChildren,
} from './model/node';
import { isChildNodesPlaceholder, childNodesPlaceholder } from './internal/html-node';
import { elementDefinitionWithDefault, markDefinitionWithDefault } from './internal/spec';
import * as ElementDefinition from './config/element-definition';
import * as MarkDefinition from './config/mark-definition';
import { nodeAt } from './node';
import { annotateSelection } from './annotation';
import { domToEditor, editorToDom } from './internal/selection';
import { preventDefaultOnBeforeInputDecoder } from './internal/before-input';
import { preventDefaultOn as preventDefaultOnKeyDown } from './internal/key-down';
import type { HtmlNode } from './model/html-node';
import type { Mark } from './model/mark';
import type { Element } from './model/element';
import type { KeyboardEvent, InputEvent } from './internal/event';
import type { DomNode } from './internal/dom-node';
import { domElementNodeType, domTextNodeType } from './internal/dom-node';
import { removeRange } from './commands';
import { transform } from './config/command';

// Import web components to make sure they are registered
import './web-component';

/**
 * This type represents your Editor configuration, e.g. the non-comparable things that define
 * the behavior of the editor. This includes the document specification, key and input event command
 * bindings, decorative functions, and tagger function.
 */
export interface Config<Msg> {
  readonly decorations: Decorations<Msg>;
  readonly spec: Spec;
  readonly commandMap: CommandMap;
  readonly toMsg: (msg: Message) => Msg;
}

/**
 * Create the config for your `view` and `update` functions.
 *
 *     import RichText.Commands exposing (defaultCommandMap)
 *     import RichText.Config.Decorations exposing (emptyDecorations)
 *     import RichText.Definitions exposing (markdown)
 *
 *     type MyMsg
 *         = InternalMsg Message | ...
 *
 *     myConfig : Config
 *     myConfig =
 *         config
 *             { decorations = emptyDecorations
 *             , commandMap = defaultCommandMap
 *             , spec = markdown
 *             , toMsg = InternalMsg
 *             }
 *
 */
export function config<Msg>(cfg: {
  decorations: Decorations<Msg>;
  spec: Spec;
  commandMap: CommandMap;
  toMsg: (msg: Message) => Msg;
}): Config<Msg> {
  return cfg;
}

/**
 * The decorations from the config object.
 */
export function decorations<Msg>(cfg: Config<Msg>): Decorations<Msg> {
  return cfg.decorations;
}

/**
 * The spec from the config object.
 */
export function spec<Msg>(cfg: Config<Msg>): Spec {
  return cfg.spec;
}

/**
 * The commandMap from the config object.
 */
export function commandMap<Msg>(cfg: Config<Msg>): CommandMap {
  return cfg.commandMap;
}

function updateSelection(
  maybeSelection: Option<Selection>,
  isDomPath: boolean,
  spec_: Spec,
  editor_: Editor,
): Editor {
  const editorState = state(editor_);
  if (maybeSelection._tag === 'None') {
    if (stateSelection(editorState)._tag === 'None') {
      return editor_;
    }
    return InternalEditor.withState(withSelection(O.none, editorState), editor_);
  }

  const selection = maybeSelection.value;
  const translatedSelection = isDomPath
    ? domToEditor(spec_, stateRoot(editorState), selection)
    : O.some(selection);

  const currentSelection = stateSelection(editorState);
  if (areSelectionsEqual(currentSelection, translatedSelection)) {
    return editor_;
  }

  if (InternalEditor.isComposing(editor_)) {
    const buffered = O.toNullable(InternalEditor.bufferedEditorState(editor_)) || editorState;
    return InternalEditor.withBufferedEditorState(O.some(withSelection(translatedSelection, buffered)), editor_);
  } else {
    return InternalEditor.withState(withSelection(translatedSelection, editorState), editor_);
  }
}

/**
 * The editor's internal update function. It's important that the editor process all `Message`
 * events with the update function so it doesn't go out of sync with the virtual DOM.
 *
 *     update : Msg -> Model -> ( Model, Cmd Msg )
 *     update msg model =
 *         case msg of
 *             EditorMsg editorMsg ->
 *                 ( { model | editor = RichText.Editor.update config editorMsg model.editor }, Cmd.none )
 *
 */
export function update<Msg>(cfg: Config<Msg>, msg: Message, editor_: Editor): Editor {
  const spec_ = cfg.spec;
  const commandMap_ = cfg.commandMap;

  switch (msg._tag) {
    case 'ChangeEvent':
      return updateChangeEvent(msg.change, spec_, editor_);

    case 'SelectionEvent':
      return updateSelection(msg.selection, msg.force, spec_, editor_);

    case 'BeforeInputEvent': {
      return BeforeInput.handleBeforeInput(msg.event, commandMap_, spec_, editor_);
    }

    case 'CompositionStart':
      return InternalEditor.withComposing(true, editor_);

    case 'CompositionEnd':
      return handleCompositionEnd(editor_);

    case 'KeyDownEvent': {
      return KeyDown.handleKeyDown(msg.event, commandMap_, spec_, editor_);
    }

    case 'PasteWithDataEvent': {
      return Paste.handlePaste(msg.event, spec_, editor_);
    }

    case 'CutEvent':
      return handleCut(spec_, editor_);

    case 'Init':
      return InternalEditor.withShortKey(msg.event.shortKey, editor_);
  }
}

function handleCut(spec_: Spec, editor_: Editor): Editor {
  const cmd = transform(removeRange);
  const res = applyCommand(['removeRangeSelection', cmd], spec_, editor_);
  if (res._tag === 'Right') {
    return InternalEditor.forceRerender(res.right);
  }
  return editor_;
}

function textChangesDomToEditor(
  spec_: Spec,
  editorNode: Block,
  changes: Array<[Path, string]>,
): Option<Array<[Path, string]>> {
  const result: Array<[Path, string]> = [];
  for (const [p, text] of changes) {
    const translatedPath = domToEditor(spec_, editorNode, range(p, 0, p, 0));
    if (translatedPath._tag === 'None') {
      return none;
    }
    result.push([anchorNode(translatedPath.value), text]);
  }
  return some(result);
}

function deriveTextChanges(
  spec_: Spec,
  editorNode: Block,
  domNode: DomNode,
): Either<string, Array<[Path, string]>> {
  const htmlNode = ElementDefinition.toHtmlNode(
    elementDefinitionWithDefault(editorNode.contents.parameters, spec_),
  )(
    editorNode.contents.parameters,
    childNodesPlaceholder,
  );
  return DomNodeInternal.findTextChanges(htmlNode, domNode);
}

function applyForceFunctionOnEditor(
  rerenderFunc: (e: Editor) => Editor,
  editor_: Editor,
): Editor {
  const bufferedOpt = InternalEditor.bufferedEditorState(editor_);
  if (bufferedOpt._tag === 'None') {
    return rerenderFunc(editor_);
  }
  const buffered = bufferedOpt.value;
  const newEditor = InternalEditor.updateEditorState('buffered', buffered, editor_);
  return rerenderFunc(
    InternalEditor.withComposing(
      false,
      InternalEditor.withBufferedEditorState(none, newEditor),
    ),
  );
}

function updateChangeEvent(change: EditorChange, spec_: Spec, editor_: Editor): Editor {
  if (change.characterDataMutations._tag === 'None') {
    const domRoot: DomNode = change.root;
    return updateChangeEventFullScan(
      change.timestamp,
      change.isComposing,
      domRoot,
      change.selection,
      spec_,
      editor_,
    );
  } else {
    return updateChangeEventTextChanges(
      change.timestamp,
      change.isComposing,
      sanitizeMutations(change.characterDataMutations.value),
      change.selection,
      spec_,
      editor_,
    );
  }
}

function sanitizeMutations(changes: Array<[Path, string]>): Array<[Path, string]> {
  return changes.map(([p, t]) => {
    if (t === '\u200B') {
      return [p, ''];
    }
    return [p, t];
  });
}

function differentText(root: Block, [path, t]: [Path, string]): boolean {
  const nodeOpt = nodeAt(path, { _tag: 'Block', value: root });
  if (nodeOpt._tag === 'None') {
    return true;
  }
  const node = nodeOpt.value;
  if (node._tag === 'Inline' && node.value._tag === 'Text') {
    return node.value.text.contents.text !== t;
  }
  return true;
}

function updateChangeEventTextChanges(
  timestamp: number,
  composing: boolean,
  textChanges: Array<[Path, string]>,
  selection: Option<Selection>,
  spec_: Spec,
  editor_: Editor,
): Editor {
  const editorComposing = composing || InternalEditor.isComposing(editor_);
  const stateToCompare = editorComposing
    ? O.toNullable(InternalEditor.bufferedEditorState(editor_)) || state(editor_)
    : state(editor_);

  const changesOpt = textChangesDomToEditor(spec_, stateRoot(stateToCompare), textChanges);
  if (changesOpt._tag === 'None') {
    return applyForceFunctionOnEditor(InternalEditor.forceRerender, editor_);
  }

  const changes = changesOpt.value;
  const editorState = state(editor_);
  const actualChanges = changes.filter((c) => differentText(stateRoot(stateToCompare), c));

  if (actualChanges.length === 0) {
    return editor_;
  }

  const replaced = replaceText(stateRoot(editorState), actualChanges);
  if (replaced._tag === 'None') {
    return applyForceFunctionOnEditor(InternalEditor.forceRerender, editor_);
  }

  const replacedEditorNodes = replaced.value;
  const domSel = pipe(
    selection,
    O.chain((sel) => domToEditor(spec_, stateRoot(editorState), sel)),
  );
  const newEditorState = withRoot(replacedEditorNodes, withSelection(domSel, editorState));

  if (editorComposing) {
    return InternalEditor.withBufferedEditorState(some(newEditorState), editor_);
  } else {
    const newEditor = InternalEditor.updateEditorStateWithTimestamp(
      some(timestamp),
      'textChange',
      newEditorState,
      editor_,
    );
    return applyForceFunctionOnEditor(InternalEditor.forceReselection, newEditor);
  }
}

function updateChangeEventFullScan(
  timestamp: number,
  isComposing: boolean,
  domRoot: DomNode,
  selection: Option<Selection>,
  spec_: Spec,
  editor_: Editor,
): Editor {
  const editorRootDomNodeOpt = DomNodeInternal.extractRootEditorBlockNode(domRoot);
  if (editorRootDomNodeOpt._tag === 'None') {
    return applyForceFunctionOnEditor(InternalEditor.forceCompleteRerender, editor_);
  }

  const editorRootDomNode = editorRootDomNodeOpt.value;
  if (needCompleteRerender(domRoot)) {
    return applyForceFunctionOnEditor(InternalEditor.forceCompleteRerender, editor_);
  }

  const derived = deriveTextChanges(spec_, stateRoot(state(editor_)), editorRootDomNode);
  if (derived._tag === 'Left') {
    return applyForceFunctionOnEditor(InternalEditor.forceRerender, editor_);
  }

  return updateChangeEventTextChanges(
    timestamp,
    isComposing,
    derived.right,
    selection,
    spec_,
    editor_,
  );
}

function needCompleteRerender(root: DomNode): boolean {
  const cnodes = root.childNodes || [];
  return cnodes.length !== 1;
}

function replaceText(editorNode: Block, changes: Array<[Path, string]>): Option<Block> {
  let current: Block = editorNode;
  for (const change of changes) {
    const nextOpt = applyTextChange(current, change);
    if (nextOpt._tag === 'None') {
      return none;
    }
    current = nextOpt.value;
  }
  return some(current);
}

function applyTextChange(editorNode: Block, [path, text]: [Path, string]): Option<Block> {
  if (path.length === 0) {
    return none;
  }
  const x = path[0];
  const xs = path.slice(1);
  const c = childNodes(editorNode);

  if (c._tag === 'BlockChildren') {
    const array = toBlockArray(c.blockChildren);
    const cblock = array[x];
    if (!cblock) return none;
    const textChangeNodeOpt = applyTextChange(cblock, [xs, text]);
    if (textChangeNodeOpt._tag === 'None') return none;
    const newArray = [...array];
    newArray[x] = textChangeNodeOpt.value;
    return some(withChildNodes(blockChildren(newArray), editorNode));
  } else if (c._tag === 'InlineChildren') {
    if (xs.length > 0) return none;
    const array = toInlineArray(c.inlineChildren);
    const inlineNode = array[x];
    if (!inlineNode) return none;
    if (inlineNode._tag === 'Text') {
      const newArray = [...array];
      newArray[x] = {
        _tag: 'Text',
        text: TextMod.withText(text.replace(/\u200B/g, ''), inlineNode.text),
      };
      return some(NodeMod.block(editorNode.contents.parameters, NodeMod.inlineChildren(newArray)));
    }
    return none;
  }
  return none;
}

function selectionAttribute(
  maybeSelection: Option<Selection>,
  renderCount: number,
  selectionCount: number,
): string {
  if (maybeSelection._tag === 'None') {
    return `render-count=${renderCount}`;
  }
  const selection = maybeSelection.value;
  return [
    `anchor-offset=${anchorOffset(selection)}`,
    `anchor-node=${pathToString(anchorNode(selection))}`,
    `focus-offset=${focusOffset(selection)}`,
    `focus-node=${focusToString(selection)}`,
    `render-count=${renderCount}`,
    `selection-count=${selectionCount}`,
  ].join(',');
}

function focusToString(sel: Selection): string {
  return pathToString(focusNode(sel));
}

function handleCompositionEnd(editor_: Editor): Editor {
  const buffered = InternalEditor.bufferedEditorState(editor_);
  if (buffered._tag === 'None') {
    return InternalEditor.withComposing(false, editor_);
  }
  return applyForceFunctionOnEditor(InternalEditor.forceReselection, editor_);
}

function shouldHideCaret(editorState: State): boolean {
  const selectionOpt = stateSelection(editorState);
  if (selectionOpt._tag === 'None') {
    return true;
  }
  const selection = selectionOpt.value;
  if (!isCollapsed(selection)) {
    return false;
  }
  const nodeOpt = nodeAt(anchorNode(selection), { _tag: 'Block', value: stateRoot(editorState) });
  if (nodeOpt._tag === 'None') {
    return false;
  }
  const node = nodeOpt.value;
  if (node._tag === 'Block') {
    return true;
  }
  if (node._tag === 'Inline') {
    if (node.value._tag === 'InlineElement') {
      return true;
    }
  }
  return false;
}

function markCaretSelectionOnEditorNodes(editorState: State): Block {
  const selectionOpt = stateSelection(editorState);
  if (selectionOpt._tag === 'None') {
    return stateRoot(editorState);
  }
  const selection = selectionOpt.value;
  if (isCollapsed(selection)) {
    return annotateSelection(selection, stateRoot(editorState));
  }
  return stateRoot(editorState);
}

export function editorToDomSelection(spec_: Spec, editor_: Editor): Option<Selection> {
  const selectionOpt = stateSelection(state(editor_));
  if (selectionOpt._tag === 'None') {
    return none;
  }
  return editorToDom(spec_, stateRoot(state(editor_)), selectionOpt.value);
}

function viewHtmlNode<Msg>(
  node: HtmlNode,
  decorators: Array<(path: Path) => Array<Attribute<Msg>>>,
  vdomChildren: Array<React.ReactNode>,
  backwardsRelativePath: Path,
  dispatch: (msg: Msg) => void,
): React.ReactNode {
  if (node._tag === 'TextNode') {
    return node.text;
  }

  const isPlaceholder = isChildNodesPlaceholder(node.children);
  const childrenToRender = isPlaceholder
    ? vdomChildren
    : node.children.map((n, i) =>
        viewHtmlNode(n, decorators, vdomChildren, [i, ...backwardsRelativePath], dispatch),
      );

  const reactProps: {
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
    [key: string]: unknown;
  } = {};

  for (const [key, value] of node.attributes) {
    if (key === 'class') {
      reactProps.className = value;
    } else {
      reactProps[key] = value;
    }
  }

  const forwardPath = [...backwardsRelativePath].reverse();
  for (const dec of decorators) {
    const attrs = dec(forwardPath);
    for (const [key, val] of attrs) {
      if (key === 'className') {
        if (typeof val === 'string') {
          reactProps.className = reactProps.className ? reactProps.className + ' ' + val : val;
        }
      } else if (key === 'onClick') {
        reactProps.onClick = (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof val === 'function') {
            const msg = val();
            dispatch(msg);
          }
        };
      } else {
        reactProps[key] = val;
      }
    }
  }

  return React.createElement(node.name, reactProps, ...childrenToRender);
}

function viewMark<Msg>(
  spec: Spec,
  decorations: Decorations<Msg>,
  backwardsNodePath: Path,
  mark: Mark,
  children: Array<React.ReactNode>,
  dispatch: (msg: Msg) => void,
): React.ReactNode {
  const name = mark.contents.name;
  const mDecorators = markDecorations(decorations).get(name) || [];
  const forwardPath = [...backwardsNodePath].reverse();
  const decorators = mDecorators.map((d) => (path: Path) => d(forwardPath, mark, path));

  const markDef = markDefinitionWithDefault(mark, spec);
  const htmlNode = MarkDefinition.toHtmlNode(markDef)(mark, childNodesPlaceholder);

  return viewHtmlNode(htmlNode, decorators, children, [], dispatch);
}

function viewElement<Msg>(
  spec: Spec,
  decorations: Decorations<Msg>,
  elementParameters: Element,
  backwardsNodePath: Path,
  children: Array<React.ReactNode>,
  dispatch: (msg: Msg) => void,
): React.ReactNode {
  const definition = elementDefinitionWithDefault(elementParameters, spec);
  const htmlNode = ElementDefinition.toHtmlNode(definition)(elementParameters, childNodesPlaceholder);

  const name = elementParameters.contents.name;
  const eDecorators = elementDecorations(decorations).get(name) || [];
  const forwardPath = [...backwardsNodePath].reverse();
  const decorators = eDecorators.map((d) => (path: Path) => d(forwardPath, elementParameters, path));

  return viewHtmlNode(htmlNode, decorators, children, [], dispatch);
}

function viewInlineLeafTree<Msg>(
  spec: Spec,
  decorations: Decorations<Msg>,
  backwardsPath: Path,
  inlineLeafArray: Array<Inline>,
  inlineLeafTree: InlineTree,
  dispatch: (msg: Msg) => void,
): React.ReactNode {
  if (inlineLeafTree._tag === 'LeafNode') {
    const leaf = inlineLeafArray[inlineLeafTree.value];
    if (!leaf) {
      return React.createElement('div', { className: 'rte-error' }, 'Invalid leaf tree.');
    }
    return viewInlineLeaf(
      spec,
      decorations,
      [inlineLeafTree.value, ...backwardsPath],
      leaf,
      dispatch,
    );
  } else {
    const n = inlineLeafTree.contents;
    const children = n.children.map((c) =>
      viewInlineLeafTree(spec, decorations, backwardsPath, inlineLeafArray, c, dispatch),
    );
    return viewMark(spec, decorations, backwardsPath, n.mark, children, dispatch);
  }
}

function viewEditorBlockNode<Msg>(
  spec: Spec,
  decorations: Decorations<Msg>,
  backwardsPath: Path,
  node: Block,
  dispatch: (msg: Msg) => void,
): React.ReactNode {
  const c = childNodes(node);
  let children: Array<React.ReactNode> = [];
  if (c._tag === 'BlockChildren') {
    const list = toBlockArray(c.blockChildren);
    children = list.map((n, i) =>
      viewEditorBlockNode(spec, decorations, [i, ...backwardsPath], n, dispatch),
    );
  } else if (c._tag === 'InlineChildren') {
    const list = toInlineArray(c.inlineChildren);
    const tree = toInlineTree(c.inlineChildren);
    children = tree.map((n) =>
      viewInlineLeafTree(spec, decorations, backwardsPath, list, n, dispatch),
    );
  }

  return viewElement(spec, decorations, node.contents.parameters, backwardsPath, children, dispatch);
}

function viewText(textVal: string): React.ReactNode {
  return textVal === '' ? '\u200B' : textVal;
}

function viewInlineLeaf<Msg>(
  spec: Spec,
  decorations: Decorations<Msg>,
  backwardsPath: Path,
  leaf: Inline,
  dispatch: (msg: Msg) => void,
): React.ReactNode {
  if (leaf._tag === 'InlineElement') {
    return viewElement(
      spec,
      decorations,
      leaf.inlineElement.contents.element,
      backwardsPath,
      [],
      dispatch,
    );
  } else {
    return viewText(leaf.text.contents.text);
  }
}

interface EditorChangeDetail {
  root: Node;
  selection: SelectionObject;
  characterDataMutations: Array<{ path: Path | null; text: string | null }>;
  timestamp: number;
  isComposing: boolean;
}

interface PasteDetail {
  text: string;
  html: string;
}

interface InitDetail {
  shortKey: string;
}

interface EditorComponentProps<Msg> {
  readonly config: Config<Msg>;
  readonly editor: Editor;
  readonly dispatch: (msg: Msg) => void;
}

export function RteEditor<Msg>({
  config,
  editor,
  dispatch,
}: EditorComponentProps<Msg>): React.ReactElement {
  const state_ = state(editor);
  const spec_ = spec(config);
  const decorations_ = decorations(config);

  const onEditorChange = (e: Event) => {
    const detail = (e as CustomEvent<EditorChangeDetail>).detail;
    console.log("RteEditor: onEditorChange", detail);
    const changePayload = {
      root: toDomNode(detail.root),
      selection: parseSelection(detail.selection),
      characterDataMutations: parseCharacterDataMutations(detail.characterDataMutations),
      timestamp: detail.timestamp,
      isComposing: detail.isComposing || false,
    };
    dispatch(config.toMsg({ _tag: 'ChangeEvent', change: changePayload }));
  };

  const onSelectionChange = (e: Event) => {
    const detail = (e as CustomEvent<SelectionObject>).detail;
    console.log("RteEditor: onSelectionChange", detail);
    const domSel = parseSelection(detail);
    const editorSel = pipe(
      domSel,
      O.chain((sel) => domToEditor(spec_, stateRoot(state(editor)), sel)),
    );
    const currentSel = stateSelection(state(editor));
    if (areSelectionsEqual(currentSel, editorSel)) {
      return;
    }
    dispatch(
      config.toMsg({
        _tag: 'SelectionEvent',
        selection: domSel,
        force: true,
      }),
    );
  };

  const onCompositionStart = () => {
    dispatch(config.toMsg({ _tag: 'CompositionStart' }));
  };

  const onCompositionEnd = () => {
    dispatch(config.toMsg({ _tag: 'CompositionEnd' }));
  };

  const onPaste = (e: Event) => {
    const detail = (e as CustomEvent<PasteDetail>).detail;
    dispatch(
      config.toMsg({
        _tag: 'PasteWithDataEvent',
        event: { text: detail.text, html: detail.html },
      }),
    );
  };

  const onCut = () => {
    dispatch(config.toMsg({ _tag: 'CutEvent' }));
  };

  const onInit = (e: Event) => {
    const detail = (e as CustomEvent<InitDetail>).detail;
    dispatch(
      config.toMsg({
        _tag: 'Init',
        event: { shortKey: detail.shortKey },
      }),
    );
  };

  const handleBeforeInput = (e: React.FormEvent<HTMLDivElement>) => {
    const decoder = preventDefaultOnBeforeInputDecoder(
      config.toMsg,
      config.commandMap,
      config.spec,
      editor,
    );
    const [msg, prevent] = decoder(e.nativeEvent as unknown as { readonly data: string | null; readonly isComposing?: boolean; readonly inputType?: string });
    if (prevent) {
      e.preventDefault();
    }
    dispatch(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keyboardEvent = mapKeyboardEvent(e);
    const msg: Message = { _tag: 'KeyDownEvent', event: keyboardEvent };
    const [_, prevent] = preventDefaultOnKeyDown(config.commandMap, config.spec, editor, msg);
    if (prevent) {
      e.preventDefault();
    }
    dispatch(config.toMsg(msg));
  };

  const topAttrs = topLevelAttributes(decorations_);
  const topProps: {
    className?: string;
    [key: string]: unknown;
  } = {};
  for (const [key, val] of topAttrs) {
    if (key === 'className') {
      topProps.className = typeof val === 'string' ? val : undefined;
    } else {
      topProps[key] = val;
    }
  }

  const selectionStateSelection = selectionAttribute(
    editorToDomSelection(spec_, editor),
    InternalEditor.renderCount(editor),
    InternalEditor.selectionCount(editor),
  );

  return React.createElement(
    'elm-editor',
    {
      oneditorchange: onEditorChange,
      oneditorselectionchange: onSelectionChange,
      oncompositionstart: onCompositionStart,
      oneditorcompositionend: onCompositionEnd,
      onpastewithdata: onPaste,
      oncut: onCut,
      oneditorinit: onInit,
    },
    React.createElement(
      'div',
      {
        key: InternalEditor.completeRerenderCount(editor),
        contentEditable: true,
        suppressContentEditableWarning: true,
        className: `rte-main${shouldHideCaret(state_) ? ' rte-hide-caret' : ''}`,
        'data-rte-main': 'true',
        onBeforeInput: handleBeforeInput,
        onKeyDown: handleKeyDown,
        ...topProps,
      },
      React.createElement(
        'div',
        {
          key: InternalEditor.renderCount(editor),
        },
        viewEditorBlockNode(spec_, decorations_, [], markCaretSelectionOnEditorNodes(state_), dispatch),
      ),
    ),
    React.createElement('selection-state', {
      selection: selectionStateSelection,
    }),
  );
}

function toDomNode(node: Node): DomNode {
  return {
    nodeType: node.nodeType,
    tagName: node instanceof Element ? node.tagName : null,
    nodeValue: node.nodeValue,
    childNodes: node.childNodes ? Array.from(node.childNodes).map(toDomNode) : null,
  };
}

function parseSelection(detail: SelectionObject): Option<Selection> {
  if (!detail || !detail.selectionExists) {
    return none;
  }
  return some(range(detail.anchorNode, detail.anchorOffset, detail.focusNode, detail.focusOffset));
}

function parseCharacterDataMutations(
  mutations: Array<{ path: Path | null; text: string | null }> | null | undefined,
): Option<Array<[Path, string]>> {
  if (!mutations || !Array.isArray(mutations)) {
    return none;
  }
  const result: Array<[Path, string]> = [];
  for (const m of mutations) {
    if (m.path !== null && m.text !== null) {
      result.push([m.path, m.text]);
    }
  }
  return some(result);
}

function mapKeyboardEvent(e: React.KeyboardEvent): KeyboardEvent {
  return {
    keyCode: e.keyCode,
    key: e.key,
    altKey: e.altKey,
    metaKey: e.metaKey,
    ctrlKey: e.ctrlKey,
    shiftKey: e.shiftKey,
    isComposing: e.nativeEvent.isComposing || false,
  };
}

/**
 * Take an editor model and config and render it in the DOM.
 */
export function view<Msg>(
  cfg: Config<Msg>,
  editor: Editor,
  dispatch: (msg: Msg) => void,
): React.ReactElement {
  return <RteEditor config={cfg} editor={editor} dispatch={dispatch} />;
}

/**
 * Renders the contents of the editor with `contenteditable` set to false and the event listeners
 * removed.
 */
export function readOnlyView<Msg>(cfg: Config<Msg>, editor: Editor): React.ReactElement {
  const state_ = state(editor);
  const spec_ = spec(cfg);
  const decorations_ = decorations(cfg);

  const topAttrs = topLevelAttributes(decorations_);
  const topProps: {
    className?: string;
    [key: string]: unknown;
  } = {};
  for (const [key, val] of topAttrs) {
    if (key === 'className') {
      topProps.className = typeof val === 'string' ? val : undefined;
    } else {
      topProps[key] = val;
    }
  }

  const dummyDispatch = () => {};

  return React.createElement(
    'div',
    {
      className: 'rte-main',
      'data-rte-main': 'true',
      ...topProps,
    },
    viewEditorBlockNode(spec_, decorations_, [], markCaretSelectionOnEditorNodes(state_), dummyDispatch),
  );
}
