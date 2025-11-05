import { tag, Env, GetEnv, provide } from "./Env.js";
import { get } from "./Iterator.js";
import { type Nano, map, of, fromIterator } from "./Nano.js";
import { pipeArguments } from "./Function.js";

export const RefsTypeId = Symbol.for("Refs");
export type RefsTypeId = typeof RefsTypeId;

export class Refs extends tag<Refs, Map<Ref<any>, any>>(
  "Refs",
  (a, b) => new Map([...a, ...b]),
) {
  static readonly empty = (): Env<Refs> => Refs.env(new Map());
}

export interface Ref<A> extends Nano<GetEnv<Refs>, A> {
  readonly defaultValue: () => A;

  readonly set: (value: A) => Nano<GetEnv<Refs>, A>;
  readonly update: (f: (x: A) => A) => Nano<GetEnv<Refs>, A>;
  readonly modify: <X>(f: (a: A) => readonly [X, A]) => Nano<GetEnv<Refs>, X>;
  readonly locally: (
    value: A,
  ) => <Y, R>(nano: Nano<Y, R>) => Nano<Y | GetEnv<Refs>, R>;
}
export interface RefConstructor<A> extends Ref<A> {
  new (defaultValue: () => A): Ref<A>;
}

export const ref = <A>(defaultValue: () => A): RefConstructor<A> =>
  class {
    static readonly defaultValue = defaultValue;
    static [Symbol.iterator](this: Ref<A>): Iterator<GetEnv<Refs>, A> {
      return getRef(this);
    }
    static set(this: Ref<A>, value: A): Nano<GetEnv<Refs>, A> {
      return set(this, value);
    }
    static update(this: Ref<A>, f: (x: A) => A): Nano<GetEnv<Refs>, A> {
      return update(this, f);
    }
    static modify<X>(
      this: Ref<A>,
      f: (a: A) => readonly [X, A],
    ): Nano<GetEnv<Refs>, X> {
      return modify(this, f);
    }
    static locally(
      this: Ref<A>,
      value: A,
    ): <Y, R>(nano: Nano<Y, R>) => Nano<Y | GetEnv<Refs>, R> {
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

const getRef = <A>(reference: Ref<A>): Iterator<GetEnv<Refs>, A> =>
  get(map(Refs, (refs) => getOrCreateRef(refs, reference)));

const getOrCreateRef = <A>(refs: Map<Ref<any>, any>, reference: Ref<A>): A => {
  if (refs.has(reference)) return refs.get(reference);
  const value = reference.defaultValue();
  refs.set(reference, value);
  return value;
};

export const locally =
  <X>(ref: Ref<X>, value: X) =>
  <Y, R>(nano: Nano<Y, R>): Nano<Y | GetEnv<Refs>, R> =>
    Refs.update(nano, (e) => new Map(e).set(ref, value));

export const set = <X>(ref: Ref<X>, value: X): Nano<GetEnv<Refs>, X> =>
  Refs.use((refs) => (refs.set(ref, value), of(value)));

export const update = <X>(ref: Ref<X>, f: (x: X) => X): Nano<GetEnv<Refs>, X> =>
  Refs.use((refs) => {
    const updated = f(getOrCreateRef(refs, ref));
    refs.set(ref, updated);
    return of(updated);
  });

export const modify = <X, Y>(
  ref: Ref<X>,
  f: (x: X) => readonly [Y, X],
): Nano<GetEnv<Refs>, Y> =>
  Refs.use((refs) => {
    const [y, x] = f(getOrCreateRef(refs, ref));
    refs.set(ref, x);
    return of(y);
  });

export const withRefs = <Y, R>(
  nano: Nano<Y, R>,
): Nano<GetEnv.Exclude<Y, Refs>, R> =>
  fromIterator<GetEnv.Exclude<Y, Refs>, R>(() =>
    get(provide(nano, Refs.empty())),
  );
