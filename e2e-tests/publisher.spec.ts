import { test, expect } from '@playwright/test';

test.describe('Publisher page', () => {
  test('should link from a game card to the publisher page listing their games', async ({ page }) => {
    await page.goto('/');
    const card = page.getByTestId('game-card').first();
    const publisherName = (await card.getByTestId('game-publisher').textContent())?.trim() ?? '';

    await card.getByTestId('game-publisher-link').click();

    await expect(page).toHaveURL(/\/publisher\/\d+$/);
    await expect(page.getByTestId('publisher-name')).toHaveText(publisherName);
    await expect(page.getByTestId('publisher-description')).not.toBeEmpty();
    await expect(page.getByTestId('publisher-games-grid').getByTestId('game-card').first()).toBeVisible();
  });

  test('should link from game details to the publisher page', async ({ page }) => {
    await page.goto('/game/1');
    await page.getByTestId('game-details-publisher-link').click();
    await expect(page).toHaveURL(/\/publisher\/\d+$/);
    await expect(page.getByTestId('publisher-name')).toBeVisible();
  });

  test('should return a 404 for a non-existent publisher', async ({ page }) => {
    const response = await page.goto('/publisher/99999');
    expect(response?.status()).toBe(404);
    await expect(page.getByTestId('not-found')).toBeVisible();
  });
});
