import { test, expect } from '@playwright/test';

const ROUTES = [
  '/',
  '/models',
  '/leaderboards',
  '/coding-agents',
  '/trends',
  '/chat',
  '/changelog',
  '/speech-to-text',
  '/text-to-speech',
  '/image/leaderboard/text-to-image',
];

/** Every major route renders without console errors and shows key content. */
for (const route of ROUTES) {
  test(`${route} renders cleanly`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    expect(errors, `console errors on ${route}`).toEqual([]);
  });
}

test('homepage hero + persona lens filters content', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /frontier, tracked automatically/i })).toBeVisible();
  const bussinessTab = page.getByRole('tab', { name: 'Business' });
  await bussinessTab.click();
  // Newswire should still render (filtered or empty-state, never a crash).
  await expect(page.locator('#latest')).toBeVisible();
});

test('model detail page renders for a real slug', async ({ page }) => {
  // Discover a real slug from the models catalog API.
  const res = await page.request.get('/api/models/catalog');
  const data = await res.json();
  const first = data?.models?.[0];
  test.skip(!first, 'no models in catalog');
  const slug = String(first.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  await page.goto(`/models/${slug}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1')).toContainText(first.name.split(' ')[0]);
});

test('chat AI toggle degrades gracefully with no key', async ({ page }) => {
  await page.goto('/chat', { waitUntil: 'domcontentloaded' });
  const toggle = page.getByRole('switch', { name: /toggle ai mode/i });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await page.getByPlaceholder(/ask about models/i).fill('Cheapest models');
  await page.getByRole('button', { name: /send message/i }).click();
  // Either an AI answer with badge or a graceful fallback notice — never a hang.
  await expect(page.locator('text=AI-generated').or(page.locator('text=deterministic engine'))).toBeVisible({
    timeout: 45_000,
  });
});

test('leaderboard search filters rows', async ({ page }) => {
  await page.goto('/models', { waitUntil: 'networkidle' });
  const search = page.getByLabel(/search all models/i);
  await expect(search).toBeVisible();
  // Wait for the catalog to populate the table before searching.
  await expect(page.getByText(/intelligence index vs/i).first()).toBeVisible({ timeout: 30_000 }).catch(() => {});
  await search.fill('zzz-no-such-model');
  await expect(page.getByText(/no models match/i)).toBeVisible({ timeout: 15_000 });
});
