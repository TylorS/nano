import { tag, Env, GetEnv, provide } from "./Env.js";
import { get } from "./Iterator.js";
import { type Nano, map, of, fromIterator, sync } from "./Nano.js";
import { pipeArguments } from "./Function.js";
import { isSome, none, some, type Option } from "./Option.js";

type RefState<A> = {
  value: A;
  version: number;
  fork?: ((value: A) => Option<A>) | undefined;
  merge?: ((a: A, b: A) => A) | undefined;
};

/**
 * The Refs tag is used to store mutable references.
 */
export class Refs extends tag<Refs, Map<string, RefState<any>>>("Refs", {
  fork: (a) => {
    const map = new Map(a);
    for (const [key, state] of a) {
      if (state.fork) {
        const option = state.fork(state.value);
        if (isSome(option)) {
          state.value = option.value;
          state.version++;
        } else {
          map.delete(key);
        }
      }
    }
    return map;
  },
  merge: (a, b) => {
    const map = new Map(a);
    for (const [key, value] of b) {
      const existing = a.get(key);
      if (existing && existing.merge) {
        map.set(key, {
          ...value,
          value: existing.merge(existing.value, value.value),
        });
      } else {
        map.set(key, value);
      }
    }
    return map;
  },
}) {
  static readonly empty = (): Env<Refs> => Refs.env(new Map());
}

export interface Ref<A> extends Nano<GetEnv<Refs>, A> {
  readonly _tag: string;
  readonly defaultValue: () => A;

  readonly set: (value: A) => Nano<GetEnv<Refs>, A>;
  readonly update: (f: (x: A) => A) => Nano<GetEnv<Refs>, A>;
  readonly modify: <X>(f: (a: A) => readonly [X, A]) => Nano<GetEnv<Refs>, X>;
  readonly locally: (
    value: A,
  ) => <Y, R>(nano: Nano<Y, R>) => Nano<Y | GetEnv<Refs>, R>;

  readonly merge?: (a: A, b: A) => A;
  readonly fork?: (a: A) => Option<A>;
}
export interface RefConstructor<Tag extends string, A> extends Ref<A> {
  readonly _tag: Tag;
  new (defaultValue: () => A): Ref<A>;
}

export const ref = <Tag extends string, A>(
  tag: Tag,
  defaultValue: () => A,
  options: {
    merge?: (a: A, b: A) => A;
    fork?: (a: A) => Option<A>;
  } = {},
): RefConstructor<Tag, A> =>
  class {
    static readonly _tag = tag;
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
    static merge?: (a: A, b: A) => A = options.merge;
    static fork?: (a: A) => Option<A> = options.fork;

    // Constructor is used to override the default value
    constructor(readonly defaultValue: () => A) {
      return ref(tag, defaultValue);
    }
  } as RefConstructor<Tag, A>;

const getRef = <A>(
  reference: Ref<A>,
): Iterator<GetEnv<Refs>, A> =>
  get(map(Refs, (refs) => getOrCreateRef(refs, reference)));

const getOrCreateRef = <A>(
  refs: Map<string, RefState<any>>,
  reference: Ref<A>,
): A => {
  if (refs.has(reference._tag)) return refs.get(reference._tag)!.value;
  const value = reference.defaultValue();
  refs.set(
    reference._tag,
    newRefState(value, 0, reference.merge, reference.fork),
  );
  return value;
};

const newRefState = <A>(
  value: A,
  version: number,
  merge?: (a: A, b: A) => A,
  fork?: (value: A) => Option<A>,
): RefState<A> => ({
  value,
  version,
  merge,
  fork,
});

const upsertRefState = <A>(
  refs: Map<string, RefState<any>>,
  ref: Ref<A>,
  value: A,
): void => {
  let existing = refs.get(ref._tag);
  if (existing) {
    existing.value = value;
    existing.version++;
  } else {
    existing = newRefState(value, 0, ref.merge, ref.fork);
    refs.set(ref._tag, existing);
  }
};

export const locally =
  <A>(ref: Ref<A>, value: A) =>
  <Y, R>(nano: Nano<Y, R>): Nano<Y | GetEnv<Refs>, R> =>
    Refs.update(nano, (e) => {
      const newRefs = new Map(e);
      upsertRefState(newRefs, ref, value);
      return newRefs;
    });

export const set = <A>(
  ref: Ref<A>,
  value: A,
): Nano<GetEnv<Refs>, A> =>
  Refs.use((refs) =>
    sync(() => {
      upsertRefState(refs, ref, value);
      return value;
    }),
  );

export const update = <A>(
  ref: Ref<A>,
  f: (x: A) => A,
): Nano<GetEnv<Refs>, A> =>
  Refs.use((refs) =>
    sync(() => {
      const updated = f(getOrCreateRef(refs, ref));
      upsertRefState(refs, ref, updated);
      return updated;
    }),
  );

export const modify = <X, Y>(
  ref: Ref<X>,
  f: (x: X) => readonly [Y, X],
): Nano<GetEnv<Refs>, Y> =>
  Refs.use((refs) =>
    sync(() => {
      const [y, x] = f(getOrCreateRef(refs, ref));
      upsertRefState(refs, ref, x);
      return y;
    }),
  );

const delete_ = <A>(
  ref: Ref<A>,
): Nano<GetEnv<Refs>, Option<A>> =>
  Refs.use((refs) => {
    if (refs.has(ref._tag)) {
      const existing = refs.get(ref._tag)!;
      refs.delete(ref._tag);
      return of(some(existing.value));
    }
    return of(none());
  });

export { delete_ as delete };

export const withRefs = <Y, R>(
  nano: Nano<Y, R>,
): Nano<GetEnv.Exclude<Y, Refs>, R> =>
  fromIterator<GetEnv.Exclude<Y, Refs>, R>(() =>
    get(provide(nano, Refs.empty())),
  );
