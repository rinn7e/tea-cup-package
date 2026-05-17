import {
  mkPropsEq
} from "./chunk-ZKFCM2IV.js";

// src/component.tsx
import { memo } from "react";
import { Fragment, jsxs } from "react/jsx-runtime";
var PaginationComponent = ({
  model,
  dispatch,
  config
}) => {
  const { page, pageAmount } = model;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    config.renderItems(model.items, (item, msg) => {
      dispatch({ _tag: "ItemMsg", item, msg });
    }),
    config.renderPagination(
      page,
      pageAmount,
      (p) => dispatch({ _tag: "ChangePage", page: p })
    )
  ] });
};
var PaginationMemo = memo(PaginationComponent, (prev, next) => {
  const propEq = mkPropsEq(prev.itemEq, prev.errEq);
  return propEq.equals(prev, next);
});
export {
  PaginationComponent,
  PaginationMemo
};
