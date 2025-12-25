import { test, expect } from '@playwright/test';

test('home loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=SoundPath')).toBeVisible();
});

test('settings page requires sign-in', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.locator('text=Sign in to manage your settings.')).toBeVisible();
});

test('library page requires sign-in', async ({ page }) => {
  await page.goto('/library');
  await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible();
  await expect(page.locator('text=Sign in to view and manage your library.')).toBeVisible();
});
