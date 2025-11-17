import type { ApplyW, Arg0, Call1, TypeLambda, TypeLambda1 } from "hkt-core";
import { identity } from "./Function.js";

export const unifySymbol = Symbol.for("nano/unify");
export type unifySymbol = typeof unifySymbol;

export type Unify<A, F extends Unification = never> = [
  | ([F] extends [never]
      ? Call1<PerformUnification, FilterIn<A>>
      : Call<F, FilterIn<A>>)
  | FilterOut<A>,
] extends [infer R]
  ? [R][R extends any ? 0 : never]
  : never;

export declare namespace Unify {
  // Intentionally internal to avoid conflicting with the hkt-core types of the same names.

  export type Args<U, T> = [Extract<U, T>] extends [never]
    ? never
    : Call1<GetUnification<T>["getArgs"], Extract<U, T>>;

  export type Arg0<U, T> =
    Args<U, T> extends readonly [infer A, ...infer _] ? A : never;

  export type Arg1<U, T> =
    Args<U, T> extends readonly [infer _A, infer B, ...infer _] ? B : never;

  export type Arg2<U, T> =
    Args<U, T> extends readonly [infer _A, infer _B, infer C, ...infer _]
      ? C
      : never;

  export type Arg3<U, T> =
    Args<U, T> extends readonly [
      infer _A,
      infer _B,
      infer _C,
      infer D,
      ...infer _,
    ]
      ? D
      : never;
}

type FilterIn<A> = A extends {
  readonly [unifySymbol]?: infer _ extends Unification;
}
  ? A
  : never;

type FilterOut<A> = A extends {
  readonly [unifySymbol]?: infer _ extends Unification;
}
  ? never
  : A;

interface PerformUnification extends TypeLambda1 {
  return: Call<Arg0<this>, Arg0<this>>;
}

export type GetUnification<A> = A extends {
  readonly [unifySymbol]?: infer L extends Unification;
}
  ? L
  : A extends new (...args: any) => {
        readonly [unifySymbol]?: infer L extends Unification;
      }
    ? L
    : A extends Unification
      ? A
      : never;

export type Unification = {
  readonly getArgs: TypeLambda1;
  readonly make: TypeLambda;
};

export interface Extract_<U extends Unification> extends TypeLambda1 {
  readonly return: ApplyW<
    U["make"],
    Call1<U["getArgs"], globalThis.Extract<Arg0<this>, ApplyW<U["make"], any[]>>>
  >;
}

export type Call<U, Arg> = U extends infer U2
  ? Call1<Extract_<GetUnification<U2>>, Arg>
  : never;

export type Extract<U, Y> = Call<U, Y>;

export interface Exclude_<U> extends TypeLambda1 {
  return: globalThis.Exclude<Arg0<this>, Extract<U, Arg0<this>>>;
}

export type Exclude<U, Y> = Call1<Exclude_<U>, Y>;

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
