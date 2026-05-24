import {
  type Attribute,
  type Block,
  type DecorationAttribute,
  type ElementDecoration,
  type ElementDefinition,
  HtmlNode,
  Leaf,
  Option,
  type Path,
  Element as RteElement,
  type Spec,
  type State,
  type Transform,
  addElementDecoration,
  applyCommand,
  applyCommandNoForceSelection,
  block,
  blockChildren,
  blockLeaf,
  editor as createEditor,
  createState,
  doc,
  element,
  elementDefinition,
  elementDefinitions,
  emptyDecorations,
  findStringAttribute,
  state as getEditorState,
  inlineChildren,
  insertBlock,
  markDefinitions,
  markdown,
  nodeAt,
  none,
  paragraph,
  plainText,
  replace,
  replaceOrAddStringAttribute,
  selectableDecoration,
  some,
  transform,
  withElement,
  withElementAttributes,
  withElementDefinitions,
  withMarkDefinitions,
  withRoot,
} from '@rinn7e/tea-cup-rte-toolkit'
import * as E from 'fp-ts/lib/Either'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import * as React from 'react'
import { Cmd } from 'tea-cup-fp'

import { strikethrough, underline } from '@/component/editor/extra-marks'
import type { Style } from '@/component/editor/type'
import * as EditorUpdate from '@/component/editor/update'

import type { Model, Msg } from './type'

// 1. Captioned Image Element Definition
export const captionedImage = elementDefinition({
  name: 'captioned_image',
  group: 'block',
  contentType: blockLeaf,
  toHtmlNode: (params: RteElement, children: Array<HtmlNode>): HtmlNode => {
    const srcOpt = findStringAttribute('src', params.contents.attributes)
    const altOpt = findStringAttribute('alt', params.contents.attributes)
    const titleOpt = findStringAttribute('title', params.contents.attributes)
    const captionOpt = findStringAttribute(
      'caption',
      params.contents.attributes,
    )

    const caption = captionOpt._tag === 'Some' ? captionOpt.value : ''

    const imgAttrs: Array<[string, string]> = [
      ['src', srcOpt._tag === 'Some' ? srcOpt.value : ''],
      ['data-caption', caption],
    ]
    if (altOpt._tag === 'Some') imgAttrs.push(['alt', altOpt.value])
    if (titleOpt._tag === 'Some') imgAttrs.push(['title', titleOpt.value])

    return {
      _tag: 'ElementNode',
      name: 'figure',
      attributes: [['contenteditable', 'false']],
      children: [
        {
          _tag: 'ElementNode',
          name: 'img',
          attributes: imgAttrs,
          children: [],
        },
        {
          _tag: 'ElementNode',
          name: 'figcaption',
          attributes: [],
          children: [
            {
              _tag: 'ElementNode',
              name: 'input',
              attributes: [
                ['value', caption],
                ['type', 'text'],
                ['class', 'caption-input'],
                ['placeholder', 'Add a caption...'],
              ],
              children: [],
            },
          ],
        },
      ],
    }
  },
  fromHtmlNode: (
    def: ElementDefinition,
    node: HtmlNode,
  ): Option<[RteElement, Array<HtmlNode>]> => {
    if (node._tag === 'ElementNode' && node.name === 'figure') {
      const img = node.children[0]
      if (img && img._tag === 'ElementNode' && img.name === 'img') {
        const attributes: Array<
          | { _tag: 'StringAttribute'; key: string; value: string }
          | { _tag: 'BoolAttribute'; key: string; value: boolean }
        > = []
        let hasSrc = false
        for (const [k, v] of img.attributes) {
          if (k === 'src') {
            hasSrc = true
            attributes.push({ _tag: 'StringAttribute', key: 'src', value: v })
          } else if (k === 'alt') {
            attributes.push({ _tag: 'StringAttribute', key: 'alt', value: v })
          } else if (k === 'title') {
            attributes.push({
              _tag: 'StringAttribute',
              key: 'title',
              value: v,
            })
          } else if (k === 'data-caption') {
            attributes.push({
              _tag: 'StringAttribute',
              key: 'caption',
              value: v,
            })
          }
        }
        if (hasSrc) {
          const el = element(def, attributes)
          return some([el, []])
        }
      }
    }
    return none
  },
  selectable: true,
})

// 2. Custom Spec (extending markdown with strikethrough, underline, and captioned image)
export const customSpec: Spec = pipe(
  markdown,
  (s) => withElementDefinitions([...elementDefinitions(s), captionedImage], s),
  (s) =>
    withMarkDefinitions([...markDefinitions(s), strikethrough, underline], s),
)

// 3. Decorations for captioned image
const captionedImageDecoration = (
  editorNodePath: Path,
  elementVal: RteElement,
  elementPath: Path,
): Array<DecorationAttribute<Msg>> => {
  const elementPathStr = elementPath.join(':')
  if (elementPathStr === '') {
    return selectableDecoration(
      (m) => ({
        _tag: 'EditorMsg' as const,
        subMsg: { _tag: 'InternalMsg' as const, msg: m },
      }),
      editorNodePath,
      elementVal,
      elementPath,
    )
  } else if (elementPathStr === '1:0') {
    return [
      [
        'onKeyDown',
        (e: React.KeyboardEvent) => {
          e.stopPropagation()
        },
      ],
      [
        'onBeforeInput',
        (e: React.FormEvent) => {
          e.stopPropagation()
        },
      ],
      [
        'onChange',
        (e: React.ChangeEvent<HTMLInputElement>) => {
          return {
            _tag: 'CaptionedImage' as const,
            path: editorNodePath,
            caption: e.target.value,
          }
        },
      ],
    ]
  }
  return []
}

export const customDecorations = addElementDecoration(
  captionedImage,
  captionedImageDecoration satisfies ElementDecoration<Msg>,
  emptyDecorations(),
)

// 4. Initial Editor Document State
const loremParagraph = (): Block =>
  block(
    element(paragraph, []),
    inlineChildren([
      plainText(
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
      ),
    ]),
  )

const initialCaptionedImage = (): Block =>
  block(
    element(captionedImage, [
      { _tag: 'StringAttribute', key: 'caption', value: 'The Tea-Cup logo!' },
      {
        _tag: 'StringAttribute',
        key: 'src',
        value: '/logo.png',
      },
    ]),
    Leaf,
  )

const docInitNode = (): Block =>
  block(
    element(doc, []),
    blockChildren([
      loremParagraph(),
      initialCaptionedImage(),
      loremParagraph(),
    ]),
  )

export const init = (): [Model, Cmd<Msg>] => {
  const editorState = createState(docInitNode(), O.none)
  const editorModel = EditorUpdate.init(createEditor(editorState))

  return [
    {
      editor: editorModel,
      insertCaptionedImageModal: {
        visible: false,
        editorState: O.none,
        src: '',
        alt: '',
        caption: '',
      },
    },
    Cmd.none(),
  ]
}

// 5. Update Captioned Image Text Transform
export const updateCaptionedImageText = (
  path: Path,
  value: string,
): Transform => {
  return (editorState: State): E.Either<string, State> => {
    const root = editorState.contents.root
    const nodeOpt = nodeAt(path, { _tag: 'Block', value: root })
    if (O.isNone(nodeOpt)) {
      return E.left('There is no node at the given path')
    }
    const node = nodeOpt.value
    if (node._tag !== 'Block') {
      return E.left('Expected a block node')
    }
    const bn = node.value
    const ep = bn.contents.parameters
    if (ep.contents.name !== 'captioned_image') {
      return E.left('Node is not a captioned image')
    }

    const newAttributes = replaceOrAddStringAttribute(
      'caption',
      value,
      ep.contents.attributes,
    )
    const newElementParameters = withElementAttributes(newAttributes, ep)
    const newBlockNode = withElement(newElementParameters, bn)
    return pipe(
      replace(path, { _tag: 'Block', value: newBlockNode }, root),
      E.map((newRoot) => withRoot(newRoot, editorState)),
    )
  }
}

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'EditorMsg': {
      // Intercept custom element caption onChange message inside RteEditor
      if (
        msg.subMsg._tag === 'InternalMsg' &&
        msg.subMsg.msg._tag === 'ChangeEvent'
      ) {
        // If there's an event triggered inside the input and intercepted, we handle it
        // Wait, standard ChangeEvent is handled by RteEditor update.
        // But our custom onChange returned a {_tag: 'CaptionedImage', path, caption}
        // Let's check if the change mutates it:
        // Actually, our event handler returns a {_tag: 'CaptionedImage', path, caption} which is dispatched as a Msg,
        // but wait! RteEditor onEditorChange only dispatches the standard Message.
        // But our custom event handler onChange returns a {_tag: 'CaptionedImage', path, caption} which is dispatched
        // directly as a Msg! Oh! Wait!
        // In app.tsx, RteEditor calls dispatch(config.toMsg(internalMsg)).
        // Our custom event handler onChange is mapped inside viewHtmlNode to call dispatch(msg).
        // Since viewHtmlNode is called with the config's dispatch (which is from the page, i.e., ExamplesPageMsg / SpecExtensionPageMsg),
        // our onChange handler dispatches the SPEC-EXTENSION PAGE Msg directly!
        // So the Msg will be `{ _tag: 'CaptionedImage', path, caption }`!
        // That is absolutely brilliant and so clean!
      }
      const [editorModel, editorCmd] = EditorUpdate.update(
        customSpec,
        msg.subMsg,
        model.editor,
      )
      return [
        { ...model, editor: editorModel },
        editorCmd.map((subMsg) => ({ _tag: 'EditorMsg', subMsg })),
      ]
    }

    case 'CaptionedImage': {
      const { path, caption } = msg
      const res = applyCommandNoForceSelection(
        [
          'updateCaptionedImageText',
          transform(updateCaptionedImageText(path, caption)),
        ],
        customSpec,
        model.editor.editor,
      )
      const newEditor = res._tag === 'Right' ? res.right : model.editor.editor
      return [
        {
          ...model,
          editor: {
            ...model.editor,
            editor: newEditor,
          },
        },
        Cmd.none(),
      ]
    }

    case 'ShowUpdateCaptionedImageModel': {
      return [
        {
          ...model,
          insertCaptionedImageModal: {
            visible: true,
            src: '',
            alt: '',
            caption: '',
            editorState: O.some(getEditorState(model.editor.editor)),
          },
        },
        Cmd.none(),
      ]
    }

    case 'UpdateCaptionedImageSrc': {
      return [
        {
          ...model,
          insertCaptionedImageModal: {
            ...model.insertCaptionedImageModal,
            src: msg.src,
          },
        },
        Cmd.none(),
      ]
    }

    case 'UpdateCaptionedImageAlt': {
      return [
        {
          ...model,
          insertCaptionedImageModal: {
            ...model.insertCaptionedImageModal,
            alt: msg.alt,
          },
        },
        Cmd.none(),
      ]
    }

    case 'UpdateCaption': {
      return [
        {
          ...model,
          insertCaptionedImageModal: {
            ...model.insertCaptionedImageModal,
            caption: msg.caption,
          },
        },
        Cmd.none(),
      ]
    }

    case 'CancelInsertCaptionedImage': {
      return [
        {
          ...model,
          insertCaptionedImageModal: {
            visible: false,
            src: '',
            alt: '',
            caption: '',
            editorState: O.none,
          },
        },
        Cmd.none(),
      ]
    }

    case 'InsertCaptionedImage': {
      const modal = model.insertCaptionedImageModal
      if (O.isNone(modal.editorState)) {
        return [model, Cmd.none()]
      }
      const state_ = modal.editorState.value
      const params = element(captionedImage, [
        { _tag: 'StringAttribute', key: 'src', value: modal.src },
        { _tag: 'StringAttribute', key: 'alt', value: modal.alt },
        { _tag: 'StringAttribute', key: 'caption', value: modal.caption },
      ])
      const img = block(params, Leaf)
      const insertTransform = insertBlock(img)
      const resState = insertTransform(state_)

      let newEditor = model.editor.editor
      if (resState._tag === 'Right') {
        const applyRes = applyCommand(
          ['insertCaptionedImage', transform(() => resState)],
          customSpec,
          model.editor.editor,
        )
        if (applyRes._tag === 'Right') {
          newEditor = applyRes.right
        }
      }

      return [
        {
          ...model,
          editor: {
            ...model.editor,
            editor: newEditor,
          },
          insertCaptionedImageModal: {
            visible: false,
            src: '',
            alt: '',
            caption: '',
            editorState: O.none,
          },
        },
        Cmd.none(),
      ]
    }
  }
}
