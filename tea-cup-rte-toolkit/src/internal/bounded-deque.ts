import { Option, none, some } from 'fp-ts/lib/Option';

export class BoundedDeque<A> {
  public readonly maxSize: number;
  public readonly items: Array<A>;

  private constructor(maxSize: number, items: Array<A>) {
    this.maxSize = maxSize;
    this.items = items;
  }

  static empty<A>(maxSize: number): BoundedDeque<A> {
    return new BoundedDeque(maxSize, []);
  }

  static first<A>(deque: BoundedDeque<A>): Option<A> {
    return deque.items.length > 0 ? some(deque.items[0]) : none;
  }

  static toList<A>(deque: BoundedDeque<A>): Array<A> {
    return deque.items;
  }

  static pushFront<A>(value: A, deque: BoundedDeque<A>): BoundedDeque<A> {
    const newItems = [value, ...deque.items];
    if (newItems.length > deque.maxSize) {
      return new BoundedDeque(deque.maxSize, newItems.slice(0, deque.maxSize));
    }
    return new BoundedDeque(deque.maxSize, newItems);
  }

  static popFront<A>(deque: BoundedDeque<A>): [Option<A>, BoundedDeque<A>] {
    if (deque.items.length === 0) {
      return [none, deque];
    }
    const val = deque.items[0];
    const rest = deque.items.slice(1);
    return [some(val), new BoundedDeque(deque.maxSize, rest)];
  }
}
