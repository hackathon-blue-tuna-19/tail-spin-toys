import { test, expect } from '@playwright/test';

test.describe('Game search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Search - filters games case-insensitively by title', async ({ page }) => {
    const cards = page.getByTestId('game-card');
    const total = await cards.count();
    const title = (await cards.first().getAttribute('data-game-title')) ?? '';

    await page.getByRole('searchbox', { name: 'Search games by title' }).fill(title.toUpperCase());

    await expect(cards.filter({ visible: true }).first()).toHaveAttribute('data-game-title', title);
    expect(await cards.filter({ visible: true }).count()).toBeLessThanOrEqual(total);
  });

  test('Search - shows empty state when nothing matches and recovers on clear', async ({ page }) => {
    const input = page.getByTestId('game-search-input');

    await input.fill('zzz-no-such-game');
    await expect(page.getByTestId('empty-state-text')).toHaveText('No games match your search.');
    await expect(page.getByTestId('game-card').filter({ visible: true })).toHaveCount(0);

    await input.fill('');
    await expect(page.getByTestId('empty-state')).toBeHidden();
    await expect(page.getByTestId('game-card').first()).toBeVisible();
  });
});
