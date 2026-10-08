import { test, expect } from '@playwright/test';
import { createRSVPHandler } from '../api/rsvp';
import { createEmails, validateRSVP } from '../server/rsvp';
const payload = { firstName: ' Lerato ', surname: 'Mokoena', email: ' LERATO@EXAMPLE.COM ', mobile: '+27 82 123 4567', attending: true, bringingGuest: false, guestFirstName: '', guestSurname: '', website: '' };
const env = { RESEND_API_KEY: 'test-placeholder-not-a-real-key', RSVP_FROM_EMAIL: 'Feather Awards <sender@example.com>', RSVP_NOTIFICATION_EMAIL: 'team@example.com', RSVP_REPLY_TO_EMAIL: 'reply@example.com' };
async function invoke(body: unknown = payload, options: { method?: string; contentType?: string; env?: typeof env; fail?: boolean; throws?: boolean } = {}) {
  let status = 0; let result: { success: boolean; message: string } | undefined;
  let sent: ReturnType<typeof createEmails> | undefined;
  const handler = createRSVPHandler(async emails => { sent = emails; if (options.throws) throw Error('private-key-provider-error'); return !options.fail; }, options.env ?? env);
  const req = { method: options.method ?? 'POST', headers: { 'content-type': options.contentType ?? 'application/json' }, body } as Parameters<typeof handler>[0];
  const res = { setHeader() {}, set statusCode(value: number) { status = value; }, end(value: string) { result = JSON.parse(value); } } as unknown as Parameters<typeof handler>[1];
  await handler(req, res);
  return { status, result, sent };
}
test('API normalizes attending RSVP and sends two separate email recipients', async () => {
  const response = await invoke({ ...payload, bringingGuest: true, guestFirstName: 'Thabo', guestSurname: 'Nkosi' });
  expect(response.status).toBe(200); expect(response.result?.success).toBe(true);
  expect(response.sent).toHaveLength(2);
  expect(response.sent?.[0].to).toBe('lerato@example.com');
  expect(response.sent?.[0].subject).toBe("You're on the list — Feather Awards XVIII");
  expect(response.sent?.[0].replyTo).toBe('reply@example.com');
  expect(response.sent?.[0].html).toContain('Thabo Nkosi');
  expect(response.sent?.[1].to).toBe('team@example.com');
  expect(response.sent?.[1].replyTo).toBe('lerato@example.com');
  expect(response.sent?.[1].text).toMatch(/Submission timestamp \(UTC\): \d{4}-/);
});
test('decline acknowledgement never confirms attendance or includes a guest', async () => {
  const response = await invoke({ ...payload, attending: false, guestFirstName: 'stale', guestSurname: 'values' });
  expect(response.status).toBe(200);
  expect(response.sent?.[0].subject).toBe('Feather Awards XVIII — RSVP received');
  expect(response.sent?.[0].html).not.toContain("YOU'RE ON THE LIST");
  expect(response.sent?.[0].text).toContain('will not be attending');
  expect(response.sent?.[1].subject).toContain('NOT ATTENDING');
  expect(response.sent?.[1].text).not.toContain('stale');
});
for (const [label, value] of Object.entries({
  malformed: '{', array: [], empty: {}, missing: { ...payload, firstName: '' }, email: { ...payload, email: 'invalid' }, mobile: { ...payload, mobile: '123' }, long: { ...payload, surname: 'a'.repeat(101) }, boolean: { ...payload, attending: 'true' }, guest: { ...payload, bringingGuest: true }, declineGuest: { ...payload, attending: false, bringingGuest: true }, honeypot: { ...payload, website: 'spam' }, unknown: { ...payload, unexpected: 'value' }, injection: { ...payload, firstName: 'Name\r\nBcc:evil' },
})) test(`rejects ${label} payload without sending`, async () => {
  const response = await invoke(value);
  expect(response.status).toBe(400); expect(response.result?.success).toBe(false); expect(response.sent).toBeUndefined();
});
test('POST only, JSON only and bounded body', async () => {
  expect((await invoke(payload, { method: 'GET' })).status).toBe(405);
  expect((await invoke(payload, { contentType: 'text/plain' })).status).toBe(415);
  expect((await invoke('a'.repeat(8193))).status).toBe(413);
  expect((await invoke(JSON.stringify(payload))).status).toBe(200);
});
test('missing configuration and provider failures return safe errors', async () => {
  expect((await invoke(payload, { env: { ...env, RESEND_API_KEY: '' } })).status).toBe(503);
  expect((await invoke(payload, { fail: true })).status).toBe(502);
  const response = await invoke(payload, { throws: true });
  expect(response.status).toBe(502); expect(response.result?.message).not.toContain('private-key');
});
test('HTML escapes names and strips unused guest data', async () => {
  const data = validateRSVP({ ...payload, firstName: '<img src=x onerror="evil">', guestFirstName: 'unused', guestSurname: 'unused' });
  const emails = createEmails(data, { from: env.RSVP_FROM_EMAIL, notification: env.RSVP_NOTIFICATION_EMAIL }, '2026-10-08T00:00:00Z');
  for (const email of emails) { expect(email.html).not.toContain('<img'); expect(email.html).toContain('&lt;img'); expect(email.html).not.toContain('unused'); }
});

test('official Resend SDK submits the two emails as one batch', async () => {
  const originalFetch = globalThis.fetch;
  let sentBody: unknown;
  globalThis.fetch = async (url, options) => {
    expect(String(url)).toBe('https://api.resend.com/emails/batch');
    sentBody = JSON.parse(String(options?.body));
    return new Response(JSON.stringify({ data: [{ id: 'guest-email' }, { id: 'team-email' }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const handler = createRSVPHandler(undefined, env);
    let status = 0;
    const req = { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload } as Parameters<typeof handler>[0];
    const res = { setHeader() {}, set statusCode(value: number) { status = value; }, end() {} } as unknown as Parameters<typeof handler>[1];
    await handler(req, res);
    expect(status).toBe(200); expect(sentBody).toHaveLength(2);
  } finally { globalThis.fetch = originalFetch; }
});
