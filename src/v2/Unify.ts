import type { ApplyW, Arg0, Call1, TypeLambda, TypeLambda1 } from "hkt-core";
import { identity } from "./Function.js";

export const unifySymbol = Symbol.for("nano/unify");
export type unifySymbol = typeof unifySymbol;

export type Unify<A, F extends Lambdas = never> = [
  | ([F] extends [never] ? Call1<Extract, A> : Call<F, FilterIn<A>>)
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

interface Extract extends TypeLambda1 {
  return: Call<GetUnifiableLambdas<Arg0<this>>, Arg0<this>>;
}

type GetUnifiableLambdas<A> = A extends {
  readonly [unifySymbol]?: infer L extends Lambdas;
}
  ? L
  : never;

export type Lambdas = {
  readonly get: TypeLambda1;
  readonly make: TypeLambda;
};

export interface GetValue<U extends Lambdas> extends TypeLambda1 {
  readonly return: Call1<
    U["get"],
    globalThis.Extract<Arg0<this>, ApplyW<U["make"], any[]>>
  > extends infer R
    ? [R] extends [never]
      ? never
      : ApplyW<U["make"], R>
    : never;
}

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
