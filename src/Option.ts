import type { Arg0, TypeLambda1 } from "hkt-core";
import * as Iterator from "./Iterator.js";
import * as Nano from "./Nano.js";
import * as Unify from "./Unify.js";
import { asNot, variant } from "./Variant.js";
import { error } from "./Error.js";

export class None extends error<None>()("None") {}

export declare namespace None {
  export type Exclude<Y> = globalThis.Exclude<Y, None>;
  export type Extract<Y> = globalThis.Extract<Y, None>;
}

export const none = (): None => new None();

export const isNone = (value: unknown): value is None =>
  value ? value instanceof None : false;

export class Some<A> extends variant("Some") implements Nano.Nano<never, A> {
  constructor(readonly value: A) {
    super();
  }
  [Symbol.iterator](this: Some<A>): Iterator<never, A> {
    return Iterator.success(this.value);
  }

  [Unify.unifySymbol]?: Some.Unify;
}
export declare namespace Some {
  export interface Unify extends Unify.Lambdas {
    make: Make;
    get: Get;
  }
  export interface Make extends TypeLambda1 {
    return: Some<Arg0<this>>;
  }
  export interface Get extends TypeLambda1 {
    return: Arg0<this> extends Some<infer A> ? [A] : never;
  }
}

export type Option<A> = Some<A> | None;

export const some = <A>(value: A): Some<A> => new Some(value);

export const isSome = <A = unknown>(value: unknown): value is Some<A> =>
  value ? value instanceof Some : false;

export const isOption = <A = unknown>(value: unknown): value is Option<A> =>
  isSome(value) || isNone(value);

export function optional<Y, R>(
  nano: Nano.Nano<Y, R>,
): Nano.Nano<None.Exclude<Y>, Option<R>> {
  return Nano.fromIterator(function* () {
    const iterator = Iterator.get(nano);
    let result = iterator.next();
    while (!result.done) {
      const value = result.value;
      if (isNone(value)) return value;
      result = iterator.next(yield asNot(value, isNone));
    }
    return some(result.value);
  });
}
