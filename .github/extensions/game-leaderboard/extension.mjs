// Extension: game-leaderboard
// Read-only canvas that ranks Tailspin Toys games by their catalog star ratings.

import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CanvasError, createCanvas, joinSession } from "@microsoft/copilot-sdk/extension";
import { listGenres, rankGames } from "./leaderboard.mjs";
import { renderHtml } from "./renderer.mjs";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const servers = new Map();

/** Resolve the SQLite file the site uses (DATABASE_URL or `file:tailspin.db` at the project root). */
function databasePath() {
    const url = process.env.DATABASE_URL ?? "file:tailspin.db";
    if (!url.startsWith("file:")) {
        throw new Error("DATABASE_URL must be a local file: URL.");
    }
    const filePath = url.startsWith("file://") ? fileURLToPath(url) : url.slice("file:".length);
    return isAbsolute(filePath) ? filePath : resolve(PROJECT_ROOT, filePath);
}

/** Load every game with its genre, publisher, and star rating. */
function loadGames() {
    const path = databasePath();
    if (!existsSync(path)) {
        throw new Error(`Database not found at ${path}. Run \`npm run db:setup\` first.`);
    }
    const sqlite = new DatabaseSync(path, { readOnly: true });
    try {
        return sqlite
            .prepare(
                `SELECT g.id AS id, g.title AS title, c.name AS genre, p.name AS publisher, g.star_rating AS starRating
                 FROM games g
                 JOIN categories c ON c.id = g.category_id
                 JOIN publishers p ON p.id = g.publisher_id`,
            )
            .all()
            .map((row) => ({ ...row, id: Number(row.id), starRating: row.starRating === null ? null : Number(row.starRating) }));
    } finally {
        sqlite.close();
    }
}

/** Build the leaderboard payload, validating the requested genre. */
function buildLeaderboard(genre) {
    const games = loadGames();
    const genres = listGenres(games);
    const selected = genre || null;
    if (selected && !genres.includes(selected)) {
        throw new Error(`Unknown genre "${selected}". Available genres: ${genres.join(", ")}.`);
    }
    return { genre: selected, genres, games: rankGames(games, { genre: selected }) };
}

function sendJson(response, status, body) {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(body));
}

async function startServer(initialGenre) {
    const server = createServer((request, response) => {
        const url = new URL(request.url ?? "/", "http://127.0.0.1");
        if (request.method !== "GET") {
            sendJson(response, 405, { error: "Read-only canvas." });
            return;
        }
        if (url.pathname === "/api/leaderboard") {
            try {
                sendJson(response, 200, buildLeaderboard(url.searchParams.get("genre")));
            } catch (error) {
                sendJson(response, 400, { error: error instanceof Error ? error.message : "Request failed." });
            }
            return;
        }
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(renderHtml(initialGenre));
    });
    await new Promise((done) => server.listen(0, "127.0.0.1", done));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { server, url: `http://127.0.0.1:${port}/` };
}

async function closeServer(instanceId) {
    const entry = servers.get(instanceId);
    if (entry) {
        servers.delete(instanceId);
        await new Promise((done) => entry.server.close(() => done()));
    }
}

const genreSchema = {
    type: "object",
    properties: { genre: { type: "string", description: "Optional genre (category) name to filter by." } },
    additionalProperties: false,
};

await joinSession({
    canvases: {
        definitions: [
            createCanvas({
                id: "game-leaderboard",
                displayName: "Game Leaderboard",
                description: "Read-only ranking of Tailspin Toys games by catalog star rating, with genre filtering.",
                inputSchema: genreSchema,
                actions: [
                    {
                        name: "get_leaderboard",
                        description:
                            "Return games ranked by star rating (ties share a rank; unrated games last with rank null), optionally filtered by genre.",
                        inputSchema: genreSchema,
                        handler: (ctx) => {
                            try {
                                return buildLeaderboard(ctx.input?.genre);
                            } catch (error) {
                                throw new CanvasError("leaderboard_unavailable", error instanceof Error ? error.message : "Leaderboard failed.");
                            }
                        },
                    },
                ],
                open: async (ctx) => {
                    const genre = ctx.input?.genre ?? "";
                    const existing = servers.get(ctx.instanceId);
                    if (existing && existing.genre !== genre) {
                        await closeServer(ctx.instanceId);
                    }
                    let entry = servers.get(ctx.instanceId);
                    if (!entry) {
                        entry = { ...(await startServer(genre)), genre };
                        servers.set(ctx.instanceId, entry);
                    }
                    return { title: genre ? `Game Leaderboard · ${genre}` : "Game Leaderboard", url: entry.url };
                },
                onClose: (ctx) => closeServer(ctx.instanceId),
            }),
        ],
    },
});
