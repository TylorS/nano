import * as Env from "./Env.js";
import * as Iterator from "./Iterator.js";
import * as Nano from "./Nano.js";
import { pipeArguments } from "./Function.js";

export const RefsTypeId = Symbol.for("Refs");
export type RefsTypeId = typeof RefsTypeId;

export class Refs extends Env.tag<Refs, Map<Ref<any>, any>>(
  "Refs",
  (a, b) => new Map([...a, ...b]),
) {
  static readonly empty = (): Env.Env<Refs> => Refs.env(new Map());
}

export interface Ref<A> extends Nano.Nano<Env.GetEnv<Refs>, A> {
  readonly defaultValue: () => A;

  readonly set: (value: A) => Nano.Nano<Env.GetEnv<Refs>, A>;
  readonly update: (f: (x: A) => A) => Nano.Nano<Env.GetEnv<Refs>, A>;
  readonly modify: <X>(
    f: (a: A) => readonly [X, A],
  ) => Nano.Nano<Env.GetEnv<Refs>, X>;
  readonly locally: (
    value: A,
  ) => <Y, R>(nano: Nano.Nano<Y, R>) => Nano.Nano<Y | Env.GetEnv<Refs>, R>;
}
export interface RefConstructor<A> extends Ref<A> {
  new (defaultValue: () => A): Ref<A>;
}

export const ref = <A>(defaultValue: () => A): RefConstructor<A> =>
  class {
    static readonly defaultValue = defaultValue;
    static [Symbol.iterator](this: Ref<A>): Iterator<Env.GetEnv<Refs>, A> {
      return getRef(this);
    }
    static set(this: Ref<A>, value: A): Nano.Nano<Env.GetEnv<Refs>, A> {
      return set(this, value);
    }
    static update(
      this: Ref<A>,
      f: (x: A) => A,
    ): Nano.Nano<Env.GetEnv<Refs>, A> {
      return update(this, f);
    }
    static modify<X>(
      this: Ref<A>,
      f: (a: A) => readonly [X, A],
    ): Nano.Nano<Env.GetEnv<Refs>, X> {
      return modify(this, f);
    }
    static locally(
      this: Ref<A>,
      value: A,
    ): <Y, R>(nano: Nano.Nano<Y, R>) => Nano.Nano<Y | Env.GetEnv<Refs>, R> {
      return locally(this, value);
    }
    static pipe(this: Ref<A>) {
      return pipeArguments(this, arguments);
    }

    // Constructor is used to override the default value
    constructor(readonly defaultValue: () => A) {
      return ref(defaultValue);
    }
  } as RefConstructor<A>;

const getRef = <A>(reference: Ref<A>): Iterator<Env.GetEnv<Refs>, A> =>
  Iterator.get(Nano.map(Refs, (refs) => getOrCreateRef(refs, reference)));

const getOrCreateRef = <A>(refs: Map<Ref<any>, any>, reference: Ref<A>): A => {
  if (refs.has(reference)) return refs.get(reference);
  const value = reference.defaultValue();
  refs.set(reference, value);
  return value;
};

export const locally =
  <X>(ref: Ref<X>, value: X) =>
  <Y, R>(nano: Nano.Nano<Y, R>): Nano.Nano<Y | Env.GetEnv<Refs>, R> =>
    Refs.update(nano, (e) => new Map(e).set(ref, value));

export const set = <X>(ref: Ref<X>, value: X): Nano.Nano<Env.GetEnv<Refs>, X> =>
  Refs.use((refs) => (refs.set(ref, value), Nano.of(value)));

export const update = <X>(
  ref: Ref<X>,
  f: (x: X) => X,
): Nano.Nano<Env.GetEnv<Refs>, X> =>
  Refs.use((refs) => {
    const updated = f(getOrCreateRef(refs, ref));
    refs.set(ref, updated);
    return Nano.of(updated);
  });

export const modify = <X, Y>(
  ref: Ref<X>,
  f: (x: X) => readonly [Y, X],
): Nano.Nano<Env.GetEnv<Refs>, Y> =>
  Refs.use((refs) => {
    const [y, x] = f(getOrCreateRef(refs, ref));
    refs.set(ref, x);
    return Nano.of(y);
  });

export const withRefs = <Y, R>(
  nano: Nano.Nano<Y, R>,
): Nano.Nano<Env.GetEnv.Exclude<Y, Refs>, R> =>
  Nano.fromIterator<Env.GetEnv.Exclude<Y, Refs>, R>(() =>
    Iterator.get(Env.provide(nano, Refs.empty())),
  );
