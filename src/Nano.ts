import * as Iterator from "./Iterator.js";
import * as Unify from "./Unify.js";
import { flow2, identity, pipeArguments, type Pipeable } from "./Function.js";

/**
 * Nano is just a wrapper around an iterator that provides a pipe method for convenience.
 */
export interface Nano<out Y, out R> extends Pipeable {
  [Symbol.iterator](): Iterator<Y, R>;
}

export declare namespace Nano {
  export type Any = Nano<any, any>;

  export type Yield<T> = [T] extends [never]
    ? never
    : [T] extends [
          { readonly [Symbol.iterator]: () => Iterator<infer Y, infer _R> },
        ]
      ? Y
      : never;

  export type Return<T> = [T] extends [never]
    ? never
    : [T] extends [
          { readonly [Symbol.iterator]: () => Iterator<infer _Y, infer R> },
        ]
      ? R
      : never;

  export type AddYield<N extends Any, Y2> =
    N extends Nano<infer Y, infer R> ? Nano<Y | Y2, R> : never;
}

export type Any = Nano.Any;
export type Yield<T> = Nano.Yield<T>;
export type Return<T> = Nano.Return<T>;
export type AddYield<N extends Any, Y2> = Nano.AddYield<N, Y2>;

/**
 * Create a Nano from an generator function or iterator
 */
export const fromIterator: {
  <T, Y, A>(thisArg: T, f: (this: T) => Iterator<Y, A>): Nano<Y, A>;
  <Y, A>(f: () => Iterator<Y, A> | Iterator<Unify.Unify<Y>, A>): Nano<Y, A>;
} = <T, Y, A>(
  ...args: [T, (this: T) => Iterator<Y, A>] | [() => Iterator<Y, A>]
): Nano<Y, A> => ({
  [Symbol.iterator]: args.length === 1 ? args[0] : args[1].bind(args[0]),
  pipe() {
    return pipeArguments(this, arguments);
  },
});

/**
 * Make a Nano from an generator function or iterator
 *
 * @example
 * ```typescript
 * const nano = Nano.make(function* () {
 *   const x = yield* Nano.of(1);
 *   return x + 1;
 * });
 *
 * const result = Nano.run(nano);
 * console.log(result); // 2
 * ```
 */
export const make: {
  <T, Y, A>(
    thisArg: T,
    f: (this: T) => Iterator<Y, A>,
  ): Nano<Unify.Unify<Y>, Unify.Unify<A>>;
  <Y, A>(f: () => Iterator<Y, A>): Nano<Unify.Unify<Y>, Unify.Unify<A>>;
} = fromIterator as any;

export const of = <R>(value: R): Nano<never, R> =>
  fromIterator(() => Iterator.success(value));

const void_ = of<void>(undefined);
const null_ = of<null>(null);
const undefined_ = of<undefined>(undefined);
const true_ = of<boolean>(true);
const false_ = of<boolean>(false);
export {
  void_ as void,
  null_ as null,
  undefined_ as undefined,
  true_ as true,
  false_ as false,
};

export const sync = <R>(f: () => R): Nano<never, R> =>
  fromIterator(() => Iterator.sync<R>(f));

export const map: {
  <R1, R2>(f: (value: R1) => R2): <Y1>(nano: Nano<Y1, R1>) => Nano<Y1, R2>;
  <Y1, R1, R2>(nano: Nano<Y1, R1>, f: (value: R1) => R2): Nano<Y1, R2>;
} = (...args: any[]): any => {
  if (args.length === 1) {
    return (nano: Nano<any, any>) => map_(nano, args[0]);
  } else {
    return map_(args[0], args[1]);
  }
};

const map_ = <Y1, R1, R2>(
  nano: Nano<Y1, R1>,
  f: (value: R1) => R2,
): Nano<Y1, R2> => fromIterator(() => Iterator.map(Iterator.get(nano), f));

export const mapYield: {
  <Y1, Y2>(f: (value: Y1) => Y2): <R1>(nano: Nano<Y1, R1>) => Nano<Y2, R1>;
  <Y1, R1, Y2>(nano: Nano<Y1, R1>, f: (value: Y1) => Y2): Nano<Y2, R1>;
} = (...args: any[]): any => {
  if (args.length === 1) {
    return (nano: Nano<any, any>) => mapYield_(nano, args[0]);
  } else {
    return mapYield_(args[0], args[1]);
  }
};

const mapYield_ = <Y1, R1, Y2>(
  nano: Nano<Y1, R1>,
  f: (value: Y1) => Y2,
): Nano<Y2, R1> => fromIterator(() => Iterator.mapYield(Iterator.get(nano), f));

export const flatMap: {
  <R1, Y2, R2>(
    f: (value: R1) => Nano<Y2, R2>,
  ): <Y1>(nano: Nano<Y1, R1>) => Nano<Y1 | Y2, R2>;
  <Y1, R1, Y2, R2>(
    nano: Nano<Y1, R1>,
    f: (value: R1) => Nano<Y2, R2>,
  ): Nano<Y1 | Y2, R2>;
} = (...args: any[]): any => {
  if (args.length === 1) {
    return (nano: Nano<any, any>) => flatMap_(nano, args[0]);
  } else {
    return flatMap_(args[0], args[1]);
  }
};

const flatMap_ = <Y1, R1, Y2, R2>(
  nano: Nano<Y1, R1>,
  f: (value: R1) => Nano<Y2, R2>,
): Nano<Y1 | Y2, R2> =>
  fromIterator(() =>
    Iterator.flatMap(Iterator.get(nano), flow2(f, Iterator.get)),
  );

export const flatten = <Y, Y2, R>(
  nano: Nano<Y, Nano<Y2, R>>,
): Nano<Y | Y2, R> => flatMap(nano, identity);

export const flatMapYield: {
  <Y1, N2 extends Nano<any, any>>(
    f: (value: Y1) => N2,
  ): <R1>(nano: Nano<Y1, R1>) => Nano<Nano.Yield<N2>, R1>;
  <Y1, R1, N2 extends Nano<any, any>>(
    nano: Nano<Y1, R1>,
    f: (value: Y1) => N2,
  ): Nano<Nano.Yield<N2>, R1>;
} = (...args: any[]): any => {
  if (args.length === 1) {
    return (nano: Nano<any, any>) => flatMapYield_(nano, args[0]);
  } else {
    return flatMapYield_(args[0], args[1]);
  }
};

const flatMapYield_ = <Y1, R1, Y2, R2>(
  nano: Nano<Y1, R1>,
  f: (value: Y1) => Nano<Y2, R2>,
): Nano<Y2, R1> =>
  fromIterator(() =>
    Iterator.flatMapYield(Iterator.get(nano), flow2(f, Iterator.get)),
  );

export const mapBoth: {
  <Y1, Y2, R1, R2>(
    onYield: (value: Y1) => Y2,
    onReturn: (value: R1) => R2,
  ): <R1>(nano: Nano<Y1, R1>) => Nano<Y2, R2>;
  <Y1, R1, Y2, R2>(
    nano: Nano<Y1, R1>,
    onYield: (value: Y1) => Y2,
    onReturn: (value: R1) => R2,
  ): Nano<Y2, R2>;
} = (...args: any[]): any => {
  if (args.length === 1) {
    return (nano: Nano<any, any>) => mapBoth_(nano, args[0], args[1]);
  } else {
    return mapBoth_(args[0], args[1], args[2]);
  }
};

const mapBoth_ = <Y1, R1, Y2, R2>(
  nano: Nano<Y1, R1>,
  onYield: (value: Y1) => Y2,
  onReturn: (value: R1) => R2,
): Nano<Y2, R2> =>
  fromIterator(() => Iterator.mapBoth(Iterator.get(nano), onYield, onReturn));

export const run = <R>(nano: Nano<never, R>): R =>
  Iterator.get(nano).next().value;

const yield_ = <Y>(value: Y): Nano<Y, unknown> =>
  fromIterator(() => Iterator.once<unknown>()(value));

export { yield_ as yield };
