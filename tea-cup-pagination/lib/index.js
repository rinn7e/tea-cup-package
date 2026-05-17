import {
  mkModelEq,
  mkPropsEq
} from "./chunk-ZKFCM2IV.js";

// src/update.ts
import * as RD from "@devexperts/remote-data-ts";
import { attemptTE, cmdSucceed } from "@rinn7e/tea-cup-prelude";
import { Cmd } from "tea-cup-fp";
var scrollToTopCmd = (scrollContainerId) => cmdSucceed(() => {
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
    items: RD.pending,
    page,
    pageAmount: 0
  };
  return [model, fetchCmd(config, page)];
};
var update = (config) => (msg, model) => {
  switch (msg._tag) {
    case "ChangePage": {
      if (msg.page === model.page) {
        return [model, Cmd.none()];
      } else {
        return [
          {
            ...model,
            page: msg.page
          },
          Cmd.batch([
            fetchCmd(config, msg.page),
            scrollToTopCmd(config.scrollContainerId)
          ])
        ];
      }
    }
    case "FetchResponse": {
      if (msg.page !== model.page) {
        return [model, Cmd.none()];
      } else {
        switch (msg.result._tag) {
          case "RemoteSuccess": {
            return [
              {
                ...model,
                items: RD.success(msg.result.value.items),
                pageAmount: Math.ceil(
                  msg.result.value.totalCount / config.limit
                )
              },
              scrollToTopCmd()
            ];
          }
          case "RemoteFailure": {
            return [
              { ...model, items: RD.failure(msg.result.error) },
              Cmd.none()
            ];
          }
          default: {
            return [model, Cmd.none()];
          }
        }
      }
    }
    case "ItemMsg": {
      return [model, Cmd.none()];
    }
    case "NoOp": {
      return [model, Cmd.none()];
    }
  }
};
var fetchCmd = (config, page) => {
  const offset = (page - 1) * config.limit;
  const limit = config.limit;
  return attemptTE(
    config.handler(offset, limit),
    (result) => {
      switch (result.tag) {
        case "Ok": {
          return {
            _tag: "FetchResponse",
            page,
            result: RD.success(result.value)
          };
        }
        case "Err": {
          return {
            _tag: "FetchResponse",
            page,
            result: RD.failure(result.err)
          };
        }
      }
    }
  );
};
export {
  init,
  mkModelEq,
  mkPropsEq,
  scrollToTopCmd,
  update
};
