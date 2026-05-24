import { Cmd } from "tea-cup-fp";
import {
  createState,
  editor as createEditor,
  markdown,
  toHtml,
  blockFromHtml,
  withRoot,
  state as getEditorState,
} from "@rinn7e/tea-cup-rte-toolkit";
import * as O from "fp-ts/lib/Option";
import * as E from "fp-ts/lib/Either";
import { marked } from "marked";
import TurndownService from "turndown";

import * as EditorUpdate from "@/editor/update";
import type { Model, Msg } from "./type";

const turndownService = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

export const init = (): [Model, Cmd<Msg>] => {
  const initialBlock = EditorUpdate.docInitNode();
  const initialEditorState = createState(initialBlock, O.none);
  const editorModel = EditorUpdate.init(createEditor(initialEditorState));

  const html = toHtml(markdown, initialBlock);
  const initialMarkdown = turndownService.turndown(html);

  return [
    {
      editor: editorModel,
      textMarkdown: initialMarkdown,
      markdownError: null,
      editorType: "WYSIWYG",
    },
    Cmd.none(),
  ];
};

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case "EditorMsg": {
      const [editorModel, editorCmd] = EditorUpdate.update(
        markdown,
        msg.subMsg,
        model.editor,
      );
      return [
        { ...model, editor: editorModel },
        editorCmd.map((subMsg) => ({ _tag: "EditorMsg", subMsg })),
      ];
    }

    case "EditorChange": {
      const targetType = msg.editorType;
      if (targetType === model.editorType) {
        return [model, Cmd.none()];
      }

      if (targetType === "WYSIWYG") {
        // Parse markdown text area to Editor block state
        try {
          const html = marked.parse(model.textMarkdown) as string;
          const blockRes = blockFromHtml(markdown, html);

          if (E.isLeft(blockRes)) {
            return [
              {
                ...model,
                markdownError: `Failed to parse HTML from Markdown: ${blockRes.left}`,
              },
              Cmd.none(),
            ];
          }

          const newBlock = blockRes.right;
          const currentEditorState = getEditorState(model.editor.editor);
          const newEditorState = withRoot(newBlock, currentEditorState);
          const newEditor = createEditor(newEditorState);

          return [
            {
              ...model,
              editor: {
                ...model.editor,
                editor: newEditor,
              },
              editorType: "WYSIWYG",
              markdownError: null,
            },
            Cmd.none(),
          ];
        } catch (e: any) {
          return [
            {
              ...model,
              markdownError: `Markdown compiler error: ${e.message || String(e)}`,
            },
            Cmd.none(),
          ];
        }
      } else {
        // Convert Editor block state to Markdown
        const currentBlock = getEditorState(model.editor.editor).contents.root;
        const html = toHtml(markdown, currentBlock);
        const textMarkdown = turndownService.turndown(html);

        return [
          {
            ...model,
            textMarkdown,
            editorType: "Markdown",
            markdownError: null,
          },
          Cmd.none(),
        ];
      }
    }

    case "TextAreaChange": {
      return [
        {
          ...model,
          textMarkdown: msg.text,
          markdownError: null,
        },
        Cmd.none(),
      ];
    }
  }
};
