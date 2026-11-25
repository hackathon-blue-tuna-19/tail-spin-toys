import { test, expect } from '@playwright/test';

test.describe('Backer Concierge', () => {
  test('is reachable from the main navigation', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Toggle menu').click();
    await page.getByRole('link', { name: 'Concierge' }).click();
    await expect(page).toHaveURL(/\/concierge$/);
    await expect(page.getByTestId('page-hero-title')).toHaveText('Backer Concierge');
  });

  test('asks a question and renders the stubbed answer', async ({ page }) => {
    let requestBody: unknown;
    await page.route('**/api/concierge', async (route) => {
      requestBody = route.request().postDataJSON();
      await route.fulfill({
        json: {
          answer: 'Merge Conflict is a good fit for git pun fans.',
          recommendations: [
            { title: 'Merge Conflict', category: 'Strategy', publisher: 'Rebase Games', starRating: 4.5, reason: 'Packed with git puns.' },
          ],
          clarifyingQuestion: 'Do you prefer co-op or competitive play?',
          generalContext: 'Co-op games are popular with developer teams.',
        },
      });
    });

    await page.goto('/concierge');
    await page.getByTestId('concierge-input').fill('Which game suits people who like git puns?');
    await page.getByTestId('concierge-submit').click();

    await expect(page.getByTestId('concierge-answer')).toContainText('Merge Conflict is a good fit');
    await expect(page.getByTestId('concierge-recommendation-0')).toContainText('Rebase Games');
    await expect(page.getByTestId('concierge-clarify')).toContainText('co-op or competitive');
    await expect(page.getByTestId('concierge-context')).toContainText('not a Tailspin catalog fact');
    expect(requestBody).toEqual({ question: 'Which game suits people who like git puns?' });
  });

  test('shows an error when the assistant call fails', async ({ page }) => {
    await page.route('**/api/concierge', (route) => route.fulfill({ status: 500, body: 'nope' }));
    await page.goto('/concierge');
    await page.getByTestId('concierge-input').fill('Anything good?');
    await page.getByTestId('concierge-submit').click();
    await expect(page.getByTestId('concierge-error')).toContainText('unavailable');
  });
});
