import type { Arg0, Call1, TypeLambda1 } from "hkt-core";
import * as Iterator from "./Iterator.js";
import * as Nano from "./Nano.js";
import * as Unify from "./Unify.js";
import { variant } from "./Variant.js";

export class Failure<out E>
  extends variant("Failure")
  implements Nano.Nano<Failure<E>, never>
{
  constructor(readonly error: E) {
    super();
  }
  [Symbol.iterator](): Iterator<Failure<E>, never> {
    return Iterator.once<never>()(this);
  }

  [Unify.unifySymbol]?: Failure.Unify;
}

export declare namespace Failure {
  export interface Unify extends Unify.Lambdas {
    make: Make;
    get: Get;
  }

  export interface Make extends TypeLambda1 {
    return: Failure<Arg0<this>>;
  }

  export interface Get extends TypeLambda1 {
    return: Arg0<this> extends Failure<infer E> ? [E] : never;
  }
}

export class Success<out A>
  extends variant("Success")
  implements Nano.Nano<never, A>
{
  constructor(readonly value: A) {
    super();
  }

  [Symbol.iterator](): Iterator<never, A> {
    return Iterator.success(this.value);
  }

  [Unify.unifySymbol]?: Success.Unify;
}

export declare namespace Success {
  export interface Unify extends Unify.Lambdas {
    make: Make;
    get: Get;
  }

  export interface Make extends TypeLambda1 {
    return: Success<Arg0<this>>;
  }

  export interface Get extends TypeLambda1 {
    return: Arg0<this> extends Success<infer A> ? [A] : never;
  }
}

export type Result<A, E = never> = Success<A> | Failure<E>;

export namespace Result {
  export type Any = Result<any, any>;

  export type Failure<T> = [T] extends [never]
    ? never
    : [T] extends [Result<infer _A, infer E> | (infer _)]
      ? E
      : never;

  export type Success<T> = [T] extends [never]
    ? never
    : [T] extends [Result<infer A, infer _E> | (infer _)]
      ? A
      : never;

  export type ExcludeFailure<Y> = Exclude<Y, Failure<any>>;

  export type FailureFromYield<Y> = Call1<Failure.Get, Y>[0];
}

export const success = <A>(value: A): Success<A> => new Success(value);
export const failure = <E>(error: E): Failure<E> => new Failure(error);

export const isFailure = <Y>(value: Y): value is Extract<Y, Failure<any>> =>
  (value as object)?.constructor === Failure || value instanceof Failure;

export const result = <Y, R>(
  nano: Iterable<Y, R>,
): Nano.Nano<Result.ExcludeFailure<Y>, Result<R, Result.FailureFromYield<Y>>> =>
  Nano.fromIterator(function* () {
    const iterator = Iterator.get(nano);
    let result = iterator.next();
    while (!result.done) {
      const value = result.value;
      if (isFailure(value)) return value;
      result = iterator.next(yield value as Result.ExcludeFailure<Y>);
    }
    return success(result.value);
  });

const catchFailure_ = <Y, E, R, N2 extends Nano.Nano.Any>(
  nano: Nano.Nano<Y | Failure<E>, R>,
  onFailure: (error: E) => N2,
): Nano.Nano<Y | Nano.Nano.Yield<N2>, R | Nano.Nano.Return<N2>> =>
  Nano.fromIterator(function* () {
    const iterator = Iterator.get(nano);
    let result = iterator.next();
    while (!result.done) {
      const value = result.value;
      if (isFailure(value)) return yield* onFailure(value.error);
      result = iterator.next(yield value as Result.ExcludeFailure<Y>);
    }
    return result.value;
  });

export const catchFailure: {
  <N1 extends Nano.Nano.Any, N2 extends Nano.Nano.Any>(
    onFailure: (error: Result.FailureFromYield<Nano.Nano.Yield<N1>>) => N2,
  ): <R>(
    nano: Nano.Nano<N1, R>,
  ) => Nano.Nano<
    Result.ExcludeFailure<N1> | Nano.Nano.Yield<N2>,
    R | Nano.Nano.Return<N2>
  >;

  <Y, E, R, N2 extends Nano.Nano.Any>(
    nano: Nano.Nano<Y | Failure<E>, R>,
    onFailure: (error: E) => N2,
  ): Nano.Nano<Y | Nano.Nano.Yield<N2>, R | Nano.Nano.Return<N2>>;
} = (args: any): any => {
  if (args.length === 1) {
    return (nano: Nano.Nano<any, any>) => catchFailure_(nano, args[0]);
  } else {
    return catchFailure_(args[0], args[1]);
  }
};
