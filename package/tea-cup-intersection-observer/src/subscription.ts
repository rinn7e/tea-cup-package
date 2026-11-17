import { Sub } from 'tea-cup-fp'

import { observe } from './observe'
import { IntersectionOptions } from './type'

// The watches whose element isn't in the document yet (React mounts it later,
// or a row of a virtualized list isn't drawn), by element id. One
// `MutationObserver` for them all checks them when the document changes:
// a watch waiting costs nothing until then, however long it waits.
const waiting = new Map<string, Set<() => void>>()
let documentObserver: MutationObserver | null = null

const checkWaiting = (): void => {
  waiting.forEach((callbacks, id) => {
    if (document.getElementById(id)) {
      waiting.delete(id)
      callbacks.forEach((found) => found())
    }
  })
  if (waiting.size === 0 && documentObserver !== null) {
    documentObserver.disconnect()
    documentObserver = null
  }
}

// Calls `found` once an element with `id` is in the document. Returns the
// cancel of the wait.
const whenInDocument = (id: string, found: () => void): (() => void) => {
  const callbacks = waiting.get(id) ?? new Set<() => void>()
  callbacks.add(found)
  waiting.set(id, callbacks)
  if (documentObserver === null) {
    documentObserver = new MutationObserver(checkWaiting)
    documentObserver.observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['id'],
    })
  }
  return () => {
    const current = waiting.get(id)
    if (current) {
      current.delete(found)
      if (current.size === 0) waiting.delete(id)
    }
    if (waiting.size === 0 && documentObserver !== null) {
      documentObserver.disconnect()
      documentObserver = null
    }
  }
}

class IntersectionObserverSubscription<Msg> extends Sub<Msg> {
  private unobserve: (() => void) | null = null
  private cancelWait: (() => void) | null = null
  private readonly elementId: string
  private readonly options: IntersectionOptions
  private readonly tagger: (
    inView: boolean,
    entry: IntersectionObserverEntry,
  ) => Msg

  constructor(
    elementId: string,
    options: IntersectionOptions,
    tagger: (inView: boolean, entry: IntersectionObserverEntry) => Msg,
  ) {
    super()
    this.elementId = elementId
    this.options = options
    this.tagger = tagger
  }

  private tryObserve(): void {
    const el = document.getElementById(this.elementId)
    if (el) {
      this.unobserve = observe(
        el,
        (inView, entry) => {
          this.dispatch(this.tagger(inView, entry))
        },
        this.options,
      )
    } else {
      // Element not yet in DOM (React mount timing, a row not drawn): observe
      // it once it is there
      this.cancelWait = whenInDocument(this.elementId, () => {
        this.cancelWait = null
        this.tryObserve()
      })
    }
  }

  protected override onInit(): void {
    this.tryObserve()
  }

  protected override onRelease(): void {
    if (this.cancelWait !== null) {
      this.cancelWait()
      this.cancelWait = null
    }
    if (this.unobserve) {
      this.unobserve()
      this.unobserve = null
    }
  }
}

/**
 * Creates a TEA subscription that monitors if a DOM element is in the viewport,
 * identified by its HTML element ID.
 *
 * The subscription will look up the element via `document.getElementById` at init time.
 * If the element is not yet in the DOM (e.g. due to React mount timing, or a row of a
 * virtualized list not drawn), it observes it once it is added: one `MutationObserver`
 * shared by every waiting watch, so a watch waiting costs nothing meanwhile.
 *
 * @example
 * ```typescript
 * // In view:
 * <div id="my-element-id" />
 *
 * // In subscriptions:
 * TeaObserver.watch(
 *   'my-element-id',
 *   { threshold: 0.5 },
 *   (inView) => ({ _tag: 'MyElementInView', inView })
 * )
 * ```
 *
 * @param elementId The HTML `id` attribute of the element to observe.
 * @param options Intersection observer options (threshold, rootMargin, etc.)
 * @param tagger A function that converts the intersection state into a TEA message.
 * @returns A Sub<Msg> that manages the observer lifecycle.
 */
export const watch = <Msg>(
  elementId: string,
  options: IntersectionOptions,
  tagger: (inView: boolean, entry: IntersectionObserverEntry) => Msg,
): Sub<Msg> => {
  return new IntersectionObserverSubscription(elementId, options, tagger)
}

export type { IntersectionOptions } from './type'
