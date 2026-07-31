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
import { Sub } from 'tea-cup-fp'

import { documentEvents } from '../../common/document-event'
import { mkIdFromString } from '../../util/common'
import type { Model, Msg } from './type/model'
import { getValueFromX } from './util'

export const subscriptions = (
  model: Model,
  fieldKey: string,
): Sub<Msg> => {
  // Only listen to document-level dragging events if drag state is active
  if (!model.isDragging) {
    return Sub.none()
  } else {
    const trackId = mkIdFromString(fieldKey)
    // Handle mouse/touch movement across the document
    const handleMove = (e: MouseEvent | TouchEvent): Msg => {
      const track = document.getElementById(trackId)
      if (!track) {
        return { _tag: 'NoOp' }
      } else {
        const rect = track.getBoundingClientRect()
        // Extract the correct screen X coordinate for mouse or touch events
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const newValue = getValueFromX(clientX, rect, model.config)

        // Filter out redundant dispatches if the value hasn't changed across mousemove frames
        if (newValue === model.value) {
          return { _tag: 'NoOp' }
        } else {
          return {
            _tag: 'SetValue',
            value: newValue,
          }
        }
      }
    }

    // Terminate the drag event state
    const handleEnd = (): Msg => {
      return { _tag: 'SetDragging', value: false }
    }

    // Subscribe to movement and release event streams on the document
    return Sub.batch([
      documentEvents.on('mousemove', handleMove),
      documentEvents.on('touchmove', handleMove),
      documentEvents.on('mouseup', handleEnd),
      documentEvents.on('touchend', handleEnd),
    ])
  }
}
