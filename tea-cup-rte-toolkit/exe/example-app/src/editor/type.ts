import { Option } from "fp-ts/lib/Option";
import { Editor, State } from "@rinn7e/tea-cup-rte-toolkit";
import { Message } from "@rinn7e/tea-cup-rte-toolkit";

export type Style = "Bold" | "Italic" | "Code" | "Strikethrough" | "Underline";

export type InsertLinkModal = {
  visible: boolean;
  href: string;
  title: string;
  editorState: Option<State>;
};

export type InsertImageModal = {
  visible: boolean;
  src: string;
  alt: string;
  editorState: Option<State>;
};

export type Model = {
  editor: Editor;
  insertLinkModal: InsertLinkModal;
  insertImageModal: InsertImageModal;
};

export type Msg =
  | { readonly _tag: "InternalMsg"; readonly msg: Message }
  | { readonly _tag: "ToggleStyle"; readonly style: Style }
  | { readonly _tag: "ShowInsertLinkModal" }
  | { readonly _tag: "UpdateLinkHref"; readonly href: string }
  | { readonly _tag: "UpdateLinkTitle"; readonly title: string }
  | { readonly _tag: "InsertLink" }
  | { readonly _tag: "CancelInsertLink" }
  | { readonly _tag: "ToggleBlock"; readonly block: string }
  | { readonly _tag: "WrapInList"; readonly listType: "Ordered" | "Unordered" }
  | { readonly _tag: "ShowInsertImageModal" }
  | { readonly _tag: "InsertImage" }
  | { readonly _tag: "CancelInsertImage" }
  | { readonly _tag: "UpdateImageSrc"; readonly src: string }
  | { readonly _tag: "UpdateImageAlt"; readonly alt: string }
  | { readonly _tag: "InsertHorizontalRule" }
  | { readonly _tag: "WrapInBlockQuote" }
  | { readonly _tag: "LiftOutOfBlock" }
  | { readonly _tag: "Undo" }
  | { readonly _tag: "Redo" };

export type ControlState = {
  hasUndo: boolean;
  hasRedo: boolean;
  hasInline: boolean;
  hasSelection: boolean;
  nodes: Set<string>;
  marks: Set<string>;
  canLift: boolean;
};
