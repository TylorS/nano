import * as Iterator from "./Iterator.js";
import type { Nano } from "./Nano.js";
import { Failure } from "./Result.js";
import { pipeArguments } from "./Function.js";

export type ErrorConstructor<Id> = new (
  ...args: ConstructorParameters<typeof Error>
) => Error & Nano<Failure<Id>, never>;

export const error = <Id>(): ErrorConstructor<Id> =>
  class extends Error implements Nano<Failure<Id>, never> {
    constructor(...args: ConstructorParameters<typeof Error>) {
      super(...args);
      if (Error.captureStackTrace)
        Error.captureStackTrace(this, this.constructor);
    }
    [Symbol.iterator](): Iterator<Failure<Id>, never> {
      return Iterator.once<never>()(new Failure(this as unknown as Id));
    }
    pipe() {
      return pipeArguments(this, arguments);
    }
  };
