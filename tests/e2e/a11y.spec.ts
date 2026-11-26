import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { begin } from './helpers';

async function audit(page: Page, label: string) {
  // let entrance animations settle so contrast is measured on the final colours
  await page.waitForTimeout(label === 'landing' ? 2200 : 700);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  if (bad.length) console.log(label, JSON.stringify(bad.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), null, 1));
  expect(bad, `${label}: serious/critical axe violations`).toEqual([]);
}

test('no serious or critical accessibility violations on any screen', async ({ page }) => {
  await page.goto('/');
  await audit(page, 'landing');
  await begin(page);
  await audit(page, 'garden');
  await page.getByRole('button', { name: 'Shape your garden' }).click();
  for (const tab of ['World', 'Sound', 'Atmosphere', 'Session']) {
    await page.getByRole('tab', { name: tab }).click();
    await audit(page, `drawer ${tab}`);
  }
  await page.keyboard.press('Escape');
  await page.keyboard.press('l');
  await audit(page, 'lens');
  await page.keyboard.press('i');
  await audit(page, 'inside a call');
  await page.keyboard.press('e');
  await audit(page, 'keep dialog');
  await page.keyboard.press('Escape');
  await page.keyboard.press('?');
  await audit(page, 'help dialog');
});
