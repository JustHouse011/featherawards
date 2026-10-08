import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { createRSVPHandler, createEmails, validateRSVP, databaseRow, saveRSVP, RSVPPersistenceError } from '../api/rsvp';
const payload = { firstName: ' Lerato ', surname: 'Mokoena', email: ' LERATO@EXAMPLE.COM ', mobile: '+27 82 123 4567', attending: true, bringingGuest: false, guestFirstName: '', guestSurname: '', website: '' };
const env = { RESEND_API_KEY: 'test-placeholder-not-a-real-key', RSVP_FROM_EMAIL: 'Feather Awards <sender@example.com>', RSVP_NOTIFICATION_EMAIL: 'team@example.com', RSVP_REPLY_TO_EMAIL: 'reply@example.com', SUPABASE_URL: 'https://test-project.supabase.co', SUPABASE_SECRET_KEY: 'test-secret-placeholder' };
test('compiled endpoint imports and executes in native Node ESM without server helpers', () => {
  const source = readFileSync('api/rsvp.ts', 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true } }).outputText;
  expect(compiled).not.toMatch(/from\s+['"]\.{1,2}\//);
  mkdirSync('.local', { recursive: true });
  const filename = resolve('.local', `rsvp-native-${randomUUID()}.mjs`);
  writeFileSync(filename, compiled);
  try {
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', `
      const { default: endpoint, createRSVPHandler } = await import(${JSON.stringify(pathToFileURL(filename).href)});
      let status = 0, result;
      const response = { setHeader() {}, set statusCode(value) { status = value; }, end(value) { result = JSON.parse(value); } };
      await endpoint({ method: 'GET', headers: {} }, response);
      if (status !== 405) throw Error('Default endpoint did not execute');
      const handler = createRSVPHandler(async emails => emails.length === 2, ${JSON.stringify(env)}, async () => {});
      await handler({ method: 'POST', headers: { 'content-type': 'application/json' }, body: ${JSON.stringify(payload)} }, response);
      if (status !== 200 || result.success !== true) throw Error('Compiled POST failed');
      console.log('Native ESM GET and POST passed');
    `], { encoding: 'utf8', timeout: 30000 });
    expect(output).toContain('Native ESM GET and POST passed');
  } finally { unlinkSync(filename); }
});
async function invoke(body: unknown = payload, options: { method?: string; contentType?: string; env?: typeof env; fail?: boolean; throws?: boolean; databaseFail?: boolean; realDatabase?: boolean } = {}) {
  let status = 0; let result: { success: boolean; message: string } | undefined;
  let sent: ReturnType<typeof createEmails> | undefined;
  let saved: ReturnType<typeof databaseRow> | undefined;
  const order: string[] = [];
  const handler = createRSVPHandler(async emails => { order.push('email'); sent = emails; if (options.throws) throw Error('private-key-provider-error'); return !options.fail; }, options.env ?? env, async (data, config) => {
    order.push('database');
    if (options.databaseFail) throw new RSVPPersistenceError('insert', 500);
    if (options.realDatabase) await saveRSVP(data, config);
    saved = databaseRow(data);
  });
  const req = { method: options.method ?? 'POST', headers: { 'content-type': options.contentType ?? 'application/json' }, body } as Parameters<typeof handler>[0];
  const res = { setHeader() {}, set statusCode(value: number) { status = value; }, end(value: string) { result = JSON.parse(value); } } as unknown as Parameters<typeof handler>[1];
  await handler(req, res);
  return { status, result, sent, saved, order };
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
  expect(response.saved).toEqual({ first_name: 'Lerato', surname: 'Mokoena', email: 'lerato@example.com', mobile: '+27 82 123 4567', attendance: 'ATTENDING', has_guest: true, guest_first_name: 'Thabo', guest_surname: 'Nkosi' });
  expect(response.order).toEqual(['database', 'email']);
});
test('decline acknowledgement never confirms attendance or includes a guest', async () => {
  const response = await invoke({ ...payload, attending: false, guestFirstName: 'stale', guestSurname: 'values' });
  expect(response.status).toBe(200);
  expect(response.sent?.[0].subject).toBe('Feather Awards XVIII — RSVP received');
  expect(response.sent?.[0].html).not.toContain("YOU'RE ON THE LIST");
  expect(response.sent?.[0].text).toContain('will not be attending');
  expect(response.sent?.[1].subject).toContain('NOT ATTENDING');
  expect(response.sent?.[1].text).not.toContain('stale');
  expect(response.saved?.attendance).toBe('NOT ATTENDING');
  expect(response.saved?.guest_first_name).toBeNull();
  expect(response.saved?.guest_surname).toBeNull();
});
for (const [label, value] of Object.entries({
  malformed: '{', array: [], empty: {}, missing: { ...payload, firstName: '' }, email: { ...payload, email: 'invalid' }, mobile: { ...payload, mobile: '123' }, long: { ...payload, surname: 'a'.repeat(101) }, boolean: { ...payload, attending: 'true' }, guest: { ...payload, bringingGuest: true }, declineGuest: { ...payload, attending: false, bringingGuest: true }, honeypot: { ...payload, website: 'spam' }, unknown: { ...payload, unexpected: 'value' }, injection: { ...payload, firstName: 'Name\r\nBcc:evil' },
})) test(`rejects ${label} payload without sending`, async () => {
  const response = await invoke(value);
  expect(response.status).toBe(400); expect(response.result?.success).toBe(false); expect(response.sent).toBeUndefined();
  expect(response.saved).toBeUndefined(); expect(response.order).toEqual([]);
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
    const handler = createRSVPHandler(undefined, env, async () => {});
    let status = 0;
    const req = { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload } as Parameters<typeof handler>[0];
    const res = { setHeader() {}, set statusCode(value: number) { status = value; }, end() {} } as unknown as Parameters<typeof handler>[1];
    await handler(req, res);
    expect(status).toBe(200); expect(sentBody).toHaveLength(2);
  } finally { globalThis.fetch = originalFetch; }
});

test('attending without guest stores only mapped fields and null guest names', async () => {
  const response = await invoke({ ...payload, guestFirstName: 'unused', guestSurname: 'unused' });
  expect(response.status).toBe(200);
  expect(response.saved).toEqual({ first_name: 'Lerato', surname: 'Mokoena', email: 'lerato@example.com', mobile: '+27 82 123 4567', attendance: 'ATTENDING', has_guest: false, guest_first_name: null, guest_surname: null });
  expect(response.order).toEqual(['database', 'email']);
});

test('database failure and missing configuration never send emails or claim success', async () => {
  const logs: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { logs.push(args); };
  try {
    for (const options of [
      { databaseFail: true },
      { env: { ...env, SUPABASE_URL: '' } },
      { env: { ...env, SUPABASE_SECRET_KEY: '' } },
      { env: { ...env, SUPABASE_URL: 'http://test-project.supabase.co' } },
    ]) {
      const response = await invoke(payload, options);
      expect(response.status).toBe(503); expect(response.result?.success).toBe(false);
      expect(response.saved).toBeUndefined(); expect(response.sent).toBeUndefined();
    }
    expect(JSON.stringify(logs)).toContain('Supabase');
    expect(JSON.stringify(logs)).not.toContain(env.SUPABASE_SECRET_KEY);
    expect(JSON.stringify(logs)).not.toContain('lerato@example.com');
    expect(JSON.stringify(logs)).toContain('insert');
  } finally { console.error = original; }
});

test('Supabase REST inserts once on sequential retry and sends emails after persistence', async () => {
  const originalFetch = globalThis.fetch;
  let inserted: ReturnType<typeof databaseRow> | undefined;
  let writes = 0;
  const events: string[] = [];
  globalThis.fetch = async (url, options) => {
    const target = new URL(String(url));
    expect(target.origin).toBe(env.SUPABASE_URL);
    expect(target.pathname).toBe('/rest/v1/rsvps');
    expect(options?.redirect).toBe('error');
    const headers = new Headers(options?.headers);
    expect(headers.get('apikey')).toBe(env.SUPABASE_SECRET_KEY);
    expect(headers.has('authorization')).toBe(false);
    if (options?.method === 'POST') {
      events.push('insert'); writes++;
      expect(headers.get('prefer')).toBe('return=minimal');
      inserted = JSON.parse(String(options.body));
      expect(inserted).not.toHaveProperty('id'); expect(inserted).not.toHaveProperty('created_at');
      return new Response(null, { status: 201 });
    }
    events.push('lookup');
    expect(target.searchParams.get('email')).toBe('eq."lerato@example.com"');
    expect(target.searchParams.get('guest_first_name')).toBe('is.null');
    expect(target.searchParams.get('has_guest')).toBe('eq.false');
    return new Response(JSON.stringify(inserted ? [{ id: '9007199254740993' }] : []));
  };
  try {
    const first = await invoke(payload, { realDatabase: true, fail: true });
    expect(first.status).toBe(502); expect(first.saved).toEqual(inserted);
    const retry = await invoke(payload, { realDatabase: true });
    expect(retry.status).toBe(200); expect(writes).toBe(1);
    expect(events).toEqual(['lookup', 'insert', 'lookup']);
    expect(first.order).toEqual(['database', 'email']);
    expect(retry.order).toEqual(['database', 'email']);
  } finally { globalThis.fetch = originalFetch; }
});

test('Supabase REST handles guest fields and distinct payloads without unsafe filters', async () => {
  const originalFetch = globalThis.fetch;
  let inserted: unknown;
  globalThis.fetch = async (url, options) => {
    if (options?.method === 'POST') { inserted = JSON.parse(String(options.body)); return new Response(null, { status: 201 }); }
    const lookup = new URL(String(url));
    expect(lookup.searchParams.get('guest_first_name')).toBe('eq."Thabo, \\"T\\""');
    expect(lookup.searchParams.get('guest_surname')).toBe('eq."Nkosi"');
    return new Response('[]');
  };
  try {
    const response = await invoke({ ...payload, bringingGuest: true, guestFirstName: 'Thabo, "T"', guestSurname: 'Nkosi' }, { realDatabase: true });
    expect(response.status).toBe(200);
    expect(inserted).toEqual({ first_name: 'Lerato', surname: 'Mokoena', email: 'lerato@example.com', mobile: '+27 82 123 4567', attendance: 'ATTENDING', has_guest: true, guest_first_name: 'Thabo, "T"', guest_surname: 'Nkosi' });
  } finally { globalThis.fetch = originalFetch; }
});

test('REST lookup, insert and network failures are safe and stop email sending', async () => {
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const logs: unknown[][] = [];
  console.error = (...args: unknown[]) => { logs.push(args); };
  try {
    for (const failure of ['lookup', 'insert', 'network', 'malformed']) {
      globalThis.fetch = async (_url, options) => {
        if (failure === 'network') throw Error(`private ${env.SUPABASE_SECRET_KEY}`);
        if (failure === 'malformed') return new Response('not-json');
        if (failure === 'lookup' || options?.method === 'POST') return new Response('sensitive provider details', { status: 500 });
        return new Response('[]');
      };
      const response = await invoke(payload, { realDatabase: true });
      expect(response.status).toBe(503); expect(response.result?.success).toBe(false);
      expect(response.sent).toBeUndefined(); expect(response.saved).toBeUndefined();
      expect(response.result?.message).not.toContain('sensitive');
    }
    expect(JSON.stringify(logs)).not.toContain(env.SUPABASE_SECRET_KEY);
    expect(JSON.stringify(logs)).not.toContain('sensitive');
  } finally { globalThis.fetch = originalFetch; console.error = originalError; }
});
