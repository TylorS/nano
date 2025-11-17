# @typed/nano

Small DSLs and interpreter utilities built on iterators and effects with powerful type inference via hkt-core.

## Features

- **Nano** - Composable iterator-based control flow
- **Effect System** - Type-safe effects with hkt-core integration for automatic return type inference
- **Generic Effects** - Effects with generic type parameters using TypeLambdaG
- **Failure Handling** - Integrated error handling with unification
- **Type Unification** - Automatic type-level simplification of unions

## Installation

```bash
npm install @typed/nano
# or
yarn add @typed/nano
# or
pnpm add @typed/nano
```

## Usage

```typescript
import * as Nano from "@typed/nano";
```

## API

### Nano

The core composable iterator type. A `Nano<Y, R>` yields values of type `Y` and returns `R`.

#### `Nano<Y, R>`

Interface representing a composable iterator.

```typescript
interface Nano<out Y, out R> extends Pipeable {
  [Symbol.iterator](): Iterator<Y, R>;
}
```

#### `Nano.make`

Create a Nano from a generator function.

```typescript
const program = Nano.make(function* () {
  const x = yield* Nano.of(10);
  const y = yield* Nano.of(20);
  return x + y;
});

const result = Nano.run(program); // 30
```

#### `Nano.of`

Create a pure Nano that immediately returns a value (no yields).

```typescript
const pure = Nano.of(42);
const result = Nano.run(pure); // 42
```

#### `Nano.map`

Transform the return value of a Nano.

```typescript
const program = Nano.of(5).pipe(
  Nano.map((x) => x * 2)
);
const result = Nano.run(program); // 10
```

#### `Nano.mapInput`

Transform the yield values of a Nano.

```typescript
const program = Nano.make(function* () {
  const value = yield* someEffect;
  return value;
}).pipe(
  Nano.mapInput((effect) => transformEffect(effect))
);
```

#### `Nano.flatMap`

Chain Nanos by transforming the return value into another Nano.

```typescript
const program = Nano.of(5).pipe(
  Nano.flatMap((x) => Nano.of(x * 2))
);
const result = Nano.run(program); // 10
```

#### `Nano.flatMapInput`

Chain Nanos by transforming yield values into other Nanos.

```typescript
const program = nano.pipe(
  Nano.flatMapInput((effect) => {
    if (isSomething(effect)) {
      return handleEffect(effect);
    }
    return Nano.yield(effect);
  })
);
```

#### `Nano.mapBoth`

Transform both yield and return values.

```typescript
const program = Nano.make(function* () {
  const value = yield* someEffect;
  return value;
}).pipe(
  Nano.mapBoth(
    (effect) => transformEffect(effect),
    (value) => transformValue(value)
  )
);
```

#### `Nano.run`

Execute a Nano to completion (requires `Nano<never, R>`).

```typescript
const program = Nano.of(42);
const result = Nano.run(program); // 42
```

#### `Nano.fromIterator`

Low-level function to create a Nano from an iterator function. Identical to `Nano.make` but avoids unification.

```typescript
const nano = Nano.fromIterator(() => Nano.Iterator.success(42));
```

---

### Effect

Type-safe effects with automatic return type inference using hkt-core.

#### `Effect<Tag, Args>`

An effect represents a yieldable computation that accepts arguments and uses hkt-core for return type inference.

```typescript
interface Effect<Tag extends string, Args extends unknown[]>
  extends TypeLambda, Pipeable {
  readonly _tag: Tag;
  readonly args: Args;
  [Symbol.iterator](): Iterator<this, ApplyW<this, this["args"]>>;
}
```

#### Creating Effects

Use `Effect(tag)` to create an effect constructor:

```typescript
class Log extends Effect("Log")<unknown[]> {
  declare return: void;
}

const log = (...args: readonly unknown[]) => new Log(args);
```

Effects implement `TypeLambda` from hkt-core, so you can use `declare return` to specify the return type based on the arguments:

```typescript
import type { N } from "ts-toolbelt";

class Add<A extends number, B extends number> extends Effect("Add")<[a: A, b: B]> {
  declare return: N.Add<Arg0<this>, Arg1<this>>;
}
```

#### Generic Effects

For effects that need generic type parameters, use `EffectG`:

```typescript
/** Define the generic effect, specifying the type parameters */
class Split extends Nano.EffectG<["Y", "R"]>()("Split") {
  declare signature: (
    /* Define our parameters using TArg for generics */
    ...args: [Nano.Nano<Nano.TArg<this, "Y">, Nano.TArg<this, "R">>]
    /* Apply these args to the Split TypeLambda itself */
  ) => Nano.ApplyW<Split, typeof args>;

  /** Construct the return type, by adding Split to the yields */
  declare return: Nano.Nano.AddYield<Nano.Arg0<this>, Split>;
}


// Use the .make method for proper type inference
const result: Nano.Nano<Split, number> = Nano.flatten(Split.make(Nano.of(42)));
```

Generic effects use hkt-core's `TypeLambdaG` abstraction, allowing you to:
- Declare type parameters with `["Param1", "Param2"]`
- Use `TArg<this, "ParamName">` to reference type parameters
- Use `Arg0<this>`, `Arg1<this>`, etc. to reference arguments
- Get automatic type inference via the `make` static method

---

### Failure

Error handling with unification support.

#### `Failure<E>`

Represents a failure with an error value.

```typescript
class Failure<E> extends Effect("Failure")<[error: E]> {
  declare return: never;
}
```

#### `failure`

Create a failure value.

```typescript
const error = Nano.failure("Something went wrong");
```

#### `catchFailure`

Handle failures in a Nano by transforming them.

```typescript
const program = Nano.make(function* () {
  yield* Nano.failure("error");
  return 42;
});

const handled = Nano.catchFailure(program, (error) => {
  console.error(error.error);
  return Nano.of(0);
});

const result = Nano.run(handled); // 0
```

#### Failure Unification

Failures automatically unify when in unions:

```typescript
type Unified = Unify<Failure<string> | Failure<number>>;
// Unified = Failure<string | number>
```

---

### Error

Create custom error classes that integrate with the Failure system.

#### `error`

Create an error constructor that yields as a Failure.

```typescript
export class DatabaseError extends Nano.error<"DatabaseError">()("DatabaseError") {}

const program = Nano.make(function* () {
  yield* new DatabaseError("Connection failed");
  return 42;
});
```

---

### Unify

Type-level utilities for unifying compatible types in unions.

#### What is Unification?

Unification simplifies unions by merging compatible type parameters. Instead of:
```typescript
Failure<string> | Failure<number> | Failure<boolean>
```

Unification produces:
```typescript
Failure<string | number | boolean>
```

#### `Unify<T>`

The `Unify` type operator processes a type and unifies any unifiable types within it.

```typescript
import type { Unify, Failure } from "@typed/nano";

// Single type - no change
type A = Unify<Failure<string>>;
// A = Failure<string>

// Union of same type - parameters merged
type B = Unify<Failure<string> | Failure<number>>;
// B = Failure<string | number>

// Different unifiable types - remain separate
type C = Unify<Failure<string> | SomeOtherEffect<number>>;
// C = Failure<string> | SomeOtherEffect<number>
```

#### `unify`

The `unify` function applies unification to function return types.

```typescript
import { unify } from "@typed/nano";

const getValue = (x: boolean) => 
  x ? Nano.failure("error") : Nano.failure(42);

const unified = unify(getValue);
// unified: (x: boolean) => Failure<string | number>
```

#### Implementing the Unify Protocol

To make your own types unifiable, implement the unify protocol:

```typescript
import * as Nano from "@typed/nano";
import type { Arg0, TypeLambda1 } from "hkt-core";

class MyType<A> {
  constructor(readonly value: A) {}
  
  // Mark as unifiable
  [unifySymbol]?: MyType.Unify;
}

declare namespace MyType {
  /** Implement the Unify protocol for MyType */
  export interface Unify extends Nano.Unification {
    make: Make;
    get: Get;
  }

  /** Construct a MyType from a value */
  export interface Make extends TypeLambda1 {
    return: MyType<Arg0<this>>;
  }

  /** 
   * Get the type parameter from an instance of MyType. 
   * Passed along directly to Make. 
   */
  export interface Get extends TypeLambda1 {
    return: Arg0<this> extends MyType<infer A> ? [A] : never;
  }

  // Derive other helpful type functions for iterator yields
  export type Extract<Y> = Nano.Extract<MyType.Unify, Y>;
  export type Exclude<Y> = Nano.Exclude<MyType.Unify, Y>;
}

// Now MyType can be unified
type Unified = Unify<MyType<string> | MyType<number>>;
// Unified = MyType<string | number>
```

---

### Iterator

Low-level iterator utilities (use with caution - iterators are mutable).

#### `Iterator.once`

Create an iterator that yields once then returns.

```typescript
const iter = Nano.Iterator.once<string>()(42);
console.log(iter.next()); // { value: 42, done: false }
console.log(iter.next("hello")); // { value: "hello", done: true }
```

#### `Iterator.success`

Create an iterator that immediately returns.

```typescript
const iter = Nano.Iterator.success(42);
console.log(iter.next()); // { value: 42, done: true }
```

#### `Iterator.map`

Map the return value of an iterator.

```typescript
const mapped = Nano.Iterator.map(iter, (x) => x * 2);
```

#### `Iterator.mapInput`

Map the yield values of an iterator.

```typescript
const mapped = Nano.Iterator.mapInput(iter, (y) => transform(y));
```

#### `Iterator.flatMap`

FlatMap the return value of an iterator.

```typescript
const flatMapped = Nano.Iterator.flatMap(iter, (x) => otherIter(x));
```

#### `Iterator.flatMapInput`

FlatMap the yield values of an iterator.

```typescript
const flatMapped = Nano.Iterator.flatMapInput(iter, (y) => otherIter(y));
```

#### `Iterator.mapBoth`

Map both yield and return values.

```typescript
const mapped = Nano.Iterator.mapBoth(iter, 
  (y) => transformYield(y),
  (r) => transformReturn(r)
);
```

#### `Iterator.get`

Get the iterator from an iterable.

```typescript
const iterator = Nano.Iterator.get(nano);
```

---

## Examples

### Building an Effect System

```typescript
// Define effects
class Log extends Nano.Effect("Log")<[message: string]> {
  declare return: void;
}

class ReadFile extends Nano.Effect("ReadFile")<[path: string]> {
  declare return: string;
}

class WriteFile extends Nano.Effect("WriteFile")<
  [path: string, content: string]
> {
  declare return: void;
}

// Helper functions
const log = (message: string) => new Log(message);
const readFile = (path: string) => new ReadFile(path);
const writeFile = (path: string, content: string) =>
  new WriteFile(path, content);

// Build a program
const program = Nano.make(function* () {
  yield* log("Reading file...");
  const content = yield* readFile("input.txt");
  yield* log("Writing file...");
  yield* writeFile("output.txt", content.toUpperCase());
  yield* log("Done!");
  return content.length;
});

type MyYield = Log | ReadFile | WriteFile;

// Implement an interpreter
const runProgram = (program: Nano.Nano<MyYield, number>) =>
  Nano.flatMapInput(program, (effect) => {
    if (Log.is(effect)) return Nano.sync(() => console.log(...effect.args));
    if (WriteFile.is(effect)) return Nano.sync(() => fs.writeFileSync(...effect.args))
    if (ReadFile.is(effect)) return Nano.sync(() => fs.readFileSync(...effect.args, 'utf-8'))
    throw new Error(`Unknown effect: ${effect}`);
  });

const result = runProgram(program);
console.log(result); // File content length

```

### Generic Effects

```typescript
import * as Nano from "@typed/nano";
import type { TArg, Arg0, Call1W } from "hkt-core";

// Generic effect that works with any Nano type
class Split extends Nano.EffectG<["Y", "R"]>()("Split") {
  declare signature: (
    nano: Nano.Nano<TArg<this, "Y">, TArg<this, "R">>
  ) => Call1W<Split, typeof nano>;
  declare return: Nano.Nano.AddYield<Arg0<this>, Split>;
}

// Use with proper type inference
const program = Nano.make(function* () {
  const result = yield* Split.make(Nano.of(42));
  return result;
});
```
