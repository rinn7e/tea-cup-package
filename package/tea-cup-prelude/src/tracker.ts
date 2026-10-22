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
import { Cmd, Task } from 'tea-cup-fp'

// Elm's `Http` trackers, for tea-cup, exported as the `Tracker` namespace. A
// request runs under a tracker name (`Tracker.task`, Elm's
// `tracker = Just name`) and cancelling it is a Cmd (`Tracker.cancel`, Elm's
// `Http.cancel name`). As in elm/http's effect manager:
// - a name tracks one request: a new one under the same name replaces it,
//   and the older one keeps running, no longer cancellable;
// - a cancelled request never reports back: its Task never completes, so no
//   Msg reaches `update`;
// - in a `Cmd.batch`, cancels and requests run in order, so
//   `Cmd.batch([Tracker.cancel(name), Task.attempt(Tracker.task(name, …), …)])`
//   cancels the previous request and starts the next.
//
// The abort controllers live here, as Elm's live in its runtime: a Model and
// its `update` only ever hold the name.

// The request each name tracks: elm/http's `Dict String Process.Id`
const tracked = new Map<string, AbortController>()

// `request` run under `tracker`: it gets the signal that
// `Tracker.cancel(tracker)` aborts, to pass to its fetches
export const task = <A>(
  tracker: string,
  request: (signal: AbortSignal) => Promise<A>,
): Task<any, A> =>
  Task.fromPromise(() => {
    const controller = new AbortController()
    tracked.set(tracker, controller)
    return new Promise<A>((resolve, reject) => {
      request(controller.signal).then(
        (a) => {
          if (!controller.signal.aborted) resolve(a)
        },
        (err) => {
          if (!controller.signal.aborted) reject(err)
        },
      )
    })
  })

class CancelCmd<Msg> extends Cmd<Msg> {
  private readonly tracker: string

  constructor(tracker: string) {
    super()
    this.tracker = tracker
  }

  execute(): void {
    tracked.get(this.tracker)?.abort()
    tracked.delete(this.tracker)
  }
}

// Cancel the request `tracker` tracks (none: nothing happens)
export const cancel = <Msg>(tracker: string): Cmd<Msg> =>
  new CancelCmd<Msg>(tracker)
