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
/**
 * Resolve `promise`, or `fallback` if it takes longer than `budgetMs`.
 *
 * The losing promise is NOT cancelled (it cannot be) — it is abandoned, and its
 * later rejection is swallowed so it cannot surface as an unhandled rejection.
 */
export const withBudget = async <A>(
  promise: Promise<A>,
  budgetMs: number,
  fallback: () => A,
  onTimeout?: () => void,
): Promise<A> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  // An abandoned promise must not raise an unhandled rejection later.
  promise.catch(() => undefined)
  try {
    return await Promise.race<A>([
      promise,
      new Promise<A>((resolve) => {
        timer = setTimeout(() => {
          onTimeout?.()
          resolve(fallback())
        }, budgetMs)
      }),
    ])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}
