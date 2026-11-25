import { createServer } from "node:http";
import { CanvasError, createCanvas, joinSession } from "@github/copilot-sdk/extension";
import declaration from "./extension.json" with { type: "json" };
import { getLeaderboard, listGenres } from "./leaderboard.mjs";
import { renderPage } from "./page.mjs";

const servers = new Map();

function loadLeaderboard(genre) {
    if (genre !== undefined && typeof genre !== "string") {
        throw new CanvasError("invalid_genre", "genre must be a string.");
    }
    try {
        return getLeaderboard(genre);
    } catch (error) {
        const code = error instanceof RangeError ? "invalid_genre" : "database_unavailable";
        throw new CanvasError(code, error instanceof Error ? error.message : "The leaderboard could not be loaded.");
    }
}

async function startServer(initialGenre) {
    const server = createServer((request, response) => {
        const url = new URL(request.url ?? "/", "http://127.0.0.1");
        const sendJson = (status, body) => {
            response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
            response.end(JSON.stringify(body));
        };

        if (request.method !== "GET") {
            sendJson(405, { error: "Method not allowed." });
            return;
        }

        if (url.pathname === "/api/leaderboard") {
            try {
                sendJson(200, loadLeaderboard(url.searchParams.get("genre") || undefined));
            } catch (error) {
                sendJson(error?.code === "invalid_genre" ? 400 : 500, { error: error.message });
            }
            return;
        }

        if (url.pathname === "/") {
            response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            response.end(renderPage(initialGenre));
            return;
        }

        sendJson(404, { error: "Not found." });
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    return { server, url: `http://127.0.0.1:${address.port}/` };
}

async function closeEntry(instanceId) {
    const entry = servers.get(instanceId);
    if (entry) {
        servers.delete(instanceId);
        await new Promise((resolve) => entry.server.close(resolve));
    }
}

const actionHandlers = {
    get_leaderboard: async ({ input }) => loadLeaderboard(input?.genre),
    list_genres: async () => {
        try {
            return { genres: listGenres() };
        } catch (error) {
            throw new CanvasError("database_unavailable", error instanceof Error ? error.message : "Could not list genres.");
        }
    },
};

await joinSession({
    canvases: declaration.canvases.map((canvas) =>
        createCanvas({
            ...canvas,
            actions: canvas.actions.map((action) => ({ ...action, handler: actionHandlers[action.name] })),
            open: async ({ instanceId, input }) => {
                // Validate up front so a bad genre fails the open instead of rendering an empty page.
                loadLeaderboard(input?.genre);
                // Replace any live server so reopening with a new genre reflects it.
                await closeEntry(instanceId);
                const entry = await startServer(input?.genre);
                servers.set(instanceId, entry);
                return { title: "Game Leaderboard", url: entry.url };
            },
            onClose: async ({ instanceId }) => closeEntry(instanceId),
        }),
    ),
});
