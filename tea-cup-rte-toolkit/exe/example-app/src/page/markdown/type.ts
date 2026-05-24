import type * as Editor from "@/editor/type";

export type EditorType = "Markdown" | "WYSIWYG";

export type Model = {
  editor: Editor.Model;
  textMarkdown: string;
  markdownError: string | null;
  editorType: EditorType;
};

export type Msg =
  | { readonly _tag: "EditorMsg"; readonly subMsg: Editor.Msg }
  | { readonly _tag: "EditorChange"; readonly editorType: EditorType }
  | { readonly _tag: "TextAreaChange"; readonly text: string };
