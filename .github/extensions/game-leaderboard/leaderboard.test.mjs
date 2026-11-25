import { describe, expect, it } from "vitest";
import { listGenres, rankGames } from "./leaderboard.mjs";

const game = (id, title, genre, starRating) => ({ id, title, genre, publisher: "Pub", starRating });

const games = [
    game(1, "Delta", "Strategy", 4.2),
    game(2, "Alpha", "Puzzle", 4.8),
    game(3, "Charlie", "Strategy", 4.8),
    game(4, "Bravo", "Puzzle", null),
    game(5, "Echo", "Strategy", 3.1),
];

describe("rankGames", () => {
    it("ranks by rating, shares ranks for ties, and skips to the next position", () => {
        const ranked = rankGames(games);

        expect(ranked.map((g) => [g.title, g.rank])).toEqual([
            ["Alpha", 1],
            ["Charlie", 1],
            ["Delta", 3],
            ["Echo", 4],
            ["Bravo", null],
        ]);
    });

    it("filters by genre and ranks within it", () => {
        const ranked = rankGames(games, { genre: "Puzzle" });

        expect(ranked.map((g) => [g.title, g.rank])).toEqual([
            ["Alpha", 1],
            ["Bravo", null],
        ]);
    });

    it("places all unrated games last, ordered by title", () => {
        const ranked = rankGames([game(1, "Zed", "X", null), game(2, "Amp", "X", null), game(3, "Mid", "X", 3)]);

        expect(ranked.map((g) => [g.title, g.rank])).toEqual([
            ["Mid", 1],
            ["Amp", null],
            ["Zed", null],
        ]);
    });

    it("returns an empty list for an unknown genre", () => {
        expect(rankGames(games, { genre: "Nope" })).toEqual([]);
    });
});

describe("listGenres", () => {
    it("returns distinct genres alphabetically", () => {
        expect(listGenres(games)).toEqual(["Puzzle", "Strategy"]);
    });
});
