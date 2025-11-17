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
  return: Call<GetUnification<Arg0<this>>, Arg0<this>>;
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
  readonly get: TypeLambda1;
  readonly make: TypeLambda;
};

interface GetValue<U extends Unification> extends TypeLambda1 {
  readonly return: ApplyW<
    U["make"],
    Call1<U["get"], globalThis.Extract<Arg0<this>, ApplyW<U["make"], any[]>>>
  >;
}

export interface Extract_<Union> extends TypeLambda1 {
  readonly return: globalThis.Extract<Union, Any<Arg0<this>>>;
}

export type Extract<U, Y> = Call1<Extract_<U>, Any<Y>>;

export interface Exclude_<U> extends TypeLambda1 {
  return: globalThis.Exclude<U, Any<Arg0<this>>>;
}

export type Exclude<U, Y> = Call1<Exclude_<U>, Y>;

export interface Any_<U> extends TypeLambda1 {
  readonly return: ApplyW<GetUnification<U>["make"], any[]>;
}

export type Any<U> = [GetUnification<U>] extends [never]
  ? InstanceOf<U>
  : Call1<Any_<U>, InstanceOf<U>>;

type InstanceOf<T> = T extends new (...args: infer __) => infer I ? I : T;

export type Call<U extends Unification, Arg> = U extends infer U2 extends
  Unification
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
