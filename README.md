# @granularjs/lint

> Linter for the [Granular](https://github.com/zerobytes/granular) framework. Understands both the canonical tag-function syntax (`@granularjs/core`) and the optional JSX runtime (`@granularjs/jsx`). Detects anti-patterns, common mistakes, and best-practice violations described in the official Granular docs.

`@granularjs/lint` is a small, dependency-light static analyzer built on top of [`@babel/parser`](https://babeljs.io/docs/babel-parser) + [`@babel/traverse`](https://babeljs.io/docs/babel-traverse). It is **not** an ESLint plugin — it is a stand-alone CLI and programmatic API tailored for Granular's reactive model.

## Install

```bash
npm install --save-dev @granularjs/lint
```

## CLI

```bash
npx granular-lint src
npx granular-lint src tests --format stylish
npx granular-lint . --only no-state-mutation,when-arrow-functions
npx granular-lint . --disable prefer-when-over-ternary
npx granular-lint --list-rules
npx granular-lint --help
```

Exit codes:

| Code | Meaning                                                |
|------|--------------------------------------------------------|
| `0`  | No errors and no warnings beyond `--max-warnings`.     |
| `1`  | Errors found, or warnings exceeded the threshold.      |
| `2`  | Bad CLI usage.                                         |

## Programmatic API

```js
const { lintSource, lintPaths, formatStylish } = require('@granularjs/lint');

const result = lintSource(`import { state } from '@granularjs/core';
const x = state(0); x.value = 1;`, 'demo.js');

console.log(result.messages);
// [{ ruleId: 'no-state-mutation', severity: 'error', line: 2, column: 21, ... }]

const results = lintPaths(['src'], { disable: ['prefer-when-over-ternary'] });
process.stdout.write(formatStylish(results).text);
```

## What it understands

The linter is dual-mode:

- **`.js` / `.ts` / `.mjs` / `.cjs` Granular code** — the canonical syntax, where DOM tags are JS functions imported from `@granularjs/core`:

  ```js
  import { state, when, Div, Button } from '@granularjs/core';
  const Counter = () => {
    const count = state(0);
    return Div(Button({ onClick: () => count.set(count.get() + 1) }, count));
  };
  ```

- **`.jsx` / `.tsx` files using `@granularjs/jsx`** — JSX is compiled to the same Granular tag calls under the hood:

  ```jsx
  import { state, when } from '@granularjs/core';
  const Counter = () => {
    const count = state(0);
    return <button onClick={() => count.set(count.get() + 1)}>{count}</button>;
  };
  ```

Rules tagged `[jsx-only]` apply only to the second form. Rules tagged `[requires-granular]` only fire when the file imports something from `@granularjs/*` or uses tag-function call style.

## Rule reference

Run `npx granular-lint --list-rules` for the live, in-CLI listing. The current rules are grouped below.

### Imports & ecosystem

| Rule                       | Severity | Description |
|----------------------------|----------|-------------|
| `correct-import-package`   | error    | Imports must use the official `@granularjs/core`, `@granularjs/ui`, `@granularjs/jsx` package names. Aliases like `granular`, `granular-ui`, or `@granular/ui` are NOT valid published packages. |
| `no-react-hooks`           | error    | `useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`, `useContext`, … are anti-patterns in Granular. The linter suggests the correct Granular primitive (`state`, `after().change`, `after().compute`, `node` prop, `context`, …). |

### Reactivity & state mutation

| Rule                           | Severity | Description |
|--------------------------------|----------|-------------|
| `no-state-mutation`            | error    | `user.name = 'Maria'` on a `state(...)` value throws at runtime. Use `user.set().name = 'Maria'` (setter proxy) or `user.set('name', 'Maria')`. Also flags `state.foo++`. |
| `state-set-misuse`             | warning  | `state.value = x` is a React/Vue habit and does not update Granular state. Use `state.set(x)`. |
| `after-targets`                | error    | `after()` / `before()` called with no arguments produces an observer that never fires. |
| `no-array-index-assignment`    | warning  | `arr[i] = x` on an `observableArray` (or a `persist(observableArray(...))`) bypasses the patch system. Use `arr.splice(i, 1, value)` so subscribers receive a patch. |

### Lists & rendering

| Rule                                | Severity | Description |
|-------------------------------------|----------|-------------|
| `no-state-in-list-render`           | error    | Calling `state()` / `signal()` / `observableArray()` inside a `list(items, fn)` render function creates new reactive state on every render. Move it to a per-item component. |
| `no-get-at-top-of-list-render`      | warning  | `const raw = item.get();` at the top of a `list()` render function takes a one-time snapshot. Only fires when the snapshot value (or constants derived from it) is actually used in render position — uses confined to event closures or `after()/compute()` callbacks are not flagged. |
| `no-or-defaults-on-state-path`      | error    | `item.size \|\| 'md'` is **always** truthy because `item.size` is a reactive proxy, not the underlying value. Use `after(item.size).compute(s => s \|\| 'md')`. |
| `no-component-call-as-tag-child`    | warning  | `list(items, Render(item))` evaluates the render once at build time. Pass an arrow function: `list(items, (item, index) => Render(item))`. |
| `prefer-list-over-map`              | warning  | `array.map(x => Row(x))` over a reactive array is a static one-time array of nodes. Use `list(array, (x) => Row(x))` for fine-grained patch-based updates. Scope-aware: shadowed parameters do not trigger. |
| `prefer-list-inside-compute`        | warning  | `after(arr).compute((arr) => ...arr.map(...))` rebuilds every node when `arr` changes. Use `list(arr, (item) => ...)` for patch-based updates instead. |

### Conditionals

| Rule                            | Severity | Description |
|---------------------------------|----------|-------------|
| `when-arrow-functions`          | error    | Both branches of `when(cond, A, B)` must be functions. `when(cond, Modal(), null)` calls `Modal()` immediately. |
| `match-arrow-functions`         | error    | `match(sources, predicate, renderTrue, renderFalse?)` requires `predicate` and the branches to be functions; eager calls execute regardless of the predicate. |
| `prefer-when-over-ternary`      | error    | `cond ? A() : B()` / `cond && A()` where `cond` is `after(...)` / `after(...).compute(...)` evaluates only once. Use `when(cond, () => A(), () => B())`. Plain JS conditions are not flagged. |
| `no-state-truthy-and`           | error    | A reactive `state` / `StatePath` / `signal` reference is always truthy as an object. `statePath && X` always renders X — and `statePath ? A : B` always picks the same branch. Use `when()`. |
| `prefer-and-over-ternary-null`  | warning  | `cond ? <X/> : null` (with non-reactive `cond`) is noise — Granular drops falsy children. Use `cond && <X/>`. |
| `no-compute-returning-tree`     | warning  | `after(x).compute(v => MultiNodeTree)` rebuilds and remounts the whole subtree on every change. Render the structure once and let leaves bind reactively (state paths, `when()`, `list()`). |

### Components

| Rule                                  | Severity | Description |
|---------------------------------------|----------|-------------|
| `no-cleanup-return-from-component`    | warning  | Granular has no `useEffect`-style cleanup. Returning a function from a component is almost always a React mistake; the function is treated as a renderable, not as cleanup. |
| `no-state-in-jsx-children-snapshot`   | warning  | `Span(count.get())` (or `{count.get()}` in JSX) snapshots once. Pass the reactive source itself: `Span(count)` / `{count}`. |
| `no-empty-props-object`               | warning  | `Tag({}, ...)` is pure noise — there is no required positional props argument. Drop the empty object. |

### JSX (only fires on `.jsx` / `.tsx`)

| Rule                              | Severity | Description |
|-----------------------------------|----------|-------------|
| `jsx-cond-and-render`             | warning  | `{after(...).compute(...) && <X/>}` and ternaries on reactive call expressions are evaluated when the JSX tree is built. Use `{when(cond, () => <X/>)}`. (Bare reactive identifiers are handled by `no-state-truthy-and`.) |
| `jsx-no-children-get-snapshot`    | warning  | `{state.get()}` inside JSX reads once. Pass the reactive source: `{state}`. |
| `jsx-no-array-map`                | warning  | `{items.map(x => <Row/>)}` produces a static node list. Use `{list(items, (x) => <Row/>)}`. Scope-aware. |

## Inline disables

You can suppress findings with comments. Both `//` and `/* */` styles work.

```js
// granular-lint-disable-next-line no-state-mutation
user.name = 'Maria';

user.value = 1; // granular-lint-disable-line state-set-misuse,no-state-mutation

// granular-lint-disable-file no-react-hooks
// (everything in this file ignores no-react-hooks)
```

Disables with no rule list disable **all** rules at that location.

## Configuration file (optional)

Create `granular-lint.config.json` (or `.granular-lintrc`, `.granular-lintrc.json`) at the project root:

```json
{
  "extensions": [".js", ".jsx", ".ts", ".tsx"],
  "ignore": ["**/node_modules/**", "**/dist/**", "**/build/**"],
  "rules": null,
  "disable": ["prefer-when-over-ternary"]
}
```

- `rules: null` (default) means *all rules*. Set to a list to enable only specific rules.
- `disable` skips listed rule ids regardless of `rules`.
- `ignore` accepts simple glob patterns (`**`, `*`, `?`).

## Why a new linter?

ESLint's React rules don't model Granular's invariants:

- **Components run exactly once.** There is no re-render to memoize against.
- **State paths are reactive proxies.** `item.size` is *always* truthy, so `||`/`??` defaults silently misbehave.
- **`when()` and `list()` need functions, not values.** Eager invocation is the most common bug after migrating from React.
- **Tags are functions, not JSX.** JSX is supported through `@granularjs/jsx` but compiles to the same calls; the same anti-patterns apply, just dressed differently.

`@granularjs/lint` encodes those invariants directly, with messages that point straight to the equivalent Granular API.

## Roadmap

- More rules (form validators, store-shape checks, virtualList misuse, route guard signatures).
- ESLint plugin shim re-exporting these rules.
- `--fix` for the mechanical cases (`useState` → `state`, `arr[i]=x` → `arr.splice(...)`).
- Editor integration with `@granularjs/vscode`.

## License

Apache-2.0. Same as `@granularjs/core`.
