import { test, expect } from '@playwright/test';

test.describe('Game search', () => {
  test('filters games by title case-insensitively', async ({ page }) => {
    await page.goto('/');
    const cards = page.getByTestId('game-card');
    const total = await cards.count();
    const title = (await cards.first().getByTestId('game-title').innerText()).trim();

    await page.getByTestId('game-search-input').fill(title.toUpperCase());
    await expect(cards.filter({ visible: true }).first().getByTestId('game-title')).toHaveText(title);
    expect(await cards.filter({ visible: true }).count()).toBeLessThanOrEqual(total);

    await page.getByTestId('game-search-input').fill('');
    await expect(cards.filter({ visible: true })).toHaveCount(total);
  });

  test('shows an empty state when nothing matches', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('game-search-input').fill('zzzz-no-such-game');
    await expect(page.getByTestId('empty-state-text')).toHaveText('No games match your search.');
    await expect(page.getByTestId('games-grid')).toBeHidden();
  });

  test('search input is labelled and keyboard focusable', async ({ page }) => {
    await page.goto('/');
    const input = page.getByLabel('Search games by title');
    await input.focus();
    await expect(input).toBeFocused();
  });
});
