import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { begin } from './helpers';

test('exports a non-silent WAV rendered offline', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`${e.message} ${e.stack ?? ''}`));
  await begin(page);
  // a short tree keeps the test quick
  await page.getByRole('button', { name: 'Shape your garden' }).click();
  const depth = page.getByRole('slider', { name: 'Depth', exact: true });
  await depth.fill('4');
  await page.waitForTimeout(800);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Keep this song/ }).click();
  const downloadPromise = page.waitForEvent('download', { timeout: 110_000 });
  await page.getByRole('button', { name: 'Download WAV' }).click();
  const download = await downloadPromise.catch((e) => {
    throw new Error(`${e.message} | page errors: ${errors.join(' --- ')}`);
  });
  expect(download.suggestedFilename()).toMatch(/^seedsong_dawn_.+\.wav$/);
  const file = await download.path();
  const bytes = readFileSync(file);
  expect(bytes.length).toBeGreaterThan(200_000);
  expect(bytes.subarray(0, 4).toString('ascii')).toBe('RIFF');
  // RMS of the 16-bit samples after the header
  const dataAt = bytes.indexOf('data');
  let sum = 0;
  let n = 0;
  for (let i = dataAt + 8; i + 1 < bytes.length; i += 2) {
    const v = bytes.readInt16LE(i) / 32768;
    sum += v * v;
    n++;
  }
  const rmsDb = 20 * Math.log10(Math.sqrt(sum / n));
  console.log(`exported WAV: ${(bytes.length / 1e6).toFixed(2)} MB, RMS ${rmsDb.toFixed(1)} dBFS`);
  expect(rmsDb).toBeGreaterThan(-45);
  await expect(page.getByText('It is in your downloads')).toBeVisible();
  expect(errors).toEqual([]);
});
