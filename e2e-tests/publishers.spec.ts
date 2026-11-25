import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Publisher pages', () => {
  test('shows a publisher description and games linked from game details', async ({ page }) => {
    await page.goto('/game/1');

    const publisherLink = page.getByTestId('game-details-publisher-link');
    const publisherName = await publisherLink.innerText();
    await expect(publisherLink).toHaveAttribute('href', /^\/publisher\/\d+$/);

    await publisherLink.click();

    await expect(page).toHaveURL(/\/publisher\/\d+$/);
    await expect(page.getByTestId('publisher-games-heading')).toHaveText(`Games by ${publisherName}`);
    await expect(page.getByTestId('publisher-description')).not.toBeEmpty();
    await expect(page.getByTestId('publisher-games-grid')).toBeVisible();
    await expect(page.getByTestId('game-card').first()).toBeVisible();
    await expect(
      page.getByTestId('game-title').filter({ hasText: 'DevOps Dominion' }),
    ).toHaveCount(1);

    const accessibilityResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(accessibilityResults.violations).toEqual([]);
  });
});
