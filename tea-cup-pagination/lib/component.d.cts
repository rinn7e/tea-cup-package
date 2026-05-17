import * as react_jsx_runtime from 'react/jsx-runtime';
import React from 'react';
import { P as Props } from './type-BYe8Yvej.cjs';
import '@devexperts/remote-data-ts';
import 'fp-ts/lib/Eq';
import 'fp-ts/lib/TaskEither';
import 'tea-cup-fp';

declare const PaginationComponent: <Item, ItemMsg, Err>({ model, dispatch, config, }: Props<Item, ItemMsg, Err>) => react_jsx_runtime.JSX.Element;
declare const PaginationMemo: <Item, ItemMsg, Err>(props: Props<Item, ItemMsg, Err>) => React.ReactElement;

export { PaginationComponent, PaginationMemo };
