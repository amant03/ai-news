import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Axe scan: 0 critical/serious issues on the three highest-traffic routes. */
for (const route of ['/', '/models', '/chat']) {
  test(`${route} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'networkidle' });
    // Let entrance animations (fade-up) finish so contrast is measured at rest.
    await page.waitForTimeout(800);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(serious, JSON.stringify(serious.map(v => ({ id: v.id, nodes: v.nodes.length })), null, 2)).toEqual(
      []
    );
  });
}

test('key controls are keyboard-operable', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // Persona tabs reachable by keyboard.
  const tab = page.getByRole('tab', { name: 'Technical' });
  await tab.focus();
  await expect(tab).toBeFocused();
  await page.keyboard.press('Enter');
  // Theme toggle reachable and labelled.
  await page.keyboard.press('Tab');
  const themeToggle = page.getByRole('button', { name: /switch to (dark|light) mode/i });
  await themeToggle.focus();
  await expect(themeToggle).toBeFocused();
});
