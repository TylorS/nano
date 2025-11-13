import { describe, it, expectTypeOf } from "vitest";
import * as Unify from "./Unify.js";
import type { Success, Failure } from "./Result.js";
import type { GetEnv } from "./Env.js";
import type { Arg0, TypeLambda1 } from "hkt-core";
import { variant } from "./Variant.js";

describe("Unify", () => {
  describe("Built-in types", () => {
    describe("Success", () => {
      it("should unify Success<string> to Success<string>", () => {
        expectTypeOf<Unify.Unify<Success<string>>>().toExtend<
          Success<string>
        >();
        expectTypeOf<Success<string>>().toExtend<
          Unify.Unify<Success<string>>
        >();
      });

      it("should unify Success<number> to Success<number>", () => {
        expectTypeOf<Unify.Unify<Success<number>>>().toExtend<
          Success<number>
        >();
        expectTypeOf<Success<number>>().toExtend<
          Unify.Unify<Success<number>>
        >();
      });

      it("should unify nested Success types", () => {
        expectTypeOf<Unify.Unify<Success<Success<string>>>>().toExtend<
          Success<Success<string>>
        >();
        expectTypeOf<Success<Success<string>>>().toExtend<
          Unify.Unify<Success<Success<string>>>
        >();
      });

      it("should unify union of Success types", () => {
        // Unify merges the type parameters: Success<string | number>
        expectTypeOf<Unify.Unify<Success<string> | Success<number>>>().toExtend<
          Success<string | number>
        >();
        expectTypeOf<Success<string | number>>().toExtend<
          Unify.Unify<Success<string> | Success<number>>
        >();
      });
    });

    describe("Failure", () => {
      it("should unify Failure<string> to Failure<string>", () => {
        expectTypeOf<Unify.Unify<Failure<string>>>().toExtend<
          Failure<string>
        >();
        expectTypeOf<Failure<string>>().toExtend<
          Unify.Unify<Failure<string>>
        >();
      });

      it("should unify Failure<Error> to Failure<Error>", () => {
        expectTypeOf<Unify.Unify<Failure<Error>>>().toExtend<Failure<Error>>();
        expectTypeOf<Failure<Error>>().toExtend<Unify.Unify<Failure<Error>>>();
      });

      it("should unify nested Failure types", () => {
        expectTypeOf<Unify.Unify<Failure<Failure<string>>>>().toExtend<
          Failure<Failure<string>>
        >();
        expectTypeOf<Failure<Failure<string>>>().toExtend<
          Unify.Unify<Failure<Failure<string>>>
        >();
      });

      it("should unify union of Failure types", () => {
        // Unify merges the type parameters: Failure<string | number>
        expectTypeOf<Unify.Unify<Failure<string> | Failure<number>>>().toExtend<
          Failure<string | number>
        >();
        expectTypeOf<Failure<string | number>>().toExtend<
          Unify.Unify<Failure<string> | Failure<number>>
        >();
      });
    });

    describe("GetEnv", () => {
      it("should unify GetEnv<string> to GetEnv<string>", () => {
        expectTypeOf<Unify.Unify<GetEnv<string>>>().toExtend<GetEnv<string>>();
        expectTypeOf<GetEnv<string>>().toExtend<Unify.Unify<GetEnv<string>>>();
      });

      it("should unify GetEnv<number> to GetEnv<number>", () => {
        expectTypeOf<Unify.Unify<GetEnv<number>>>().toExtend<GetEnv<number>>();
        expectTypeOf<GetEnv<number>>().toExtend<Unify.Unify<GetEnv<number>>>();
      });

      it("should unify nested GetEnv types", () => {
        expectTypeOf<Unify.Unify<GetEnv<GetEnv<string>>>>().toExtend<
          GetEnv<GetEnv<string>>
        >();
        expectTypeOf<GetEnv<GetEnv<string>>>().toExtend<
          Unify.Unify<GetEnv<GetEnv<string>>>
        >();
      });

      it("should unify union of GetEnv types", () => {
        // Unify merges the type parameters: GetEnv<string | number>
        expectTypeOf<Unify.Unify<GetEnv<string> | GetEnv<number>>>().toExtend<
          GetEnv<string | number>
        >();
        expectTypeOf<GetEnv<string | number>>().toExtend<
          Unify.Unify<GetEnv<string> | GetEnv<number>>
        >();
      });
    });

    describe("Mixed built-in types", () => {
      it("should unify union of Success and Failure", () => {
        expectTypeOf<Unify.Unify<Success<string> | Failure<Error>>>().toExtend<
          Success<string> | Failure<Error>
        >();
        expectTypeOf<Success<string> | Failure<Error>>().toExtend<
          Unify.Unify<Success<string> | Failure<Error>>
        >();
      });

      it("should unify union of Success and GetEnv", () => {
        expectTypeOf<Unify.Unify<Success<number> | GetEnv<string>>>().toExtend<
          Success<number> | GetEnv<string>
        >();
        expectTypeOf<Success<number> | GetEnv<string>>().toExtend<
          Unify.Unify<Success<number> | GetEnv<string>>
        >();
      });

      it("should unify union of Failure and GetEnv", () => {
        expectTypeOf<Unify.Unify<Failure<string> | GetEnv<number>>>().toExtend<
          Failure<string> | GetEnv<number>
        >();
        expectTypeOf<Failure<string> | GetEnv<number>>().toExtend<
          Unify.Unify<Failure<string> | GetEnv<number>>
        >();
      });

      it("should unify union of all three built-in types", () => {
        expectTypeOf<
          Unify.Unify<Success<string> | Failure<Error> | GetEnv<number>>
        >().toExtend<Success<string> | Failure<Error> | GetEnv<number>>();
        expectTypeOf<
          Success<string> | Failure<Error> | GetEnv<number>
        >().toExtend<
          Unify.Unify<Success<string> | Failure<Error> | GetEnv<number>>
        >();
      });
    });
  });

  describe("Non-unifiable types", () => {
    it("should leave primitives unchanged", () => {
      expectTypeOf<Unify.Unify<string>>().toExtend<string>();
      expectTypeOf<string>().toExtend<Unify.Unify<string>>();
    });

    it("should leave numbers unchanged", () => {
      expectTypeOf<Unify.Unify<number>>().toExtend<number>();
      expectTypeOf<number>().toExtend<Unify.Unify<number>>();
    });

    it("should leave booleans unchanged", () => {
      expectTypeOf<Unify.Unify<boolean>>().toExtend<boolean>();
      expectTypeOf<boolean>().toExtend<Unify.Unify<boolean>>();
    });

    it("should leave null unchanged", () => {
      expectTypeOf<Unify.Unify<null>>().toExtend<null>();
      expectTypeOf<null>().toExtend<Unify.Unify<null>>();
    });

    it("should leave undefined unchanged", () => {
      expectTypeOf<Unify.Unify<undefined>>().toExtend<undefined>();
      expectTypeOf<undefined>().toExtend<Unify.Unify<undefined>>();
    });

    it("should leave plain objects unchanged", () => {
      expectTypeOf<Unify.Unify<{ a: string; b: number }>>().toExtend<{
        a: string;
        b: number;
      }>();
      expectTypeOf<{ a: string; b: number }>().toExtend<
        Unify.Unify<{ a: string; b: number }>
      >();
    });

    it("should leave arrays unchanged", () => {
      expectTypeOf<Unify.Unify<string[]>>().toExtend<string[]>();
      expectTypeOf<string[]>().toExtend<Unify.Unify<string[]>>();
    });

    it("should leave tuples unchanged", () => {
      expectTypeOf<Unify.Unify<[string, number]>>().toExtend<
        [string, number]
      >();
      expectTypeOf<[string, number]>().toExtend<
        Unify.Unify<[string, number]>
      >();
    });

    it("should leave functions unchanged", () => {
      expectTypeOf<Unify.Unify<(x: string) => number>>().toExtend<
        (x: string) => number
      >();
      expectTypeOf<(x: string) => number>().toExtend<
        Unify.Unify<(x: string) => number>
      >();
    });

    it("should leave unions of primitives unchanged", () => {
      expectTypeOf<Unify.Unify<string | number>>().toExtend<string | number>();
      expectTypeOf<string | number>().toExtend<Unify.Unify<string | number>>();
    });
  });

  describe("Mixed unifiable and non-unifiable types", () => {
    it("should unify Success in union with primitives", () => {
      expectTypeOf<Unify.Unify<Success<string> | number>>().toExtend<
        Success<string> | number
      >();
    });

    it("should unify Failure in union with primitives", () => {
      expectTypeOf<Unify.Unify<Failure<Error> | string>>().toExtend<
        Failure<Error> | string
      >();
    });

    it("should unify GetEnv in union with primitives", () => {
      expectTypeOf<Unify.Unify<GetEnv<number> | boolean>>().toExtend<
        GetEnv<number> | boolean
      >();
    });

    it("should unify multiple unifiable types with primitives", () => {
      expectTypeOf<
        Unify.Unify<Success<string> | Failure<Error> | number | string>
      >().toExtend<Success<string> | Failure<Error> | number | string>();
    });
  });

  describe("Custom unifiable types", () => {
    class CustomSuccess<A> extends variant("CustomSuccess") {
      constructor(readonly value: A) {
        super();
      }
      [Unify.unifySymbol]?: Unify;
    }

    interface Unify extends Unify.Lambdas {
      make: Make;
      get: Get;
    }

    interface Make extends TypeLambda1 {
      return: CustomSuccess<Arg0<this>>;
    }

    interface Get extends TypeLambda1 {
      return: Arg0<this> extends CustomSuccess<infer A> ? [A] : never;
    }

    it("should unify custom Success type", () => {
      expectTypeOf<Unify.Unify<CustomSuccess<string>>>().toExtend<
        CustomSuccess<string>
      >();
      expectTypeOf<CustomSuccess<string>>().toExtend<
        Unify.Unify<CustomSuccess<string>>
      >();
    });

    it("should unify custom Success with different type parameters", () => {
      expectTypeOf<Unify.Unify<CustomSuccess<number>>>().toExtend<
        CustomSuccess<number>
      >();
      expectTypeOf<CustomSuccess<number>>().toExtend<
        Unify.Unify<CustomSuccess<number>>
      >();
    });

    it("should unify union of custom Success types", () => {
      // Unify merges the type parameters: CustomSuccess<string | number>
      expectTypeOf<
        Unify.Unify<CustomSuccess<string> | CustomSuccess<number>>
      >().toExtend<CustomSuccess<string | number>>();
      expectTypeOf<CustomSuccess<string | number>>().toExtend<
        Unify.Unify<CustomSuccess<string> | CustomSuccess<number>>
      >();
    });

    it("should unify custom Success with built-in Success", () => {
      expectTypeOf<
        Unify.Unify<CustomSuccess<string> | Success<number>>
      >().toExtend<CustomSuccess<string> | Success<number>>();
    });
  });

  describe("Nested structures", () => {
    it("should unify Success containing Success", () => {
      expectTypeOf<Unify.Unify<Success<Success<string>>>>().toExtend<
        Success<Success<string>>
      >();
      expectTypeOf<Success<Success<string>>>().toExtend<
        Unify.Unify<Success<Success<string>>>
      >();
    });

    it("should unify Success containing Failure", () => {
      expectTypeOf<Unify.Unify<Success<Failure<string>>>>().toExtend<
        Success<Failure<string>>
      >();
      expectTypeOf<Success<Failure<string>>>().toExtend<
        Unify.Unify<Success<Failure<string>>>
      >();
    });

    it("should unify Failure containing Success", () => {
      expectTypeOf<Unify.Unify<Failure<Success<string>>>>().toExtend<
        Failure<Success<string>>
      >();
      expectTypeOf<Failure<Success<string>>>().toExtend<
        Unify.Unify<Failure<Success<string>>>
      >();
    });

    it("should unify GetEnv containing Success", () => {
      expectTypeOf<Unify.Unify<GetEnv<Success<string>>>>().toExtend<
        GetEnv<Success<string>>
      >();
      expectTypeOf<GetEnv<Success<string>>>().toExtend<
        Unify.Unify<GetEnv<Success<string>>>
      >();
    });

    it("should unify complex nested structures", () => {
      expectTypeOf<
        Unify.Unify<Success<Failure<GetEnv<string>>> | Failure<Success<number>>>
      >().toExtend<
        Success<Failure<GetEnv<string>>> | Failure<Success<number>>
      >();
      expectTypeOf<
        Success<Failure<GetEnv<string>>> | Failure<Success<number>>
      >().toExtend<
        Unify.Unify<Success<Failure<GetEnv<string>>> | Failure<Success<number>>>
      >();
    });
  });

  describe("Edge cases", () => {
    it("should handle never type", () => {
      expectTypeOf<Unify.Unify<never>>().toExtend<never>();
      expectTypeOf<never>().toExtend<Unify.Unify<never>>();
    });

    it("should handle any type", () => {
      // any is special - just verify it compiles
      type Test = Unify.Unify<any>;
      expectTypeOf<Test>().toBeAny();
    });

    it("should handle unknown type", () => {
      expectTypeOf<Unify.Unify<unknown>>().toExtend<unknown>();
      expectTypeOf<unknown>().toExtend<Unify.Unify<unknown>>();
    });

    it("should handle empty union", () => {
      expectTypeOf<Unify.Unify<never>>().toExtend<never>();
      expectTypeOf<never>().toExtend<Unify.Unify<never>>();
    });

    it("should handle union with never", () => {
      // never is eliminated from unions
      expectTypeOf<Unify.Unify<Success<string> | never>>().toExtend<
        Success<string>
      >();
      expectTypeOf<Success<string>>().toExtend<
        Unify.Unify<Success<string> | never>
      >();
    });
  });

  describe("Function types", () => {
    it("should unify function return type with Success", () => {
      type Fn = () => Success<string>;
      expectTypeOf<Unify.Unify<ReturnType<Fn>>>().toExtend<Success<string>>();
      expectTypeOf<Success<string>>().toExtend<Unify.Unify<ReturnType<Fn>>>();
    });

    it("should unify function return type with Failure", () => {
      type Fn = () => Failure<Error>;
      expectTypeOf<Unify.Unify<ReturnType<Fn>>>().toExtend<Failure<Error>>();
      expectTypeOf<Failure<Error>>().toExtend<Unify.Unify<ReturnType<Fn>>>();
    });

    it("should unify function return type union", () => {
      type Fn = () => Success<string> | Failure<Error>;
      expectTypeOf<Unify.Unify<ReturnType<Fn>>>().toExtend<
        Success<string> | Failure<Error>
      >();
      expectTypeOf<Success<string> | Failure<Error>>().toExtend<
        Unify.Unify<ReturnType<Fn>>
      >();
    });
  });

  describe("Generic constraints", () => {
    it("should preserve generic constraints in Success", () => {
      type Test<T extends string> = Unify.Unify<Success<T>>;
      type Expected<T extends string> = Success<T>;
      expectTypeOf<Test<"hello">>().toExtend<Expected<"hello">>();
      expectTypeOf<Expected<"hello">>().toExtend<Test<"hello">>();
    });

    it("should preserve generic constraints in Failure", () => {
      type Test<T extends Error> = Unify.Unify<Failure<T>>;
      type Expected<T extends Error> = Failure<T>;
      expectTypeOf<Test<Error>>().toExtend<Expected<Error>>();
      expectTypeOf<Expected<Error>>().toExtend<Test<Error>>();
    });

    it("should preserve generic constraints in GetEnv", () => {
      type Test<T extends string | number> = Unify.Unify<GetEnv<T>>;
      type Expected<T extends string | number> = GetEnv<T>;
      expectTypeOf<Test<string>>().toExtend<Expected<string>>();
      expectTypeOf<Expected<string>>().toExtend<Test<string>>();
    });
  });

  describe("Complex real-world scenarios", () => {
    it("should unify Result type (Success | Failure)", () => {
      type Result<A, E> = Success<A> | Failure<E>;
      expectTypeOf<Unify.Unify<Result<string, Error>>>().toExtend<
        Success<string> | Failure<Error>
      >();
      expectTypeOf<Success<string> | Failure<Error>>().toExtend<
        Unify.Unify<Result<string, Error>>
      >();
    });

    it("should unify nested Result types", () => {
      type Result<A, E> = Success<A> | Failure<E>;
      expectTypeOf<
        Unify.Unify<Result<Result<string, Error>, string>>
      >().toExtend<
        Success<Success<string> | Failure<Error>> | Failure<string>
      >();
      expectTypeOf<
        Success<Success<string> | Failure<Error>> | Failure<string>
      >().toExtend<Unify.Unify<Result<Result<string, Error>, string>>>();
    });

    it("should unify complex effect-like type", () => {
      type Effect<A, E, R> = Success<A> | Failure<E> | GetEnv<R>;
      expectTypeOf<Unify.Unify<Effect<string, Error, number>>>().toExtend<
        Success<string> | Failure<Error> | GetEnv<number>
      >();
      expectTypeOf<
        Success<string> | Failure<Error> | GetEnv<number>
      >().toExtend<Unify.Unify<Effect<string, Error, number>>>();
    });

    it("should unify with optional properties", () => {
      type WithOptional = { value: Success<string>; optional?: Failure<Error> };
      expectTypeOf<Unify.Unify<WithOptional["value"]>>().toExtend<
        Success<string>
      >();
      expectTypeOf<Success<string>>().toExtend<
        Unify.Unify<WithOptional["value"]>
      >();
    });

    it("should unify with mapped types", () => {
      type Mapped = {
        [K in "a" | "b"]: Success<K>;
      };
      expectTypeOf<Unify.Unify<Mapped["a"]>>().toExtend<Success<"a">>();
      expectTypeOf<Success<"a">>().toExtend<Unify.Unify<Mapped["a"]>>();
    });
  });
});
