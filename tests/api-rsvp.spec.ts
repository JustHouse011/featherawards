import { test, expect } from '@playwright/test';
import { createRSVPHandler, createEmails, validateRSVP } from '../api/rsvp';

const payload = { firstName: 'Lerato', surname: 'Mokoena', email: 'lerato@example.com', mobile: '+27 82 123 4567', attending: true, bringingGuest: false, guestFirstName: '', guestSurname: '', website: '' };
const env = { RESEND_API_KEY: 'fixture', RSVP_FROM_EMAIL: 'Feather Awards <sender@example.com>', RSVP_NOTIFICATION_EMAIL: 'team@example.com', RSVP_REPLY_TO_EMAIL: 'reply@example.com' };

async function invoke(body: unknown = payload, method = 'POST', contentType = 'application/json') {
  let status = 0;
  let result: { success: boolean; message: string } | undefined;
  let sends = 0;
  const handler = createRSVPHandler(async () => { sends++; return true; }, env);
  const req = { method, headers: { 'content-type': contentType }, body } as Parameters<typeof handler>[0];
  const res = { setHeader() {}, set statusCode(value: number) { status = value; }, end(value: string) { result = JSON.parse(value); } } as unknown as Parameters<typeof handler>[1];
  await handler(req, res);
  return { status, result, sends };
}

test('public RSVP POST is rejected before parsing, persistence or email delivery', async () => {
  const response = await invoke();
  expect(response.status).toBe(403);
  expect(response.result).toEqual({ success: false, message: 'RSVP registration is closed. New registrations are not being accepted.' });
  expect(response.sends).toBe(0);

  const malformed = await invoke('{', 'POST', 'text/plain');
  expect(malformed.status).toBe(403);
  expect(malformed.sends).toBe(0);
});

test('non-POST methods remain disallowed', async () => {
  expect((await invoke(payload, 'GET')).status).toBe(405);
});

test('RSVP validation and email helpers remain available without sending messages', () => {
  const data = validateRSVP(payload);
  expect(data.email).toBe('lerato@example.com');
  const emails = createEmails(data, { from: env.RSVP_FROM_EMAIL, notification: env.RSVP_NOTIFICATION_EMAIL }, '2026-10-08T00:00:00Z');
  expect(emails).toHaveLength(2);
  expect(emails[0].to).toBe('lerato@example.com');
  expect(emails[1].to).toBe('team@example.com');
});
