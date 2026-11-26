import { expect, test } from '@playwright/test';
import { begin, collectErrors } from './helpers';

test('landing → Begin → the song plays and the tree grows, with no console errors', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Seedsong' })).toBeVisible();
  await expect(page.getByText('Best with headphones')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Begin' })).toBeFocused();
  await begin(page);
  await page.waitForTimeout(3500);
  const label = await page.getByRole('img').first().getAttribute('aria-label');
  expect(label).toMatch(/branches, \d+ levels deep, playing in/);
  const pos = page.getByRole('slider', { name: /Position in the song/ });
  const value = Number(await pos.inputValue());
  expect(value).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('keyboard: shortcuts change mood, mode and seed', async ({ page }) => {
  await begin(page);
  await page.keyboard.press('3');
  await expect(page.getByRole('radio', { name: 'Deep Ocean' })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('w');
  await expect(page.getByRole('radio', { name: /Bloom/ })).toHaveAttribute('aria-checked', 'true');
  const sub = page.locator('.brand-sub');
  const before = await sub.textContent();
  await page.keyboard.press('n');
  await expect(sub).not.toHaveText(before ?? '');
  await page.keyboard.press('l');
  await expect(page.getByRole('complementary', { name: 'Recursion lens' })).toBeVisible();
});
