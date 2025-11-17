import type { Arg0, TypeLambda1 } from "hkt-core";
import { pipeArguments } from "./Function.js";
import * as Iterator from "./Iterator.js";
import * as Nano from "./Nano.js";
import { Failure } from "./Result.js";
import * as Unify from "./Unify.js";
import { asNot, variant } from "./Variant.js";
import { U } from "ts-toolbelt";

/**
 * GetEnv is the variant which can be utilized to retrieve an Env<R>
 * containing some number of services indexed by `Tag<R, *>`s.
 */
export class GetEnv<out R>
  extends variant("GetEnv")
  implements Nano.Nano<GetEnv<R>, Env<R>>
{
  [Symbol.iterator]() {
    return Iterator.once<Env<R>>()(this);
  }
  [Unify.unifySymbol]?: GetEnv.Unify;
}

export declare namespace GetEnv {
  /**
   * Extract the keys of the environment from a GetEnv<R>
   */
  export type Extract<T> = T extends GetEnv<infer R> | (infer _) ? R : never;

  /**
   * Exclude all GetEnv variants from a type
   */
  export type ExcludeAll<Y> = globalThis.Exclude<Y, GetEnv<any>>;

  /**
   * Exclude a single tag from a GetEnv<R>
   */
  export type Exclude<Y, R> = [
    ExcludeAll<Y> | GetEnv<globalThis.Exclude<FromYield<Y>, R>>,
  ] extends [(infer Y2) | GetEnv<infer R2>]
    ? Y2 | GetEnv<R2>
    : never;

  /**
   * Extract the keys of the environment from a Yield<GetEnv<R>>
   */
  export type FromYield<Y> = [Y] extends [never]
    ? never
    : [Y] extends [GetEnv<infer R> | (infer _)]
      ? R
      : never;

  /**
   * The Unify interface for GetEnv
   */
  export interface Unify extends Unify.Lambdas {
    make: Make;
    get: Get;
  }

  /**
   * The Make interface for GetEnv
   */
  export interface Make extends TypeLambda1 {
    return: GetEnv<Arg0<this>>;
  }

  /**
   * The Get interface for GetEnv
   */
  export interface Get extends TypeLambda1 {
    return: Arg0<this> extends GetEnv<infer R> ? [R] : never;
  }
}

/**
 * Exclude a single service from a Yield<GetEnv<R>>
 */
export type ExcludeService<Yield, Id> = GetEnv.Exclude<Yield, Id>;

/**
 * Check if a value is a GetEnv<R>
 */
export const isGetEnv = <R = unknown>(value: unknown): value is GetEnv<R> =>
  value ? value instanceof GetEnv : false;

export const get = <R>() => new GetEnv<R>();

type GetTagsOf<T> = GetTags_<U.ListOf<T>>[number];
type GetTags_<T extends readonly any[]> = {
  [K in keyof T]: Tag<T[K], any>;
};

/**
 * An Env is just a glorified Map<Tag, Service> some common operations
 * and some type-safety for getting tags in the environment.
 */
export class Env<out R> {
  static empty = (): Env<never> => new Env(new Map());
  static make = <Id, S>(tag: Tag<Id, S>, service: S): Env<Id> =>
    new Env(new Map().set(tag, service));

  constructor(readonly map: Map<Tag.Any, any>) {}

  add<T extends Tag.Any>(tag: T, service: Nano.Nano.Return<T>): Env<R> {
    return new Env(new Map(this.map).set(tag, service));
  }

  get<T extends GetTagsOf<R>>(tag: T): Nano.Nano.Return<T> {
    return this.map.get(tag);
  }

  merge<R2>(other: Env<R2>): Env<R | R2> {
    const map = new Map(this.map);
    mergeInto(map, other.map);
    return new Env(map);
  }

  fork(): Env<R> {
    const map = new Map<Tag.Any, any>();
    for (const [tag, service] of this.map) {
      if (tag.fork !== undefined) {
        map.set(tag, tag.fork(service));
      } else {
        map.set(tag, service);
      }
    }
    return new Env(map);
  }
}

function mergeInto(current: Map<Tag.Any, any>, other: Map<Tag.Any, any>) {
  for (const [tag, service] of other) {
    if (current.has(tag) && tag.merge !== undefined) {
      current.set(tag, tag.merge(current.get(tag), service));
    } else {
      current.set(tag, service);
    }
  }
}

/**
 * A Tag is just a Key in an Env<R> which is associated with a service of type S.
 */
export interface Tag<Id, S> extends Nano.Nano<GetEnv<Id>, S> {
  readonly name: string;
  readonly merge?: (service: S, other: S) => S;
  readonly fork?: (service: S) => S;
}

export interface TagConstructor<in out Id, in out S> extends Tag<Id, S> {
  new (): Tag<Id, S>;

  readonly env: (service: S) => Env<Id>;

  readonly with: (
    service: S,
  ) => <Y, R>(nano: Nano.Nano<Y, R>) => Nano.Nano<GetEnv.Exclude<Y, Id>, R>;

  readonly use: <N2 extends Nano.Nano.Any>(
    f: (service: S) => N2,
  ) => Nano.Nano<Nano.Nano.Yield<N2> | GetEnv<Id>, Nano.Nano.Return<N2>>;

  readonly update: <Y, R2>(
    nano: Nano.Nano<Y, R2>,
    f: (service: S) => S,
  ) => Nano.Nano<Y | GetEnv<Id>, R2>;
}

export declare namespace Tag {
  export type Any = Tag<any, any>;
  export type Id<T> = T extends Tag<infer Id, infer _S> ? Id : never;
  export type Service<T> = T extends Tag<infer _Id, infer S> ? S : never;
}

/**
 * We attempt to utilize a global tag cache to avoid creating duplicate tag classes for the same name.
 * This is primarily to avoid issues during hot-module reloading which can cause the TagClass instance to change.
 */
const GLOBAL_TAG_CACHE_KEY = Symbol.for("GLOBAL_TAG_CACHE_KEY");
const GLOBAL_TAG_CACHE: Map<string, TagConstructor<any, any>> = ((
  globalThis as any
)[GLOBAL_TAG_CACHE_KEY] ??= new Map());

export const tag = <Id, S = Id>(
  name: string,
  options: {
    fork?: (service: S) => S;
    merge?: (service: S, other: S) => S;
  } = {},
): TagConstructor<Id, S> => {
  if (GLOBAL_TAG_CACHE.has(name)) {
    return GLOBAL_TAG_CACHE.get(name) as TagConstructor<Id, S>;
  }

  const TagClass = class TagClass {
    static env(this: Tag<Id, S>, service: S): Env<Id> {
      return Env.make<Id, S>(this, service);
    }
    static use<Y, R2>(this: Tag<Id, S>, f: (service: S) => Nano.Nano<Y, R2>) {
      return Nano.flatMap(this, f);
    }
    static with(this: Tag<Id, S>, service: S) {
      return <Y, R>(
        nano: Nano.Nano<Y, R>,
      ): Nano.Nano<GetEnv.Exclude<Y, Id>, R> =>
        provide(nano, Env.make<Id, S>(this, service));
    }
    static update<Y, R2>(
      this: Tag<Id, S>,
      nano: Nano.Nano<Y, R2>,
      f: (service: S) => S,
    ) {
      return Nano.flatMap(this, (s) =>
        provide(nano, Env.make<Id, S>(this, f(s))),
      );
    }
    static [Symbol.iterator](this: Tag<Id, S>) {
      return getTag<Id, S>(this);
    }
    static pipe(this: Tag<Id, S>) {
      return pipeArguments(this, arguments);
    }
    static {
      Object.defineProperty(this, "name", { value: name });
    }
    static merge?: (service: S, other: S) => S = options.merge;
    static fork?: (service: S) => S = options.fork;

    readonly name = name;
    readonly merge?: (service: S, other: S) => S = options.merge;
    readonly fork?: (service: S) => S = options.fork;
    [Symbol.iterator](this: Tag<Id, S>): Iterator<GetEnv<Id>, S> {
      return getTag(this.constructor as TagConstructor<Id, S>);
    }
    pipe() {
      return pipeArguments(this, arguments);
    }
  } as TagConstructor<Id, S>;
  GLOBAL_TAG_CACHE.set(name, TagClass);
  return TagClass;
};

const withEnvIterator = <R, A>(f: (env: Env<R>) => A): Iterator<GetEnv<R>, A> =>
  Iterator.map(Iterator.get(get<R>()), f);

const getTag = <Id, S>(tag: Tag<Id, S>): Iterator<GetEnv<Id>, S> =>
  withEnvIterator<Id, S>((e) => {
    if (!e.map.has(tag)) {
      throw new Failure(`Tag ${tag.name} not found in environment`);
    }
    return e.get(tag);
  });

/**
 * Provide the entire Env<R> to a Nano<Y | GetEnv<R>, A>
 */
export const provideAll: {
  <Y>(
    env: Env<GetEnv.FromYield<Y>>,
  ): <R>(nano: Nano.Nano<Y, R>) => Nano.Nano<GetEnv.ExcludeAll<Y>, R>;

  <Y, R>(
    nano: Nano.Nano<Y, R>,
    env: Env<GetEnv.FromYield<Y>>,
  ): Nano.Nano<GetEnv.ExcludeAll<Y>, R>;
} = (...args: any[]): any => {
  if (args.length === 1) {
    return (nano: Nano.Nano<any, any>) => provideAll_(nano, args[0]);
  } else {
    return provideAll_(args[0], args[1]);
  }
};

const provideAll_ = <Y, R>(
  nano: Nano.Nano<Y, R>,
  env: Env<GetEnv.FromYield<Y>>,
): Nano.Nano<GetEnv.ExcludeAll<Y>, R> =>
  Nano.fromIterator(() =>
    Iterator.flatMapInput(Iterator.get(nano), (value) => {
      if (isGetEnv(value)) {
        return Iterator.success(env);
      } else {
        return Iterator.once()(asNot(value, isGetEnv));
      }
    }),
  );

/**
 * Provide a subset of the environment to a Nano<Y | GetEnv<R>, A>
 */
export const provide: {
  <R2>(
    env: Env<R2>,
  ): <Y, R>(nano: Nano.Nano<Y, R>) => Nano.Nano<GetEnv.Exclude<Y, R2>, R>;

  <Y, R, R2>(
    nano: Nano.Nano<Y, R>,
    env: Env<R2>,
  ): Nano.Nano<GetEnv.Exclude<Y, R2>, R>;
} = (...args: any[]): any => {
  if (args.length === 1) {
    return (nano: Nano.Nano<any, any>) => provide_(nano, args[0]);
  } else {
    return provide_(args[0], args[1]);
  }
};

const provide_ = <Y, R, R2>(nano: Nano.Nano<Y, R>, env: Env<R2>) =>
  Nano.flatMap(get(), (existing) =>
    provideAll(nano, existing.merge(env) as Env<GetEnv.FromYield<Y>>),
  );

/**
 * Provide the initial empty environment to a Nano<Y | GetEnv<never>, A>
 */
export const withEnv = <Y, R>(
  nano: Nano.Nano<Y | GetEnv<never>, R>,
): Nano.Nano<GetEnv.ExcludeAll<Y>, R> => provideAll(nano, Env.empty());

/**
 * Provide a single tag's service to a Nano<Y | GetEnv<R>, A>
 */
export const withTag =
  <Id, S>(tag: Tag<Id, S>, service: S) =>
  <Y, R>(nano: Nano.Nano<Y, R>): Nano.Nano<GetEnv.Exclude<Y, Id>, R> =>
    provide(nano, Env.make(tag, service));
