import type { Arg0, TypeLambda1 } from "hkt-core";
import { Effect } from "./Effect.js";
import * as Nano from "./Nano.js";
import * as Unify from "./Unify.js";

export class Failure<E> extends Effect("Failure")<[error: E]> {
  declare return: never;
  declare [Unify.unifySymbol]: Failure.Unify;
}

export declare namespace Failure {
  export interface Unify extends Unify.Unification {
    make: Make;
    get: Get;
  }

  export interface Make extends TypeLambda1 {
    return: Failure<Arg0<this>>;
  }

  export interface Get extends TypeLambda1 {
    return: Arg0<this> extends Failure<infer E> ? [E] : never;
  }

  export type Extract<Y> = Unify.Extract<Failure.Unify, Y>;
  export type Exclude<Y> = Unify.Exclude<Failure.Unify, Y>;
}

export const failure = <E>(error: E): Failure<E> => new Failure(error);

export const catchFailure = <Y, R, N2 extends Nano.Any>(
  nano: Nano.Nano<Y, R>,
  onFailure: (error: Failure.Extract<Y>) => N2,
): Nano.Nano<Failure.Exclude<Y> | Nano.Yield<N2>, R | Nano.Return<N2>> =>
  Nano.flatMapYield(nano, (y) => {
    if (Failure.is(y)) return onFailure(y);
    return Nano.yield(y);
  });
