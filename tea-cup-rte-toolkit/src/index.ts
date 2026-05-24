// Import web-component to register the custom elements automatically on package load
import './web-component';

export * from './editor';
export {
  selection as annotationSelection,
  selectable as annotationSelectable,
  lift as annotationLift,
  add as addAnnotation,
  remove as removeAnnotation,
  addAtPath as addAnnotationAtPath,
  removeAtPath as removeAnnotationAtPath,
  addToBlock as addAnnotationToBlock,
  addToInline as addAnnotationToInline,
  removeFromBlock as removeAnnotationFromBlock,
  removeFromInline as removeAnnotationFromInline,
  clear as clearAnnotations,
  fromNode as annotationsFromNode,
  annotateSelection,
  clearSelectionAnnotations,
  selectionFromAnnotations,
  isSelectable,
  doLift,
} from './annotation';
export * from './commands';
export * from './definitions';
export * from './html';
export type {
  ListType,
  ListDefinitionContents,
  ListDefinition,
} from './list';
export {
  listDefinition,
  defaultListDefinition,
  item,
  ordered,
  unordered,
  findListItemAncestor,
  split as splitList,
  isListNode,
  defaultCommandMap as defaultListCommandMap,
  lift as liftList,
  liftEmpty as liftEmptyList,
  wrap as wrapList,
} from './list';
export {
  last,
  allRange,
  anyRange,
  foldlRange,
  foldrRange,
  findAncestor,
  findBackwardFromExclusive,
  findForwardFromExclusive,
  findTextBlockNodeAncestor,
  insertAfter,
  isEmptyTextBlock,
  nodeAt,
  replace,
  replaceWithFragment,
  selectionIsBeginningOfTextBlock,
  selectionIsEndOfTextBlock,
  splitTextLeaf,
  toggleMark as nodeToggleMark,
  joinBlocks as nodeJoinBlocks,
  removeNodeAndEmptyParents,
  removeInRange,
  splitBlockAtPathAndOffset,
} from './node';
export type { Node } from './node';
export * from './state';

// Also re-export essential type and helper constructors from model modules
export type {
  Block,
  Inline,
  Path,
  Children,
  Leaf,
} from './model/node';
export {
  block,
  blockChildren,
  inlineChildren,
  plainText,
  markedText,
  parent,
  childNodes,
} from './model/node';

export type { Selection } from './model/selection';
export {
  range,
  caret,
  normalize,
  isCollapsed,
  anchorNode,
  focusNode,
} from './model/selection';

export type { State } from './model/state';
export {
  state as createState,
} from './model/state';

export type { History } from './model/history';
export {
  peek,
  redoList,
} from './model/history';

export type { Mark, MarkOrder } from './model/mark';

export type { Decorations } from './config/decorations';
export {
  emptyDecorations,
  withMarkDecorations,
  withElementDecorations,
  withTopLevelAttributes,
  addElementDecoration,
  addMarkDecoration,
} from './config/decorations';

export type { Spec } from './config/spec';

export type { Editor } from './internal/editor';
export type { Message } from './internal/message';
