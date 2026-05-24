import { Cmd } from "tea-cup-fp";

import type { Model, Msg } from "./type";

export const init = (): [Model, Cmd<Msg>] => {
  return [{}, Cmd.none()];
};

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  return [model, Cmd.none()];
};
