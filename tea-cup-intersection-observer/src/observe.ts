import { IntersectionOptions } from "./type";

type ObserverInstanceCallback = (
  inView: boolean,
  entry: IntersectionObserverEntry,
) => void;

const observerMap = new Map<
  string,
  {
    id: string;
    observer: IntersectionObserver;
    elements: Map<Element, Array<ObserverInstanceCallback>>;
  }
>();

const RootIds: WeakMap<Element | Document, string> = new WeakMap();
let rootId = 0;

function getRootId(root: IntersectionObserverInit["root"]) {
  if (!root) return "0";
  if (RootIds.has(root)) return RootIds.get(root);
  rootId += 1;
  RootIds.set(root, rootId.toString());
  return RootIds.get(root);
}

export function optionsToId(options: IntersectionObserverInit) {
  return Object.keys(options)
    .sort()
    .filter(
      (key) => options[key as keyof IntersectionObserverInit] !== undefined,
    )
    .map((key) => {
      return `${key}_${
        key === "root"
          ? getRootId(options.root)
          : options[key as keyof IntersectionObserverInit]
      }`;
    })
    .toString();
}

function createObserver(options: IntersectionObserverInit) {
  const id = optionsToId(options);
  let instance = observerMap.get(id);

  if (!instance) {
    const elements = new Map<Element, Array<ObserverInstanceCallback>>();
    // eslint-disable-next-line prefer-const
    let thresholds: number[] | readonly number[];

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const inView =
          entry.isIntersecting &&
          thresholds.some((threshold) => entry.intersectionRatio >= threshold);

        [...(elements.get(entry.target) ?? [])].forEach((callback) => {
          callback(inView, entry);
        });
      });
    }, options);

    thresholds =
      observer.thresholds ||
      (Array.isArray(options.threshold)
        ? options.threshold
        : [options.threshold ?? 0]);

    instance = {
      id,
      observer,
      elements,
    };

    observerMap.set(id, instance);
  }

  return instance;
}

export function observe(
  element: Element,
  callback: ObserverInstanceCallback,
  options: IntersectionOptions = {},
) {
  const { id, observer, elements } = createObserver(options);

  const callbacks = elements.get(element) || [];
  if (!elements.has(element)) {
    elements.set(element, callbacks);
  }

  callbacks.push(callback);
  observer.observe(element);

  return function unobserve() {
    callbacks.splice(callbacks.indexOf(callback), 1);

    if (callbacks.length === 0) {
      elements.delete(element);
      observer.unobserve(element);
    }

    if (elements.size === 0) {
      observer.disconnect();
      observerMap.delete(id);
    }
  };
}
