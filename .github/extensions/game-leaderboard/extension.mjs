import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createClient } from "@libsql/client";
import { CanvasError, createCanvas, joinSession } from "@github/copilot-sdk/extension";
import { buildLeaderboard, listGenres } from "./leaderboard.mjs";

const servers = new Map();
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function databaseUrl() {
    return process.env.DATABASE_URL ?? `file:${join(PROJECT_ROOT, ".data", "tailspin.db")}`;
}

async function loadGames(url) {
    const client = createClient({ url });
    try {
        const result = await client.execute(
            "SELECT g.id AS id, g.title AS title, c.name AS genre, p.name AS publisher, g.star_rating AS starRating FROM games g LEFT JOIN categories c ON g.category_id = c.id LEFT JOIN publishers p ON g.publisher_id = p.id",
        );
        return result.rows.map((row) => ({
            id: Number(row.id),
            title: String(row.title),
            genre: row.genre === null ? null : String(row.genre),
            publisher: row.publisher === null ? null : String(row.publisher),
            starRating: row.starRating === null ? null : Number(row.starRating),
        }));
    } finally {
        client.close();
    }
}

async function getLeaderboard(url, genre) {
    const games = await loadGames(url);
    const genres = listGenres(games);
    if (genre && !genres.includes(genre)) {
        throw new Error(`Unknown genre: ${genre}`);
    }
    return { genres, entries: buildLeaderboard(games, genre || undefined) };
}

function renderHtml() {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Game Leaderboard</title>
    <style>
      :root { color-scheme: light dark; --surface: color-mix(in srgb, var(--background-color-default, #fff) 94%, var(--text-color-default, #1f2328) 6%); }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--background-color-default, #fff); color: var(--text-color-default, #1f2328); font: var(--text-body-medium, 14px)/20px var(--font-sans, system-ui, sans-serif); }
      main { max-width: 900px; margin: 0 auto; padding: clamp(16px, 3vw, 32px); }
      h1 { font-size: clamp(26px, 3vw, 34px); letter-spacing: -0.025em; margin: 0; }
      .lede { color: var(--text-color-muted, #59636e); margin: 8px 0 20px; max-width: 64ch; }
      .badge { border: 1px solid var(--border-color-default, #d0d7de); border-radius: 999px; font-size: 12px; margin-left: 6px; padding: 1px 8px; }
      .controls { align-items: center; display: flex; gap: 10px; margin-bottom: 16px; }
      select { background: var(--background-color-default, #fff); border: 1px solid var(--border-color-default, #d0d7de); border-radius: 7px; color: inherit; font: inherit; min-height: 34px; padding: 4px 8px; }
      select:focus-visible { outline: 2px solid var(--color-focus-outline, #0969da); outline-offset: 2px; }
      .panel { background: var(--surface); border: 1px solid var(--border-color-default, #d0d7de); border-radius: 12px; overflow-x: auto; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border-bottom: 1px solid var(--border-color-default, #d0d7de); padding: 10px 14px; text-align: left; }
      tr:last-child td { border-bottom: 0; }
      th { font-size: 11px; letter-spacing: 0.02em; text-transform: uppercase; }
      .rank { font-variant-numeric: tabular-nums; font-weight: 600; width: 80px; }
      .muted { color: var(--text-color-muted, #59636e); }
      .empty { color: var(--text-color-muted, #59636e); padding: 24px; }
      .error { color: var(--true-color-red, #cf222e); }
      @media (prefers-reduced-motion: reduce) { * { transition-duration: 0.01ms !important; } }
    </style>
  </head>
  <body>
    <main>
      <h1>Game Leaderboard<span class="badge">Read-only</span></h1>
      <p class="lede">Games ranked by their catalog star rating. Ratings are not gameplay scores or live backing activity. Tied ratings share a rank; unrated games are listed last.</p>
      <div class="controls">
        <label for="genre">Genre</label>
        <select id="genre"><option value="">All genres</option></select>
        <span id="status" role="status" aria-live="polite" class="muted"></span>
      </div>
      <section class="panel" id="board" aria-live="polite"></section>
    </main>
    <script>
      const genre = document.querySelector("#genre");
      const board = document.querySelector("#board");
      const status = document.querySelector("#status");
      const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
      let loadedGenres = false;
      const load = async () => {
        status.textContent = "Loading...";
        status.className = "muted";
        try {
          const response = await fetch("/api/leaderboard?genre=" + encodeURIComponent(genre.value));
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? "Request failed.");
          if (!loadedGenres) {
            loadedGenres = true;
            genre.insertAdjacentHTML("beforeend", data.genres.map((g) => '<option value="' + escapeHtml(g) + '">' + escapeHtml(g) + "</option>").join(""));
          }
          board.innerHTML = data.entries.length
            ? '<table><thead><tr><th scope="col">Rank</th><th scope="col">Game</th><th scope="col">Genre</th><th scope="col">Publisher</th><th scope="col">Star rating</th></tr></thead><tbody>' +
              data.entries.map((e) => "<tr><td class=\\"rank\\">" + (e.rank ?? "—") + "</td><td>" + escapeHtml(e.title) + "</td><td>" + escapeHtml(e.genre ?? "—") + "</td><td>" + escapeHtml(e.publisher ?? "—") + "</td><td>" + (e.starRating === null ? '<span class="muted">Unrated</span>' : e.starRating.toFixed(1) + " ★") + "</td></tr>").join("") + "</tbody></table>"
            : '<p class="empty">No games found. Set up the database with <code>npm run db:setup</code>.</p>';
          status.textContent = "";
        } catch (error) {
          status.textContent = "Could not load leaderboard: " + error.message;
          status.className = "error";
        }
      };
      genre.addEventListener("change", load);
      load();
    </script>
  </body>
</html>`;
}

async function startServer(url) {
    const server = createServer(async (request, response) => {
        try {
            const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
            if (requestUrl.pathname === "/api/leaderboard" && request.method === "GET") {
                const data = await getLeaderboard(url, requestUrl.searchParams.get("genre"));
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
            description: "Read-only ranking of catalog games by star rating, with genre filtering. Not gameplay scores or live backing activity.",
            actions: [
                {
                    name: "get_leaderboard",
                    description: "Get games ranked by star rating, optionally filtered by genre.",
                    inputSchema: {
                        type: "object",
                        properties: { genre: { type: "string" } },
                        additionalProperties: false,
                    },
                    handler: async (ctx) => {
                        try {
                            return await getLeaderboard(databaseUrl(), ctx.input?.genre);
                        } catch (error) {
                            throw new CanvasError("leaderboard_invalid", error instanceof Error ? error.message : "The request is invalid.");
                        }
                    },
                },
            ],
            open: async (ctx) => {
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer(databaseUrl());
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
