import type {
  ApplyW,
  Arg0,
  Call1,
  Params,
  TypeLambda,
  TypeLambda1,
} from "hkt-core";
import { PipeableClass } from "../Function.js";
import type { Pipeable } from "./Function.js";
import * as Nano from "./Nano.js";
import * as Iterator from "./Iterator.js";
import type * as Unify from "./Unify.js";

export interface Effect<Tag extends string, Args extends unknown[]>
  extends TypeLambda,
    Pipeable {
  readonly _tag: Tag;
  readonly args: Args;
  [Symbol.iterator](): Iterator<this, ApplyW<this, this["args"]>>;
}

export interface EffectConstructor<Tag extends string> {
  readonly _tag: Tag;

  is<T extends { readonly _tag: string }, E>(
    this: T,
    effect: E,
  ): effect is Extract<E, AnyOf<InstanceOf<T>>>;

  new <const Args extends unknown[] = []>(...args: Args): Effect<Tag, Args>;
}

export type AnyOf<T> = [Unify.GetUnifiableLambdas<T>] extends [never]
  ? InstanceOf<T>
  : ApplyW<Unify.GetUnifiableLambdas<T>["make"], any[]>;

/**
 * Construct effects which implement the Nano interface and utilize hkt-core for return type inference.
 *
 * Ultimately, this is identical to creating TypeLambdas in hkt-core, using the `declare` keyword to
 * create phantom types upon the class instance.
 *
 * The runtime value is just a Nano which yields itself and utilizing the `return` property to determine the
 *
 * @example
 * ```typescript
 * class Log extends Effect("Log")<unknown[]> {
 *    declare return: void;
 *    // alternatively,
 *    // return!: void;
 * }
 *
 * const log = (...args: readonly unknown[]) => new Log(args);
 * ```
 */
export const Effect = <Tag extends string>(tag: Tag): EffectConstructor<Tag> =>
  class Effect<Args extends readonly unknown[]>
    extends PipeableClass
    implements TypeLambda
  {
    static readonly _tag = tag;
    readonly _tag = tag;
    readonly args: Args;
    constructor(...args: Args) {
      super();
      this.args = args;
    }
    static is<T extends { readonly _tag: string }, E>(
      this: T,
      effect: E,
    ): effect is any {
      return isEffectOf.call(this, effect);
    }
    static make(...args: readonly unknown[]) {
      return new this(...args);
    }

    [Symbol.iterator]() {
      return Iterator.once<ApplyW<this, this["args"]>>()(this);
    }

    [Symbol.hasInstance](value: any): value is this {
      return isEffectOf.call(this as any, value);
    }

    readonly ["~hkt"]!: TypeLambda["~hkt"];
    readonly signature!: TypeLambda["signature"];
  };

function isEffectOf<
  T extends {
    readonly _tag: string;
  },
  E,
>(this: T, effect: E): effect is Extract<E, InstanceOf<T>> {
  if (effect === undefined || effect === null) return false;
  return (effect as any)._tag === this._tag;
}

type TypeParameterIdentifier = Capitalize<string>;
type TypeParameter = [TypeParameterIdentifier, unknown];
type TypeLambdaMeta = TypeLambda["~hkt"];

interface GenericTypeLambda<TypeParameters extends TypeParameter[]>
  extends TypeLambda {
  readonly ["~hkt"]: GenericTypeLambdaMeta<TypeParameters>;
}
interface GenericTypeLambdaMeta<TypeParameters extends TypeParameter[]>
  extends TypeLambdaMeta {
  readonly tparams: TypeParameters;
}

export interface GenericEffect<
  Tag extends string,
  TParams extends TypeParameter[],
> extends GenericTypeLambda<TParams>,
    Pipeable {
  readonly _tag: Tag;
  readonly args: Params<this>;
  [Symbol.iterator](): Iterator<this, ApplyW<this, this["args"]>>;
}

export interface GenericEffectConstructor<
  Tag extends string,
  TParams extends TypeParameter[],
> {
  readonly _tag: Tag;
  new (
    ...args: Params<GenericEffect<Tag, TParams>>
  ): GenericEffect<Tag, TParams>;

  make<
    T extends new (...args: any) => TypeLambda<any, any>,
    Args extends Params<InstanceOf<T>>,
  >(
    this: T,
    ...args: Args
  ): Pipe2<Args, InstanceOf<T>, ToNanoWithYield<InstanceOf<T>>>;
}

interface ToNanoWithYield<Y> extends TypeLambda1 {
  return: Nano.Nano<Y, Arg0<this>>;
}

type Pipe2<
  Args extends readonly unknown[],
  F extends TypeLambda,
  G extends TypeLambda1,
> = Call1<G, ApplyW<F, Args>>;

type InstanceOf<T> = T extends new (...args: infer __) => infer I ? I : never;
type TypeParamDeclaration = TypeParameterIdentifier | TypeParameter;
type ToTypeParam<T extends TypeParamDeclaration> =
  T extends TypeParameterIdentifier ? [T, unknown] : T;
type ToTypeParameters<Params extends Array<TypeParamDeclaration>> = {
  [K in keyof Params]: ToTypeParam<Params[K]>;
};

/**
 * For creating generic effects which utilize hkt-core for return type inference. This is identical to creating Generic TypeLambdas in hkt-core,
 * using the `declare` keyword to  create phantom types upon the class instance.
 *
 * The runtime value is identical to that of Effect(tag).
 *
 * @example
 * ```typescript
 * class Split extends EffectG<["Y", "R"]>()("Split") {
 *   declare signature: (nano: Nano.Nano<TArg<this, "Y">, TArg<this, "R">>) => Call1W<Split, typeof nano>;
 *   declare return: Nano.Nano.AddYield<Arg0<this>, Split>;
 * }
 * ```
 */
export const EffectG =
  <G extends Array<TypeParamDeclaration>>() =>
  <Tag extends string>(
    tag: Tag,
  ): GenericEffectConstructor<Tag, ToTypeParameters<G>> =>
    Effect(tag) as any;
