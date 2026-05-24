// Import web-component to register the custom elements automatically on package load
import './web-component'

export * from './editor'
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
} from './annotation'
export * from './commands'
export * from './definitions'
export * from './html'
export type { ListType, ListDefinitionContents, ListDefinition } from './list'
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
} from './list'
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
} from './node'
export type { Node } from './node'
export * from './state'

// Also re-export essential type and helper constructors from model modules
export type {
  Block,
  Inline,
  Path,
  Children,
  Leaf as LeafType,
} from './model/node'
export {
  block,
  blockChildren,
  inlineChildren,
  plainText,
  markedText,
  parent,
  childNodes,
  Leaf,
  withElement,
  toBlockArray,
  toInlineArray,
  marks,
  inlineElement,
} from './model/node'

export type { Selection } from './model/selection'
export {
  range,
  caret,
  normalize,
  isCollapsed,
  anchorNode,
  focusNode,
} from './model/selection'

export type { State } from './model/state'
export { state as createState, withRoot, withSelection } from './model/state'

export type { History } from './model/history'
export { peek, redoList } from './model/history'

export type { Mark, MarkOrder, ToggleAction } from './model/mark'
export {
  mark,
  markOrderFromSpec,
  sort,
  Add,
  Remove,
  Flip,
  toggle,
  hasMarkWithName,
  withAttributes as withMarkAttributes,
} from './model/mark'

export type { Element } from './model/element'
export {
  element,
  withAttributes as withElementAttributes,
} from './model/element'

export type {
  Decorations,
  ElementDecoration,
  MarkDecoration,
  Attribute as DecorationAttribute,
} from './config/decorations'
export {
  emptyDecorations,
  withMarkDecorations,
  withElementDecorations,
  withTopLevelAttributes,
  addElementDecoration,
  addMarkDecoration,
  selectableDecoration,
} from './config/decorations'

export type { Spec } from './config/spec'
export {
  emptySpec,
  withElementDefinitions,
  withMarkDefinitions,
  elementDefinitions,
  markDefinitions,
} from './config/spec'

export type { Editor } from './internal/editor'
export {
  editor,
  state,
  applyCommand,
  applyCommandNoForceSelection,
  applyNamedCommandList,
} from './internal/editor'

export type { Message } from './internal/message'
export * from './model/attribute'

export {
  elementDefinition,
  blockNode,
  blockLeaf,
  textBlock,
  inlineLeaf,
  defaultElementToHtml,
  defaultHtmlToElement,
} from './config/element-definition'
export type {
  ElementDefinition,
  ContentType,
} from './config/element-definition'

export { markDefinition, defaultHtmlToMark } from './config/mark-definition'
export type { MarkDefinition } from './config/mark-definition'

export * from './config/command'
export * from './model/html-node'
export { Option, some, none } from 'fp-ts/lib/Option'
export * from './config/keys'
