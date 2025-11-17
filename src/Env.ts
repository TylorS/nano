import type { Arg0, TypeLambda1 } from "hkt-core";
import type { U } from "ts-toolbelt";
import { Effect } from "./Effect.js";
import { pipeArguments } from "./Function.js";
import * as Iterator from "./Iterator.js";
import * as Nano from "./Nano.js";
import * as Unify from "./Unify.js";
import { Failure } from "./Failure.js";

export class Get<R> extends Effect("Get") {
  declare return: Env<R>;
  declare [Unify.unifySymbol]: Get.Unify;
}

export const get = <R>(): Get<R> => new Get<R>();

export declare namespace Get {
  export interface Unify extends Unify.Unification {
    make: Make;
    getArgs: GetArgs;
  }

  export interface Make extends TypeLambda1 {
    return: Get<Arg0<this>>;
  }

  export interface GetArgs extends TypeLambda1 {
    return: Arg0<this> extends Get<infer R> ? [R] : never;
  }

  export type Extract<Y> = Unify.Extract<Get.Unify, Y>;
  export type Exclude<Y> = Unify.Exclude<Get.Unify, Y>;
  export type Ids<Y> = Unify.Unify.Arg0<Get.Unify, Y>;

  export type ExcludeService<Y, Id> =
    | Exclude<Y>
    | Get<globalThis.Exclude<Ids<Y>, Id>>;
}

type GetTagsOf<T> = GetTags_<U.ListOf<T>>[number];
type GetTags_<T extends readonly any[]> = {
  [K in keyof T]: Tag<T[K], any>;
};

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

  extend<R2>(other: Env<R2>): Env<R | R2> {
    const map = new Map(this.map);
    mergeInto(map, other.map);
    return new Env(map);
  }
}

function mergeInto(current: Map<Tag.Any, any>, other: Map<Tag.Any, any>) {
  for (const [tag, service] of other) {
    current.set(tag, service);
  }
}

/**
 * A Tag is just a Key in an Env<R> which is associated with a service of type S.
 */
export interface Tag<in out Id, out S> extends Nano.Nano<Get<Id>, S> {
  readonly name: string;
}

export declare namespace Tag {
  export type Any = Tag<any, any>;
  export type Id<T> = T extends Tag<infer Id, infer _S> ? Id : never;
  export type Service<T> = T extends Tag<infer _Id, infer S> ? S : never;
}

export interface TagConstructor<in out Id, in out S> extends Tag<Id, S> {
  new (): Tag<Id, S>;

  readonly env: (service: S) => Env<Id>;

  readonly with: (
    service: S,
  ) => <Y, R>(nano: Nano.Nano<Y, R>) => Nano.Nano<Get.ExcludeService<Y, Id>, R>;

  readonly use: <N2 extends Nano.Nano.Any>(
    f: (service: S) => N2,
  ) => Nano.Nano<Nano.Nano.Yield<N2> | Get<Id>, Nano.Nano.Return<N2>>;

  readonly update: <Y, R2>(
    nano: Nano.Nano<Y, R2>,
    f: (service: S) => S,
  ) => Nano.Nano<Y | Get<Id>, R2>;
}

/**
 * We attempt to utilize a global tag cache to avoid creating duplicate tag classes for the same name.
 * This is primarily to avoid issues during hot-module reloading which can cause the TagClass instance to change.
 */
const GLOBAL_TAG_CACHE_KEY = Symbol.for("GLOBAL_TAG_CACHE_KEY");
const GLOBAL_TAG_CACHE: Map<string, TagConstructor<any, any>> = ((
  globalThis as any
)[GLOBAL_TAG_CACHE_KEY] ??= new Map());

export const tag = <Id, S = Id>(name: string): TagConstructor<Id, S> => {
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
      ): Nano.Nano<Get.ExcludeService<Y, Id>, R> =>
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

    readonly name = name;
    [Symbol.iterator](this: Tag<Id, S>): Iterator<Get<Id>, S> {
      return getTag(this.constructor as TagConstructor<Id, S>);
    }
    pipe() {
      return pipeArguments(this, arguments);
    }
  } as TagConstructor<Id, S>;
  GLOBAL_TAG_CACHE.set(name, TagClass);
  return TagClass;
};

const withEnvIterator = <R, A>(f: (env: Env<R>) => A): Iterator<Get<R>, A> =>
  Iterator.map(Iterator.get(get<R>()), f);

const getTag = <Id, S>(tag: Tag<Id, S>): Iterator<Get<Id>, S> =>
  withEnvIterator<Id, S>((e) => {
    if (!e.map.has(tag)) {
      throw new Failure(`Tag ${tag.name} not found in environment`);
    }
    return e.get(tag);
  });

export const provideAll: {
  <Y>(
    env: Env<Get.Ids<Y>>,
  ): <R>(nano: Nano.Nano<Y, R>) => Nano.Nano<Get.Exclude<Y>, R>;

  <Y, R>(
    nano: Nano.Nano<Y, R>,
    env: Env<Get.Ids<Y>>,
  ): Nano.Nano<Get.Exclude<Y>, R>;
} = (...args: any[]): any => {
  if (args.length === 1) {
    return (nano: Nano.Nano<any, any>) => provideAll_(nano, args[0]);
  } else {
    return provideAll_(args[0], args[1]);
  }
};

const provideAll_ = <Y, R>(
  nano: Nano.Nano<Y, R>,
  env: Env<Get.Ids<Y>>,
): Nano.Nano<Get.Exclude<Y>, R> =>
  Nano.fromIterator(() =>
    Iterator.flatMapYield(Iterator.get(nano), (value) => {
      if (Get.is(value)) {
        return Iterator.success(env);
      } else {
        return Iterator.once()(value as Get.Exclude<Y>);
      }
    }),
  );

export const provide: {
  <R2>(
    env: Env<R2>,
  ): <Y, R>(nano: Nano.Nano<Y, R>) => Nano.Nano<Get.ExcludeService<Y, R2>, R>;

  <Y, R, R2>(
    nano: Nano.Nano<Y, R>,
    env: Env<R2>,
  ): Nano.Nano<Get.ExcludeService<Y, R2>, R>;
} = (...args: any[]): any => {
  if (args.length === 1) {
    return (nano: Nano.Nano<any, any>) => provide_(nano, args[0]);
  } else {
    return provide_(args[0], args[1]);
  }
};

const provide_ = <Y, R, R2>(nano: Nano.Nano<Y, R>, env: Env<R2>) =>
  Nano.flatMap(get(), (existing) =>
    provideAll(nano, existing.extend(env) as Env<Get.Ids<Y>>),
  );

/**
 * Provide the initial empty environment to a Nano<Y | GetEnv<never>, A>
 */
export const withEnv = <Y, R>(
  nano: Nano.Nano<Y | Get<never>, R>,
): Nano.Nano<Get.Exclude<Y>, R> => provideAll(nano, Env.empty());

/**
 * Provide a single tag's service to a Nano<Y | GetEnv<R>, A>
 */
export const withTag =
  <Id, S>(tag: Tag<Id, S>, service: S) =>
  <Y, R>(nano: Nano.Nano<Y, R>): Nano.Nano<Get.ExcludeService<Y, Id>, R> =>
    provide(nano, Env.make(tag, service));
