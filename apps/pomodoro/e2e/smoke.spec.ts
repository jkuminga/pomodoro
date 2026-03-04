import { test, expect } from '@playwright/test';

async function installFakeNow(
  page: import('@playwright/test').Page,
  startMs = 1_700_000_000_000
) {
  await page.addInitScript(
    (ms) => {
      // @ts-expect-error test-only
      window.__FAKE_NOW__ = ms;
      // @ts-expect-error test-only
      window.__advanceNow__ = (delta: number) => (window.__FAKE_NOW__ += delta);
      Date.now = () => {
        // @ts-expect-error test-only
        return window.__FAKE_NOW__;
      };
    },
    startMs
  );
}

async function advanceNow(page: import('@playwright/test').Page, deltaMs: number) {
  await page.evaluate((delta) => {
    // @ts-expect-error test-only
    window.__advanceNow__(delta);
  }, deltaMs);
  // Allow one real tick to render (keep this short)
  await page.waitForTimeout(350);
}

test('has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/pomodoro/);
});

test('settings persist across reload', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByLabel('Focus (min)').fill('30');
  await page.getByLabel('Break (min)').fill('10');
  await page.getByLabel('Rounds').fill('3');

  await page.reload();

  await expect(page.getByLabel('Focus (min)')).toHaveValue('30');
  await expect(page.getByLabel('Break (min)')).toHaveValue('10');
  await expect(page.getByLabel('Rounds')).toHaveValue('3');
});

test('resume after reload uses epoch math (remaining reduced)', async ({ page }) => {
  let nowMs = 1_700_000_000_000;
  await installFakeNow(page, nowMs);

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByLabel('Focus (min)').fill('1');
  await page.getByLabel('Break (min)').fill('1');
  await page.getByLabel('Rounds').fill('2');

  await page.getByLabel('Start timer').click();

  nowMs += 30_000;
  await advanceNow(page, 30_000);
  await expect(page.locator('.time-display')).toHaveText('00:30');

  await installFakeNow(page, nowMs);
  await page.reload();

  await expect(page.locator('.time-display')).toHaveText('00:30');
});

test('focus expiry transitions to Break and pauses (one-boundary)', async ({ page }) => {
  let nowMs = 1_700_000_000_000;
  await installFakeNow(page, nowMs);

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByLabel('Focus (min)').fill('1');
  await page.getByLabel('Break (min)').fill('1');
  await page.getByLabel('Rounds').fill('2');

  await page.getByLabel('Start timer').click();

  nowMs += 60_000;
  await advanceNow(page, 60_000);

  await expect(page.getByText('Break', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Resume timer')).toBeVisible();
  await expect(page.getByLabel('Pause timer')).toBeDisabled();
  await expect(page.locator('.time-display')).toHaveText('01:00');
});

test('completed state shows message and reset works', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (err) => consoleErrors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  let nowMs = 1_700_000_000_000;
  await installFakeNow(page, nowMs);

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByLabel('Focus (min)').fill('1');
  await page.getByLabel('Break (min)').fill('1');
  await page.getByLabel('Rounds').fill('1');

  await page.getByLabel('Start timer').click();

  nowMs += 60_000;
  await advanceNow(page, 60_000);

  await expect(page.getByText('All rounds complete!')).toBeVisible();
  await expect(page.getByLabel('Start timer')).toBeDisabled();

  await page.screenshot({ path: '../../.sisyphus/evidence/task-10-complete.png', fullPage: true });

  await page.getByLabel('Reset timer').click();

  await expect(page.getByText('Ready to focus?')).toBeVisible();
  await expect(page.getByLabel('Start timer')).toBeEnabled();
  await expect(page.locator('.time-display')).toHaveText('01:00');

  await page.screenshot({ path: '../../.sisyphus/evidence/task-10-reset.png', fullPage: true });

  expect(consoleErrors).toEqual([]);
});
