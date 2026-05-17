/* MIT License

Copyright (c) 2025 Moremi Vannak

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. */
import * as RD from "@devexperts/remote-data-ts";
import { attemptTE, cmdSucceed } from "@rinn7e/tea-cup-prelude";
import { Cmd } from "tea-cup-fp";

import { type Config, type Model, type Msg } from "./type";

export const scrollToTopCmd = (
  scrollContainerId?: string,
): Cmd<{ _tag: "NoOp" }> =>
  cmdSucceed(() => {
    if (scrollContainerId) {
      const container = document.getElementById(scrollContainerId);
      if (container) {
        container.scrollTo({
          top: 0,
          behavior: "smooth",
        });
        return;
      }
    }
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });

export const init = <Item, ItemMsg, Err>(
  config: Config<Item, ItemMsg, Err>,
  page: number = 1,
): [Model<Item, Err>, Cmd<Msg<Item, ItemMsg, Err>>] => {
  const model: Model<Item, Err> = {
    items: RD.pending,
    page,
    pageAmount: 0,
  };

  return [model, fetchCmd(config, page)];
};

export const update =
  <Item, ItemMsg, Err>(config: Config<Item, ItemMsg, Err>) =>
  (
    msg: Msg<Item, ItemMsg, Err>,
    model: Model<Item, Err>,
  ): [Model<Item, Err>, Cmd<Msg<Item, ItemMsg, Err>>] => {
    switch (msg._tag) {
      case "ChangePage": {
        if (msg.page === model.page) {
          return [model, Cmd.none()];
        } else {
          return [
            {
              ...model,
              page: msg.page,
            },
            Cmd.batch([
              fetchCmd(config, msg.page),
              scrollToTopCmd(config.scrollContainerId),
            ]),
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
                    msg.result.value.totalCount / config.limit,
                  ),
                },
                scrollToTopCmd(),
              ];
            }
            case "RemoteFailure": {
              return [
                { ...model, items: RD.failure(msg.result.error) },
                Cmd.none(),
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

const fetchCmd = <Item, ItemMsg, Err>(
  config: Config<Item, ItemMsg, Err>,
  page: number,
): Cmd<Msg<Item, ItemMsg, Err>> => {
  const offset = (page - 1) * config.limit;
  const limit = config.limit;
  return attemptTE(
    config.handler(offset, limit),
    (result): Msg<Item, ItemMsg, Err> => {
      switch (result.tag) {
        case "Ok": {
          return {
            _tag: "FetchResponse",
            page,
            result: RD.success(result.value),
          };
        }
        case "Err": {
          return {
            _tag: "FetchResponse",
            page,
            result: RD.failure(result.err),
          };
        }
      }
    },
  );
};
