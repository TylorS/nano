# @typed/nano

Small DSLs and interpeter utilities atop of iterators and open variants.

## Features

- **Open variants** - Extensible variant types for building DSLs and effect systems
- **Iterators** - Generator-based composable control flow
- **Effect system primitives** - Error handling, environment, and state management

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

The core iterable type with a pipeable interface. The intent is that you can `yield`
arbitrary effects, likely variants, which an interpreter must handle. 

#### `Nano<Y, R>`

Interface representing a composable iterator that yields `Y` and returns `R`.

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
  // e.g. migrate effects to newer versions
  Nano.mapInput((effect) => {
    if (isV2(effect)) {
      return toV3(effect);
    }
    if (isV1(effect)) {
      return toV2(effect);
    }
    return effect;
  })
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
  Nano.flatMapInput((effect) => Nano.make(function* () {
    // Utilize a type guard to refine the effect type union
    if (isSomething(effect)) { 
      // provide an implementation for the effect
      yield* Console.log(effect.message); 
      // The return value is what will be returned back to the calling Nano
      return
    }
    // otherwise, just yield the effect for somewhere else to handle
    return yield* effect;
  }))
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

Low-level function to create a Nano from an iterator function.

```typescript
const nano = Nano.fromIterator(() => Nano.Iterator.success(42));
```

---

### Variant

Open variant types for extensible type-safe unions.

#### `variant`

Create a variant constructor. Each variant class must extend from its own call to `variant()` with its own unique tag.

```typescript
class Click extends Nano.variant("Click") {}
class Hover extends Nano.variant("Hover") {}
class KeyPress extends Nano.variant("KeyPress") {}

type Action = Click | Hover | KeyPress;
```

#### `match`

Exhaustive pattern matching on variants.

```typescript
const handleAction = (action: Action) => action.pipe(Nano.match({
  Click: (click) => "clicked",
  Hover: (hover) => "hovered",
  KeyPress: (press) => "pressed",
}));

const result = handleAction(new Click()); // "clicked"
```

#### `matchOr`

Partial pattern matching with fallback.

```typescript
const handleAction = (action: Action) => action.pipe(Nano.matchOr(
  {
    Click: (click) => "clicked",
  },
  (other) => "not clicked"
));

const result1 = handleAction(new Click()); // "clicked"
const result2 = handleAction(new Hover()); // "not clicked"
```

---

### Result

Success/Failure types for error handling.

#### `Success<A>`

Represents a successful value.

```typescript
const success = Nano.success(42);
```

#### `Failure<E>`

Represents a failure with an error.

```typescript
const failure = Nano.failure("Something went wrong");
```

#### `Result<A, E>`

Union type of `Success<A> | Failure<E>`.

```typescript
type MyResult = Nano.Result<number, string>;
```

#### `success`

Create a success value.

```typescript
const value = Nano.success(42);
```

#### `failure`

Create a failure value.

```typescript
const error = Nano.failure("Error message");
```

#### `isFailure`

Type guard to check if a value is a failure.

```typescript
const result: Nano.Result<number, string> = someOperation();

if (Nano.isFailure(result)) {
  console.error(result.error);
} else {
  console.log(result.value);
}
```

#### `result`

Convert a Nano to a Result, handling failures in yields.

```typescript
const program = Nano.make(function* () {
  yield* Nano.failure("error");
  return 42;
});

const resultNano = Nano.result(program);
const result = Nano.run(resultNano); // Failure<"error">
```

---

### Env & Tag

Environment/dependency injection system using tags.

#### `Env<R>`

Container for environment services.

```typescript
const env = Nano.Env.empty();
const env2 = Nano.Env.make(tag, service);
```

#### `GetEnv<R>`

Represents a request for an environment service.

```typescript
class Config extends Nano.tag<Config, { apiUrl: string }>("Config") {}

const program = Nano.make(function* () {
  const { apiUrl } = yield* Config;
  return apiUrl;
});
```

#### `tag`

Create an environment tag (extend as a class).

```typescript
class Database extends Nano.tag<Database, { query: (sql: string) => unknown }>("Database") {}

// Usage
const program = Nano.make(function* () {
  const db = yield* Database;
  return db.query("SELECT * FROM users");
});

const env = Database.env({ query: (sql) => [] });
const result = program.pipe(
  Nano.provide(env),
  Nano.withEnv,
  Nano.run
);
```

#### `Env.get`

Get the current environment.

```typescript
const program = Nano.make(function* () {
  const env = yield* Env.get<Config>();
  return env;
});
```

#### `Env.provide`

Provide an environment to a Nano.

```typescript
const env = Config.env({ apiUrl: "https://api.example.com" });
const programWithEnv = Nano.provide(program, env);
```

#### `Env.provideAll`

Provide all required environments to a Nano.

```typescript
const env = Config.env({ apiUrl: "https://api.example.com" });
const programWithAllEnv = Nano.provideAll(program, env);
```

#### `Env.withEnv`

Remove all environment requirements from a Nano.

```typescript
const programWithoutEnv = Nano.withEnv(program);
```

#### `Env.withTag`

Provide a single tag's service to a Nano.

```typescript
const programWithTag = Nano.withTag(Config, { apiUrl: "https://api.example.com" })(program);
```

#### Tag Methods

Tags created with `tag` have the following methods:

##### `Tag.env`

Create an environment from a tag and service.

```typescript
const env = Config.env({ apiUrl: "https://api.example.com" });
```

##### `Tag.with`

Provide a tag's service to a Nano.

```typescript
const programWithTag = Config.with({ apiUrl: "https://api.example.com" })(program);
```

##### `Tag.use`

Use a tag's service within a Nano.

```typescript
const program = Config.use((config) => 
  Nano.of(config.apiUrl)
);
```

##### `Tag.update`

Update a tag's service in a Nano.

```typescript
const program = Config.update(
  existingProgram,
  (config) => ({ ...config, apiUrl: "new-url" })
);
```

### Refs

Mutable references for state management.

#### `Refs`

The environment tag for refs storage.

```typescript
class Counter extends Nano.ref(() => 0) {}
```

#### `ref`

Create a mutable reference.

```typescript
class Counter extends Nano.ref(() => 0) {}

const program = Nano.make(function* () {
  yield* Counter.set(10);
  const value = yield* Counter;
  return value;
});
```

#### `Ref.set`

Set a ref's value.

```typescript
const program = Counter.set(42);
```

#### `Ref.update`

Update a ref's value with a function.

```typescript
const program = Counter.update((x) => x + 1);
```

#### `Ref.modify`

Modify a ref and return a computed value.

```typescript
const program = Counter.modify((x) => [x * 2, x + 1] as const);
// Returns x * 2, sets ref to x + 1
```

#### `Ref.locally`

Temporarily override a ref's value.

```typescript
const program = Nano.make(function* () {
  yield* Counter.set(10);
  const local = yield* Counter.locally(100)(
    Nano.make(function* () {
      return yield* Counter; // 100
    })
  );
  const after = yield* Counter; // 10
  return [local, after];
});
```

#### `withRefs`

Remove refs requirement from a Nano.

```typescript
const programWithoutRefs = Nano.withRefs(program);
```

### Error

Create error constructors that integrate with Result.

#### `error`

Create an error constructor.

```typescript
const DatabaseError = Error.error<"DatabaseError">();

const program = Nano.make(function* () {
  yield* new DatabaseError("Connection failed");
  return 42;
});
```

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

#### `Iterator.next`

Create a yield result.

```typescript
const result = Nano.Iterator.next(42);
```

#### `Iterator.done`

Create a done result.

```typescript
const result = Nano.Iterator.done(42);
```

### Unify

Type-level utilities for unifying types (advanced).

#### `Unify`

Unify types that implement the unify protocol.

```typescript
type Unified = Nano.Unify<SomeType>;
```

#### `unify`

Unify function types.

```typescript
const unified = Nano.unify(someFunction);
```

## Examples

### Building a Closed Effect System

```typescript
import * as Nano from "@typed/nano";

// Define a closed Effect type
interface Effect<A, E = never, R = never>
  extends Nano.Nano<Nano.Failure<E> | Nano.GetEnv<R | Nano.Refs>, A> {}

// Helper to run effects
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

// Create environment tags
class Logger extends Nano.tag<Logger, { log: (msg: string) => void }>("Logger") {}

// Create refs
class Counter extends Nano.ref(() => 0) {}

// Build effect programs
const program = Nano.make(function* () {
  yield* Counter.set(5);
  const count = yield* Counter;
  const logger = yield* Logger;
  logger.log(`Count is ${count}`);
  return `Final count: ${count}`;
});

// Run with environment
const logs: string[] = [];
const env = Logger.env({ log: (msg) => logs.push(msg) });
const result = runEffect(program, env);
```

### Pattern Matching

```typescript
import * as Nano from "@typed/nano";

class Click extends Nano.variant("Click") {}
class Hover extends Nano.variant("Hover") {}
class KeyPress extends Nano.variant("KeyPress") {
  constructor(readonly key: string) {
    super();
  }
}

type Action = Click | Hover | KeyPress;

const handleAction = (action: Action) => action.pipe(Nano.match({
  Click: () => "clicked",
  Hover: () => "hovered",
  KeyPress: (press) => `pressed ${press.key}`,
}));

const result = handleAction(new KeyPress("Enter")); // "pressed Enter"
```
