---
description: 'Comment philosophy, TSDoc, component Props documentation, and TypeScript formatting rules'
applyTo: '**/*.ts,**/*.astro'
---

# Coding Standards

## Comment philosophy

- **Comment _why_, not _what_.** Explain intent, constraints, and non-obvious decisions (e.g. "ordinal sort keeps the export byte-identical across locales").
- **Don't restate code.** Delete comments that paraphrase the line below them; prefer clearer names over explanatory comments.
- **Keep comments current.** Outdated comments are bugs — update or delete them in the same change that touches the related code.

## TSDoc for the data layer (`db/`, `src/lib/`)

Every **exported function** must have a TSDoc comment with:

- a one-line purpose (and the reasoning behind any non-obvious behavior),
- an `@param name description` for every parameter — including the injectable `db` argument, so the testing pattern stays clear,
- an `@returns description` (omit only for `void` functions).

```ts
/**
 * Fetch a single game by id.
 *
 * @param db Injectable database client.
 * @param id Game id to look up.
 * @returns The game, or null when it does not exist.
 */
export async function getGameById(db: Database, id: number): Promise<Game | null> { ... }
```

ESLint (`eslint-plugin-jsdoc`) enforces this for `db/**` and `src/lib/**` (tests and migrations are excluded).

## `.astro` component Props

Every reusable component in `src/components/` declares an explicit `interface Props`, and each prop has a `/** ... */` comment describing what it controls (and its default or accepted values when not obvious). Components without props need no interface.

## TypeScript formatting

Enforced by ESLint (`npm run lint`):

- Match the surrounding file's indentation (4 spaces in `db/` and `src/`).
- `import type` for type-only imports (`consistent-type-imports`).
- Prefer `interface` over `type` for object shapes (`consistent-type-definitions`).
- Use `===`/`!==` (`eqeqeq`), `const`/`let` never `var`, and braces for multi-line blocks (`curly`).
- Explicit parameter and return types in the data layer.
