import * as RD from '@devexperts/remote-data-ts';
import * as EqClass from 'fp-ts/lib/Eq';
import * as TE from 'fp-ts/lib/TaskEither';
import { ReactNode } from 'react';
import { Dispatcher } from 'tea-cup-fp';

type Config<Item, ItemMsg, Err> = {
    handler: (offset: number, limit: number) => TE.TaskEither<Err, {
        items: Item[];
        totalCount: number;
    }>;
    renderItems: (items: RD.RemoteData<Err, Item[]>, itemDispatch: (item: Item, msg: ItemMsg) => void) => ReactNode;
    renderPagination: (currentPage: number, pageAmount: number, onPageChange: (page: number) => void) => ReactNode;
    limit: number;
    scrollContainerId?: string;
};
type Model<Item, Err> = {
    items: RD.RemoteData<Err, Item[]>;
    page: number;
    pageAmount: number;
};
declare const mkModelEq: <Item, Err>(itemEq: EqClass.Eq<Item>, errEq: EqClass.Eq<Err>) => EqClass.Eq<Model<Item, Err>>;
type Msg<Item, ItemMsg, Err> = {
    _tag: "ChangePage";
    page: number;
} | {
    _tag: "FetchResponse";
    page: number;
    result: RD.RemoteData<Err, {
        items: Item[];
        totalCount: number;
    }>;
} | {
    _tag: "ItemMsg";
    msg: ItemMsg;
    item: Item;
} | {
    _tag: "NoOp";
};
type Props<Item, ItemMsg, Err> = {
    model: Model<Item, Err>;
    dispatch: Dispatcher<Msg<Item, ItemMsg, Err>>;
    config: Config<Item, ItemMsg, Err>;
    itemEq: EqClass.Eq<Item>;
    errEq: EqClass.Eq<Err>;
};
declare const mkPropsEq: <Item, ItemMsg, Err>(itemEq: EqClass.Eq<Item>, errEq: EqClass.Eq<Err>) => EqClass.Eq<Props<Item, ItemMsg, Err>>;

export { type Config as C, type Model as M, type Props as P, type Msg as a, mkPropsEq as b, mkModelEq as m };
