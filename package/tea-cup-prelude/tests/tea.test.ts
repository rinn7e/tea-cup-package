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
import * as E from 'fp-ts/lib/Either'
import * as TE from 'fp-ts/lib/TaskEither'
import { Cmd, type Result, Task, err, ok } from 'tea-cup-fp'
import { describe, expect, it } from 'vitest'

import {
  batchCmd,
  doNothing,
  extraCmd,
  resultToRd,
  taskFromIO,
  taskFromTE,
  taskToTE,
  updateAndCmd,
  updateAndCmdExtra,
} from '../src'

type Msg = { _tag: 'NoOp' }

const runTask = <E, A>(task: Task<E, A>): Promise<Result<E, A>> =>
  new Promise((resolve) => task.execute(resolve))

describe('Result / RemoteData', () => {
  it('resultToRd maps Ok to Success and Err to Failure', () => {
    expect(resultToRd(ok(1))).toEqual(RD.success(1))
    expect(resultToRd(err('e'))).toEqual(RD.failure('e'))
  })
})

describe('Update composition', () => {
  it('doNothing keeps the model and issues no Cmd', () => {
    const [model, cmd] = doNothing<number, Msg>(1)
    expect(model).toBe(1)
    expect(cmd).toEqual(Cmd.none())
  })

  it('updateAndCmd applies the next update to the model', () => {
    const [model] = updateAndCmd<Msg, number>((m) => [m + 1, Cmd.none()])([
      1,
      Cmd.none(),
    ])
    expect(model).toBe(2)
  })

  it('updateAndCmdExtra also returns the extra value', () => {
    const [model, , extra] = updateAndCmdExtra<Msg, number, string>((m) => [
      m * 2,
      Cmd.none(),
      'extra',
    ])([3, Cmd.none()])
    expect(model).toBe(6)
    expect(extra).toBe('extra')
  })

  it('batchCmd / extraCmd keep the model unchanged', () => {
    const [m1] = batchCmd<Msg, number>(Cmd.none())([5, Cmd.none()])
    const [m2] = extraCmd<Msg, number>(() => Cmd.none())([5, Cmd.none()])
    expect(m1).toBe(5)
    expect(m2).toBe(5)
  })
})

describe('Task bridges', () => {
  it('taskFromTE resolves Right as Ok and Left as Err', async () => {
    expect(await runTask(taskFromTE(TE.right(1)))).toEqual({
      tag: 'Ok',
      value: 1,
    })
    expect(await runTask(taskFromTE(TE.left('e')))).toEqual({
      tag: 'Err',
      err: 'e',
    })
  })

  it('taskToTE resolves Ok as Right and Err as Left', async () => {
    expect(await taskToTE(Task.succeed(1))()).toEqual(E.right(1))
    expect(await taskToTE(Task.fail('e'))()).toEqual(E.left('e'))
  })

  it('taskFromIO runs the IO lazily', async () => {
    const calls: number[] = []
    const task = taskFromIO(() => {
      calls.push(1)
      return 'done'
    })
    expect(calls).toEqual([])
    expect(await runTask(task)).toEqual({ tag: 'Ok', value: 'done' })
    expect(calls).toEqual([1])
  })
})
