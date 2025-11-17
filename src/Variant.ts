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
    static is<V>(
      value: V,
    ): value is V & Variant<Tag> {
      return isVariant(value) && value._tag === tag;
    }
    readonly _tag: Tag = tag;

    static override [Symbol.hasInstance](
      instance: unknown,
    ): instance is Variant<Tag> {
      return isVariant(instance) && instance._tag === tag;
    }
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

export function isVariant(value: unknown): value is Variant.Any {
  if (value === null || value === undefined) return false;
  return (
    Object.hasOwn(value, "_tag") &&
    typeof (value as { _tag: unknown })._tag === "string"
  );
}

/**
 * Type-case specifically for nano yield interception.
 * @example
 * Nano.mapInput(Nano.mapIf(isX, f))
 * @param args 
 * @returns 
 */
export const mapIf: {
  <I, V, O>(
    refinement: (value: unknown) => value is V,
    mapper: (value: Extract<I, V>) => O,
  ): (input: I) => O | Exclude<I, V>;
  <I, V, O>(
    input: I,
    refinement: (value: unknown) => value is V,
    mapper: (value: Extract<I, V>) => O,
  ): O | Exclude<I, V>;
} = (...args: any[]): any => {
  if (args.length === 2) {
    return (input: unknown) => mapIfOr_(input, args[0], args[1], identity);
  }
  return mapIfOr_(args[0], args[1], args[2], identity);
};

/**
 * Type-case specifically for nano yield interception.
 * @example
 * Nano.mapInput(y => {
 *   if (isX(y)) return f(y)
 *   return asNot(value, isX)
 * })
 */
export function asNot<X, V>(
  value: X,
  _predicateJustForTypes: (value: unknown) => value is V,
): Exclude<X, V> {
  return value as Exclude<X, V>;
}

function mapIfOr_<I, V, O, R>(
  input: I,
  refinement: (value: unknown) => value is V,
  mapper: (value: Extract<I, V>) => O,
  fallback: (value: Exclude<I, V>) => R,
): O | R {
  if (refinement(input)) return mapper(input as Extract<I, V>);
  return fallback(input as Exclude<I, V>);
}

/**
 * Type-case specifically for nano yield interception.
 * @example
 * Nano.mapInput(y => Nano.mapIfOr(y, isX, f, g))
 */
export const mapIfOr: {
  <I, V, O, R>(
    refinement: (value: unknown) => value is V,
    mapper: (value: Extract<I, V>) => O,
    fallback: (value: Exclude<I, V>) => R,
  ): (input: I) => O | R;

  <I, V, O, R>(
    input: I,
    refinement: (value: unknown) => value is V,
    mapper: (value: Extract<I, V>) => O,
    fallback: (value: Exclude<I, V>) => R,
  ): O | R;
} = (...args: any[]): any => {
  if (args.length === 3) {
    return (input: unknown) => mapIfOr_(input, args[0], args[1], args[2]);
  }
  return mapIfOr_(args[0], args[1], args[2], args[3]);
};
