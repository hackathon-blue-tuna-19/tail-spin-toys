import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { CanvasError, createCanvas, joinSession } from "@github/copilot-sdk/extension";
import { buildLeaderboard, getLeaderboardCategories } from "../../../src/lib/leaderboard.ts";

const servers = new Map();
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function databasePath() {
    const url = process.env.DATABASE_URL;
    if (url?.startsWith("file://")) return fileURLToPath(url);
    if (url?.startsWith("file:")) return resolve(PROJECT_ROOT, url.slice("file:".length));
    return join(PROJECT_ROOT, "tailspin.db");
}

// Read-only snapshot of the catalog in the shape the pure ranking helpers expect.
function loadGames() {
    const path = databasePath();
    if (!existsSync(path)) {
        throw new CanvasError("database_missing", "Local database not found. Run `npm run db:setup` first.");
    }
    const db = new DatabaseSync(path, { readOnly: true });
    try {
        const rows = db
            .prepare(
                `SELECT g.id AS id, g.title AS title, g.description AS description, g.star_rating AS starRating,
                        c.id AS categoryId, c.name AS categoryName, p.id AS publisherId, p.name AS publisherName
                 FROM games g
                 LEFT JOIN categories c ON g.category_id = c.id
                 LEFT JOIN publishers p ON g.publisher_id = p.id`,
            )
            .all();
        return rows.map((row) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            starRating: row.starRating ?? null,
            category: row.categoryId === null ? null : { id: row.categoryId, name: row.categoryName },
            publisher: row.publisherId === null ? null : { id: row.publisherId, name: row.publisherName },
        }));
    } finally {
        db.close();
    }
}

function leaderboard(category) {
    const games = loadGames();
    const categories = getLeaderboardCategories(games);
    if (category && !categories.includes(category)) {
        throw new CanvasError("category_unknown", `Unknown category "${category}". Available: ${categories.join(", ")}`);
    }
    return { category: category || null, categories, entries: buildLeaderboard(games, { category }) };
}

function renderHtml() {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Game Leaderboard</title>
    <style>
      :root { color-scheme: light dark; --status-bar-color: var(--background-color-default, #ffffff); }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--background-color-default, #ffffff); color: var(--text-color-default, #1f2328); font: var(--text-body-medium, 14px)/var(--leading-body-medium, 20px) var(--font-sans, system-ui, sans-serif); }
      main { max-width: 900px; margin: 0 auto; padding: clamp(16px, 3vw, 32px); }
      h1 { font-size: clamp(26px, 3vw, 34px); letter-spacing: -0.025em; line-height: 1.1; margin: 0; }
      .lede { color: var(--text-color-muted, #59636e); margin: 8px 0 16px; max-width: 70ch; }
      .badge { border: 1px solid var(--border-color-default, #d0d7de); border-radius: 999px; font-size: 12px; margin-left: 6px; padding: 1px 8px; }
      .controls { align-items: center; display: flex; gap: 10px; margin-bottom: 14px; }
      select { background: var(--background-color-default, #ffffff); border: 1px solid var(--border-color-default, #d0d7de); border-radius: 7px; color: inherit; font: inherit; padding: 6px 10px; }
      select:focus-visible { outline: 2px solid var(--color-focus-outline, #0969da); outline-offset: 2px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border-bottom: 1px solid var(--border-color-default, #d0d7de); padding: 9px 11px; text-align: left; }
      th { color: var(--text-color-muted, #59636e); font-size: 12px; text-transform: uppercase; letter-spacing: 0.02em; }
      td.rank { font-variant-numeric: tabular-nums; font-weight: var(--font-weight-semibold, 600); width: 64px; }
      .muted { color: var(--text-color-muted, #59636e); }
      .error { color: var(--true-color-red, #cf222e); }
    </style>
  </head>
  <body>
    <main>
      <h1>Game Leaderboard<span class="badge">Read-only</span></h1>
      <p class="lede">Games ranked by catalog star rating. These are ratings only — not player scores or live popularity. Tied ratings share a rank; unrated games are listed last.</p>
      <div class="controls">
        <label for="category">Genre</label>
        <select id="category"><option value="">All genres</option></select>
        <span id="status" class="muted" role="status" aria-live="polite"></span>
      </div>
      <table>
        <thead><tr><th scope="col">Rank</th><th scope="col">Game</th><th scope="col">Genre</th><th scope="col">Rating</th></tr></thead>
        <tbody id="rows"></tbody>
      </table>
    </main>
    <script>
      const select = document.querySelector("#category");
      const rows = document.querySelector("#rows");
      const status = document.querySelector("#status");
      const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
      let populated = false;
      const load = async () => {
        status.className = "muted";
        status.textContent = "Loading...";
        try {
          const response = await fetch("/api/leaderboard?category=" + encodeURIComponent(select.value));
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? "Request failed.");
          if (!populated) {
            data.categories.forEach((name) => select.add(new Option(name, name)));
            populated = true;
          }
          rows.innerHTML = data.entries.length
            ? data.entries.map((e) => '<tr><td class="rank">' + (e.rank ?? "—") + "</td><td>" + esc(e.title) + "</td><td>" + esc(e.category) + "</td><td>" + (e.starRating === null ? '<span class="muted">Not yet rated</span>' : esc(e.starRating) + " / 5") + "</td></tr>").join("")
            : '<tr><td colspan="4" class="muted">No games found.</td></tr>';
          status.textContent = data.entries.length + " game(s)";
        } catch (error) {
          status.className = "error";
          status.textContent = error.message;
        }
      };
      select.addEventListener("change", load);
      load();
    </script>
  </body>
</html>`;
}

async function startServer() {
    const server = createServer((request, response) => {
        const url = new URL(request.url ?? "/", "http://127.0.0.1");
        try {
            if (url.pathname === "/api/leaderboard" && request.method === "GET") {
                const data = leaderboard(url.searchParams.get("category"));
                response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                response.end(JSON.stringify(data));
                return;
            }
            response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            response.end(renderHtml());
        } catch (error) {
            response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
            response.end(JSON.stringify({ error: error instanceof Error ? error.message : "The request failed." }));
        }
    });
    await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { server, url: `http://127.0.0.1:${port}/` };
}

await joinSession({
    canvases: [
        createCanvas({
            id: "game-leaderboard",
            displayName: "Game Leaderboard",
            description: "Read-only ranking of catalog games by star rating, filterable by genre (category). Ratings only; not player scores.",
            actions: [
                {
                    name: "get_leaderboard",
                    description: "Return ranked games, optionally filtered by category. Ties share a rank; unrated games are last.",
                    inputSchema: {
                        type: "object",
                        properties: { category: { type: "string" } },
                        additionalProperties: false,
                    },
                    handler: async (ctx) => leaderboard(ctx.input?.category),
                },
            ],
            open: async (ctx) => {
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer();
                    servers.set(ctx.instanceId, entry);
                }
                return { title: "Game Leaderboard", url: entry.url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    await new Promise((resolveClose) => entry.server.close(resolveClose));
                }
            },
        }),
    ],
});
