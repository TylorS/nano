import { describe, expect, it } from "vitest";
import {
  flatMap,
  flatMapYield,
  map,
  mapBoth,
  mapYield,
  once,
  success,
} from "./Iterator.js";

describe("once", () => {
  it("should yield the value once, then use next(x) as return", () => {
    const iter = once<string>()(42);
    const result1 = iter.next();
    expect(result1.done).toBe(false);
    expect(result1.value).toBe(42);

    const result2 = iter.next("returned");
    expect(result2.done).toBe(true);
    expect(result2.value).toBe("returned");
  });

  it("should only yield once even if next is called multiple times", () => {
    const iter = once<string>()("hello");
    expect(iter.next()).toEqual({ done: false, value: "hello" });
    expect(iter.next("a")).toEqual({ done: true, value: "a" });
    expect(iter.next("b")).toEqual({ done: true, value: "b" });
  });
});

describe("success", () => {
  it("should immediately return the value without yielding", () => {
    const iter = success(100);
    const result = iter.next();
    expect(result.done).toBe(true);
    expect(result.value).toBe(100);
  });

  it("should always return the same value", () => {
    const iter = success("done");
    expect(iter.next()).toEqual({ done: true, value: "done" });
    expect(iter.next()).toEqual({ done: true, value: "done" });
  });
});

describe("map", () => {
  it("should map the return value", () => {
    const source = once<number>()(1);
    const mapped = map(source, (x: number) => x * 2);

    const result1 = mapped.next();
    expect(result1.done).toBe(false);
    expect(result1.value).toBe(1);

    const result2 = mapped.next(5);
    expect(result2.done).toBe(true);
    expect(result2.value).toBe(10);
  });

  it("should preserve yield values", () => {
    const source = once<string>()("yield");
    const mapped = map(source, (x: string) => x.length);

    const result1 = mapped.next();
    expect(result1.done).toBe(false);
    expect(result1.value).toBe("yield");
  });

  it("should compose with other map iterators", () => {
    const source = once<number>()(1);
    const mapped1 = map(source, (x: number) => x * 2);
    const mapped2 = map(mapped1, (x: number) => x + 1);

    mapped2.next();
    const result = mapped2.next(5);
    expect(result.done).toBe(true);
    expect(result.value).toBe(11); // (5 * 2) + 1
  });

  it("should handle throw if source supports it", () => {
    let thrown = false;
    const source: Iterator<never, number> = {
      next() {
        return { done: true, value: 10 };
      },
      throw(_e: unknown) {
        thrown = true;
        return { done: true, value: 20 };
      },
    };

    const mapped = map(source, (x: number) => x * 2);
    if (!mapped.throw) throw new Error("throw should exist");
    const result = mapped.throw(new Error("test"));
    expect(thrown).toBe(true);
    expect(result.done).toBe(true);
    expect(result.value).toBe(40);
  });

  it("should propagate throw if source doesn't support it", () => {
    const source = success(5);
    const mapped = map(source, (x: number) => x * 2);
    if (!mapped.throw) {
      expect.fail("throw should exist");
      return;
    }
    expect(() => mapped.throw?.(new Error("test"))).toThrow("test");
  });
});

describe("mapInput", () => {
  it("should map yield values", () => {
    const source = once<number>()(1);
    const mapped = mapYield(source, (x: number) => x * 2);

    const result1 = mapped.next();
    expect(result1.done).toBe(false);
    expect(result1.value).toBe(2);

    const result2 = mapped.next(10);
    expect(result2.done).toBe(true);
    expect(result2.value).toBe(10);
  });

  it("should preserve return values", () => {
    const source = once<number>()(5);
    const mapped = mapYield(source, (x: number) => x.toString());

    mapped.next();
    const result = mapped.next(42);
    expect(result.done).toBe(true);
    expect(result.value).toBe(42);
  });

  it("should compose with other mapInput iterators", () => {
    const source = once<number>()(1);
    const mapped1 = mapYield(source, (x: number) => x * 2);
    const mapped2 = mapYield(mapped1, (x: number) => x + 1);

    const result = mapped2.next();
    expect(result.done).toBe(false);
    expect(result.value).toBe(3); // (1 * 2) + 1
  });

  it("should handle throw if source supports it", () => {
    let thrown = false;
    const source: Iterator<number, never> = {
      next() {
        return { done: false, value: 10 };
      },
      throw(_e: unknown) {
        thrown = true;
        return { done: false, value: 20 };
      },
    };

    const mapped = mapYield(source, (x: number) => x * 2);
    if (!mapped.throw) throw new Error("throw should exist");
    const result = mapped.throw(new Error("test"));
    expect(thrown).toBe(true);
    expect(result.done).toBe(false);
    expect(result.value).toBe(40);
  });

  it("should handle return if source supports it", () => {
    let returned = false;
    const source: Iterator<number, number> = {
      next() {
        return { done: false, value: 10 };
      },
      return(value: unknown) {
        returned = true;
        return { done: true, value: value as number };
      },
    };

    const mapped = mapYield(source, (x: number) => x * 2);
    if (!mapped.return) throw new Error("return should exist");
    const result = mapped.return(100);
    expect(returned).toBe(true);
    expect(result.done).toBe(true);
    expect(result.value).toBe(100);
  });
});

describe("flatMap", () => {
  it("should flat map return value to a new iterator", () => {
    const source = once<number>()(1);
    const flatMapped = flatMap(source, (x: number) => success(x * 2));

    const result1 = flatMapped.next();
    expect(result1.done).toBe(false);
    expect(result1.value).toBe(1);

    const result2 = flatMapped.next(5);
    expect(result2.done).toBe(true);
    expect(result2.value).toBe(10);
  });

  it("should yield from the new iterator", () => {
    const source = success(1);
    const flatMapped = flatMap(source, (x: number) => once<number>()(x * 2));

    const result1 = flatMapped.next();
    expect(result1.done).toBe(false);
    expect(result1.value).toBe(2);

    const result2 = flatMapped.next(10);
    expect(result2.done).toBe(true);
    expect(result2.value).toBe(10);
  });

  it("should compose with map iterators", () => {
    const source = once<number>()(1);
    const mapped = map(source, (x: number) => x * 2);
    const flatMapped = flatMap(mapped, (x: number) => success(x * 3));

    flatMapped.next();
    const result = flatMapped.next(5);
    expect(result.done).toBe(true);
    expect(result.value).toBe(30); // (5 * 2) * 3
  });

  it("should handle multiple yields from inner iterator", () => {
    function* counter(start: number) {
      yield start;
      yield start + 1;
      return start + 2;
    }

    const source = success(10);
    const flatMapped = flatMap(source, (x: number) => counter(x));

    // The source returns immediately, so we get the inner iterator right away
    const result1 = flatMapped.next();
    expect(result1.done).toBe(false);
    expect(result1.value).toBe(10);

    const result2 = flatMapped.next();
    expect(result2.done).toBe(false);
    expect(result2.value).toBe(11);

    // When inner iterator returns, we get its return value
    const result3 = flatMapped.next();
    expect(result3.done).toBe(true);
    expect(result3.value).toBe(12);
  });

  it("should handle throw on inner iterator", () => {
    const source = once<number>()(1);
    let innerThrown = false;
    const inner: Iterator<never, number> = {
      next() {
        return { done: true, value: 10 };
      },
      throw(_e: unknown) {
        innerThrown = true;
        return { done: true, value: 20 };
      },
    };

    const flatMapped = flatMap(source, () => inner);
    flatMapped.next(); // Advance past the yield
    flatMapped.next(); // Trigger inner iterator creation
    if (!flatMapped.throw) throw new Error("throw should exist");
    const result = flatMapped.throw(new Error("test"));
    expect(innerThrown).toBe(true);
    expect(result.done).toBe(true);
    expect(result.value).toBe(20);
  });

  it("should handle return on inner iterator", () => {
    const source = once<number>()(1);
    let innerReturned = false;
    const inner: Iterator<never, number> = {
      next() {
        return { done: true, value: 10 };
      },
      return(value: unknown) {
        innerReturned = true;
        return { done: true, value: value as number };
      },
    };

    const flatMapped = flatMap(source, () => inner);
    flatMapped.next(); // Advance past the yield
    flatMapped.next(); // Trigger inner iterator creation
    if (!flatMapped.return) throw new Error("return should exist");
    const result = flatMapped.return(100);
    expect(innerReturned).toBe(true);
    expect(result.done).toBe(true);
    expect(result.value).toBe(100);
  });
});

describe("flatMapInput", () => {
  it("should flat map yield values to a new iterator", () => {
    const source = once<number>()(1);
    const flatMapped = flatMapYield(source, (x: number) => success(x * 2));

    const result1 = flatMapped.next();
    expect(result1.done).toBe(true);
    expect(result1.value).toBe(2);
  });

  it("should yield from the new iterator", () => {
    const source = once<number>()(1);
    const flatMapped = flatMapYield(source, (x: number) =>
      once<number>()(x * 2),
    );

    const result1 = flatMapped.next();
    expect(result1.done).toBe(false);
    expect(result1.value).toBe(2);

    const result2 = flatMapped.next(10);
    expect(result2.done).toBe(true);
    expect(result2.value).toBe(10);
  });

  it("should handle multiple yields from inner iterator", () => {
    function* counter(start: number) {
      yield start;
      yield start + 1;
      return start + 2;
    }

    const source = once<number>()(10);
    const flatMapped = flatMapYield(source, (x: number) => counter(x));

    const result1 = flatMapped.next();
    expect(result1.done).toBe(false);
    expect(result1.value).toBe(10);

    const result2 = flatMapped.next();
    expect(result2.done).toBe(false);
    expect(result2.value).toBe(11);

    // When inner iterator returns, outerNext is called with the return value
    // Since outer iterator (once) is already done, this completes
    const result3 = flatMapped.next();
    expect(result3.done).toBe(true);
    expect(result3.value).toBe(12);
  });

  it("should compose with mapInput iterators", () => {
    const source = once<number>()(1);
    const mapped = mapYield(source, (x: number) => x * 2);
    const flatMapped = flatMapYield(mapped, (x: number) =>
      once<number>()(x * 3),
    );

    const result = flatMapped.next();
    expect(result.done).toBe(false);
    expect(result.value).toBe(6); // (1 * 2) * 3
  });

  it("should handle throw on inner iterator", () => {
    const source = once<number>()(1);
    let innerThrown = false;
    let innerCallCount = 0;
    const inner: Iterator<number, number> = {
      next() {
        innerCallCount++;
        if (innerCallCount === 1) return { done: false, value: 10 };
        return { done: true, value: 10 };
      },
      throw(_e: unknown) {
        innerThrown = true;
        return { done: true, value: 20 };
      },
    };

    const flatMapped = flatMapYield(source, () => inner);
    flatMapped.next(); // Trigger inner iterator creation and get first yield
    if (!flatMapped.throw) throw new Error("throw should exist");
    const result = flatMapped.throw(new Error("test"));
    expect(innerThrown).toBe(true);
    expect(result.done).toBe(true);
    expect(result.value).toBe(20);
  });

  it("should handle return on outer iterator", () => {
    let outerReturned = false;
    const source: Iterator<number, number> = {
      next() {
        return { done: false, value: 10 };
      },
      return(value: unknown) {
        outerReturned = true;
        return { done: true, value: value as number };
      },
    };

    const flatMapped = flatMapYield(source, () => once<number>()(1));
    flatMapped.next();
    if (!flatMapped.return) throw new Error("return should exist");
    const result = flatMapped.return(100);
    expect(outerReturned).toBe(true);
    expect(result.done).toBe(true);
    expect(result.value).toBe(100);
  });

  it("should continue with outer iterator after inner completes", () => {
    let callCount = 0;
    const source: Iterator<number, never> = {
      next() {
        callCount++;
        if (callCount === 1) return { done: false, value: 10 };
        if (callCount === 2) return { done: false, value: 20 };
        return { done: false, value: 30 };
      },
    };

    // Use an iterator that yields once then completes
    function* singleYield(value: number) {
      yield value;
      return value * 2;
    }

    const flatMapped = flatMapYield(source, (x: number) => singleYield(x));
    const result1 = flatMapped.next();
    expect(result1.done).toBe(false);
    expect(result1.value).toBe(10);

    // After inner completes, should get next value from outer
    const result2 = flatMapped.next();
    expect(result2.done).toBe(false);
    expect(result2.value).toBe(20);
  });
});

describe("mapBoth", () => {
  it("should map both yield and return values", () => {
    const source = once<number>()(1);
    const mapped = mapBoth(
      source,
      (x: number) => x * 2,
      (x: number) => x * 3,
    );

    const result1 = mapped.next();
    expect(result1.done).toBe(false);
    expect(result1.value).toBe(2);

    const result2 = mapped.next(5);
    expect(result2.done).toBe(true);
    expect(result2.value).toBe(15);
  });

  it("should compose with map iterators", () => {
    const source = once<number>()(1);
    const mapped1 = map(source, (x: number) => x * 2);
    const mapped2 = mapBoth(
      mapped1,
      (x: number) => x,
      (x: number) => x * 3,
    );

    mapped2.next();
    const result = mapped2.next(5);
    expect(result.done).toBe(true);
    expect(result.value).toBe(30); // (5 * 2) * 3
  });

  it("should compose with mapInput iterators", () => {
    const source = once<number>()(1);
    const mapped1 = mapYield(source, (x: number) => x * 2);
    const mapped2 = mapBoth(
      mapped1,
      (x: number) => x * 3,
      (x: number) => x,
    );

    const result = mapped2.next();
    expect(result.done).toBe(false);
    expect(result.value).toBe(6); // (1 * 2) * 3
  });

  it("should compose with other mapBoth iterators", () => {
    const source = once<number>()(1);
    const mapped1 = mapBoth(
      source,
      (x: number) => x * 2,
      (x: number) => x * 3,
    );
    const mapped2 = mapBoth(
      mapped1,
      (x: number) => x + 1,
      (x: number) => x + 2,
    );

    const result1 = mapped2.next();
    expect(result1.done).toBe(false);
    expect(result1.value).toBe(3); // (1 * 2) + 1

    const result2 = mapped2.next(5);
    expect(result2.done).toBe(true);
    expect(result2.value).toBe(17); // ((5 * 3) + 2)
  });

  it("should handle throw if source supports it", () => {
    let thrown = false;
    const source: Iterator<number, number> = {
      next() {
        return { done: true, value: 10 };
      },
      throw(_e: unknown) {
        thrown = true;
        return { done: true, value: 20 };
      },
    };

    const mapped = mapBoth(
      source,
      (x: number) => x,
      (x: number) => x * 2,
    );
    if (!mapped.throw) throw new Error("throw should exist");
    const result = mapped.throw(new Error("test"));
    expect(thrown).toBe(true);
    expect(result.done).toBe(true);
    expect(result.value).toBe(40);
  });

  it("should handle multiple yields", () => {
    function* counter(start: number) {
      yield start;
      yield start + 1;
      return start + 2;
    }

    const mapped = mapBoth(
      counter(10),
      (x: number) => x * 2,
      (x: number) => x * 3,
    );

    const result1 = mapped.next();
    expect(result1.done).toBe(false);
    expect(result1.value).toBe(20);

    const result2 = mapped.next();
    expect(result2.done).toBe(false);
    expect(result2.value).toBe(22);

    const result3 = mapped.next();
    expect(result3.done).toBe(true);
    expect(result3.value).toBe(36); // (10 + 2) * 3
  });
});
