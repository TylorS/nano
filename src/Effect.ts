import type { Pipeable } from "./Function.js";
import * as Iterator from "./Iterator.js";

export interface EffectType {
  readonly _nanoEffectId: unknown;
  new (...args: readonly any[]): any;
}

export const EffectTypeId = Symbol("nano/Effect");

export interface AnyEffect {
  readonly _nanoTypeId: typeof EffectTypeId;
  readonly _nanoEffectId: unknown;
  readonly arg: unknown;
}

/**
 * Create an Effect type constructor. Effects are algebraic effect operations
 * that can be yielded from generators and handled by effect handlers.
 *
 * @example
 * ```typescript
 * class Log extends Effect("Log")<readonly unknown[], void> {}
 *
 * const log = (...args: readonly unknown[]) => new Log(args);
 * ```
 */
export const Effect = <const T extends string>(id: T) =>
  class <A, R = unknown> implements AnyEffect, Pipeable {
    public readonly _nanoTypeId: typeof EffectTypeId = EffectTypeId;
    public readonly _nanoEffectId = id;
    public static readonly _nanoEffectId = id;
    public readonly R!: R;
    public readonly pipe = ((...args: any[]) => {
      return (args as any).reduce((acc: any, fn: any) => fn(acc), this);
    }) as Pipeable["pipe"];

    constructor(public readonly arg: A) {}

    static is<E extends EffectType>(
      this: E,
      x: unknown,
    ): x is InstanceType<E> {
      return !!x && (x as any)._nanoEffectId === this._nanoEffectId;
    }

    /**
     * Convert this effect to an iterable that yields this effect and returns R
     */
    returning<RR extends R>(): { [Symbol.iterator](): Iterator<this, RR> } {
      return this as { [Symbol.iterator](): Iterator<this, RR> };
    }

    [Symbol.iterator](): Iterator<this, R, any> {
      return Iterator.once<R>()(this);
    }
  };

export const isEffect = <E>(e: E): e is E & AnyEffect =>
  !!e && (e as any)._nanoTypeId === EffectTypeId;



