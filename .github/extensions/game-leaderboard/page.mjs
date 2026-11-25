/** Self-contained HTML page for the leaderboard canvas. Data is fetched from same-origin /api/leaderboard. */
export function renderPage(initialGenre) {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Game Leaderboard</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #0f172a; color: #f1f5f9; font: 14px/1.5 system-ui, sans-serif; }
      main { max-width: 960px; margin: 0 auto; padding: clamp(16px, 3vw, 32px); }
      h1 { font-size: clamp(24px, 3vw, 34px); margin: 0; letter-spacing: -0.02em; }
      .lede { color: #94a3b8; margin: 6px 0 20px; max-width: 70ch; }
      .controls { align-items: center; display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
      label { font-weight: 600; }
      select { background: #1e293b; border: 1px solid #475569; border-radius: 8px; color: inherit; font: inherit; min-height: 36px; padding: 6px 10px; }
      select:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }
      #status { color: #94a3b8; }
      #status.error { color: #f87171; }
      .panel { background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow-x: auto; }
      table { border-collapse: collapse; width: 100%; }
      caption { padding: 12px 16px; text-align: left; color: #94a3b8; }
      th, td { padding: 10px 16px; text-align: left; border-top: 1px solid #334155; }
      th { color: #94a3b8; font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; }
      td.rank { font-variant-numeric: tabular-nums; font-weight: 700; width: 72px; }
      tr.top td.rank { color: #fbbf24; }
      .stars { color: #fbbf24; white-space: nowrap; }
      .muted { color: #94a3b8; }
      .empty { color: #94a3b8; padding: 24px 16px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Game Leaderboard</h1>
      <p class="lede">Games ranked by their catalog star rating. These are ratings, not gameplay scores or live backing activity. Tied ratings share a rank, and unrated games are listed last.</p>
      <div class="controls">
        <label for="genre">Genre</label>
        <select id="genre" data-testid="leaderboard-genre-filter"></select>
        <span id="status" role="status" aria-live="polite"></span>
      </div>
      <div class="panel" id="panel"></div>
    </main>
    <script>
      const select = document.querySelector("#genre");
      const panel = document.querySelector("#panel");
      const status = document.querySelector("#status");
      const initialGenre = ${JSON.stringify(initialGenre ?? "")};

      const el = (tag, text, className) => {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
      };

      const render = (data) => {
        panel.replaceChildren();
        if (!data.entries.length) {
          panel.append(el("p", "No games found for this genre.", "empty"));
          return;
        }
        const table = el("table");
        table.dataset.testid = "leaderboard-table";
        const caption = el("caption", data.genre ? "Top " + data.genre + " games" : "Top games across all genres");
        const head = el("tr");
        for (const name of ["Rank", "Game", "Genre", "Publisher", "Star rating"]) {
          const th = el("th", name);
          th.scope = "col";
          head.append(th);
        }
        const thead = el("thead");
        thead.append(head);
        const tbody = el("tbody");
        for (const entry of data.entries) {
          const row = el("tr", undefined, entry.rank !== null && entry.rank <= 3 ? "top" : "");
          row.dataset.testid = "leaderboard-row-" + entry.id;
          const rank = el("td", entry.rank === null ? "–" : String(entry.rank), "rank");
          if (entry.rank === null) rank.setAttribute("aria-label", "Unranked");
          row.append(rank, el("td", entry.title), el("td", entry.genre), el("td", entry.publisher));
          if (entry.starRating === null) {
            row.append(el("td", "Not yet rated", "muted"));
          } else {
            const stars = el("td", entry.starRating.toFixed(1) + " ★", "stars");
            stars.setAttribute("aria-label", entry.starRating.toFixed(1) + " out of 5 stars");
            row.append(stars);
          }
          tbody.append(row);
        }
        table.append(caption, thead, tbody);
        panel.append(table);
      };

      const load = async (genre) => {
        status.textContent = "Loading leaderboard...";
        status.className = "";
        try {
          const response = await fetch("/api/leaderboard" + (genre ? "?genre=" + encodeURIComponent(genre) : ""));
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? "Request failed.");
          if (!select.options.length) {
            select.append(new Option("All genres", ""));
            for (const name of data.genres) select.append(new Option(name, name));
          }
          select.value = data.genre ?? "";
          render(data);
          status.textContent = data.entries.length + " game(s)";
        } catch (error) {
          panel.replaceChildren();
          status.textContent = error.message;
          status.className = "error";
        }
      };

      select.addEventListener("change", () => load(select.value));
      load(initialGenre);
    </script>
  </body>
</html>`;
}
