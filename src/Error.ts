import * as Iterator from "./Iterator.js";
import type { Nano } from "./Nano.js";
import { Failure } from "./Result.js";
import { pipeArguments } from "./Function.js";
import { isVariant } from "./Variant.js";

export type ErrorConstructor<Tag extends string, Id> = {
  readonly _tag: Tag;
  new (
    ...args: ConstructorParameters<typeof Error>
  ): Error & { readonly _tag: Tag } & Nano<Failure<Id>, never>;
};

/**
 * Helper for creating custom errors which are also yieldable failures.
 */
export const error =
  <Id>() =>
  <Tag extends string>(tag: Tag): ErrorConstructor<Tag, Id> =>
    class extends Error implements Nano<Failure<Id>, never> {
      static readonly _tag: Tag = tag;
      readonly _tag = tag;

      constructor(...args: ConstructorParameters<typeof Error>) {
        super(...args);
        this.name = tag;
        if (Error.captureStackTrace)
          Error.captureStackTrace(this, this.constructor);
      }
      [Symbol.iterator](this: Id): Iterator<Failure<Id>, never> {
        return Iterator.once<never>()(new Failure(this));
      }

      pipe() {
        return pipeArguments(this, arguments);
      }

      static override [Symbol.hasInstance](
        instance: unknown,
      ): instance is Error & Nano<Failure<Id>, never> {
        return (
          instance instanceof Error &&
          isVariant(instance) &&
          instance._tag === tag
        );
      }
    };
