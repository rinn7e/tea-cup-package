import { Option, none, some } from 'fp-ts/lib/Option';
import { State } from '../model/state';

export class BoundedDeque<T> {
  public readonly maxSize: number;
  public readonly items: Array<T>;

  constructor(
    maxSize: number,
    items: Array<T> = [],
  ) {
    this.maxSize = maxSize;
    this.items = items;
  }

  static empty<T>(maxSize: number): BoundedDeque<T> {
    return new BoundedDeque<T>(maxSize);
  }

  pushFront(item: T): BoundedDeque<T> {
    const nextItems = [item, ...this.items];
    if (nextItems.length > this.maxSize) {
      return new BoundedDeque<T>(this.maxSize, nextItems.slice(0, this.maxSize));
    }
    return new BoundedDeque<T>(this.maxSize, nextItems);
  }

  pushBack(item: T): BoundedDeque<T> {
    const nextItems = [...this.items, item];
    if (nextItems.length > this.maxSize) {
      return new BoundedDeque<T>(this.maxSize, nextItems.slice(nextItems.length - this.maxSize));
    }
    return new BoundedDeque<T>(this.maxSize, nextItems);
  }

  popFront(): [Option<T>, BoundedDeque<T>] {
    if (this.items.length === 0) {
      return [none, this];
    }
    const val = this.items[0];
    const next = new BoundedDeque<T>(this.maxSize, this.items.slice(1));
    return [some(val), next];
  }

  popBack(): [Option<T>, BoundedDeque<T>] {
    if (this.items.length === 0) {
      return [none, this];
    }
    const val = this.items[this.items.length - 1];
    const next = new BoundedDeque<T>(this.maxSize, this.items.slice(0, this.items.length - 1));
    return [some(val), next];
  }

  first(): Option<T> {
    return this.items.length > 0 ? some(this.items[0]) : none;
  }

  last(): Option<T> {
    return this.items.length > 0 ? some(this.items[this.items.length - 1]) : none;
  }

  toList(): Array<T> {
    return [...this.items];
  }
}

/**
 * The contents used to initialize history.
 */
export interface Contents {
  readonly undoDeque: BoundedDeque<[string, State]>;
  readonly redoStack: Array<State>;
  readonly groupDelayMilliseconds: number;
  readonly lastTextChangeTimestamp: number;
}

/**
 * History contains the undo deque and redo stack related to undo history.
 */
export type History = { readonly _tag: 'History'; readonly contents: Contents };

/**
 * Retrieves the contents of `History`
 */
export function contents(history: History): Contents {
  return history.contents;
}

export function peek(history: History): Option<[string, State]> {
  return history.contents.undoDeque.first();
}

export function undoList(history: History): Array<[string, State]> {
  return history.contents.undoDeque.toList();
}

export function redoList(history: History): Array<State> {
  return history.contents.redoStack;
}

/**
 * Initializes history from `Contents`
 */
export function fromContents(c: Contents): History {
  return { _tag: 'History', contents: c };
}

/**
 * Initializes a `History` with an empty Deque and initial size.
 */
export function empty(config: { groupDelayMilliseconds: number; size: number }): History {
  return {
    _tag: 'History',
    contents: {
      undoDeque: BoundedDeque.empty<[string, State]>(config.size),
      redoStack: [],
      groupDelayMilliseconds: config.groupDelayMilliseconds,
      lastTextChangeTimestamp: 0,
    },
  };
}
