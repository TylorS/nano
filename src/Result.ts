import type { Arg0, Arg1, TypeLambda1, TypeLambda2 } from "hkt-core";
import { catchFailure, Failure } from "./Failure.js";
import * as Unify from "./Unify.js";
import * as Nano from "./Nano.js";
import * as Iterator from "./Iterator.js";
import { PipeableClass } from "./Function.js";

export class Success<A> extends PipeableClass implements Nano.Nano<never, A> {
  static readonly _tag = "Success" as const;
  readonly _tag = Success._tag;
  constructor(readonly value: A) {
    super();
  }
  [Symbol.iterator](): Iterator<never, A> {
    return Iterator.success(this.value);
  }

  [Symbol.hasInstance](value: unknown): value is Success<A> {
    return value ? (value as any)._tag === Success._tag : false;
  }

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

declare namespace Result {
  export interface Unify extends Unify.Unification {
    make: Make;
    get: Get;
  }

  export interface Make extends TypeLambda2 {
    return: Result<Arg0<this>, Arg1<this>>;
  }

  export interface Get extends TypeLambda1 {
    return: Arg0<this> extends Result<infer A, infer E> ? [A, E] : never;
  }

  export type Extract<Y> = Unify.Extract<Result.Unify, Y>;
  export type Exclude<Y> = Unify.Exclude<Result.Unify, Y>;
}

export const result = <Y, R>(
  nano: Nano.Nano<Y, R>,
): Nano.Nano<Failure.Exclude<Y>, Result<R, Failure.Error<Y>>> =>
  nano.pipe(Nano.map(success), catchFailure(Nano.of));
