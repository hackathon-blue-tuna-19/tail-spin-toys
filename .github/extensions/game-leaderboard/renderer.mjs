/**
 * HTML renderer for the Game Leaderboard canvas iframe.
 *
 * The page fetches `/api/leaderboard?genre=...` from the extension's loopback
 * server; ranking happens server-side in `leaderboard.mjs`.
 */

/**
 * @param {string} initialGenre
 * @returns {string}
 */
export function renderHtml(initialGenre) {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Game Leaderboard</title>
    <style>
      :root {
        color-scheme: light dark;
        --status-bar-color: var(--background-color-default, #ffffff);
        --surface: color-mix(in srgb, var(--background-color-default, #ffffff) 94%, var(--text-color-default, #1f2328) 6%);
        --surface-strong: color-mix(in srgb, var(--background-color-default, #ffffff) 88%, var(--text-color-default, #1f2328) 12%);
      }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--background-color-default, #ffffff); color: var(--text-color-default, #1f2328); font-family: var(--font-sans, system-ui, sans-serif); font-size: var(--text-body-medium, 14px); line-height: var(--leading-body-medium, 20px); }
      main { max-width: 960px; margin: 0 auto; padding: clamp(16px, 3vw, 32px); }
      header { border-bottom: 1px solid var(--border-color-default, #d0d7de); display: flex; flex-wrap: wrap; gap: 16px; align-items: end; justify-content: space-between; margin-bottom: 20px; padding-bottom: 16px; }
      h1 { font-size: var(--text-title-large, 26px); font-weight: var(--font-weight-semibold, 600); line-height: var(--leading-title-large, 32px); margin: 0; }
      .lede { color: var(--text-color-muted, #59636e); margin: 6px 0 0; max-width: 62ch; }
      .badge { border: 1px solid var(--border-color-default, #d0d7de); border-radius: 999px; color: var(--text-color-muted, #59636e); font-size: 12px; margin-left: 6px; padding: 1px 8px; }
      label { font-weight: var(--font-weight-semibold, 600); margin-right: 8px; }
      select { background: var(--background-color-default, #ffffff); border: 1px solid var(--border-color-default, #d0d7de); border-radius: 8px; color: inherit; font: inherit; min-height: 34px; padding: 4px 10px; }
      select:focus-visible { outline: 2px solid var(--color-focus-outline, #0969da); outline-offset: 2px; }
      #status { color: var(--text-color-muted, #59636e); margin: 0 0 8px; }
      .error { color: var(--true-color-red, #cf222e) !important; }
      table { border-collapse: separate; border-spacing: 0; width: 100%; background: var(--surface); border: 1px solid var(--border-color-default, #d0d7de); border-radius: 12px; overflow: hidden; }
      th, td { border-bottom: 1px solid var(--border-color-default, #d0d7de); padding: 10px 12px; text-align: left; vertical-align: middle; }
      tr:last-child td { border-bottom: 0; }
      th { background: var(--surface-strong); font-size: 12px; font-weight: var(--font-weight-semibold, 600); letter-spacing: 0.02em; text-transform: uppercase; }
      .rank { font-variant-numeric: tabular-nums; font-weight: var(--font-weight-semibold, 600); width: 4.5em; }
      .rating { font-variant-numeric: tabular-nums; white-space: nowrap; }
      .stars { color: var(--true-color-yellow, #9a6700); letter-spacing: 1px; margin-right: 6px; }
      .muted { color: var(--text-color-muted, #59636e); }
      .tie { font-size: 11px; margin-left: 4px; }
      .empty { border: 1px dashed var(--border-color-default, #d0d7de); border-radius: 8px; color: var(--text-color-muted, #59636e); padding: 18px 14px; }
      code { font-family: var(--font-mono, monospace); font-size: var(--text-code-inline, 12px); }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <h1>Game Leaderboard <span class="badge">Read-only</span></h1>
          <p class="lede">Tailspin Toys games ranked by their catalog star ratings. Ratings are not gameplay scores or live backing activity.</p>
        </div>
        <div>
          <label for="genre">Genre</label>
          <select id="genre" data-testid="leaderboard-genre-filter"><option value="">All genres</option></select>
        </div>
      </header>
      <p id="status" role="status" aria-live="polite">Loading leaderboard…</p>
      <div id="board"></div>
    </main>
    <script>
      const initialGenre = ${JSON.stringify(initialGenre).replace(/</g, "\\u003c")};
      const select = document.querySelector("#genre");
      const board = document.querySelector("#board");
      const status = document.querySelector("#status");
      const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
      const stars = (rating) => {
        const clamped = Math.min(5, Math.max(0, rating));
        const full = Math.floor(clamped);
        const half = clamped % 1 >= 0.5;
        return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
      };
      const tiedRanks = (games) => {
        const counts = new Map();
        for (const g of games) if (g.rank !== null) counts.set(g.rank, (counts.get(g.rank) ?? 0) + 1);
        return counts;
      };
      const render = (data) => {
        if (!data.games.length) {
          board.innerHTML = '<div class="empty">No games found for this genre.</div>';
          return;
        }
        const counts = tiedRanks(data.games);
        const rows = data.games.map((g) => {
          const rank = g.rank === null
            ? '<span class="muted">—</span>'
            : \`\${g.rank}\${counts.get(g.rank) > 1 ? '<span class="tie muted">(tie)</span>' : ""}\`;
          const rating = g.starRating === null
            ? '<span class="muted">Not yet rated</span>'
            : \`<span class="stars" aria-hidden="true">\${stars(g.starRating)}</span>\${g.starRating.toFixed(1)}<span class="muted"> / 5</span>\`;
          return \`<tr data-testid="leaderboard-row-\${g.id}"><td class="rank">\${rank}</td><td>\${escapeHtml(g.title)}</td><td>\${escapeHtml(g.genre)}</td><td>\${escapeHtml(g.publisher)}</td><td class="rating">\${rating}</td></tr>\`;
        }).join("");
        board.innerHTML = \`<table data-testid="leaderboard-table"><caption class="muted" style="caption-side: bottom; padding: 8px; text-align: left;">Tied ratings share a rank. Unrated games are listed last.</caption><thead><tr><th scope="col">Rank</th><th scope="col">Game</th><th scope="col">Genre</th><th scope="col">Publisher</th><th scope="col">Star rating</th></tr></thead><tbody>\${rows}</tbody></table>\`;
      };
      const load = async () => {
        status.textContent = "Loading leaderboard…";
        status.className = "";
        try {
          const response = await fetch(\`/api/leaderboard?genre=\${encodeURIComponent(select.value)}\`);
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? "Request failed.");
          if (select.options.length === 1) {
            select.insertAdjacentHTML("beforeend", data.genres.map((g) => \`<option value="\${escapeHtml(g)}">\${escapeHtml(g)}</option>\`).join(""));
            if (initialGenre && data.genres.includes(initialGenre)) {
              select.value = initialGenre;
              return load();
            }
          }
          render(data);
          status.textContent = \`\${data.games.length} game(s)\${data.genre ? \` in \${data.genre}\` : ""}.\`;
        } catch (error) {
          board.innerHTML = '<div class="empty">Could not load the catalog. Set up the local database with <code>npm run db:setup</code>, then reopen this canvas.</div>';
          status.textContent = error.message;
          status.className = "error";
        }
      };
      select.addEventListener("change", load);
      load();
    </script>
  </body>
</html>`;
}
