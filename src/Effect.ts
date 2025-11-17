import type { ApplyW, Params, TypeLambda } from "hkt-core";
import { type Pipeable, PipeableClass } from "./Function.js";
import * as Nano from "./Nano.js";
import * as Iterator from "./Iterator.js";
import type * as Unify from "./Unify.js";

/**
 * An Effect represent a yieldable computation that accepts some amount of arguments
 * and utilizes hkt-core for return type inference.
 */
export interface Effect<Tag extends string, Args extends any[] | []>
  extends TypeLambda,
    Pipeable {
  readonly _tag: Tag;
  readonly args: Args;
  [Symbol.iterator](): Iterator<this, ApplyW<this, this["args"]>>;
}

/**
 * The constructor for an Effect.
 */
export interface EffectConstructor<Tag extends string> {
  readonly _tag: Tag;

  is<T extends { readonly _tag: string }, E>(
    this: T,
    effect: E,
  ): effect is Unify.Extract<T, E>;

  new <const Args extends any[] | [] = []>(...args: Args): Effect<Tag, Args>;
}

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
 * }
 *
 * const log = (...args: readonly unknown[]) => new Log(args);
 * ```
 */
export const Effect = <Tag extends string>(tag: Tag): EffectConstructor<Tag> =>
  class Effect<Args extends any[]> extends PipeableClass implements TypeLambda {
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
    ): effect is Unify.Extract<T, E> {
      return isEffectOf.call(this, effect);
    }
    static make(...args: any[]) {
      return new this(...args);
    }

    [Symbol.iterator]() {
      return Iterator.once<ApplyW<this, this["args"]>>()(this);
    }

    [Symbol.hasInstance](value: any): value is this {
      return isEffectOf.call(this, value);
    }

    /** Type-level only for TypeLambda "implementation" */
    readonly ["~hkt"]!: TypeLambda["~hkt"];
    readonly signature!: TypeLambda["signature"];
  };

function isEffectOf<
  T extends {
    readonly _tag: string;
  },
  E,
>(this: T, effect: E): effect is Unify.Extract<T, E> {
  if (effect === undefined || effect === null) return false;
  return (effect as any)._tag === this._tag;
}

/**
 * A GenericEffect is an Effect which utilize hkt-core's TypeLambdaG abstraction to
 * represent effects which utilize generic type parameters for computation.
 */
export interface GenericEffect<
  Tag extends string,
  TParams extends TypeParameter[],
> extends GenericTypeLambda<TParams>,
    Pipeable {
  readonly _tag: Tag;
  readonly args: Params<this>;
  [Symbol.iterator](): Iterator<this, ApplyW<this, this["args"]>>;
}

/**
 * The constructor for a GenericEffect. Though it is intended to be utilized in an `extends` clause,
 * it *not* intended to be used as a constructor itself utilizing the `new` keyword. Instead, use the `make`
 * static method to create a new instance of the effect. This will preserve type-information from the TypeLambdaG
 * implementation of the Effect.
 */
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
  ): Nano.Nano<InstanceOf<T>, ApplyW<InstanceOf<T>, Args>>;
}

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

/** Internal Types */

type InstanceOf<T> = T extends new (...args: infer __) => infer I ? I : never;

//#region Types that could (should?) be exposed by hkt-core

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
type TypeParamDeclaration = TypeParameterIdentifier | TypeParameter;
type ToTypeParam<T extends TypeParamDeclaration> =
  T extends TypeParameterIdentifier ? [T, unknown] : T;
type ToTypeParameters<Params extends Array<TypeParamDeclaration>> = {
  [K in keyof Params]: ToTypeParam<Params[K]>;
};
//#endregion

export const asNot = <T, U extends Array<{ readonly _tag: string }>>(
  value: T,
  ..._constructors: U
): Unify.Exclude<InstanceOf<U[number]>, T> => value as Unify.Exclude<InstanceOf<U[number]>, T>;
