import * as Iterator from "./Iterator.js";
import type { Nano } from "./Nano.js";
import { Failure } from "./Failure.js";
import { pipeArguments } from "./Function.js";

export type ErrorConstructor<Tag extends string, Id> = {
  readonly _tag: Tag;
  new (
    ...args: ConstructorParameters<typeof Error>
  ): Error & Nano<Failure<Id>, never> & { readonly _tag: Tag };
};

/**
 * Helper for creating custom errors which are also yieldable failures.
 * 
 * @example
 * ```typescript
 * export class MyError extends Nano.error<MyError>()("MyError") {}
 * ```
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
        return instance instanceof Error && (instance as any)._tag === tag;
      }
    };
