import { describe, it, expect } from "vitest";
import * as Refs from "./Refs.js";
import * as Nano from "./Nano.js";
import * as Env from "./Env.js";

// Helper to run a Nano with Refs environment
const runWithRefs = <R>(nano: Nano.Nano<Env.GetEnv<Refs.Refs>, R>): R => 
  nano.pipe(
    Refs.withRefs,
    Env.withEnv,
    Nano.run,
  )

describe("Refs", () => {
  describe("ref", () => {
    it("should create a ref class with a default value", () => {
      class MyRef extends Refs.ref(() => 42) {}
      expect(MyRef.defaultValue()).toBe(42);
    });

    it("should allow different default values for different refs", () => {
      class Ref1 extends Refs.ref(() => "hello") {}
      class Ref2 extends Refs.ref(() => 100) {}
      expect(Ref1.defaultValue()).toBe("hello");
      expect(Ref2.defaultValue()).toBe(100);
    });

    it("should call default value function each time", () => {
      let counter = 0;
      class MyRef extends Refs.ref(() => ++counter) {}
      expect(MyRef.defaultValue()).toBe(1);
      expect(MyRef.defaultValue()).toBe(2);
      expect(MyRef.defaultValue()).toBe(3);
    });
  });

  describe("getRef (via iteration)", () => {
    it("should return default value when ref is not set", () => {
      class MyRef extends Refs.ref(() => 42) {}
      const result = runWithRefs(MyRef);
      expect(result).toBe(42);
    });

    it("should return set value instead of default", () => {
      class MyRef extends Refs.ref(() => 42) {}
      const program = Nano.make(function* () {
        yield* MyRef.set(100);
        return yield* MyRef;
      });
      const result = runWithRefs(program);
      expect(result).toBe(100);
    });

    it("should maintain separate values for different refs", () => {
      class Ref1 extends Refs.ref(() => "a") {}
      class Ref2 extends Refs.ref(() => "b") {}
      const program = Nano.make(function* () {
        yield* Ref1.set("x");
        yield* Ref2.set("y");
        const r1 = yield* Ref1;
        const r2 = yield* Ref2;
        return [r1, r2] as const;
      });
      const result = runWithRefs(program);
      expect(result).toEqual(["x", "y"]);
    });

    it("should work with multiple refs in sequence", () => {
      class Ref1 extends Refs.ref(() => 0) {}
      class Ref2 extends Refs.ref(() => 0) {}

      const program = Nano.make(function* () {
        yield* Ref1.set(10);
        yield* Ref1;
        yield* Ref2.set(20);
        return yield* Ref2;
      });

      const result = runWithRefs(program);
      expect(result).toBe(20);
    });
  });

  describe("set", () => {
    it("should set a value and return it", () => {
      class MyRef extends Refs.ref(() => 0) {}
      const result = runWithRefs(MyRef.set(42));
      expect(result).toBe(42);
    });

    it("should update the value in subsequent reads", () => {
      class MyRef extends Refs.ref(() => 0) {}
      const program = Nano.make(function* () {
        yield* MyRef.set(42);
        return yield* MyRef;
      });
      const result = runWithRefs(program);
      expect(result).toBe(42);
    });

    it("should overwrite previous values", () => {
      class MyRef extends Refs.ref(() => 0) {}
      const program = Nano.make(function* () {
        yield* MyRef.set(10);
        yield* MyRef.set(20);
        return yield* MyRef;
      });
      const result = runWithRefs(program);
      expect(result).toBe(20);
    });
  });

  describe("update", () => {
    it("should update value using a function", () => {
      class MyRef extends Refs.ref(() => 10) {}
      const program = MyRef.update((x) => x * 2);
      const result = runWithRefs(program);
      expect(result).toBe(20);
    });

    it("should use default value if ref hasn't been set", () => {
      class MyRef extends Refs.ref(() => 5) {}
      const program = MyRef.update((x) => x + 10);
      const result = runWithRefs(program);
      expect(result).toBe(15);
    });

    it("should use current value if ref has been set", () => {
      class MyRef extends Refs.ref(() => 5) {}
      const program = Nano.make(function* () {
        yield* MyRef.set(100);
        return yield* MyRef.update((x) => x + 1);
      });
      const result = runWithRefs(program);
      expect(result).toBe(101);
    });

    it("should chain multiple updates", () => {
      class MyRef extends Refs.ref(() => 0) {}
      const program = Nano.make(function* () {
        yield* MyRef.update((x) => x + 1);
        yield* MyRef.update((x) => x * 2);
        yield* MyRef.update((x) => x + 10);
        return yield* MyRef;
      });
      const result = runWithRefs(program);
      expect(result).toBe(12); // (0 + 1) * 2 + 10
    });
  });

  describe("modify", () => {
    it("should modify value and return a result", () => {
      class MyRef extends Refs.ref(() => 10) {}
      const program = MyRef.modify((x) => [x * 2, x + 1] as const);
      const result = runWithRefs(program);
      expect(result).toBe(20); // returned value
    });

    it("should update the ref with the new value", () => {
      class MyRef extends Refs.ref(() => 10) {}
      const program = Nano.make(function* () {
        yield* MyRef.modify((x) => [x * 2, x + 1] as const);
        return yield* MyRef;
      });
      const result = runWithRefs(program);
      expect(result).toBe(11); // updated value
    });

    it("should use default value if ref hasn't been set", () => {
      class MyRef extends Refs.ref(() => 5) {}
      const program = MyRef.modify((x) => [`result-${x}`, x * 2] as const);
      const result = runWithRefs(program);
      expect(result).toBe("result-5");
    });

    it("should use current value if ref has been set", () => {
      class MyRef extends Refs.ref(() => 5) {}
      const program = Nano.make(function* () {
        yield* MyRef.set(100);
        const str = yield* MyRef.modify((x) => [x.toString(), x + 1] as const);
        const val = yield* MyRef;
        return [val, str] as const;
      });
      const result = runWithRefs(program);
      expect(result).toEqual([101, "100"]);
    });
  });

  describe("locally", () => {
    it("should temporarily override ref value", () => {
      class MyRef extends Refs.ref(() => 0) {}
      const program = Nano.make(function* () {
        yield* MyRef.set(100);
        return yield* MyRef.pipe(MyRef.locally(200));
      });
      const result = runWithRefs(program);
      expect(result).toBe(200);
    });

    it("should restore original value after locally", () => {
      class MyRef extends Refs.ref(() => 0) {}
      const program = Nano.make(function* () {
        yield* MyRef.set(100);
        yield* Nano.of(undefined).pipe(MyRef.locally(200));
        return yield* MyRef;
      });
      const result = runWithRefs(program);
      expect(result).toBe(100);
    });

    it("should work with default value if ref hasn't been set", () => {
      class MyRef extends Refs.ref(() => 42) {}
      const program = MyRef.pipe(MyRef.locally(100));
      const result = runWithRefs(program);
      expect(result).toBe(100);
    });

    it("should allow nested local scopes", () => {
      class MyRef extends Refs.ref(() => 0) {}
      const program = Nano.make(function* () {
        yield* MyRef.set(10);
        return yield* MyRef.pipe(MyRef.locally(30), MyRef.locally(20));
      });
      const result = runWithRefs(program);
      expect(result).toBe(30);
    });

    it("should restore outer local value after inner scope", () => {
      class MyRef extends Refs.ref(() => 0) {}
      const program = Nano.make(function* () {
        yield* MyRef.set(10);
        return yield* Nano.make(function* () {
          yield* Nano.of(undefined).pipe(MyRef.locally(30));
          return yield* MyRef;
        }).pipe(MyRef.locally(20));
      });
      const result = runWithRefs(program);
      expect(result).toBe(20);
    });
  });

  describe("withRefs", () => {
    it("should provide empty refs environment", () => {
      class MyRef extends Refs.ref(() => 42) {}
      const result = runWithRefs(MyRef);
      expect(result).toBe(42);
    });

    it("should allow setting and reading refs", () => {
      class MyRef extends Refs.ref(() => 0) {}
      const program = Nano.make(function* () {
        yield* MyRef.set(100);
        return yield* MyRef;
      });
      const result = runWithRefs(program);
      expect(result).toBe(100);
    });

    it("should work with multiple refs", () => {
      class Ref1 extends Refs.ref(() => "a") {}
      class Ref2 extends Refs.ref(() => "b") {}
      const program = Nano.make(function* () {
        yield* Ref1.set("x");
        yield* Ref2.set("y");
        const r1 = yield* Ref1;
        const r2 = yield* Ref2;
        return `${r1}-${r2}`;
      });
      const result = runWithRefs(program);
      expect(result).toBe("x-y");
    });
  });

  describe("integration", () => {
    it("should work with complex ref operations", () => {
      class Counter extends Refs.ref(() => 0) {}
      class Multiplier extends Refs.ref(() => 1) {}

      const program = Nano.make(function* () {
        yield* Counter.set(5);
        yield* Multiplier.set(3);
        const mult = yield* Multiplier;
        const result = yield* Counter.modify((c) => [c * mult, c + 1] as const);
        const c = yield* Counter;
        return { counter: c, result };
      });

      const finalResult = runWithRefs(program);
      expect(finalResult.counter).toBe(6);
      expect(finalResult.result).toBe(15);
    });

    it("should handle refs in different scopes", () => {
      class GlobalRef extends Refs.ref(() => "global") {}
      const program = Nano.make(function* () {
        yield* GlobalRef.set("outer");
        const innerVal = yield* GlobalRef.pipe(GlobalRef.locally("inner"));
        const outerVal = yield* GlobalRef;
        return { outer: outerVal, inner: innerVal };
      });

      const result = runWithRefs(program);
      expect(result.outer).toBe("outer");
      expect(result.inner).toBe("inner");
    });
  });
});
