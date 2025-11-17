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

export interface Effect<Tag extends string, Args extends readonly unknown[]>
  extends TypeLambda,
    Pipeable {
  readonly _tag: Tag;
  readonly args: Args;
  [Symbol.iterator](): Iterator<this, ApplyW<this, this["args"]>>;
}

export interface EffectConstructor<Tag extends string> {
  readonly _tag: Tag;
  new <const Args extends readonly unknown[] = []>(
    ...args: Args
  ): Effect<Tag, Args>;
}

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
    static make(...args: readonly unknown[]) {
      return new this(...args);
    }

    [Symbol.iterator]() {
      return Iterator.once<ApplyW<this, this["args"]>>()(this);
    }

    [Symbol.hasInstance](value: any): value is this {
      if (typeof value !== "object" || value === null) return false;
      return value._tag === this._tag || this.constructor === value.constructor;
    }

    readonly ["~hkt"]!: TypeLambda["~hkt"];
    readonly signature!: TypeLambda["signature"];
  };

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

export const EffectG =
  <G extends Array<TypeParamDeclaration>>() =>
  <Tag extends string>(
    tag: Tag,
  ): GenericEffectConstructor<Tag, ToTypeParameters<G>> =>
    Effect(tag) as any;
