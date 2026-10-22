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
import { describe, expect, it } from 'vitest'

import { Tracker } from '../src'

// A request under `tracker` that waits until told to finish, recording its
// signal and whether its Task reported back
const request = (tracker: string) => {
  const state = {
    signal: null as AbortSignal | null,
    finish: (): void => {},
    reported: false,
  }
  return {
    state,
    task: Tracker.task(
      tracker,
      (signal) =>
        new Promise<string>((resolve) => {
          state.signal = signal
          state.finish = () => resolve('done')
        }),
    ),
  }
}

const start = (r: ReturnType<typeof request>) =>
  Task.attempt(r.task, () => {
    r.state.reported = true
  })

const run = (cmd: Cmd<unknown>) => cmd.execute(() => {})

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('Tracker.task and Tracker.cancel (elm/http trackers)', () => {
  it('cancels the tracked request, and it never reports back', async () => {
    const r = request('search')
    run(start(r))
    run(Tracker.cancel('search'))
    r.state.finish()
    await settle()
    expect(r.state.signal?.aborted).toBe(true)
    expect(r.state.reported).toBe(false)
  })

  it('cancels the previous request and starts the next, in batch order', async () => {
    const first = request('search')
    run(start(first))
    const second = request('search')
    run(Cmd.batch([Tracker.cancel('search'), start(second)]))
    second.state.finish()
    await settle()
    expect(first.state.signal?.aborted).toBe(true)
    expect(second.state.signal?.aborted).toBe(false)
    expect(second.state.reported).toBe(true)
  })

  it('tracks one request per name: a newer one replaces the older', () => {
    const older = request('search')
    run(start(older))
    const newer = request('search')
    run(start(newer))
    run(Tracker.cancel('search'))
    expect(newer.state.signal?.aborted).toBe(true)
    expect(older.state.signal?.aborted).toBe(false)
  })

  it('leaves other names alone', () => {
    const search = request('search')
    const other = request('other')
    run(start(search))
    run(start(other))
    run(Tracker.cancel('search'))
    expect(other.state.signal?.aborted).toBe(false)
  })

  it('reports a finished request, and a later cancel does nothing', async () => {
    const r = request('search')
    run(start(r))
    r.state.finish()
    await settle()
    expect(r.state.reported).toBe(true)
    expect(() => run(Tracker.cancel('search'))).not.toThrow()
    expect(() => run(Tracker.cancel('nothing'))).not.toThrow()
  })
})
