import { C as Config, M as Model, a as Msg } from './type-BYe8Yvej.cjs';
export { P as Props, m as mkModelEq, b as mkPropsEq } from './type-BYe8Yvej.cjs';
import { Cmd } from 'tea-cup-fp';
import '@devexperts/remote-data-ts';
import 'fp-ts/lib/Eq';
import 'fp-ts/lib/TaskEither';
import 'react';

declare const scrollToTopCmd: (scrollContainerId?: string) => Cmd<{
    _tag: "NoOp";
}>;
declare const init: <Item, ItemMsg, Err>(config: Config<Item, ItemMsg, Err>, page?: number) => [Model<Item, Err>, Cmd<Msg<Item, ItemMsg, Err>>];
declare const update: <Item, ItemMsg, Err>(config: Config<Item, ItemMsg, Err>) => (msg: Msg<Item, ItemMsg, Err>, model: Model<Item, Err>) => [Model<Item, Err>, Cmd<Msg<Item, ItemMsg, Err>>];

export { Config, Model, Msg, init, scrollToTopCmd, update };
