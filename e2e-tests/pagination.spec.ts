import { test, expect } from '@playwright/test';

test.describe('Game list pagination', () => {
  test('shows pagination controls and first page state', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('pagination')).toBeVisible();
    await expect(page.getByTestId('pagination-page-1')).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('pagination-prev')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByTestId('pagination-next')).toBeVisible();
  });

  test('navigates to the next page with different games', async ({ page }) => {
    await page.goto('/');
    const firstTitles = await page.locator('[data-testid="game-card"]').allInnerTexts();
    await page.getByTestId('pagination-next').click();
    await expect(page).toHaveURL(/\/page\/2$/);
    await expect(page.getByTestId('pagination-page-2')).toHaveAttribute('aria-current', 'page');
    const secondTitles = await page.locator('[data-testid="game-card"]').allInnerTexts();
    expect(secondTitles.length).toBeGreaterThan(0);
    expect(secondTitles).not.toEqual(firstTitles);
  });

  test('last page disables next and previous returns to the home page', async ({ page }) => {
    await page.goto('/');
    const links = page.locator('[data-testid^="pagination-page-"]');
    const last = await links.count();
    await page.goto(`/page/${last}`);
    await expect(page.getByTestId('pagination-next')).toHaveAttribute('aria-disabled', 'true');
    await page.goto('/page/2');
    await page.getByTestId('pagination-prev').click();
    await expect(page).toHaveURL(/\/$/);
  });
});
