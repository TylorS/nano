import { identity, PipeableClass, type Pipeable } from "./Function.js";

export interface Variant<Tag extends string> extends Pipeable {
  readonly _tag: Tag;
}

export declare namespace Variant {
  export type Any = Variant<any>;

  export type ExtractByTag<V extends Variant.Any, Tag extends string> = Extract<
    V,
    { readonly _tag: Tag }
  >;

  export type ExcludeByTag<V extends Variant.Any, Tag extends string> = Exclude<
    V,
    { readonly _tag: Tag }
  >;
}

export interface VariantConstructor<Tag extends string> {
  readonly _tag: Tag;
  is<V extends Variant.Any>(value: V): value is V & { readonly _tag: Tag };

  new (): Variant<Tag>;
}

export const variant = <const Tag extends string>(
  tag: Tag,
): VariantConstructor<Tag> =>
  class extends PipeableClass implements Variant<Tag> {
    static readonly _tag: Tag = tag;
    static is<V extends Variant.Any>(
      value: V,
    ): value is V & { readonly _tag: Tag } {
      return value._tag === tag;
    }
    readonly _tag: Tag = tag;
  };

type MatchersOf<V extends Variant.Any> = {
  readonly [K in V["_tag"]]: (value: Variant.ExtractByTag<V, K>) => any;
};

export const match: {
  <V extends Variant.Any, const Matchers extends MatchersOf<V>>(
    matchers: Matchers,
  ): (variant: V) => ReturnType<Matchers[keyof Matchers]>;

  <V extends Variant.Any, const Matchers extends MatchersOf<V>>(
    variant: V,
    matchers: Matchers,
  ): ReturnType<Matchers[keyof Matchers]>;
} = <V extends Variant.Any, Matchers extends MatchersOf<V>>(
  ...args: [Matchers] | [V, Matchers]
): any => {
  if (args.length === 1) {
    return (variant: V) => match(variant, ...args);
  }
  return args[1][args[0]._tag as V["_tag"]](args[0] as never);
};

type PartialMatchersOf<V extends Variant.Any> = Partial<MatchersOf<V>>;

type Remaining<
  V extends Variant.Any,
  Matchers extends PartialMatchersOf<V>,
> = Variant.ExcludeByTag<V, keyof Matchers & string>;

export const matchOr: {
  <
    V extends Variant.Any,
    const Matchers extends PartialMatchersOf<V>,
    const X = Remaining<V, Matchers>,
  >(
    matchers: Matchers,
    fallback?: (variant: Remaining<V, Matchers>) => X,
  ): (variant: V) => ReturnType<NonNullable<Matchers[keyof Matchers]>> | X;

  <
    V extends Variant.Any,
    const Matchers extends PartialMatchersOf<V>,
    const X = Remaining<V, Matchers>,
  >(
    variant: V,
    matchers: Matchers,
    fallback?: (variant: Remaining<V, Matchers>) => X,
  ): ReturnType<NonNullable<Matchers[keyof Matchers]>> | X;
} = (...args: any[]): any => {
  if (isVariant(args[0])) {
    const variant = args[0];
    const matchers = args[1];
    const fallback = args[2] ?? identity;
    if (variant._tag in matchers) return matchers[variant._tag](variant);
    return fallback(variant);
  }
  return (variant: Variant.Any) => matchOr(variant, args[0], args[1]);
};

function isVariant(value: unknown): value is Variant.Any {
  if (value === null || value === undefined) return false;
  return (
    Object.hasOwn(value, "_tag") &&
    typeof (value as { _tag: unknown })._tag === "string"
  );
}
