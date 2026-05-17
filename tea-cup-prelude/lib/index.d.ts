import * as RD from '@devexperts/remote-data-ts';
import * as E from 'fp-ts/lib/Either';
import * as EqClass from 'fp-ts/lib/Eq';
import { Eq } from 'fp-ts/lib/Eq';
import * as IO from 'fp-ts/lib/IO';
import { IO as IO$1 } from 'fp-ts/lib/IO';
import * as OrdClass from 'fp-ts/lib/Ord';
import * as t from 'io-ts';
import * as tt from 'io-ts-types';
import * as T from 'fp-ts/lib/Task';
import * as TE from 'fp-ts/lib/TaskEither';
import { Result, Cmd, PromiseSupplier, Task } from 'tea-cup-fp';
import { ClassValue } from 'clsx';
import { DevTools } from 'react-tea-cup';

declare const and: (as: Array<boolean>) => boolean;
declare const or: (as: Array<boolean>) => boolean;
/**
 * Make a nullable type, not null. Should ony be used on a type
 * that is sure to be not null.
 */
declare const unsafeFromNullable: <A, _>(a: A | null) => NonNullable<A>;
/**
 * Run a function that accepts no argument, useful when running if/else/switch function
 * `exec(() => 1 + 1)` is the same as `(() => 1 + 1)()`
 * Resemble fp-ts `Lazy.execute`.
 */
declare const exec: <A>(f: () => A) => A;
/**
 * If the value has more than 2 decimal, rounded it to 2
 * If the value has less than 2 decimal, display .00 or .x0
 */
declare const limitDecimal2Digit: (value: number) => string;
declare const delay: (ms: number) => Promise<unknown>;
declare const appRouteReload: (r: string) => void;
declare const words: (r: string) => string[];
declare const unwords: (r: string[]) => string;
declare const lines: (r: string) => string[];
declare const unlines: (r: string[]) => string;
declare const hasChildOverflow: (ref: {
    current: HTMLDivElement | null;
}) => boolean;
declare const capFirst: (string: string) => string;
declare const runIO: <A>(io: IO.IO<A>) => A;
declare const throttle: <F extends (...args: any[]) => any>(func: F, waitFor: number) => (...args: Parameters<F>) => Promise<ReturnType<F>>;
declare const mkDate: (dateString: string) => Date;
declare const NullableEq: <A>(aEq: EqClass.Eq<A>) => EqClass.Eq<A | null>;
declare const EqAlways: EqClass.Eq<any>;
declare const nullEq: EqClass.Eq<null>;
declare const UndefinableEq: <A>(aEq: EqClass.Eq<A>) => EqClass.Eq<A | undefined>;
declare const filterUnique: <A>(equal: (a1: A, a2: A) => boolean, arrayToBeFiltered: A[], arrayToBeCheckedWith: A[]) => A[];
declare const concatOverwriteDup: <A>(equal: (a1: A, a2: A) => boolean, currentData: A[], incomingData: A[]) => A[];
declare const booleanFromString: (v: string) => boolean | null;
declare const booleanFromUndefinedWithDefault: (v: string | undefined, de: boolean) => boolean;
declare const nonEmptyStr: (s: string) => s is string;
declare const error: (err: string) => any;
declare const RemoteProgressJson: t.TypeC<{
    loaded: t.NumberC;
    total: tt.OptionC<t.NumberC>;
}>;
declare const RemoteDataJson: <A>(aJson: t.Type<A>) => t.Type<RD.RemoteData<string, A>>;
declare const rdConvertNullSuccessToInitial: <E, A>(input: RD.RemoteData<E, A | null>) => RD.RemoteData<E, A>;
declare const diffIdList: <A>(eq: EqClass.Eq<A>) => (idListB: A[]) => (idListA: A[]) => A[];
declare const jsonParse: (input: any) => E.Either<string, any>;
declare const decodeWithReport: <A>(jsonDecoder: t.Type<A, unknown>, input: any) => E.Either<string, A>;
declare const errorToString: (err: unknown) => string;
declare const sortAndRemoveDup: <A>(eq: EqClass.Eq<A>, ord: OrdClass.Ord<A>) => (arr: A[]) => A[];
declare const concatIfNotExist: <A>(E: EqClass.Eq<A>) => (value: A) => (array: A[]) => A[];
declare const getFirstLine: (text: string) => string;
declare const truncateHtml: (input: string, limit: number) => string;
declare const truncateText: (input: string, limit: number) => string;
declare const brandedString: <T extends string>(name: string) => t.Type<T, T, unknown>;
declare const brandedNumber: <T extends number>(name: string) => t.Type<T, T, unknown>;

declare const resultToRd: <E, A>(r: Result<E, A>) => RD.RemoteData<E, A>;
declare const resultToNoAction: <Msg>(noAction: Msg) => (r: Result<Error, void>) => Msg;
declare const cmdFromPromise: <A, Msg>(promiseSupplier: PromiseSupplier<A>, f: (result: Result<Error, A>) => Msg) => Cmd<Msg>;
declare const doNothing: <M, msg>(model: M) => [M, Cmd<msg>];
declare const delayCmd: <msg>(ms: number, msg: msg) => Cmd<msg>;
declare const msgCmd: <msg>(msg: msg) => Cmd<msg>;
declare const noMsg: () => {
    _tag: "NoOp";
};
declare const cmdSucceed: (effectSupplier: () => void) => Cmd<{
    _tag: "NoOp";
}>;
declare const cmdSucceedWithMsg: <A, amsg>(effectSupplier: () => A, f: (result: A) => amsg) => Cmd<amsg>;
declare const batchCmd: <msg, model>(newCmd: Cmd<msg>) => ([model, cmd]: [model, Cmd<msg>]) => [model, Cmd<msg>];
declare const extraCmd: <msg, model>(mkNewCmd: (m: model) => Cmd<msg>) => ([model, cmd]: [model, Cmd<msg>]) => [model, Cmd<msg>];
declare const updateAndCmd: <msg, model>(func: (m: model) => [model, Cmd<msg>]) => ([model, cmd]: [model, Cmd<msg>]) => [model, Cmd<msg>];
declare const updateAndCmdExtra: <msg, model, A>(func: (m: model) => [model, Cmd<msg>, A]) => ([model, cmd]: [model, Cmd<msg>]) => [model, Cmd<msg>, A];
/**
 * Converts a tea-cup-fp `Task` into an fp-ts `TaskEither`.
 * This bridge is useful when integrating tea-cup-fp based components
 * with API handlers or other logic that strictly uses fp-ts TaskEither.
 */
declare const taskToTE: <E, R>(task: Task<E, R>) => TE.TaskEither<E, R>;
/**
 * Converts an fp-ts `TaskEither` into a tea-cup-fp `Task`.
 * This allows integrating existing TaskEither-based API handlers
 * into the tea-cup-fp TEA (The Elm Architecture) update loop logic safely.
 */
declare const taskFromTE: <E, R>(te: TE.TaskEither<E, R>) => Task<E, R>;
/**
 * Converts an fp-ts `Task` into a tea-cup-fp `Task`.
 * This allows integrating existing Task-based API handlers
 * into the tea-cup-fp TEA (The Elm Architecture) update loop logic safely.
 */
declare const taskFromT: <R>(t: T.Task<R>) => Task<never, R>;
/**
 * Converts an fp-ts `IO` into a tea-cup-fp `Task`.
 * This allows integrating existing IO-based logic
 * into the tea-cup-fp TEA (The Elm Architecture) update loop logic safely.
 */
declare const taskFromIO: <R>(io: IO$1<R>) => Task<never, R>;
declare const attemptTE: <E, R, M>(te: TE.TaskEither<E, R>, toMsg: (r: Result<E, R>) => M) => Cmd<M>;
declare const performIO: <R, M>(io: IO$1<R>, toMsg: (r: R) => M) => Cmd<M>;
declare const performIO_: <R>(io: IO$1<R>) => Cmd<{
    _tag: "NoOp";
}>;

/**
 * A simple way to conditionally add class names,
 * without using template literals.
 *
 * @example
 *
 * ```tsx
 * <div class={cn('px-3 py-2', condition && 'bg-red-500', classAsVariable)} />
 * ```
 */
declare function cn(...args: ClassValue[]): string;

declare function withDefault<T extends t.Any>(type: T, defaultValue: t.TypeOf<T>): t.Type<t.TypeOf<T>, t.OutputOf<T>, unknown>;

declare const devTools: <Model, Msg>() => DevTools<Model, Msg>;

declare const modifyAtIfExist$1: <A>(i: number, f: (a: A) => A) => (as: A[]) => A[];
declare const arrayFormatter: Intl.ListFormat;

declare const array_arrayFormatter: typeof arrayFormatter;
declare namespace array {
  export { array_arrayFormatter as arrayFormatter, modifyAtIfExist$1 as modifyAtIfExist };
}

declare const modifyAtIfExist: <K>(E: Eq<K>) => (<A>(k: K, f: (a: A) => A) => (m: Map<K, A>) => Map<K, A>);
declare const lookupWithDefault: <K>(E: Eq<K>) => (<A>(k: K) => (a: A) => (m: Map<K, A>) => A);

declare const map_lookupWithDefault: typeof lookupWithDefault;
declare const map_modifyAtIfExist: typeof modifyAtIfExist;
declare namespace map {
  export { map_lookupWithDefault as lookupWithDefault, map_modifyAtIfExist as modifyAtIfExist };
}

export { array as ArrayExtra, EqAlways, map as MapExtra, NullableEq, RemoteDataJson, RemoteProgressJson, UndefinableEq, and, appRouteReload, attemptTE, batchCmd, booleanFromString, booleanFromUndefinedWithDefault, brandedNumber, brandedString, capFirst, cmdFromPromise, cmdSucceed, cmdSucceedWithMsg, cn, concatIfNotExist, concatOverwriteDup, decodeWithReport, delay, delayCmd, devTools, diffIdList, doNothing, error, errorToString, exec, extraCmd, filterUnique, getFirstLine, hasChildOverflow, jsonParse, limitDecimal2Digit, lines, mkDate, msgCmd, noMsg, nonEmptyStr, nullEq, or, performIO, performIO_, rdConvertNullSuccessToInitial, resultToNoAction, resultToRd, runIO, sortAndRemoveDup, taskFromIO, taskFromT, taskFromTE, taskToTE, throttle, truncateHtml, truncateText, unlines, unsafeFromNullable, unwords, updateAndCmd, updateAndCmdExtra, withDefault, words };
