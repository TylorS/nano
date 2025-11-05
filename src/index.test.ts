import { describe, it, expect } from "vitest";
import * as Nano from "./index.js";

describe("Nano", () => {
  /**
   * The overall goal of nano-ts is to utilize open variants and iterators to build interpreters.
   * One such example is an effect system, found below.
   */
  describe("building closed effect systems", () => {
    // Define a closed Effect type that wraps Nano's open variant system
    interface Effect<A, E = never, R = never>
      extends Nano.Nano<Yield<E, R>, A> {}

    type Yield<E, R> = Nano.Failure<E> | Nano.GetEnv<R | Nano.Refs>;

    // Helper to run an Effect program
    const runEffect = <A, E, R = never>(
      effect: Effect<A, E, R>,
      ...[env]: [R] extends [never] ? [] : [Nano.Env<R>]
    ): Nano.Result<A, E> => {
      return effect.pipe(
        Nano.provideAll((env || Nano.Env.empty()).merge(Nano.Refs.empty())),
        Nano.result,
        Nano.run,
      );
    };

    // Helper to create pure effects
    const succeed = <A>(value: A): Effect<A> => Nano.of(value);

    // Helper to create failure effects
    const fail = <E>(error: E): Effect<never, E> => Nano.failure(error);

    const make = Nano.make as <Y extends Yield<any, any>, R>(
      f: () => Generator<Y, R>,
    ) => Effect<
      R,
      Nano.Result.FailureFromYield<Y>,
      Exclude<Nano.GetEnv.FromYield<Y>, Nano.Refs>
    >;

    it("should allow creating simple pure effects", () => {
      const program = succeed(42);
      const result = runEffect(program);
      expect(result).toEqual(Nano.success(42));
    });

    it("should allow creating effect programs with generators", () => {
      const program: Effect<number> = make(function* () {
        const x = yield* succeed(10);
        const y = yield* succeed(20);
        return x + y;
      });

      const result = runEffect(program);
      expect(result).toEqual(Nano.success(30));
    });

    it("should handle error effects", () => {
      const program: Effect<number, string> = make(function* () {
        yield* fail("Something went wrong");
        return 42;
      });

      const result = runEffect(program);
      expect(Nano.isFailure(result)).toBe(true);
      if (Nano.isFailure(result)) {
        expect(result.error).toBe("Something went wrong");
      }
    });

    it("should handle environment effects", () => {
      class Config extends Nano.tag<Config, { apiUrl: string }>("Config") {}

      const program: Effect<string, never, Config> = make(function* () {
        const config = yield* Config;
        return `API URL: ${config.apiUrl}`;
      });

      const env = Config.env({ apiUrl: "https://api.example.com" });
      const result = runEffect(program, env);
      expect(result).toEqual(Nano.success("API URL: https://api.example.com"));
    });

    it("should handle refs effects", () => {
      class Counter extends Nano.ref(() => 0) {}

      const program: Effect<number> = make(function* () {
        yield* Counter.set(10);
        yield* Counter.update((x) => x + 5);
        return yield* Counter;
      });

      const result = runEffect(program);
      expect(result).toEqual(Nano.success(15));
    });

    it("should compose multiple effects together", () => {
      class Logger extends Nano.tag<Logger, { log: (message: string) => void }>(
        "Logger",
      ) {}

      class Counter extends Nano.ref(() => 0) {}

      const program = make(function* () {
        yield* Counter.set(5);
        const count = yield* Counter;
        const logger = yield* Logger;
        logger.log(`Count is ${count}`);
        return `Final count: ${count}`;
      });

      const logs: string[] = [];
      const env = Logger.env({
        log: (msg) => logs.push(msg),
      });

      const result = runEffect(program, env);
      expect(result).toEqual(Nano.success("Final count: 5"));
      expect(logs).toEqual(["Count is 5"]);
    });

    it("should handle error propagation in composed effects", () => {
      class Config extends Nano.tag<Config, { allowNegative: boolean }>(
        "Config",
      ) {}

      const program = make(function* () {
        const config = yield* Config;
        const value = -10;

        if (value < 0 && !config.allowNegative) {
          yield* fail("Negative values not allowed");
        }

        return value;
      });

      // Test with negative values not allowed
      const env1 = Config.env({ allowNegative: false });
      const result1 = runEffect(program, env1);
      expect(Nano.isFailure(result1)).toBe(true);
      if (Nano.isFailure(result1)) {
        expect(result1.error).toBe("Negative values not allowed");
      }

      // Test with negative values allowed
      const env2 = Config.env({ allowNegative: true });
      const result2 = runEffect(program, env2);
      expect(result2).toEqual(Nano.success(-10));
    });

    it("should allow chaining effects with flatMap", () => {
      const program = succeed(5).pipe(
        Nano.flatMap((x) => succeed(x * 2)),
        Nano.flatMap((x) => succeed(x + 3)),
      );

      const result = runEffect(program);
      expect(result).toEqual(Nano.success(13)); // (5 * 2) + 3
    });

    it("should handle refs with local scoping", () => {
      class Counter extends Nano.ref(() => 0) {}

      const program = make(function* () {
        yield* Counter.set(10);
        const before = yield* Counter;

        // Locally override the counter value
        const localResult = yield* Counter.locally(100)(
          make(function* () {
            return yield* Counter;
          }),
        );

        const after = yield* Counter;
        return [before, localResult, after] as const;
      });

      const result = runEffect(program);
      expect(result).toEqual(Nano.success([10, 100, 10]));
    });

    it("should demonstrate that Effect is closed - cannot add arbitrary effects", () => {
      // This test demonstrates type safety - the Effect type is closed
      // and only allows the specific effect types we've defined

      const program: Effect<number> = make(function* () {
        const x = yield* succeed(5);
        const y = yield* succeed(10);
        return x + y;
      });

      // The program is well-typed and can be run
      const result = runEffect(program);
      expect(result).toEqual(Nano.success(15));

      // TypeScript will prevent adding effects not in the union
      // This is a compile-time guarantee, not a runtime test
    });

    it("should handle complex effect compositions", () => {
      class Database extends Nano.tag<
        Database,
        { query: (_sql: string) => Promise<number> }
      >("Database") {}

      class QueryCount extends Nano.ref(() => 0) {}

      const program = make(function* () {
        yield* QueryCount.set(0);

        yield* Database;
        // Simulate multiple queries
        yield* QueryCount.update((x) => x + 1);
        yield* QueryCount.update((x) => x + 1);

        const count = yield* QueryCount;
        if (count > 1) {
          yield* fail("Too many queries");
        }

        return count;
      });

      const db = {
        query: async (_sql: string) => 42,
      };

      const env = Database.env(db);
      const result = runEffect(program, env);
      expect(Nano.isFailure(result)).toBe(true);
      if (Nano.isFailure(result)) {
        expect(result.error).toBe("Too many queries");
      }
    });

    it("should preserve effect types through composition", () => {
      // This test demonstrates that the closed Effect type is preserved
      // through various composition operations

      const effect1: Effect<number> = succeed(1);
      const effect2: Effect<string> = succeed("hello");

      const combined = make(function* () {
        const n = yield* effect1;
        const s = yield* effect2;
        return [n, s] as const;
      });

      const result = runEffect(combined);
      expect(result).toEqual(Nano.success([1, "hello"]));
    });
  });
});
