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

// src/index.ts
var index_exports = {};
__export(index_exports, {
  init: () => init,
  mkModelEq: () => mkModelEq,
  mkPropsEq: () => mkPropsEq,
  scrollToTopCmd: () => scrollToTopCmd,
  update: () => update
});
module.exports = __toCommonJS(index_exports);

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

// src/update.ts
var RD2 = __toESM(require("@devexperts/remote-data-ts"), 1);
var import_tea_cup_prelude2 = require("@rinn7e/tea-cup-prelude");
var import_tea_cup_fp = require("tea-cup-fp");
var scrollToTopCmd = (scrollContainerId) => (0, import_tea_cup_prelude2.cmdSucceed)(() => {
  if (scrollContainerId) {
    const container = document.getElementById(scrollContainerId);
    if (container) {
      container.scrollTo({
        top: 0,
        behavior: "smooth"
      });
      return;
    }
  }
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});
var init = (config, page = 1) => {
  const model = {
    items: RD2.pending,
    page,
    pageAmount: 0
  };
  return [model, fetchCmd(config, page)];
};
var update = (config) => (msg, model) => {
  switch (msg._tag) {
    case "ChangePage": {
      if (msg.page === model.page) {
        return [model, import_tea_cup_fp.Cmd.none()];
      } else {
        return [
          {
            ...model,
            page: msg.page
          },
          import_tea_cup_fp.Cmd.batch([
            fetchCmd(config, msg.page),
            scrollToTopCmd(config.scrollContainerId)
          ])
        ];
      }
    }
    case "FetchResponse": {
      if (msg.page !== model.page) {
        return [model, import_tea_cup_fp.Cmd.none()];
      } else {
        switch (msg.result._tag) {
          case "RemoteSuccess": {
            return [
              {
                ...model,
                items: RD2.success(msg.result.value.items),
                pageAmount: Math.ceil(
                  msg.result.value.totalCount / config.limit
                )
              },
              scrollToTopCmd()
            ];
          }
          case "RemoteFailure": {
            return [
              { ...model, items: RD2.failure(msg.result.error) },
              import_tea_cup_fp.Cmd.none()
            ];
          }
          default: {
            return [model, import_tea_cup_fp.Cmd.none()];
          }
        }
      }
    }
    case "ItemMsg": {
      return [model, import_tea_cup_fp.Cmd.none()];
    }
    case "NoOp": {
      return [model, import_tea_cup_fp.Cmd.none()];
    }
  }
};
var fetchCmd = (config, page) => {
  const offset = (page - 1) * config.limit;
  const limit = config.limit;
  return (0, import_tea_cup_prelude2.attemptTE)(
    config.handler(offset, limit),
    (result) => {
      switch (result.tag) {
        case "Ok": {
          return {
            _tag: "FetchResponse",
            page,
            result: RD2.success(result.value)
          };
        }
        case "Err": {
          return {
            _tag: "FetchResponse",
            page,
            result: RD2.failure(result.err)
          };
        }
      }
    }
  );
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  init,
  mkModelEq,
  mkPropsEq,
  scrollToTopCmd,
  update
});
