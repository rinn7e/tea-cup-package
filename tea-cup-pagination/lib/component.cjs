"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/component.tsx
var component_exports = {};
__export(component_exports, {
  PaginationComponent: () => PaginationComponent,
  PaginationMemo: () => PaginationMemo
});
module.exports = __toCommonJS(component_exports);
var import_react = require("react");

// src/type.ts
var RD = __toESM(require("@devexperts/remote-data-ts"), 1);
var import_tea_cup_prelude = require("@rinn7e/tea-cup-prelude");
var A = __toESM(require("fp-ts/lib/Array"), 1);
var EqClass = __toESM(require("fp-ts/lib/Eq"), 1);
var N = __toESM(require("fp-ts/lib/number"), 1);
var mkModelEq = (itemEq, errEq) => EqClass.struct({
  items: RD.getEq(errEq, A.getEq(itemEq)),
  page: N.Eq,
  pageAmount: N.Eq
});
var mkPropsEq = (itemEq, errEq) => EqClass.struct({
  model: mkModelEq(itemEq, errEq),
  dispatch: import_tea_cup_prelude.EqAlways,
  config: import_tea_cup_prelude.EqAlways,
  itemEq: import_tea_cup_prelude.EqAlways,
  errEq: import_tea_cup_prelude.EqAlways
});

// src/component.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var PaginationComponent = ({
  model,
  dispatch,
  config
}) => {
  const { page, pageAmount } = model;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
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
var PaginationMemo = (0, import_react.memo)(PaginationComponent, (prev, next) => {
  const propEq = mkPropsEq(prev.itemEq, prev.errEq);
  return propEq.equals(prev, next);
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PaginationComponent,
  PaginationMemo
});
