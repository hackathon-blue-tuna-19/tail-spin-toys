import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { CanvasError, createCanvas, joinSession } from "@github/copilot-sdk/extension";
import { rankGames } from "./ranking.mjs";

const servers = new Map();
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function databasePath() {
    const url = process.env.DATABASE_URL;
    if (!url) return join(PROJECT_ROOT, "tailspin.db");
    if (!url.startsWith("file:")) throw new CanvasError("database_unsupported", "DATABASE_URL must be a local file: URL.");
    return url.startsWith("file://") ? fileURLToPath(url) : resolve(PROJECT_ROOT, url.slice("file:".length));
}

// Read-only snapshot of the catalog; ratings are the only ranking signal.
function loadLeaderboard(genre) {
    let db;
    try {
        db = new DatabaseSync(databasePath(), { readOnly: true });
    } catch {
        throw new CanvasError("database_unavailable", "Could not open the catalog database. Run `npm run db:setup` first.");
    }
    try {
        const games = db
            .prepare(
                `SELECT g.id AS id, g.title AS title, c.name AS category, p.name AS publisher, g.star_rating AS starRating
                 FROM games g JOIN categories c ON c.id = g.category_id JOIN publishers p ON p.id = g.publisher_id`,
            )
            .all();
        const genres = [...new Set(games.map((game) => game.category))].sort();
        if (genre && !genres.includes(genre)) {
            throw new CanvasError("genre_unknown", `Unknown genre "${genre}". Available: ${genres.join(", ")}`);
        }
        return { genre: genre || null, genres, entries: rankGames(games, genre) };
    } finally {
        db.close();
    }
}

function renderHtml() {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Game Leaderboard</title>
    <style>
      :root { color-scheme: light dark; --status-bar-color: var(--background-color-default, #ffffff); }
      body { margin: 0; padding: 20px; background: var(--background-color-default, #ffffff); color: var(--text-color-default, #1f2328); font-family: var(--font-sans, system-ui, sans-serif); font-size: var(--text-body-medium, 14px); line-height: var(--leading-body-medium, 20px); }
      h1 { font-size: var(--text-title-large, 26px); font-weight: var(--font-weight-semibold, 600); margin: 0 0 4px; }
      p.note { color: var(--text-color-muted, #656d76); margin: 0 0 16px; }
      label { font-weight: var(--font-weight-semibold, 600); margin-right: 8px; }
      select { background: transparent; border: 1px solid var(--border-color-default, #d0d7de); border-radius: 8px; color: inherit; font: inherit; padding: 6px 10px; }
      table { border-collapse: collapse; margin-top: 16px; width: 100%; }
      th, td { border-bottom: 1px solid var(--border-color-default, #d0d7de); padding: 8px 10px; text-align: left; }
      th { font-size: 11px; letter-spacing: 0.02em; text-transform: uppercase; }
      td.rank { font-variant-numeric: tabular-nums; font-weight: var(--font-weight-semibold, 600); width: 64px; }
      tr.unrated { color: var(--text-color-muted, #656d76); }
      #status { color: var(--text-color-muted, #656d76); margin-top: 12px; }
    </style>
  </head>
  <body>
    <h1>Game Leaderboard</h1>
    <p class="note">Ranked by catalog star ratings only. These are not gameplay scores or live backing activity.</p>
    <label for="genre">Genre</label>
    <select id="genre" data-testid="genre-filter"><option value="">All genres</option></select>
    <div id="status" role="status" aria-live="polite"></div>
    <table data-testid="leaderboard-table">
      <thead><tr><th>Rank</th><th>Game</th><th>Genre</th><th>Publisher</th><th>Rating</th></tr></thead>
      <tbody id="rows"></tbody>
    </table>
    <script>
      const select = document.querySelector("#genre");
      const rows = document.querySelector("#rows");
      const status = document.querySelector("#status");
      const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
      const stars = (rating) => {
        const full = Math.floor(rating), half = rating % 1 >= 0.5;
        return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
      };
      async function load() {
        status.textContent = "Loading…";
        const response = await fetch("/api/leaderboard?genre=" + encodeURIComponent(select.value));
        const data = await response.json();
        if (!response.ok) { rows.innerHTML = ""; status.textContent = data.error; return; }
        if (select.options.length === 1) {
          for (const genre of data.genres) select.add(new Option(genre, genre));
          select.value = data.genre || "";
        }
        rows.innerHTML = data.entries.map((game) => {
          const rank = game.rank === null ? "—" : (game.tied ? "T" : "") + game.rank;
          const rating = game.starRating === null ? "Not yet rated" : stars(game.starRating) + " " + game.starRating.toFixed(1);
          return '<tr data-testid="leaderboard-row-' + game.id + '" class="' + (game.rank === null ? "unrated" : "") + '"><td class="rank">' + rank + "</td><td>" + escapeHtml(game.title) + "</td><td>" + escapeHtml(game.category) + "</td><td>" + escapeHtml(game.publisher) + "</td><td>" + rating + "</td></tr>";
        }).join("");
        status.textContent = data.entries.length ? data.entries.length + " games" : "No games in this genre.";
      }
      select.addEventListener("change", load);
      load();
    </script>
  </body>
</html>`;
}

async function startServer() {
    const server = createServer((request, response) => {
        const url = new URL(request.url ?? "/", "http://127.0.0.1");
        if (url.pathname === "/api/leaderboard" && request.method === "GET") {
            try {
                const data = loadLeaderboard(url.searchParams.get("genre"));
                response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                response.end(JSON.stringify(data));
            } catch (error) {
                response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
                response.end(JSON.stringify({ error: error instanceof Error ? error.message : "The request failed." }));
            }
            return;
        }
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(renderHtml());
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { server, url: `http://127.0.0.1:${port}/` };
}

await joinSession({
    canvases: [
        createCanvas({
            id: "game-leaderboard",
            displayName: "Game Leaderboard",
            description: "Read-only ranking of catalog games by star rating, with genre filtering.",
            actions: [
                {
                    name: "get_leaderboard",
                    description: "Return ranked games, optionally filtered to one genre (category name).",
                    inputSchema: {
                        type: "object",
                        properties: { genre: { type: "string" } },
                        additionalProperties: false,
                    },
                    handler: async (ctx) => loadLeaderboard(ctx.input?.genre),
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
                    await new Promise((resolve) => entry.server.close(resolve));
                }
            },
        }),
    ],
});
