import {
  type Attribute,
  type Block,
  type ElementDecoration,
  type ElementDefinition,
  HtmlNode,
  Option,
  type Path,
  Element as RteElement,
  type Spec,
  type State,
  type Transform,
  addElementDecoration,
  applyCommand,
  block,
  blockChildren,
  blockNode,
  editor as createEditor,
  createState,
  defaultHtmlToElement,
  element,
  elementDefinition,
  emptyDecorations,
  emptySpec,
  findBoolAttribute,
  hardBreak,
  inlineChildren,
  nodeAt,
  none,
  plainText,
  replace,
  replaceOrAddBoolAttribute,
  some,
  textBlock,
  transform,
  withElement,
  withElementAttributes,
  withElementDefinitions,
  withRoot,
  withTopLevelAttributes,
} from '@rinn7e/tea-cup-rte-toolkit'
import * as E from 'fp-ts/lib/Either'
import * as O from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { Cmd } from 'tea-cup-fp'

import * as EditorUpdate from '@/editor/update'

import type { Model, Msg } from './type'

// 1. Todo List Element Definition
export const todoList = elementDefinition({
  name: 'todo_list',
  group: 'root',
  contentType: blockNode(['items']),
  toHtmlNode: (el, children) => ({
    _tag: 'ElementNode',
    name: 'ul',
    attributes: [['class', 'todo-list-container']],
    children,
  }),
  fromHtmlNode: defaultHtmlToElement('ul'),
  selectable: false,
})

// 2. Todo Item Element Definition
export const item = elementDefinition({
  name: 'todo_item',
  group: 'items',
  contentType: textBlock({ allowedGroups: ['inline'], allowedMarks: [] }),
  toHtmlNode: (params: RteElement, children: Array<HtmlNode>): HtmlNode => {
    const checkedOpt = findBoolAttribute('checked', params.contents.attributes)
    const checked = checkedOpt._tag === 'Some' ? checkedOpt.value : false

    return {
      _tag: 'ElementNode',
      name: 'li',
      attributes: [['class', 'todo-list-item']],
      children: [
        {
          _tag: 'ElementNode',
          name: 'div',
          attributes: [['contenteditable', 'false']],
          children: [
            {
              _tag: 'ElementNode',
              name: 'div',
              attributes: [
                [
                  'class',
                  checked ? 'checklist-checkbox checked' : 'checklist-checkbox',
                ],
              ],
              children: [],
            },
          ],
        },
        {
          _tag: 'ElementNode',
          name: 'div',
          attributes: [
            [
              'class',
              checked ? 'checklist-content completed' : 'checklist-content',
            ],
          ],
          children,
        },
      ],
    }
  },
  fromHtmlNode: (
    def: ElementDefinition,
    node: HtmlNode,
  ): Option<[RteElement, Array<HtmlNode>]> => {
    if (node._tag === 'ElementNode' && node.name === 'li') {
      const wrapper = node.children[0]
      if (wrapper && wrapper._tag === 'ElementNode' && wrapper.name === 'div') {
        const checkDiv = wrapper.children[0]
        if (
          checkDiv &&
          checkDiv._tag === 'ElementNode' &&
          checkDiv.name === 'div'
        ) {
          let checked = false
          for (const [k, v] of checkDiv.attributes) {
            if (k === 'class' && v.includes('checked')) {
              checked = true
            }
          }
          const contentDiv = node.children[1]
          if (contentDiv && contentDiv._tag === 'ElementNode') {
            const parameters = element(def, [
              { _tag: 'BoolAttribute', key: 'checked', value: checked },
            ])
            return some([parameters, contentDiv.children])
          }
        }
      }
    }
    return none
  },
  selectable: false,
})

// 3. Todo Spec
export const todoSpec: Spec = withElementDefinitions(
  [todoList, item, hardBreak],
  emptySpec,
)

// 4. Todo Decorations
const toggleCheckboxDecoration = (
  editorNodePath: Path,
  elementVal: RteElement,
  elementPath: Path,
): Array<Attribute<Msg>> => {
  const checkedOpt = findBoolAttribute(
    'checked',
    elementVal.contents.attributes,
  )
  const checked = checkedOpt._tag === 'Some' ? checkedOpt.value : false

  const pathStr = elementPath.join(':')
  if (pathStr === '0:0') {
    return [
      [
        'onClick',
        () => ({
          _tag: 'ToggleCheckedTodoItem' as const,
          path: editorNodePath,
          checked: !checked,
        }),
      ],
    ]
  }
  return []
}

export const todoDecorations = pipe(
  emptyDecorations<Msg>(),
  (d) =>
    addElementDecoration(
      item,
      toggleCheckboxDecoration satisfies ElementDecoration<Msg>,
      d,
    ),
  (d) => withTopLevelAttributes([['data-gramm_editor', 'false']], d),
)

// 5. Initial Checklist State
const initialTodoNode = (s: string, checked = false): Block =>
  block(
    element(item, [{ _tag: 'BoolAttribute', key: 'checked', value: checked }]),
    inlineChildren([plainText(s)]),
  )

const docInitNode = (): Block =>
  block(
    element(todoList, []),
    blockChildren([
      initialTodoNode(
        'Port Elm Rich Text Editor Toolkit to TypeScript/React 💞',
        true,
      ),
      initialTodoNode(
        'Set up monorepo workspaces and link dependencies ⚙️',
        true,
      ),
      initialTodoNode(
        'Implement path-based (History API) URL routing 🔗',
        true,
      ),
      initialTodoNode(
        'Port the five interactive demo pages faithfully 🌸',
        false,
      ),
      initialTodoNode(
        'Verify all TS builds compile with 0 compilation errors! ✨',
        false,
      ),
    ]),
  )

export const init = (): [Model, Cmd<Msg>] => {
  const editorState = createState(docInitNode(), O.none)
  const editorModel = EditorUpdate.init(createEditor(editorState))

  return [{ editor: editorModel }, Cmd.none()]
}

// 6. Update Checked Todo Item Transform
export const updateTodoListItem = (path: Path, value: boolean): Transform => {
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
    if (ep.contents.name !== 'todo_item') {
      return E.left('Node is not a todo item')
    }

    const newAttributes = replaceOrAddBoolAttribute(
      'checked',
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
      const [editorModel, editorCmd] = EditorUpdate.update(
        todoSpec,
        msg.subMsg,
        model.editor,
        todoDecorations,
      )
      return [
        { ...model, editor: editorModel },
        editorCmd.map((subMsg) => ({ _tag: 'EditorMsg', subMsg })),
      ]
    }

    case 'ToggleCheckedTodoItem': {
      const { path, checked } = msg
      const res = applyCommand(
        ['updateTodoListItem', transform(updateTodoListItem(path, checked))],
        todoSpec,
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
  }
}
