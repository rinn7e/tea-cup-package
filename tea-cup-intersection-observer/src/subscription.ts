import { Sub } from "tea-cup-fp";

import { observe } from "./observe";
import { IntersectionOptions } from "./type";

const RETRY_DELAY_MS = 50;

class IntersectionObserverSubscription<Msg> extends Sub<Msg> {
  private unobserve: (() => void) | null = null;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly elementId: string;
  private readonly options: IntersectionOptions;
  private readonly tagger: (
    inView: boolean,
    entry: IntersectionObserverEntry,
  ) => Msg;

  constructor(
    elementId: string,
    options: IntersectionOptions,
    tagger: (inView: boolean, entry: IntersectionObserverEntry) => Msg,
  ) {
    super();
    this.elementId = elementId;
    this.options = options;
    this.tagger = tagger;
  }

  private tryObserve(): void {
    const el = document.getElementById(this.elementId);
    if (el) {
      this.unobserve = observe(
        el,
        (inView, entry) => {
          this.dispatch(this.tagger(inView, entry));
        },
        this.options,
      );
    } else {
      // Element not yet in DOM — retry after a short delay to handle React mount timing
      this.retryTimeout = setTimeout(() => {
        this.retryTimeout = null;
        this.tryObserve();
      }, RETRY_DELAY_MS);
    }
  }

  protected override onInit(): void {
    this.tryObserve();
  }

  protected override onRelease(): void {
    if (this.retryTimeout !== null) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    if (this.unobserve) {
      this.unobserve();
      this.unobserve = null;
    }
  }
}

/**
 * Creates a TEA subscription that monitors if a DOM element is in the viewport,
 * identified by its HTML element ID.
 *
 * The subscription will look up the element via `document.getElementById` at init time.
 * If the element is not yet in the DOM (e.g. due to React mount timing), it will retry
 * automatically after a short delay.
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
  return new IntersectionObserverSubscription(elementId, options, tagger);
};

export type { IntersectionOptions } from "./type";
