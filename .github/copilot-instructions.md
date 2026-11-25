# Tailspin Toys agent guide

- This is a fully prerendered Astro 7 + Tailwind CSS v4 app (`astro.config.mjs`: `output: 'static'`), not an SPA or API server. Keep pages/components in `.astro`; use a scoped `<script>` only for genuine DOM interaction.
- Data is build-time local SQLite. `db/schema.ts` owns tables, `db/games.csv` is the seed source, `db/transforms.ts` provides pure CSV/rating helpers, and `db/seed.ts` is idempotent (games are matched by title). Do not add `Math.random()` or other nondeterministic seed output.
- Use `src/lib/db.ts` for the Node `node:sqlite`/Drizzle client. `DATABASE_URL` accepts `file:...` or `:memory:`; the default is `file:tailspin.db`. Data helpers in `src/lib/games.ts` accept an injectable `Database` and map Drizzle rows to `src/types/game.ts` app types.
- Pages query through frontmatter: `getDatabase()` + functions such as `getAllGames()` / `getGameById()`. Keep ordering and joins in `src/lib/games.ts`, not in `.astro` files.
- Dynamic routes must export `prerender = true` and `getStaticPaths()`. Follow `src/pages/game/[id].astro`, where IDs come from `getAllGameIds(getDatabase())`; retain the branded `src/pages/404.astro`.
- Layout and reusable UI live in `src/layouts/` and `src/components/`; `src/layouts/Layout.astro` imports global styles and common navigation. Prefer semantic HTML, the slate dark palette, Tailwind utilities, visible focus rings, and no custom CSS unless utility classes cannot express it.
- Every interactive element needs a stable `data-testid`, with descriptive names such as `game-card`, `game-details-title`, or `back-game-button`. The Playwright suite uses these IDs and role/text locators; add test IDs for newly interactive elements.
- Use the existing instruction files when working in scoped areas: `astro.instructions.md`, `drizzle.instructions.md`, `style.instructions.md`, `ui.instructions.md`, `unit-tests.instructions.md`, and `playwright.instructions.md` under `.github/instructions/`.
- Node 22.13+ is required. Run `npm ci` before the first check. `npm run dev` and `npm run build` run `predev`/`prebuild`, which migrate and seed `tailspin.db`.
- Database changes: edit `db/schema.ts`, run `npm run db:generate`, then `npm run db:setup`; commit generated files under `db/migrations/` with the schema change. Do not hand-edit generated SQL/migration metadata.
- If local seed data is stale, remove `tailspin.db` and run `npm run db:setup`. The database is intentionally gitignored and locally mutable; CI starts clean.
- Co-locate unit tests as `*.test.ts`. Test pure transforms directly and test data helpers against `createTestDatabase()` in `db/test-helpers.ts`; do not mock SQL or start Astro for unit tests.
- Playwright specs belong in `e2e-tests/*.spec.ts`. Run `npm run test:e2e`; its config builds and previews the static site on port 4321, so it does not require a separate server. Prefer role-based locators and web-first assertions; never add fixed waits.
- The project has two type-check paths: `npm run typecheck` checks pure TypeScript with `tsgo`, while `npm run typecheck:astro` runs `astro sync && astro check`. Use `npm run typecheck:all` for both.
- Frontend/data quality checks: use the `quality-checks` skill or run `npm run test:unit`, `npm run lint`, and `npm run typecheck:all` as applicable. Run `npm run build` and `npm run test:e2e` for frontend changes.
- CI is defined in `.github/workflows/run-tests.yml`: lint, native/classic type checks, Vitest, and Playwright run separately. Playwright uses the browser image matching `@playwright/test` in `package-lock.json`.
- Keep README.md and this Copilot guide updated when adding scripts, project structure, or contributor-facing conventions. Update `db/` unit tests for schema/helper/transform changes.
- Do not commit or push to `main` unless the user explicitly instructs it. Work should normally be on a named feature branch and follow `.github/skills/make-contribution/SKILL.md` for contribution/PR steps.
