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
import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            '12-cf',
            '14-cf',
            '16-cf',
            '18-cf',
            '20-cf',
            '24-cf',
            '30-cf',
            '38-cf',
            '46-cf',
            '56-cf',
          ],
        },
      ],
      'text-color': [
        {
          text: [
            (value: string) =>
              /^((jj|sk)-(blue|gray|green|volcan|volcano|red|yellow|gold|purple|cyan|dark|light|accent|primary)(-\d+)?|(blue|gray|green|volcan|volcano|red|yellow|gold|purple|cyan)(-\d+)?-cf)$/.test(
                value,
              ),
          ],
        },
      ],
    },
  },
})

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
export function cn(...args: ClassValue[]): string {
  return customTwMerge(clsx(args))
}
