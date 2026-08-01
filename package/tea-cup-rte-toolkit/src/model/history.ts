import * as Internal from '../internal/history'

/**
 * `History` contains the undo deque and redo stack related to undo history.
 */
export type History = Internal.History

/**
 * Provides an empty `History` with the given config. The config values are as follows:
 *
 *   - `groupDelayMilliseconds` is the interval which the editor will ignore adding multiple text changes onto the undo stack. This is
 *     so the history doesn't get overwhelmed by single character changes.
 *   - `size` is the number of states stored in the history
 */
export const empty = Internal.empty

/**
 * Returns the last executed action and previous state on the undo stack.
 */
export const peek = Internal.peek

/**
 * Returns the entire undo stack.
 */
export const undoList = Internal.undoList

/**
 * Returns the entire redo stack.
 */
export const redoList = Internal.redoList
