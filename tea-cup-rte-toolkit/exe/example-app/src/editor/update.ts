import { Either, left, right } from 'fp-ts/lib/Either'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import {
  type Config,
  type Spec,
  type Editor,
  type State,
  type Mark,
  type Node,
  type Block,
  type Path,
  type Message as RteMessage,
  config as createConfig,
  defaultCommandMap,
  emptyDecorations,
  set as setCommand,
  inputEvent,
  key,
  enter,
  return as returnKey,
  short,
  bold,
  italic,
  code,
  paragraph,
  codeBlock,
  heading,
  image,
  link,
  blockquote,
  horizontalRule,
  toggleMark,
  toggleTextBlock,
  insertNewline,
  liftEmpty,
  splitBlockHeaderToNewParagraph,
  insertAfterBlockLeaf,
  block,
  blockChildren,
  plainText,
  inlineChildren,
  Flip,
  Add,
  Remove,
  mark,
  element,
  Leaf,
  transform,
  markOrderFromSpec,
  applyCommand,
  applyNamedCommandList,
  internal,
  state as getEditorState,
  peek,
  normalize,
  anchorNode,
  focusNode,
  parent as getParentPath,
  foldlRange,
  childNodes,
  element as getBlockElement,
  toBlockArray,
  toInlineArray,
  marks as getMarks,
  inlineElement,
  insertInline,
  insertBlock,
  wrap,
  lift,
  liftList,
  wrapList,
  defaultListDefinition,
  nodeAt,
  update as updateRte,
} from '@rinn7e/tea-cup-rte-toolkit'

import { strikethrough, underline } from './extra-marks'
import type { ControlState, InsertImageModal, InsertLinkModal, Model, Msg } from './type'
export type { Msg } from './type'

export const docInitNode = (): Block =>
  block(
    element(heading, [{ _tag: 'IntegerAttribute', key: 'level', value: 1 }]),
    blockChildren([
      block(
        element(paragraph, []),
        inlineChildren([plainText('This is some sample text')])
      )
    ])
  )


export const emptyParagraph = block(
  element(paragraph, []),
  inlineChildren([plainText('')])
)

export function createEditorConfig<Msg>(
  spec: Spec,
  toMsg: (msg: RteMessage) => Msg,
  decorations: any = emptyDecorations()
): Config<Msg> {
  const markOrder = markOrderFromSpec(spec)
  let cmdMap = defaultCommandMap

  cmdMap = setCommand(
    [inputEvent('insertParagraph'), key([enter]), key([returnKey])],
    [
      ['insertNewline', transform(insertNewline(['code_block']))],
      ['liftEmpty', transform(liftEmpty)],
      [
        'splitBlockHeaderToNewParagraph',
        transform(
          splitBlockHeaderToNewParagraph(['heading'], element(paragraph, []))
        ),
      ],
      ['insertEmptyParagraph', transform(insertAfterBlockLeaf(emptyParagraph))],
    ],
    cmdMap
  )

  cmdMap = setCommand(
    [inputEvent('formatBold'), key([short, 'b'])],
    [['toggleStyle', transform(toggleMark(markOrder, mark(bold, []), Flip))]],
    cmdMap
  )

  cmdMap = setCommand(
    [inputEvent('formatItalic'), key([short, 'i'])],
    [['toggleStyle', transform(toggleMark(markOrder, mark(italic, []), Flip))]],
    cmdMap
  )

  return createConfig({
    decorations,
    spec,
    commandMap: cmdMap,
    toMsg,
  })
}

export const emptyControlState = (): ControlState => ({
  hasUndo: false,
  hasRedo: false,
  hasInline: false,
  hasSelection: false,
  nodes: new Set(),
  marks: new Set(),
  canLift: false,
})

function accumulateControlState(node: Node, cs: ControlState): ControlState {
  if (node._tag === 'Block') {
    const el = node.value.contents.parameters
    cs.nodes.add(el.contents.name)
  } else if (node._tag === 'Inline') {
    cs.hasInline = true
    const nodeMarks = getMarks(node.value)
    nodeMarks.forEach((m: Mark) => {
      cs.marks.add(m.contents.name)
    })
  }
  return cs
}

function accumulateControlStateWithRanges(
  ranges: Array<[Path, Path]>,
  root: Block,
  cs: ControlState,
): ControlState {
  let currentCs = cs
  for (const [start, end] of ranges) {
    currentCs = foldlRange(
      start,
      end,
      (path, node, acc) => accumulateControlState(node, acc),
      currentCs,
      { _tag: 'Block', value: root }
    )
  }
  return currentCs
}

export function deriveControlState(editorVal: Editor): ControlState {
  const editorState = getEditorState(editorVal)
  const editorHistory = editorVal.contents.history
  const selectionOpt = editorState.contents.selection

  if (O.isNone(selectionOpt)) {
    return emptyControlState()
  }

  const selection = selectionOpt.value
  const hasUndo = O.isSome(peek(editorHistory))
  const redoStack = editorHistory.contents.redoStack
  const hasRedo = redoStack.length > 0

  const normalizedSelection = normalize(selection)
  const aN = anchorNode(normalizedSelection)
  const fN = focusNode(normalizedSelection)

  const parentFocus = getParentPath(fN)
  const parentAnchor = getParentPath(aN)

  const initialCs = {
    ...emptyControlState(),
    hasSelection: true,
    hasUndo,
    hasRedo,
  }

  const cs = accumulateControlStateWithRanges(
    [
      [aN, fN],
      [parentFocus, parentFocus],
      [parentAnchor, parentAnchor],
    ],
    editorState.contents.root,
    initialCs
  )

  return {
    ...cs,
    canLift:
      aN.length > 2 ||
      fN.length > 2 ||
      cs.nodes.has('blockquote') ||
      cs.nodes.has('list_item'),
  }
}

export const initInsertLinkModal = (): InsertLinkModal => ({
  visible: false,
  href: '',
  title: '',
  editorState: O.none,
})

export const initInsertImageModal = (): InsertImageModal => ({
  visible: false,
  src: '',
  alt: '',
  editorState: O.none,
})

export const init = (editorVal: Editor): Model => ({
  editor: editorVal,
  insertLinkModal: initInsertLinkModal(),
  insertImageModal: initInsertImageModal(),
})

export const update = (
  spec: Spec,
  msg: Msg,
  model: Model,
  decorations: any = emptyDecorations(),
): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'InternalMsg': {
      const config = createEditorConfig(spec, (m) => ({
        _tag: 'InternalMsg' as const,
        msg: m,
      }), decorations)
      const newEditor = updateRte(config, msg.msg, model.editor)
      return [{ ...model, editor: newEditor }, Cmd.none()]
    }

    case 'ToggleStyle': {
      const style = msg.style
      const markDef =
        style === 'Bold'
          ? bold
          : style === 'Italic'
          ? italic
          : style === 'Code'
          ? code
          : style === 'Underline'
          ? underline
          : strikethrough

      const markOrder = markOrderFromSpec(spec)
      const res = applyCommand(
        [
          'toggleStyle',
          transform(toggleMark(markOrder, mark(markDef, []), Flip)),
        ],
        spec,
        model.editor
      )
      const newEditor = res._tag === 'Right' ? res.right : model.editor
      return [{ ...model, editor: newEditor }, Cmd.none()]
    }

    case 'ShowInsertLinkModal': {
      const editorState = getEditorState(model.editor)
      const selectionOpt = editorState.contents.selection
      if (O.isNone(selectionOpt)) {
        return [model, Cmd.none()]
      }
      const selection = selectionOpt.value
      const normalizedSelection = normalize(selection)

      const hasLink = anyRange(
        (n) => {
          if (n._tag === 'Inline') {
            const inlineNode = n.value
            return getMarks(inlineNode).some((m: Mark) => m.contents.name === 'link')
          }
          return false
        },
        anchorNode(normalizedSelection),
        focusNode(normalizedSelection),
        editorState.contents.root
      )

      if (hasLink) {
        const markOrder = markOrderFromSpec(spec)
        const linkMark = mark(link, [
          { _tag: 'StringAttribute', key: 'href', value: '' },
        ])
        const res = applyCommand(
          [
            'removeLink',
            transform(toggleMark(markOrder, linkMark, Remove)),
          ],
          spec,
          model.editor
        )
        const newEditor = res._tag === 'Right' ? res.right : model.editor
        return [{ ...model, editor: newEditor }, Cmd.none()]
      } else {
        return [
          {
            ...model,
            insertLinkModal: {
              visible: true,
              href: '',
              title: '',
              editorState: O.some(editorState),
            },
          },
          Cmd.none(),
        ]
      }
    }

    case 'UpdateLinkHref': {
      return [
        {
          ...model,
          insertLinkModal: {
            ...model.insertLinkModal,
            href: msg.href,
          },
        },
        Cmd.none(),
      ]
    }

    case 'UpdateLinkTitle': {
      return [
        {
          ...model,
          insertLinkModal: {
            ...model.insertLinkModal,
            title: msg.title,
          },
        },
        Cmd.none(),
      ]
    }

    case 'InsertLink': {
      const modal = model.insertLinkModal
      if (O.isNone(modal.editorState)) {
        return [model, Cmd.none()]
      }
      const state_ = modal.editorState.value
      const linkMark = mark(link, [
        { _tag: 'StringAttribute', key: 'href', value: modal.href },
        { _tag: 'StringAttribute', key: 'title', value: modal.title },
      ])
      const markOrder = markOrderFromSpec(spec)
      const toggleTransform = toggleMark(markOrder, linkMark, Add)
      const resState = toggleTransform(state_)

      let newEditor = model.editor
      if (resState._tag === 'Right') {
        const applyRes = applyCommand(
          ['insertLink', transform(() => resState)],
          spec,
          model.editor
        )
        if (applyRes._tag === 'Right') {
          newEditor = applyRes.right
        }
      }

      return [
        {
          ...model,
          editor: newEditor,
          insertLinkModal: {
            visible: false,
            href: '',
            title: '',
            editorState: O.none,
          },
        },
        Cmd.none(),
      ]
    }

    case 'CancelInsertLink': {
      return [
        {
          ...model,
          insertLinkModal: {
            visible: false,
            href: '',
            title: '',
            editorState: O.none,
          },
        },
        Cmd.none(),
      ]
    }

    case 'ToggleBlock': {
      const blockName = msg.block
      const isCode = blockName === 'Code block'
      const level = parseInt(blockName.slice(-1)) || 1
      const onParams = isCode
        ? element(codeBlock, [])
        : element(heading, [
            { _tag: 'IntegerAttribute', key: 'level', value: level },
          ])
      const offParams = element(paragraph, [])
      const res = applyCommand(
        ['toggleBlock', transform(toggleTextBlock(onParams, offParams, isCode))],
        spec,
        model.editor
      )
      const newEditor = res._tag === 'Right' ? res.right : model.editor
      return [{ ...model, editor: newEditor }, Cmd.none()]
    }

    case 'WrapInList': {
      const res = applyCommand(
        [
          'wrapList',
          transform(wrapList(defaultListDefinition, msg.listType)),
        ],
        spec,
        model.editor
      )
      const newEditor = res._tag === 'Right' ? res.right : model.editor
      return [{ ...model, editor: newEditor }, Cmd.none()]
    }

    case 'ShowInsertImageModal': {
      return [
        {
          ...model,
          insertImageModal: {
            visible: true,
            src: '',
            alt: '',
            editorState: O.some(getEditorState(model.editor)),
          },
        },
        Cmd.none(),
      ]
    }

    case 'UpdateImageSrc': {
      return [
        {
          ...model,
          insertImageModal: {
            ...model.insertImageModal,
            src: msg.src,
          },
        },
        Cmd.none(),
      ]
    }

    case 'UpdateImageAlt': {
      return [
        {
          ...model,
          insertImageModal: {
            ...model.insertImageModal,
            alt: msg.alt,
          },
        },
        Cmd.none(),
      ]
    }

    case 'InsertImage': {
      const modal = model.insertImageModal
      if (O.isNone(modal.editorState)) {
        return [model, Cmd.none()]
      }
      const state_ = modal.editorState.value
      const params = element(image, [
        { _tag: 'StringAttribute', key: 'src', value: modal.src },
        { _tag: 'StringAttribute', key: 'alt', value: modal.alt },
      ])
      const img = inlineElement(params, [])
      const insertTransform = insertInline(img)
      const resState = insertTransform(state_)

      let newEditor = model.editor
      if (resState._tag === 'Right') {
        const applyRes = applyCommand(
          ['insertImage', transform(() => resState)],
          spec,
          model.editor
        )
        if (applyRes._tag === 'Right') {
          newEditor = applyRes.right
        }
      }

      return [
        {
          ...model,
          editor: newEditor,
          insertImageModal: {
            visible: false,
            src: '',
            alt: '',
            editorState: O.none,
          },
        },
        Cmd.none(),
      ]
    }

    case 'CancelInsertImage': {
      return [
        {
          ...model,
          insertImageModal: {
            visible: false,
            src: '',
            alt: '',
            editorState: O.none,
          },
        },
        Cmd.none(),
      ]
    }

    case 'InsertHorizontalRule': {
      const hrBlock = block(element(horizontalRule, []), Leaf)
      const res = applyCommand(
        ['insertHR', transform(insertBlock(hrBlock))],
        spec,
        model.editor
      )
      const newEditor = res._tag === 'Right' ? res.right : model.editor
      return [{ ...model, editor: newEditor }, Cmd.none()]
    }

    case 'WrapInBlockQuote': {
      const res = applyCommand(
        ['wrapBlockquote', transform(wrap((n) => n, element(blockquote, [])))],
        spec,
        model.editor
      )
      const newEditor = res._tag === 'Right' ? res.right : model.editor
      return [{ ...model, editor: newEditor }, Cmd.none()]
    }

    case 'LiftOutOfBlock': {
      const res = applyNamedCommandList(
        [
          ['liftList', transform(liftList(defaultListDefinition))],
          ['lift', transform(liftList(defaultListDefinition))],
        ],
        spec,
        model.editor
      )
      const newEditor = res._tag === 'Right' ? res.right : model.editor
      return [{ ...model, editor: newEditor }, Cmd.none()]
    }

    case 'Undo': {
      const res = applyCommand(['undo', internal('Undo')], spec, model.editor)
      const newEditor = res._tag === 'Right' ? res.right : model.editor
      return [{ ...model, editor: newEditor }, Cmd.none()]
    }

    case 'Redo': {
      const res = applyCommand(['redo', internal('Redo')], spec, model.editor)
      const newEditor = res._tag === 'Right' ? res.right : model.editor
      return [{ ...model, editor: newEditor }, Cmd.none()]
    }
  }
}

function anyRange(
  pred: (node: Node) => boolean,
  start: Path,
  end: Path,
  root: Block,
): boolean {
  return !allRange((x) => !pred(x), start, end, root)
}

function allRange(
  pred: (node: Node) => boolean,
  start: Path,
  end: Path,
  root: Block,
): boolean {
  if (comparePaths(start, end) === 'GT') {
    return true
  }

  const nodeOpt = nodeAt(start, { _tag: 'Block', value: root })
  if (O.isNone(nodeOpt)) {
    return true
  }

  const node = nodeOpt.value
  if (pred(node)) {
    const nextOpt = nextNodePath(start, root)
    if (O.isNone(nextOpt)) {
      return true
    }
    const [nextPath] = nextOpt.value
    return allRange(pred, nextPath, end, root)
  } else {
    return false
  }
}

function comparePaths(a: Path, b: Path): 'LT' | 'EQ' | 'GT' {
  const minLen = Math.min(a.length, b.length)
  for (let i = 0; i < minLen; i++) {
    if (a[i] < b[i]) return 'LT'
    if (a[i] > b[i]) return 'GT'
  }
  if (a.length < b.length) return 'LT'
  if (a.length > b.length) return 'GT'
  return 'EQ'
}

function nextNodePath(path: Path, root: Block): O.Option<[Path, Node]> {
  return findNodeFrom(nextPathFunc, () => true, path, root)
}

function findNodeFrom(
  step: (p: Path, root: Block) => O.Option<Path>,
  pred: (path: Path, node: Node) => boolean,
  path: Path,
  node: Block,
): O.Option<[Path, Node]> {
  let curr = step(path, node)
  while (O.isSome(curr)) {
    const p = curr.value
    const nOpt = nodeAt(p, { _tag: 'Block', value: node })
    if (O.isSome(nOpt)) {
      if (pred(p, nOpt.value)) {
        return O.some([p, nOpt.value])
      }
    }
    curr = step(p, node)
  }
  return O.none
}

function nextPathFunc(path: Path, root: Block): O.Option<Path> {
  const nodeOpt = nodeAt(path, { _tag: 'Block', value: root })
  if (O.isNone(nodeOpt)) {
    return O.none
  }
  const node = nodeOpt.value
  if (node._tag === 'Block') {
    const c = childNodes(node.value)
    if (c._tag === 'BlockChildren' && c.blockChildren.array.length > 0) {
      return O.some([...path, 0])
    }
    if (c._tag === 'InlineChildren' && c.inlineChildren.contents.array.length > 0) {
      return O.some([...path, 0])
    }
  }

  let curr = path
  while (curr.length > 0) {
    const parentPath = getParentPath(curr)
    const parentNodeOpt = nodeAt(parentPath, { _tag: 'Block', value: root })
    if (O.isSome(parentNodeOpt) && parentNodeOpt.value._tag === 'Block') {
      const parentNode = parentNodeOpt.value.value
      const c = childNodes(parentNode)
      let len = 0
      if (c._tag === 'BlockChildren') {
        len = toBlockArray(c.blockChildren.array).length
      } else if (c._tag === 'InlineChildren') {
        len = toInlineArray(c.inlineChildren.contents.array).length
      }
      const idx = curr[curr.length - 1]
      if (idx < len - 1) {
        return O.some([...parentPath, idx + 1])
      }
    }
    curr = parentPath
  }
  return O.none
}
