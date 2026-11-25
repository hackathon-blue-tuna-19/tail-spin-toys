import { test, expect } from '@playwright/test';

test.describe('Game Leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leaderboard');
  });

  test('shows a ranked catalog and links games to their details', async ({ page }) => {
    await expect(page).toHaveTitle('Game Leaderboard - Tailspin Toys');
    await expect(page.getByRole('heading', { name: 'Game Leaderboard' })).toBeVisible();
    await expect(page.getByTestId('leaderboard-table')).toBeVisible();

    const rows = page.getByTestId('leaderboard-row');
    await expect(rows.first()).toBeVisible();
    await expect(rows.first().getByTestId('leaderboard-game-link')).toHaveAttribute('href', /^\/game\/\d+$/);
    await expect(page.getByText(/not gameplay scores or a measure of backing activity/)).toBeVisible();
  });

  test('filters the leaderboard by genre and restores all games', async ({ page }) => {
    const genreFilter = page.getByTestId('leaderboard-genre-filter');
    const rows = page.getByTestId('leaderboard-row');
    const allRowsCount = await rows.count();
    const categoryId = await genreFilter.locator('option').nth(1).getAttribute('value');
    expect(categoryId).not.toBeNull();

    const matchingCount = await rows.evaluateAll(
      (elements, selectedCategory) =>
        elements.filter((row) => row.getAttribute('data-category-id') === selectedCategory).length,
      categoryId,
    );

    await genreFilter.selectOption(categoryId!);
    await expect(rows).toHaveCount(allRowsCount);
    await expect(page.getByTestId('leaderboard-results-count')).toHaveText(
      `${matchingCount} ${matchingCount === 1 ? 'game' : 'games'}`,
    );
    await expect
      .poll(() => rows.evaluateAll((elements) => elements.filter((row) => !row.hasAttribute('hidden')).length))
      .toBe(matchingCount);

    await genreFilter.selectOption('');
    await expect(page.getByTestId('leaderboard-results-count')).toHaveText(
      `${allRowsCount} ${allRowsCount === 1 ? 'game' : 'games'}`,
    );
    await expect
      .poll(() => rows.evaluateAll((elements) => elements.filter((row) => !row.hasAttribute('hidden')).length))
      .toBe(allRowsCount);
  });

  test('provides leaderboard navigation from the site menu', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Toggle menu' }).click();
    await page.getByTestId('nav-leaderboard').click();

    await expect(page).toHaveURL('/leaderboard');
    await expect(page.getByRole('heading', { name: 'Game Leaderboard' })).toBeVisible();
  });
});
