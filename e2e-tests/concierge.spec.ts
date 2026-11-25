import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const catalog = {
  source: 'Tailspin Toys crowdfunding catalog',
  note: 'Catalog facts only.',
  gameCount: 2,
  categories: ['Strategy'],
  publishers: ['GitHub Games', 'Ops Interactive'],
  games: [
    {
      id: 1,
      title: 'Repo Rulers',
      description: 'Repository management in a tactical arena.',
      category: 'Strategy',
      publisher: 'GitHub Games',
      starRating: 4.8,
      ratingLabel: '★★★★★',
    },
    {
      id: 2,
      title: 'Server Siege',
      description: 'A strategy game about defending a digital fortress.',
      category: 'Strategy',
      publisher: 'Ops Interactive',
      starRating: 4.1,
      ratingLabel: '★★★★',
    },
  ],
};

test.describe('Backer Concierge', () => {
  test('is reachable from the main navigation', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Toggle menu' }).click();
    await page.getByTestId('nav-concierge').click();

    await expect(page).toHaveURL(/\/concierge\/?$/);
    await expect(page.getByRole('heading', { name: 'Backer Concierge' })).toBeVisible();
  });

  test('has no accessibility violations before a question is submitted', async ({ page }) => {
    await page.goto('/concierge');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('answers a catalog question using a stubbed catalog response', async ({ page }) => {
    await page.route('**/catalog.json', async (route) => {
      await route.fulfill({ json: catalog });
    });
    await page.goto('/concierge');

    await page.getByTestId('concierge-question').fill('Which strategy game has the highest rating?');
    await page.getByTestId('concierge-submit').click();

    await expect(page.getByTestId('concierge-status')).toHaveText('Catalog answer ready.');
    await expect(page.getByTestId('concierge-answer')).toContainText('The highest-rated Strategy game listed is:');
    await expect(page.getByTestId('concierge-game-1')).toContainText('Repo Rulers');
    await expect(page.getByTestId('concierge-game-1')).toContainText('GitHub Games');
    await expect(page.getByTestId('concierge-game-1')).toContainText('★★★★★');
    await expect(page.getByTestId('concierge-game-link-1')).toHaveAttribute('href', '/game/1');
    await expect(page.getByTestId('concierge-game-2')).toHaveCount(0);
  });
});
