import type { Arg0, TypeLambda1 } from "hkt-core";
import * as Iterator from "./Iterator.js";
import * as Nano from "./Nano.js";
import { Failure } from "./Result.js";
import * as Unify from "./Unify.js";
import { pipeArguments } from "./Function.js";
import { variant } from "./Variant.js";

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
  export type Extract<T> = T extends GetEnv<infer R> | (infer _) ? R : never;

  export type ExcludeAll<Y> = globalThis.Exclude<Y, GetEnv<any>>;

  export type Exclude<Y, R> = [
    ExcludeAll<Y> | GetEnv<globalThis.Exclude<FromYield<Y>, R>>,
  ] extends [(infer Y2) | GetEnv<infer R2>]
    ? Y2 | GetEnv<R2>
    : never;

  export type FromYield<Y> = [Y] extends [never]
    ? never
    : [Y] extends [GetEnv<infer R> | (infer _)]
      ? R
      : never;

  export interface Unify extends Unify.Lambdas {
    make: Make;
    get: Get;
  }

  export interface Make extends TypeLambda1 {
    return: GetEnv<Arg0<this>>;
  }

  export interface Get extends TypeLambda1 {
    return: Arg0<this> extends GetEnv<infer R> ? [R] : never;
  }
}

export const get = <R>() => new GetEnv<R>();

export class Env<out R> {
  static empty = (): Env<never> => new Env(new Map());
  static make = <Id, S>(tag: Tag<Id, S>, service: S): Env<Id> =>
    new Env(new Map().set(tag, service));

  constructor(readonly map: Map<Tag.Any, any>) {}

  add<T extends Tag.Any>(tag: T, service: Nano.Nano.Return<T>): Env<R> {
    return new Env(new Map(this.map).set(tag, service));
  }

  get<T extends Tag.Any>(tag: T): Nano.Nano.Return<T> {
    return this.map.get(tag);
  }

  fork<R2>(other: Env<R2>): Env<R | R2> {
    const map = new Map(this.map);
    mergeInto(map, other.map);
    return new Env(map);
  }

  merge<R2>(other: Env<R2>): Env<R | R2> {
    mergeInto(this.map, other.map);
    return this as Env<R | R2>;
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

export interface Tag<Id, S> extends Nano.Nano<GetEnv<Id>, S> {
  readonly name: string;
  readonly merge?: (service: S, other: S) => S;
}

export interface TagConstructor<in out Id, in out S> extends Tag<Id, S> {
  new (): Tag<Id, S>;

  readonly env: (service: S) => Env<Id>;

  readonly with: (
    service: S,
  ) => <Y, R>(nano: Nano.Nano<Y, R>) => Nano.Nano<GetEnv.Exclude<Y, Id>, R>;

  readonly use: <Y, R2>(
    f: (service: S) => Nano.Nano<Y, R2>,
  ) => Nano.Nano<Y | GetEnv<Id>, R2>;

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

export const tag = <Id, S = Id>(
  name: string,
  merge?: (service: S, other: S) => S,
): TagConstructor<Id, S> =>
  class TagClass {
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
    static merge?: (service: S, other: S) => S = merge;

    readonly name = name;
    readonly merge?: (service: S, other: S) => S = merge;
    [Symbol.iterator](this: {
      constructor: TagConstructor<Id, S>;
    }): Iterator<GetEnv<Id>, S> {
      return getTag(this.constructor);
    }
    pipe() {
      return pipeArguments(this, arguments);
    }
  } as TagConstructor<Id, S>;

const withEnvIterator = <R, A>(f: (env: Env<R>) => A): Iterator<GetEnv<R>, A> =>
  Iterator.map(Iterator.get(get<R>()), f);

const getTag = <Id, S>(tag: Tag<Id, S>): Iterator<GetEnv<Id>, S> =>
  withEnvIterator<Id, S>((e) => {
    if (!e.map.has(tag)) {
      throw new Failure(`Tag ${tag.name} not found in environment`);
    }
    return e.get(tag) as S;
  });

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
      if (value instanceof GetEnv) {
        return Iterator.success(env);
      } else {
        return Iterator.once()(value as GetEnv.ExcludeAll<Y>);
      }
    }),
  );

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

const provide_ = <Y, R, R2>(
  nano: Nano.Nano<Y, R>,
  env: Env<R2>,
): Nano.Nano<GetEnv.Exclude<Y, R2>, R> =>
  Nano.flatMap(get<any>(), (existing) =>
    provideAll(nano, existing.fork(env)),
  ) as any;

export const withEnv = <Y, R>(
  nano: Nano.Nano<Y | GetEnv<never>, R>,
): Nano.Nano<GetEnv.ExcludeAll<Y>, R> => provideAll(nano, Env.empty());

export const withTag =
  <Id, S>(tag: Tag<Id, S>, service: S) =>
  <Y, R>(nano: Nano.Nano<Y, R>): Nano.Nano<GetEnv.Exclude<Y, Id>, R> =>
    provide(nano, Env.make(tag, service));
