import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.route('**/api/rsvp', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'RSVP confirmed' }) }));
});
async function fillDetails(page: import('@playwright/test').Page) {
  await page.getByLabel('First Name', { exact: true }).fill('Lerato');
  await page.getByLabel('Surname', { exact: true }).fill('Mokoena');
  await page.getByLabel('Email Address', { exact: true }).fill('lerato@example.com');
  await page.getByLabel('Mobile Number', { exact: true }).fill('+27 (82) 123-4567');
}
test('all requested widths render without horizontal overflow', async ({ page }) => {
  test.setTimeout(180000);
  for (const width of [1440, 1280, 1024, 768, 430, 390, 360]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('heading', { name: 'SIGNATURE STATEMENT?' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    const overflow = await page.locator('h1, .hero-actions, .rsvp-header h2, .signature-copy h2, .campaign-values').evaluateAll(elements => elements.filter(element => { const box = element.getBoundingClientRect(); return box.left < -1 || box.right > window.innerWidth + 1; }).map(element => element.className));
    expect(overflow).toEqual([]);
    expect(await page.locator('h1 span').evaluateAll(elements => elements.every(element => {
      const range = document.createRange(); range.selectNodeContents(element);
      const text = range.getBoundingClientRect(); const box = element.getBoundingClientRect();
      return text.left >= -1 && text.right <= innerWidth + 1 && text.right <= box.right + 2;
    }))).toBeTruthy();
    await page.locator('#rsvp').scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: 'GET ON THE LIST' })).toBeVisible();
    await page.locator('#dress-code').scrollIntoViewIfNeeded();
    await expect(page.locator('.signature-copy')).toHaveCSS('opacity', '1');
    // Keep captures in memory: verification should not require disk space.
    await page.screenshot({ fullPage: true });
  }
});
test('validates details, preserves information, confirms all four steps and downloads invitation/calendar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'YES, I’M READY' }).click();
  await expect(page.locator('.step-indicator li')).toHaveCount(4);
  await page.getByRole('button', { name: 'NEXT', exact: true }).click();
  await expect(page.getByText('Please enter your first name.')).toBeVisible();
  await fillDetails(page);
  await page.getByLabel('Email Address', { exact: true }).fill('invalid');
  await page.getByLabel('Mobile Number', { exact: true }).fill('123');
  await page.getByRole('button', { name: 'NEXT', exact: true }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await expect(page.getByText('Enter a valid mobile number', { exact: false })).toBeVisible();
  await fillDetails(page);
  await page.getByRole('button', { name: 'NEXT', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'YES — I’LL BE THERE' })).toBeChecked();
  await page.getByRole('button', { name: 'BACK', exact: true }).click();
  await expect(page.getByLabel('First Name', { exact: true })).toHaveValue('Lerato');
  await page.getByRole('button', { name: 'NEXT', exact: true }).click();
  await page.getByRole('button', { name: 'NEXT', exact: true }).click();
  await page.getByRole('radio', { name: 'YES — I’M BRINGING SOMEONE' }).check();
  await page.getByRole('button', { name: 'NEXT', exact: true }).click();
  await expect(page.getByText('Please enter your guest’s first name.')).toBeVisible();
  await page.getByLabel('Guest First Name', { exact: true }).fill('Thabo');
  await page.getByLabel('Guest Surname', { exact: true }).fill('Nkosi');
  await page.getByRole('button', { name: 'NEXT', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'CONFIRM', exact: true })).toBeVisible();
  await expect(page.locator('.step-indicator li[aria-current=step] > span')).toHaveText('4');
  await expect(page.locator('.step-connector')).toHaveCount(3);
  await expect(page.getByText('Thabo Nkosi', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'BACK', exact: true }).click();
  await expect(page.getByLabel('Guest First Name', { exact: true })).toHaveValue('Thabo');
  await page.getByRole('button', { name: 'NEXT', exact: true }).click();
  const submitted = page.waitForRequest(request => request.url().endsWith('/api/rsvp'));
  await page.getByRole('button', { name: 'CONFIRM MY RSVP' }).click();
  expect((await submitted).postDataJSON()).toEqual({ firstName: 'Lerato', surname: 'Mokoena', email: 'lerato@example.com', mobile: '+27 (82) 123-4567', attending: true, bringingGuest: true, guestFirstName: 'Thabo', guestSurname: 'Nkosi', website: '' });
  await expect(page.getByText('YOU’RE ON THE LIST.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lerato Mokoena' })).toBeFocused();
  const invitationPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'SAVE INVITATION' }).click();
  expect((await invitationPromise).suggestedFilename()).toBe('feather-awards-invitation.svg');
  const calendarPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'ADD TO CALENDAR' }).click();
  expect((await calendarPromise).suggestedFilename()).toBe('feather-awards-xviii.ics');
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});
test('decline skips guest step and shows the appropriate confirmation', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero-actions button')).toHaveCount(1);
  await page.getByRole('button', { name: 'YES, I’M READY' }).click();
  await fillDetails(page);
  await page.getByRole('button', { name: 'NEXT', exact: true }).click();
  await page.getByRole('radio', { name: 'UNFORTUNATELY, I CAN’T ATTEND' }).check();
  await expect(page.getByRole('radio', { name: 'UNFORTUNATELY, I CAN’T ATTEND' })).toBeChecked();
  await page.getByRole('button', { name: 'NEXT', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'CONFIRM', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'BACK', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'ATTENDANCE', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'NEXT', exact: true }).click();
  await page.getByRole('button', { name: 'CONFIRM MY RSVP' }).click();
  await expect(page.getByText('THANK YOU FOR LETTING US KNOW.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'ADD TO CALENDAR' })).toHaveCount(0);
});
test('mobile menu works with keyboard and reduced motion disables decorative movement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Open navigation' });
  await menu.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  expect(await page.locator('.hero-atmosphere i').first().evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  expect(await page.locator('.trophy-beams i').first().evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  expect(await page.locator('.trophy-glints i').first().evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  for (const selector of ['.trophy', '.panel-crystals', '.signature-section > img']) {
    expect(await page.locator(selector).evaluate(element => getComputedStyle(element).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  }
  const mobileOrder = await page.locator('.hero').evaluate(hero => {
    const selectors = ['.hero-copy > .eyebrow', 'h1', '.trophy-scene', '.hero-intro', '.hero-actions'];
    return selectors.map(selector => hero.querySelector(selector)!.getBoundingClientRect().top);
  });
  expect(mobileOrder).toEqual([...mobileOrder].sort((a, b) => a - b));
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  await page.getByRole('button', { name: 'YES, I’M READY' }).click();
  await fillDetails(page);
  await page.getByRole('button', { name: 'NEXT', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'ATTENDANCE', exact: true })).toBeVisible();
});

test('submission failure preserves details, permits retry and prevents rapid duplicate requests', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let requests = 0;
  await page.route('**/api/rsvp', async route => {
    requests++;
    await new Promise(resolve => setTimeout(resolve, 600));
    await route.fulfill({ status: requests === 1 ? 502 : 200, contentType: 'application/json', body: JSON.stringify({ success: requests !== 1, message: 'Private provider details must not reach the UI' }) });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'YES, I’M READY' }).click();
  await fillDetails(page);
  await page.getByRole('button', { name: 'NEXT', exact: true }).click();
  await page.getByRole('button', { name: 'NEXT', exact: true }).click();
  await page.getByRole('button', { name: 'NEXT', exact: true }).click();
  const button = page.getByRole('button', { name: 'CONFIRM MY RSVP' });
  await button.evaluate(el => { (el as HTMLButtonElement).click(); (el as HTMLButtonElement).click(); });
  await expect(page.getByRole('button', { name: 'CONFIRMING…' })).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText('Please try again');
  expect(requests).toBe(1);
  await expect(page.getByText('Lerato Mokoena', { exact: true })).toBeVisible();
  await expect(page.getByText('Private provider details must not reach the UI')).toHaveCount(0);
  await page.getByRole('button', { name: 'CONFIRM MY RSVP' }).click();
  await expect(page.getByText('YOU’RE ON THE LIST.', { exact: true })).toBeVisible();
  expect(requests).toBe(2);
});
