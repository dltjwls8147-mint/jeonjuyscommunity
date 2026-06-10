import { expect, test } from '@playwright/test';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

test('right-clicking the logo opens the easter egg image popup', async ({ page }) => {
  await page.goto(baseUrl);

  await expect(page.locator('#catModal')).toHaveClass(/hidden/);
  await page.locator('#logo').click({ button: 'right' });

  await expect(page.locator('#catModal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#catImage')).toBeVisible();
  await expect(page.locator('#catImage')).toHaveAttribute('src', /logo-easter-egg\.svg$/);

  await page.keyboard.press('Escape');
  await expect(page.locator('#catModal')).toHaveClass(/hidden/);
});
