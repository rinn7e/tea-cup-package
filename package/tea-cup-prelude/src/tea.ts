/* MIT License

Copyright (c) 2026 Moremi Vannak

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
import * as RD from '@devexperts/remote-data-ts'
import { Either } from 'fp-ts/lib/Either'
import { IO } from 'fp-ts/lib/IO'
import * as T from 'fp-ts/lib/Task'
import * as TE from 'fp-ts/lib/TaskEither'
import { identity } from 'fp-ts/lib/function'
import { Cmd, type PromiseSupplier, type Result, Task } from 'tea-cup-fp'

import { delay } from './common'

// TEA utils functions
// ---------------------------------

export const resultToRd = <E, A>(r: Result<E, A>): RD.RemoteData<E, A> =>
  r.tag === 'Ok' ? RD.success(r.value) : RD.failure(r.err)

export const resultToNoAction =
  <Msg>(noAction: Msg) =>
  (r: Result<Error, void>): Msg => {
    if (r.tag === 'Err') {
      console.warn('resultToNoAction error:', r.err.toString())
    }
    return noAction
  }

export const cmdFromPromise = <A, Msg>(
  promiseSupplier: PromiseSupplier<A>,
  f: (result: Result<Error, A>) => Msg,
) => Task.attempt(Task.fromPromise(promiseSupplier), f)

export const doNothing = <M, msg>(model: M): [M, Cmd<msg>] => {
  return [model, Cmd.none()]
}

export const delayCmd = <msg>(ms: number, msg: msg): Cmd<msg> =>
  cmdFromPromise(
    async () => {
      await delay(ms)
    },
    () => msg,
  )

// Trigger a msg in Cmd (currently useful for processing queue)
export const msgCmd = <msg>(msg: msg): Cmd<msg> =>
  Task.perform(Task.succeed(msg), identity)

export const noMsg = (): { _tag: 'NoOp' } => ({ _tag: 'NoOp' })

export const cmdSucceed = (effectSupplier: () => void): Cmd<{ _tag: 'NoOp' }> =>
  Task.perform<void, { _tag: 'NoOp' }>(Task.succeedLazy(effectSupplier), noMsg)

// The same as `cmdSucceed` but accepts a function that return a Msg
// (Similar to `cmdFromPromise` in a way, but instead of accept an aysnc function
// accepts a normal effect function instead.)
export const cmdSucceedWithMsg = <A, amsg>(
  effectSupplier: () => A,
  f: (result: A) => amsg,
) => Task.perform<A, amsg>(Task.succeedLazy(effectSupplier), f)

// batchCommand : Cmd msg -> ( model, Cmd msg ) -> ( model, Cmd msg )
// batchCommand cmd =
//     Tuple.mapSecond (\c -> Cmd.batch [ c, cmd ])
export const batchCmd =
  <msg, model>(newCmd: Cmd<msg>) =>
  ([model, cmd]: [model, Cmd<msg>]): [model, Cmd<msg>] => {
    return [model, Cmd.batch([cmd, newCmd])]
  }

// extraCommand : (model -> Cmd msg) -> ( model, Cmd msg ) -> ( model, Cmd msg )
// extraCommand newCmd ( model, cmd ) =
//     ( model, Cmd.batch [ cmd, newCmd model ] )
export const extraCmd =
  <msg, model>(mkNewCmd: (m: model) => Cmd<msg>) =>
  ([model, cmd]: [model, Cmd<msg>]): [model, Cmd<msg>] => {
    return [model, Cmd.batch([cmd, mkNewCmd(model)])]
  }

// updateAndCommand : (model -> ( model, Cmd msg )) -> ( model, Cmd msg ) -> ( model, Cmd msg )
// updateAndCommand func ( model, cmd ) =
//     func model
//         |> Tuple.mapSecond (\c -> Cmd.batch [ cmd, c ])
export const updateAndCmd =
  <msg, model>(func: (m: model) => [model, Cmd<msg>]) =>
  ([model, cmd]: [model, Cmd<msg>]): [model, Cmd<msg>] => {
    const [newModel, newCmd] = func(model)
    return [newModel, Cmd.batch([cmd, newCmd])]
  }

// The same as `updateAndCmd` but also include another generic param
export const updateAndCmdExtra =
  <msg, model, A>(func: (m: model) => [model, Cmd<msg>, A]) =>
  ([model, cmd]: [model, Cmd<msg>]): [model, Cmd<msg>, A] => {
    const [newModel, newCmd, a] = func(model)
    return [newModel, Cmd.batch([cmd, newCmd]), a]
  }

/**
 * Converts a tea-cup-fp `Task` into an fp-ts `TaskEither`.
 * This bridge is useful when integrating tea-cup-fp based components
 * with API handlers or other logic that strictly uses fp-ts TaskEither.
 */
export const taskToTE = <E, R>(task: Task<E, R>): TE.TaskEither<E, R> =>
  TE.tryCatch(
    () =>
      new Promise<R>((resolve, reject) => {
        task.execute((result) => {
          if (result.tag === 'Ok') {
            resolve(result.value)
          } else {
            reject(result.err)
          }
        })
      }),
    (err: unknown) => err as E,
  )

/**
 * Converts an fp-ts `TaskEither` into a tea-cup-fp `Task`.
 * This allows integrating existing TaskEither-based API handlers
 * into the tea-cup-fp TEA (The Elm Architecture) update loop logic safely.
 */
export const taskFromTE = <E, R>(te: TE.TaskEither<E, R>): Task<E, R> => {
  return Task.fromPromise(te).andThen((res: Either<E, R>) => {
    if (res._tag === 'Right') {
      return Task.succeed(res.right)
    } else {
      return Task.fail(res.left)
    }
  }) as Task<E, R>
}

/**
 * Converts an fp-ts `Task` into a tea-cup-fp `Task`.
 * This allows integrating existing Task-based API handlers
 * into the tea-cup-fp TEA (The Elm Architecture) update loop logic safely.
 */
export const taskFromT = <R>(t: T.Task<R>): Task<never, R> => {
  return Task.fromPromise(t) as Task<never, R>
}

/**
 * Converts an fp-ts `IO` into a tea-cup-fp `Task`.
 * This allows integrating existing IO-based logic
 * into the tea-cup-fp TEA (The Elm Architecture) update loop logic safely.
 */
export const taskFromIO = <R>(io: IO<R>): Task<never, R> => {
  return Task.succeedLazy(io)
}

// Shorthand for `Task.attempt(taskFromTE(te) ...)`
export const attemptTE = <E, R, M>(
  te: TE.TaskEither<E, R>,
  toMsg: (r: Result<E, R>) => M,
) => Task.attempt(taskFromTE(te), toMsg)

// Shorthand for `Task.perform(taskFromIO(io) ...)`
export const performIO = <R, M>(io: IO<R>, toMsg: (r: R) => M) =>
  Task.perform(taskFromIO(io), toMsg)

// Execute IO and discard results by returning `None` msg
export const performIO_ = <R>(io: IO<R>): Cmd<{ _tag: 'NoOp' }> =>
  Task.perform(taskFromIO(io), noMsg)
