import { expect, type Page } from '@playwright/test';

export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

export async function begin(page: Page) {
  await page.goto('/');
  const button = page.getByRole('button', { name: 'Begin' });
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.getByRole('button', { name: /Pause \(Space\)/ })).toBeVisible();
}
