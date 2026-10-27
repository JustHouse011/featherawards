import { test, expect } from '@playwright/test';

test('closed RSVP message is centred, complete and responsive without registration controls', async ({ page }) => {
  test.setTimeout(180000);
  for (const width of [1440, 1280, 1024, 768, 430, 390, 360]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('heading', { name: 'RSVP REGISTRATION CLOSED' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'THANK YOU FOR YOUR INTEREST' })).toBeVisible();
    await expect(page.getByText('Registration for the Feather Awards 2026 is now officially closed.')).toBeVisible();
    await expect(page.getByText('We sincerely thank everyone who confirmed their attendance and look forward to celebrating an unforgettable evening with you.')).toBeVisible();
    await expect(page.getByText('SEE YOU ON 05 NOVEMBER 2026')).toBeVisible();
    await expect(page.getByText('The Feather Awards Team')).toBeVisible();
    await expect(page.locator('#rsvp form, #rsvp input, #rsvp .step-indicator, #rsvp button')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    const centered = await page.locator('.rsvp-closed').evaluate(element => {
      const card = element.closest('.glass-panel')!.getBoundingClientRect();
      const message = element.getBoundingClientRect();
      return Math.abs((card.left + card.right) / 2 - (message.left + message.right) / 2) < 2;
    });
    expect(centered).toBeTruthy();
    const event = page.getByRole('region', { name: 'Event information' });
    await expect(event.getByText('05 NOVEMBER 2026', { exact: true })).toBeVisible();
    await expect(event.getByText('MELROSE ARCH', { exact: true })).toBeVisible();
    await expect(event.getByText('18:00', { exact: true })).toBeVisible();
    await expect(event.getByText('DRESS CODE')).toBeVisible();
  }
});

test('home-page call to action navigates to the closure notice', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'RSVP REGISTRATION CLOSED' }).click();
  await expect(page.locator('#rsvp')).toBeInViewport();
});

test('mobile menu remains keyboard accessible and reduced motion is respected', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Open navigation' });
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  expect(await page.locator('.hero-atmosphere i').first().evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  expect(await page.locator('.trophy-beams i').first().evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  expect(await page.locator('.trophy-glints i').first().evaluate(element => getComputedStyle(element).animationName)).toBe('none');
});
