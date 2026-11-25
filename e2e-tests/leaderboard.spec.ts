import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Game Leaderboard', () => {
  test('shows catalog ratings in descending order with shared ranks for ties', async ({ page }) => {
    await page.goto('/leaderboard');

    const rows = page.getByTestId('leaderboard-row');
    await expect(rows.first()).toBeVisible();
    const ratings = await rows.evaluateAll((elements) =>
      elements.map((row) => {
        const value = row.getAttribute('data-rating');
        return value === '' ? null : Number(value);
      }),
    );
    const ratedRatings = ratings.filter((rating): rating is number => rating !== null);
    expect(ratedRatings).toEqual([...ratedRatings].sort((left, right) => right - left));
    expect(ratings.slice(ratedRatings.length).every((rating) => rating === null)).toBeTruthy();

    const firstRatedRating = ratedRatings[0];
    if (firstRatedRating !== undefined) {
      const tiedRows = page.locator(
        `[data-testid="leaderboard-row"][data-rating="${firstRatedRating}"]`,
      );
      if (await tiedRows.count() > 1) {
        await expect(tiedRows.first().getByTestId('leaderboard-rank')).toHaveText('1');
        await expect(tiedRows.nth(1).getByTestId('leaderboard-rank')).toHaveText('1');
      }
    }
  });

  test('filters by genre and recalculates ranks for the visible games', async ({ page }) => {
    await page.goto('/leaderboard');

    const genreFilter = page.getByRole('combobox', { name: 'Filter by genre' });
    await genreFilter.selectOption({ label: 'Puzzle' });

    const visibleRows = page.getByTestId('leaderboard-row').filter({ visible: true });
    await expect(visibleRows.first()).toBeVisible();
    await expect(visibleRows.first().getByTestId('leaderboard-rank')).toHaveText('1');
    await expect(page.getByTestId('leaderboard-results')).toContainText('Showing');
    await expect(page.getByTestId('leaderboard-row').filter({ visible: false })).not.toHaveCount(0);
  });

  test('navigates from a leaderboard entry to game details', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.getByTestId('leaderboard-game-link').first().click();

    await expect(page).toHaveURL(/\/game\/\d+$/);
    await expect(page.getByTestId('game-details')).toBeVisible();
  });

  test('has no accessibility violations', async ({ page }) => {
    await page.goto('/leaderboard');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
