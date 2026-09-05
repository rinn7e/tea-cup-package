import { Cmd } from 'tea-cup-fp'

import { type Model, type Msg } from './type'

export const init = (
  networkOnline = true,
  networkLatencyMs = 80,
): [Model, Cmd<Msg>] => {
  const model: Model = {
    networkOnline,
    networkLatencyMs,
  }
  return [model, Cmd.none()]
}

export const update = (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
  switch (msg._tag) {
    case 'NoOp':
      return [model, Cmd.none()]
    case 'ToggleNetworkOnline':
      return [{ ...model, networkOnline: !model.networkOnline }, Cmd.none()]
    case 'SetNetworkLatency':
      return [{ ...model, networkLatencyMs: msg.ms }, Cmd.none()]
  }
}
