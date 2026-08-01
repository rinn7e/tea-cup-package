/* MIT License

Copyright (c) 2025 Moremi Vannak

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
import type { Config } from './type/model'

/**
 * Converts the absolute screen X coordinate of a mouse/touch event into
 * the corresponding slider value, clamped and snapped to the nearest step.
 */
export const getValueFromX = (
  clientX: number,
  rect: DOMRect,
  config: Config,
): number => {
  // Calculate the percentage relative to the track width
  const pct = (clientX - rect.left) / rect.width
  // Clamp the percentage between 0 and 1
  const clampedPct = Math.max(0, Math.min(1, pct))
  // Map the percentage to the slider's numeric range
  const val = config.min + clampedPct * (config.max - config.min)
  // Round to the nearest step increment
  const roundedVal = Math.round(val / config.step) * config.step
  // Ensure the value does not exceed min/max boundaries
  return Math.max(config.min, Math.min(config.max, roundedVal))
}
