import type { ApplyW, Arg0, Call1, TypeLambda, TypeLambda1 } from "hkt-core";
import { identity } from "./Function.js";
import type { A } from "ts-toolbelt";

export const unifySymbol = Symbol.for("nano/unify");
export type unifySymbol = typeof unifySymbol;

export type Unify<A, F extends Lambdas = never> = [
  | ([F] extends [never]
      ? Call1<PerformUnification, FilterIn<A>>
      : Call<F, FilterIn<A>>)
  | FilterOut<A>,
] extends [infer R]
  ? [R][R extends any ? 0 : never]
  : never;

type FilterIn<A> = A extends {
  readonly [unifySymbol]?: infer _ extends Lambdas;
}
  ? A
  : never;

type FilterOut<A> = A extends {
  readonly [unifySymbol]?: infer _ extends Lambdas;
}
  ? never
  : A;

interface PerformUnification extends TypeLambda1 {
  return: Call<GetUnifiableLambdas<Arg0<this>>, Arg0<this>>;
}

export type GetUnifiableLambdas<A> = A extends {
  readonly [unifySymbol]?: infer L extends Lambdas;
}
  ? L
  : A extends new (...args: any) => {
        readonly [unifySymbol]?: infer L extends Lambdas;
      }
    ? L
    : never;

export type Lambdas = {
  readonly get: TypeLambda1;
  readonly make: TypeLambda;
};

interface GetValue<U extends Lambdas> extends TypeLambda1 {
  readonly return: ApplyW<
    U["make"],
    Call1<U["get"], globalThis.Extract<Arg0<this>, ApplyW<U["make"], any[]>>>
  >;
}

export type TryGetLambdas<U> =
  GetUnifiableLambdas<U> extends infer U2 extends Lambdas
    ? U2
    : U extends Lambdas
      ? U
      : never;

export interface Extract_<U> extends TypeLambda1 {
  readonly return: Call<TryGetLambdas<U>, Arg0<this>>;
}

export type Extract<U, Y> =
  A.Equals<[Y], [any]> extends 1 ? Any<Y> : Call1<Extract_<U>, Any<Y>>;

export interface Exclude_<U> extends TypeLambda1 {
  readonly return: globalThis.Exclude<
    Arg0<this>,
    Call<TryGetLambdas<U>, Arg0<this>>
  >;
}

export type Exclude<U, Y> = Call1<Exclude_<U>, Any<Y>>;

export interface Any_<U> extends TypeLambda1 {
  readonly return: ApplyW<TryGetLambdas<U>["make"], any[]>;
}

export type Any<U> = Call1<Any_<U>, InstanceOf<U>>;

type InstanceOf<T> = T extends new (...args: infer __) => infer I ? I : T;

export type Call<U extends Lambdas, Arg> = U extends infer U2 extends Lambdas
  ? [Call1<GetValue<U2>, Arg>] extends [infer R]
    ? [R][R extends any ? 0 : never]
    : never
  : never;

export const unify: {
  <
    Args extends Array<any>,
    Args2 extends Array<any>,
    Args3 extends Array<any>,
    Args4 extends Array<any>,
    Args5 extends Array<any>,
    T,
  >(
    x: (
      ...args: Args
    ) => (
      ...args: Args2
    ) => (...args: Args3) => (...args: Args4) => (...args: Args5) => T,
  ): (
    ...args: Args
  ) => (
    ...args: Args2
  ) => (...args: Args3) => (...args: Args4) => (...args: Args5) => Unify<T>;
  <
    Args extends Array<any>,
    Args2 extends Array<any>,
    Args3 extends Array<any>,
    Args4 extends Array<any>,
    T,
  >(
    x: (
      ...args: Args
    ) => (...args: Args2) => (...args: Args3) => (...args: Args4) => T,
  ): (
    ...args: Args
  ) => (...args: Args2) => (...args: Args3) => (...args: Args4) => Unify<T>;
  <
    Args extends Array<any>,
    Args2 extends Array<any>,
    Args3 extends Array<any>,
    T,
  >(
    x: (...args: Args) => (...args: Args2) => (...args: Args3) => T,
  ): (...args: Args) => (...args: Args2) => (...args: Args3) => Unify<T>;
  <Args extends Array<any>, Args2 extends Array<any>, T>(
    x: (...args: Args) => (...args: Args2) => T,
  ): (...args: Args) => (...args: Args2) => Unify<T>;
  <Args extends Array<any>, T>(
    x: (...args: Args) => T,
  ): (...args: Args) => Unify<T>;
  <T>(x: T): Unify<T>;
} = identity as any;
