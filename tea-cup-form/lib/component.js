import {
  PropEq,
  formView
} from "./chunk-V5GNV5VO.js";

// src/component.tsx
import * as M from "fp-ts/lib/Map";
import * as S from "fp-ts/lib/string";
import { memo } from "react";
import { jsx } from "react/jsx-runtime";
var FormItem = ({ field, dispatch, model }) => {
  const result = M.lookup(S.Ord)(field)(model.forms);
  switch (result._tag) {
    case "Some":
      return formView(field, result.value, dispatch, model);
    default:
      return /* @__PURE__ */ jsx("div", { children: "Internal error" });
  }
};
var FormItemMemo = memo(FormItem, PropEq.equals);
export {
  FormItemMemo
};
