import type { Arg0, TypeLambda1 } from "hkt-core";
import { Effect } from "./Effect.js";
import { catchFailure, Failure } from "./Failure.js";
import * as Nano from "./Nano.js";
import * as Unify from "./Unify.js";

export class Success<A> extends Effect("Success")<[value: A]> {
  declare [Unify.unifySymbol]: Success.Unify;
}

export namespace Success {
  export interface Unify extends Unify.Unification {
    make: Make;
    get: Get;
  }

  export interface Make extends TypeLambda1 {
    return: Success<Arg0<this>>;
  }

  export interface Get extends TypeLambda1 {
    return: Arg0<this> extends Success<infer A> ? [A] : never;
  }

  export type Extract<Y> = Unify.Extract<Success.Unify, Y>;
  export type Exclude<Y> = Unify.Exclude<Success.Unify, Y>;
  export type Value<Y> = Unify.Unify.Arg0<Success.Unify, Y>;
}

export const success = <A>(value: A): Success<A> => new Success(value);

export * from "./Failure.js";

export const isSuccess = <A, E = never>(
  result: Result<A, E>,
): result is Success<A> => result instanceof Success;

export const isFailure = <A, E = never>(
  result: Result<A, E>,
): result is Failure<E> => result instanceof Failure;

export const isResult = <A = any, E = any>(u: unknown): u is Result<A, E> =>
  u instanceof Success || u instanceof Failure;

export type Result<A, E = never> = Success<A> | Failure<E>;

export declare namespace Result {
  export type Extract<Y> = Failure.Extract<Y> | Success.Extract<Y>;
  export type Exclude<Y> = Failure.Exclude<Y> | Success.Exclude<Y>;
  export type Error<Y> = Failure.Error<Y>;
  export type Value<Y> = Success.Value<Y>;
}

export const result = <Y, R>(
  nano: Nano.Nano<Y, R>,
): Nano.Nano<Result.Exclude<Y>, Result<R, Failure.Error<Y>>> =>
  nano.pipe(Nano.map(success), catchFailure(Nano.of));
