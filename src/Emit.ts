import * as Nano from "./Nano.js";
import { variant } from "./Variant.js";
import * as Iterator from "./Iterator.js";
import * as Unify from "./Unify.js";
import type { Arg0, Call1, TypeLambda1 } from "hkt-core";

/**
 * Emit is a variant for representing a value that has been emitted.
 * It essentially implements an event of a pull-based stream by yielding
 * to its observer cooperatively.
 */
export class Emit<A>
  extends variant("Emit")
  implements Nano.Nano<Emit<A>, unknown>
{
  constructor(readonly value: A) {
    super();
  }
  [Symbol.iterator](): Iterator<Emit<A>, void> {
    return Iterator.once<void>()(this);
  }
  [Unify.unifySymbol]?: Emit.Unify;
}

export declare namespace Emit {
  export interface Unify extends Unify.Lambdas {
    make: Make;
    get: Get;
  }

  export interface Make extends TypeLambda1 {
    return: Emit<Arg0<this>>;
  }

  export interface Get extends TypeLambda1 {
    return: Arg0<this> extends Emit<infer A> ? [A] : never;
  }

  export type ExcludeAll<Y> = globalThis.Exclude<Y, Emit<any>>;

  export type FromYield<Y> = Call1<Get, Unify.Call<Unify, Y>>[0];
}

export const emit = <A>(value: A): Emit<A> => new Emit(value);

export const isEmit = <A = unknown>(value: unknown): value is Emit<A> =>
  value ? value.constructor === Emit || value instanceof Emit : false;

export const observe: {
  <N1 extends Nano.Nano.Any, N2 extends Nano.Nano.Any>(
    onEmit: (value: Emit.FromYield<Nano.Nano.Yield<N1>>) => N2,
  ): (
    nano: N1,
  ) => Nano.Nano<
    Emit.ExcludeAll<Nano.Nano.Yield<N1 | N2>>,
    Nano.Nano.Return<N1>
  >;
  <Y, R, N2 extends Nano.Nano.Any>(
    nano: Nano.Nano<Y, R>,
    onEmit: (value: Emit.FromYield<Y>) => N2,
  ): Nano.Nano<Emit.ExcludeAll<Y> | Nano.Nano.Yield<N2>, R>;
} = (...args: any): any => {
  if (args.length === 1) {
    return (nano: any) => observe_(nano, args[0]);
  }
  return observe_(args[0], args[1]);
};

const observe_ = <Y, A, R, Y2, R2>(
  nano: Nano.Nano<Y | Emit<A>, R>,
  onEmit: (value: A) => Nano.Nano<Y2, R2>,
): Nano.Nano<Y | Y2, R> =>
  Nano.flatMapInput(nano, (y) => {
    if (isEmit(y)) {
      return onEmit(y.value);
    }
    return Nano.yield(y);
  });

function map_<Y, A, R, B>(
  stream: Nano.Nano<Y | Emit<A>, R>,
  f: (value: A) => B,
): Nano.Nano<Y | Emit<B>, R> {
  return Nano.mapInput(stream, (y) => {
    if (isEmit(y)) {
      return emit(f(y.value));
    }
    return y;
  });
}

export const mapEmit: {
  <Y, B>(
    f: (value: Emit.FromYield<Y>) => B,
  ): <R>(stream: Nano.Nano<Y, R>) => Nano.Nano<Emit.ExcludeAll<Y> | Emit<B>, R>;
  <Y, A, R, B>(
    stream: Nano.Nano<Y | Emit<A>, R>,
    f: (value: A) => B,
  ): Nano.Nano<Y | Emit<B>, R>;
} = (...args: any): any => {
  if (args.length === 1) {
    return (stream: any) => map_(stream, args[0]);
  }
  return map_(args[0], args[1]);
};

export const filterEmit: {
  <Y, B extends Emit.FromYield<Y>>(
    predicate: (value: Emit.FromYield<Y>) => value is B,
  ): <R>(stream: Nano.Nano<Y, R>) => Nano.Nano<Emit.ExcludeAll<Y> | Emit<B>, R>;
  <Y>(
    predicate: (value: Emit.FromYield<Y>) => boolean,
  ): <R>(stream: Nano.Nano<Y, R>) => Nano.Nano<Y, R>;
  
  <Y, R, B extends Emit.FromYield<Y>>(
    stream: Nano.Nano<Y, R>,
    predicate: (value: Emit.FromYield<Y>) => value is B,
  ): Nano.Nano<Emit.ExcludeAll<Y> | Emit<B>, R>;
  <Y, A, R>(
    stream: Nano.Nano<Y, R>,
    predicate: (value: A) => boolean,
  ): Nano.Nano<Y, R>;
} = (...args: any): any => {
  if (args.length === 1) {
    return (stream: any) => filter_(stream, args[0]);
  }
  return filter_(args[0], args[1]);
};

function filter_<Y, A, R>(
  stream: Nano.Nano<Y | Emit<A>, R>,
  predicate: (value: A) => boolean,
): Nano.Nano<Y | Emit<A>, R> {
  return Nano.flatMapInput(stream, (y) => {
    if (isEmit(y)) {
      return predicate(y.value) ? Nano.yield(y) : Nano.void;
    }
    return Nano.yield(y);
  });
}
