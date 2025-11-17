/**
 * The Iterator module provides a small set of utilities for working directly against iterators.
 * If you find yourself utilizing this module, be careful knowing that iterators are mutable.
 */

import type { Unify } from "./Unify.js";
import { flow2 } from "./Function.js";

/**
 * Create an iterator that will only yield a single value and then utilize the next(x)ed value as the return.
 */
export const once =
  <Return>() =>
  <const Yield>(y: Yield): Iterator<Yield, Return> =>
    new OnceIterator(y);

class OnceIterator<Y, R> implements Iterator<Y, R> {
  private done = false;
  constructor(readonly value: Y) {}
  next(value: R): IteratorResult<Y, R> {
    if (this.done) return done(value);
    this.done = true;
    return next(this.value);
  }
}

export const success = <A>(value: A): Iterator<never, A> =>
  new SuccessIterator(value);

class SuccessIterator<A> implements Iterator<never, A> {
  constructor(readonly value: A) {}
  next(): IteratorResult<never, A> {
    return done(this.value);
  }
}

export const sync = <A>(f: () => A): Iterator<never, A> => new SyncIterator(f);

class SyncIterator<A> implements Iterator<never, A> {
  constructor(readonly value: () => A) {}
  next(): IteratorResult<never, A> {
    return done(this.value());
  }
}

export const map = <Y, R1, R2>(
  iterator: Iterator<Y, R1>,
  f: (value: R1) => R2,
): Iterator<Y, R2> => MapIterator.make(iterator, f);

class MapIterator<Y, R1, R2> implements Iterator<Y, R2> {
  static make<Y, R1, R2>(
    iterator: Iterator<Y, R1>,
    f: (value: R1) => R2,
  ): Iterator<Y, R2> {
    if (isMapIterator(iterator))
      return new MapIterator(iterator.iterator, flow2(iterator.f, f));
    return new MapIterator(iterator, f);
  }

  constructor(
    readonly iterator: Iterator<Y, R1>,
    readonly f: (value: R1) => R2,
  ) {}

  next(value: Y): IteratorResult<Y, R2> {
    return this.innerNext(this.iterator.next(value));
  }

  throw(e: unknown): IteratorResult<Y, R2> {
    if (this.iterator.throw) return this.innerNext(this.iterator.throw(e));
    throw e;
  }

  return(value: R2): IteratorResult<Y, R2> {
    return done(value);
  }

  private innerNext(result: IteratorResult<Y, R1>): IteratorResult<Y, R2> {
    if (result.done) return done(this.f(result.value));
    return result;
  }
}

function isMapIterator<Y, R1>(
  iterator: Iterator<Y, R1> | Iterator<Unify<Y>, R1>,
): iterator is MapIterator<Y, unknown, R1> {
  return iterator.constructor === MapIterator;
}

export const mapYield = <Y1, R1, Y2>(
  iterator: Iterator<Y1, R1> | Iterator<Unify<Y1>, R1>,
  f: (value: Y1) => Y2,
): Iterator<Y2, R1> => new MapYieldIterator(iterator as Iterator<Y1, R1>, f);

class MapYieldIterator<Y1, R1, Y2> implements Iterator<Y2, R1> {
  static make<Y1, R1, Y2>(
    iterator: Iterator<Y1, R1>,
    f: (value: Y1) => Y2,
  ): Iterator<Y2, R1> {
    if (isMapYieldIterator(iterator))
      return new MapYieldIterator(iterator.iterator, flow2(iterator.f, f));
    return new MapYieldIterator(iterator, f);
  }

  constructor(
    readonly iterator: Iterator<Y1, R1>,
    readonly f: (value: Y1) => Y2,
  ) {}

  next(value: unknown): IteratorResult<Y2, R1> {
    return this.innerNext(this.iterator.next(value));
  }

  private innerNext(result: IteratorResult<Y1, R1>): IteratorResult<Y2, R1> {
    if (result.done) return done(result.value);
    return next(this.f(result.value));
  }

  throw(e: unknown): IteratorResult<Y2, R1> {
    if (this.iterator.throw) return this.innerNext(this.iterator.throw(e));
    throw e;
  }

  return(value: R1): IteratorResult<Y2, R1> {
    if (this.iterator.return)
      return this.innerNext(this.iterator.return(value));
    return done(value);
  }
}

function isMapYieldIterator<Y1, R1>(
  iterator: Iterator<Y1, R1>,
): iterator is MapYieldIterator<unknown, R1, Y1> {
  return iterator.constructor === MapYieldIterator;
}

export const flatMap = <Y, R1, Y2, R2>(
  iterator: Iterator<Y, R1> | Iterator<Unify<Y>, R1>,
  f: (value: R1) => Iterator<Y2, R2> | Iterator<Unify<Y2>, R2>,
): Iterator<Y | Y2, R2> => FlatMapIterator.make(iterator, f);

class FlatMapIterator<Y, R1, Y2, R2> implements Iterator<Y | Y2, R2> {
  static make<Y, R1, Y2, R2>(
    iterator: Iterator<Y, R1> | Iterator<Unify<Y>, R1>,
    f: (value: R1) => Iterator<Y2, R2> | Iterator<Unify<Y2>, R2>,
  ): Iterator<Y | Y2, R2> {
    if (isMapIterator(iterator))
      return new FlatMapIterator(iterator.iterator, flow2(iterator.f, f));
    return new FlatMapIterator(iterator, f);
  }

  private _nextIterator: Iterator<Y2, R2> | null = null;
  constructor(
    readonly iterator: Iterator<Y, R1> | Iterator<Unify<Y>, R1>,
    readonly f: (value: R1) => Iterator<Y2, R2> | Iterator<Unify<Y2>, R2>,
  ) {}

  next(value: unknown): IteratorResult<Y | Y2, R2> {
    if (this._nextIterator === null) return this.outerNext(value);
    return this._nextIterator.next(value);
  }

  throw(e: unknown): IteratorResult<Y | Y2, R2> {
    if (this._nextIterator?.throw) return this._nextIterator.throw(e);
    if (this.iterator.throw) return this.outerNext(this.iterator.throw(e));
    throw e;
  }

  return(value: R2): IteratorResult<Y | Y2, R2> {
    this.iterator.return?.();
    if (this._nextIterator?.return) return this._nextIterator.return(value);
    return done(value);
  }

  private outerNext(value: unknown): IteratorResult<Y | Y2, R2> {
    const result = this.iterator.next(value);
    if (result.done) {
      this._nextIterator = this.f(result.value) as Iterator<Y2, R2>;
      return this._nextIterator.next(value);
    }
    return result as IteratorResult<Y | Y2, R2>;
  }
}

export const flatMapYield = <Y1, R1, Y2, R2>(
  iterator: Iterator<Y1, R1> | Iterator<Unify<Y1>, R1>,
  f: (value: Y1) => Iterator<Y2, R2>,
): Iterator<Y2, R1> =>
  FlatMapYieldIterator.make(iterator as Iterator<Y1, R1>, f);

class FlatMapYieldIterator<Y1, R1, Y2, R2> implements Iterator<Y2, R1> {
  static make<Y1, R1, Y2, R2>(
    iterator: Iterator<Y1, R1>,
    f: (value: Y1) => Iterator<Y2, R2>,
  ): Iterator<Y2, R1> {
    if (isMapYieldIterator(iterator))
      return new FlatMapYieldIterator(iterator.iterator, flow2(iterator.f, f));
    return new FlatMapYieldIterator(iterator, f);
  }

  private _innerIterator: Iterator<Y2, R2> | null = null;
  constructor(
    readonly iterator: Iterator<Y1, R1>,
    readonly f: (value: Y1) => Iterator<Y2, R2>,
  ) {}

  next(value: unknown): IteratorResult<Y2, R1> {
    if (this._innerIterator === null)
      return this.outerNext(this.iterator.next(value));
    return this.innerNext(this._innerIterator.next(value));
  }

  throw(e: unknown): IteratorResult<Y2, R1> {
    if (this._innerIterator?.throw)
      return this.innerNext(this._innerIterator.throw(e));
    if (this.iterator.throw) return this.outerNext(this.iterator.throw(e));
    throw e;
  }

  return(value: R1): IteratorResult<Y2, R1> {
    if (this.iterator.return)
      return this.outerNext(this.iterator.return(value));
    return done(value);
  }

  private outerNext(result: IteratorResult<Y1, R1>): IteratorResult<Y2, R1> {
    if (result.done) return result;
    this._innerIterator = this.f(result.value);
    return this.innerNext(this._innerIterator.next(result.value));
  }

  private innerNext(result: IteratorResult<Y2, R2>): IteratorResult<Y2, R1> {
    if (result.done) {
      this._innerIterator = null;
      return this.outerNext(this.iterator.next(result.value));
    }
    return result;
  }
}

export const mapBoth = <Y1, R1, Y2, R2>(
  iterator: Iterator<Y1, R1> | Iterator<Unify<Y1>, R1>,
  onYield: (value: Y1) => Y2,
  onReturn: (value: R1) => R2,
): Iterator<Y2, R2> =>
  MapBothIterator.make(iterator as Iterator<Y1, R1>, onYield, onReturn);

class MapBothIterator<Y1, R1, Y2, R2> implements Iterator<Y2, R2> {
  static make<Y1, R1, Y2, R2>(
    iterator: Iterator<Y1, R1>,
    onYield: (value: Y1) => Y2,
    onReturn: (value: R1) => R2,
  ): Iterator<Y2, R2> {
    if (isMapBothIterator(iterator))
      return MapBothIterator.make(
        iterator.iterator,
        flow2(iterator.onYield, onYield),
        flow2(iterator.onReturn, onReturn),
      );
    if (isMapIterator(iterator))
      return MapBothIterator.make(
        iterator.iterator,
        onYield,
        flow2(iterator.f, onReturn),
      );
    if (isMapYieldIterator(iterator))
      return MapBothIterator.make(
        iterator.iterator,
        flow2(iterator.f, onYield),
        onReturn,
      );
    return new MapBothIterator(iterator, onYield, onReturn);
  }

  constructor(
    readonly iterator: Iterator<Y1, R1>,
    readonly onYield: (value: Y1) => Y2,
    readonly onReturn: (value: R1) => R2,
  ) {}

  next(value: unknown): IteratorResult<Y2, R2> {
    return this.innerNext(this.iterator.next(value));
  }

  throw(e: unknown): IteratorResult<Y2, R2> {
    if (this.iterator.throw) return this.innerNext(this.iterator.throw(e));
    throw e;
  }

  return(value: R2): IteratorResult<Y2, R2> {
    return done(value);
  }

  private innerNext(result: IteratorResult<Y1, R1>): IteratorResult<Y2, R2> {
    if (result.done) return done(this.onReturn(result.value));
    return next(this.onYield(result.value));
  }
}

function isMapBothIterator<Y1, R1>(
  iterator: Iterator<Y1, R1>,
): iterator is MapBothIterator<unknown, unknown, Y1, R1> {
  return iterator.constructor === MapBothIterator;
}

export const get = <I>(iterator: { readonly [Symbol.iterator]: () => I }): I =>
  iterator[Symbol.iterator]();

export const next = <Y>(value: Y) => ({ done: false, value }) as const;

export const done = <Y>(value: Y) => ({ done: true, value }) as const;
