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
import { Cmd } from 'tea-cup-fp'

import {
  type Anchor,
  type Behavior,
  type Command,
  type Config,
  type Follow,
  FollowEq,
  type Geometry,
  type Model,
  type Msg,
  type Target,
} from './type'

/**
 * A scroll of ours holds the position at most this long (a row that never
 * stops resizing can't hold it forever). The engine retires its own command
 * after the same time.
 */
export const MAX_NAVIGATE_MS = 5000

// -------------------------------------------
// Init
// -------------------------------------------

/**
 * A container that hasn't scrolled yet: free, until the owner's first
 * scroll (to the end, or to a row) says where it is.
 */
export const init = (
  follow: Follow = { _tag: 'Free', anchor: null },
): Model => ({
  follow,
  geometry: null,
  pendingAdjust: null,
  placing: null,
})

// -------------------------------------------
// Helpers
// -------------------------------------------

const withCommand =
  (command: Command) =>
  (model: Model): Model => ({
    ...model,
    pendingAdjust: { seq: (model.pendingAdjust?.seq ?? 0) + 1, command },
  })

const commandFor = (target: Target, behavior: Behavior): Command => {
  switch (target._tag) {
    case 'Start':
      return { _tag: 'ScrollToStart', behavior }
    case 'End':
      return { _tag: 'ScrollToEnd', behavior }
    case 'Key':
      return {
        _tag: 'ScrollToKey',
        key: target.key,
        offset: target.offset,
        onlyIfHidden: target.onlyIfHidden,
        belowOverlay: true,
        behavior,
      }
  }
}

const followAtRest = (anchor: Anchor | null, atEnd: boolean): Follow =>
  atEnd ? { _tag: 'AtEnd' } : { _tag: 'Free', anchor }

// The model with its last decision as the one that hides the list until it
// lands (`placing`), when `hide`
const hidingIf =
  (hide: boolean) =>
  (model: Model): Model =>
    hide && model.pendingAdjust !== null
      ? { ...model, placing: model.pendingAdjust.seq }
      : model

/**
 * Whether the list is hidden while a scroll of ours puts it in place
 */
export const isPlacing = (model: Model): boolean => model.placing !== null

/**
 * Whether a scroll of ours still holds the position
 */
export const isNavigating = (model: Model): boolean =>
  model.follow._tag === 'Navigating' || model.follow._tag === 'Restoring'

/**
 * The row a scroll of ours keeps still: the target row of a navigation (not
 * the end), or the row of a restore. Rows above it that change height move
 * the position by as much, so the row stays where the scroll put it (the
 * engine asks `adjustOnItemResize` for each resize).
 */
export const heldKey = (model: Model): string | null => {
  switch (model.follow._tag) {
    case 'Navigating':
      return model.follow.target._tag === 'Key' ? model.follow.target.key : null
    case 'Restoring':
      return model.follow.anchor.key
    case 'AtEnd':
    case 'Free':
      return null
  }
}

// The scroll to the held row again, as it was asked for
const reaimCommand = (model: Model, key: string): Command => {
  switch (model.follow._tag) {
    case 'Navigating':
      return commandFor(model.follow.target, model.follow.behavior)
    case 'Restoring':
      return {
        _tag: 'ScrollToKey',
        key,
        offset: model.follow.anchor.offset,
        onlyIfHidden: false,
        belowOverlay: false,
        behavior: 'instant',
      }
    case 'AtEnd':
    case 'Free':
      return commandFor(
        { _tag: 'Key', key, offset: 0, onlyIfHidden: false },
        'instant',
      )
  }
}

// -------------------------------------------
// Decided by the engine's own callbacks
// -------------------------------------------

/**
 * Whether a row's change of height moves the position by as much. The
 * engine asks this synchronously in its resize callback, before paint (a
 * message would only arrive after the browser painted the jump), so it is a
 * pure function of the model, not a message.
 * - `index`, `heldIndex`: the row resized, and the row a scroll of ours
 *   holds (`heldKey`), when there is one
 * - `defaultAdjust`: the engine's own rule (the row is above the view)
 */
export const adjustOnItemResize = (
  config: Config,
  index: number,
  heldIndex: number | null,
  defaultAdjust: boolean,
): boolean => {
  if (config.onItemResize === 'none') {
    return false
  } else if (heldIndex !== null) {
    return index < heldIndex
  } else {
    return defaultAdjust
  }
}

// -------------------------------------------
// Handlers
// -------------------------------------------

/**
 * A scroll of ours; `hide`: the list is hidden until it lands
 */
export const scrollToHandler =
  (target: Target, behavior: Behavior, now: number, hide: boolean = false) =>
  (model: Model): Model =>
    hidingIf(hide)(
      withCommand(commandFor(target, behavior))({
        ...model,
        follow: {
          _tag: 'Navigating',
          target,
          behavior,
          until: now + MAX_NAVIGATE_MS,
        },
      }),
    )

export const restoreHandler =
  (anchor: Anchor, hide: boolean = false) =>
  (model: Model): Model =>
    hidingIf(hide)(
      withCommand({
        _tag: 'ScrollToKey',
        key: anchor.key,
        offset: anchor.offset,
        onlyIfHidden: false,
        belowOverlay: false,
        behavior: 'instant',
      })({ ...model, follow: { _tag: 'Restoring', anchor } }),
    )

/**
 * The hiding decision `seq` landed: the list is shown, unless a newer
 * decision hid it (its own `Placed` shows it)
 */
export const placedHandler =
  (seq: number) =>
  (model: Model): Model =>
    model.placing === seq ? { ...model, placing: null } : model

/**
 * The reader takes over: a scroll of ours stops where it is, and a list at
 * the end is free until it settles (at the end again, or not)
 */
export const readerScrolledHandler = (model: Model): Model => {
  switch (model.follow._tag) {
    case 'Navigating':
    case 'Restoring':
      return withCommand({ _tag: 'Cancel' })({
        ...model,
        follow: { _tag: 'Free', anchor: null },
      })
    case 'AtEnd':
      return { ...model, follow: { _tag: 'Free', anchor: null } }
    case 'Free':
      // Already the reader's: the same model, so nothing renders again
      return model
  }
}

export const scrollSettledHandler =
  (geometry: Geometry, anchor: Anchor | null, atEnd: boolean, now: number) =>
  (model: Model): Model => {
    if (
      model.follow._tag === 'Navigating' &&
      model.follow.target._tag === 'End' &&
      !atEnd &&
      now < model.follow.until
    ) {
      // A scroll to the end that came to rest short of it was stopped on the
      // way: WebKit stops a smooth scroll when the page resizes (an editor
      // closing after Send, the on-screen keyboard). It goes on to the end,
      // until `until`; the reader's own input ends it first (`ReaderScrolled`)
      return withCommand(
        commandFor(model.follow.target, model.follow.behavior),
      )({ ...model, geometry })
    } else {
      const follow = ((): Follow => {
        switch (model.follow._tag) {
          case 'Navigating':
            // A jump to a row holds it while rows around it still grow (late
            // bodies and images land a second or more after the scroll)
            return model.follow.target._tag === 'Key' &&
              now < model.follow.until
              ? model.follow
              : followAtRest(anchor, atEnd)
          case 'Restoring':
          case 'AtEnd':
          case 'Free':
            return followAtRest(anchor, atEnd)
        }
      })()
      return FollowEq.equals(follow, model.follow)
        ? { ...model, geometry }
        : { ...model, follow, geometry }
    }
  }

export const viewportResizedHandler =
  (config: Config, prev: number, next: number) =>
  (model: Model): Model => {
    // Positive when the viewport got smaller
    const delta = prev - next
    const geometry: Geometry | null = model.geometry
      ? { ...model.geometry, clientHeight: next }
      : null
    const resized: Model = { ...model, geometry }
    if (delta === 0 || config.onViewportResize !== 'keepEnd') {
      // Keeping the top line (or the anchor row at the top) needs no move
      return resized
    } else {
      switch (model.follow._tag) {
        case 'AtEnd':
          return withCommand({ _tag: 'ScrollToEnd', behavior: 'instant' })(
            resized,
          )
        case 'Free':
          // Keep the bottom line: the newest rows the reader sees stay
          return withCommand({ _tag: 'ScrollBy', delta })(resized)
        case 'Navigating':
        case 'Restoring':
          // The engine re-aims at the target from the new size: moving the
          // offset here would stop a smooth scroll where it is
          return resized
      }
    }
  }

export const itemsChangedHandler =
  (change: {
    prepended: number
    appended: number
    removed: number
    anchor: Anchor | null
  }) =>
  (model: Model): Model => {
    // Rows above the view are kept by the engine as it renders them (its
    // reading anchor, `onPrepend`), except under a scroll of ours to a row:
    // the engine aims at the row's index, which rows added or removed above
    // now give to another row, so the scroll goes again by the row's key.
    // Rows added at the end never move the position, even at the end: the
    // end of the rows loaded is not always the newest one (a page loads below
    // the reader), so the owner scrolls to them when the reader adds one
    // (`ScrollTo`). A list at its end is no longer there: it is the reader's,
    // at the row at the top, so a smaller viewport keeps its bottom line
    // rather than jumping to the new end.
    const held = heldKey(model)
    if ((change.prepended > 0 || change.removed > 0) && held !== null) {
      return withCommand(reaimCommand(model, held))(model)
    } else if (change.appended > 0 && model.follow._tag === 'AtEnd') {
      return { ...model, follow: { _tag: 'Free', anchor: change.anchor } }
    } else {
      return model
    }
  }

// -------------------------------------------
// Update
// -------------------------------------------

export const update =
  (config: Config) =>
  (msg: Msg, model: Model): [Model, Cmd<Msg>] => {
    switch (msg._tag) {
      case 'NoOp':
        return [model, Cmd.none()]
      case 'ItemsChanged':
        return [itemsChangedHandler(msg)(model), Cmd.none()]
      case 'ViewportResized':
        return [
          viewportResizedHandler(config, msg.prev, msg.next)(model),
          Cmd.none(),
        ]
      case 'ReaderScrolled':
        return [readerScrolledHandler(model), Cmd.none()]
      case 'ScrollSettled':
        return [
          scrollSettledHandler(
            msg.geometry,
            msg.anchor,
            msg.atEnd,
            msg.now,
          )(model),
          Cmd.none(),
        ]
      case 'ScrollTo':
        return [
          scrollToHandler(msg.target, msg.behavior, msg.now, msg.hide)(model),
          Cmd.none(),
        ]
      case 'Restore':
        return [restoreHandler(msg.anchor, msg.hide)(model), Cmd.none()]
      case 'Placed':
        return [placedHandler(msg.seq)(model), Cmd.none()]
      case 'EdgeShown':
        // The owner's to act on
        return [model, Cmd.none()]
    }
  }
