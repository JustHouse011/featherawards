# Feather Awards XVIII

Approved React/TypeScript/Vite frontend with a Vercel RSVP endpoint and Resend email delivery. The design, assets, typography and four-step flow are preserved.

## Local development

Use Node.js 22.12+ (or a supported newer LTS). After a fresh checkout:

```sh
npm ci
npm run dev
npm run typecheck
npm run build
npm test
```

`npm run dev` serves the frontend only. It does not emulate Vercel functions: submitting against Vite alone returns the existing inline failure treatment. To exercise the real endpoint locally, use `vercel dev` with the Vercel CLI, and a private `.env.local` containing the server environment variables below. Do not use real credentials for the automated tests. Browser tests intercept `/api/rsvp`; API tests mock delivery, including the official SDK HTTP boundary, so no email is sent.

This workspace currently reuses a node_modules junction from another local project. No installation should mutate that shared directory. A fresh checkout uses its own dependency directory.

## Required server configuration

Copy `.env.example` to an ignored `.env.local` for local server testing, or configure these as Vercel server environment variables when deployment is separately authorized:

- `RESEND_API_KEY`: private Resend sending API key.
- `RSVP_FROM_EMAIL`: verified sender address, optionally `Feather Awards <address@verified-domain>`.
- `RSVP_NOTIFICATION_EMAIL`: the internal team's single notification address.
- `RSVP_REPLY_TO_EMAIL`: optional guest-email Reply-To address. Internal notifications reply to the invitee's validated email.
- `SUPABASE_URL`: the HTTPS Supabase project URL (server only).
- `SUPABASE_SECRET_KEY`: private Supabase server secret key, never a `VITE_` variable.

Never prefix these with `VITE_`. No real credentials are supplied. `.env` and `.env.*` are ignored; only `.env.example` is intended for version control. `.vercel/` is also ignored.

## RSVP request and response

`POST /api/rsvp`, `Content-Type: application/json`, accepts:

```json
{
  "firstName": "Lerato",
  "surname": "Mokoena",
  "email": "lerato@example.com",
  "mobile": "+27 82 123 4567",
  "attending": true,
  "bringingGuest": false,
  "guestFirstName": "",
  "guestSurname": "",
  "website": ""
}
```

`website` is the hidden honeypot transport field, not RSVP business data. Populated honeypots are rejected. Guest names are required only with a plus-one; unused guest values are discarded. A decline cannot bring a guest. No requirements fields exist.

The server rejects non-POST requests (405), non-JSON content (415), malformed/invalid inputs (400), and bodies over 8 KiB (413). It trims text, lowercases email, requires strict booleans, validates email/mobile, limits names to 100 characters, email to 254 and mobile to 40, and rejects control characters and unknown fields. Missing server configuration returns 503; provider errors return 502. Responses have `success` and a safe `message`, with no provider error details or credentials. Success is `200 {"success":true,"message":"RSVP confirmed"}`.

`api/rsvp.ts` contains validation, email generation and delivery in one self-contained serverless entry point, with no relative runtime imports. It uses the official Resend SDK to submit two distinct messages in a single batch:

1. Attendee: the near-black/pink HTML confirmation, event information, and optional guest name. Decline: an acknowledgement, without an attendance confirmation.
2. Team: name, contact details, attendance, plus-one information and UTC submission timestamp.

Both messages also have plain-text versions. All user content inserted in HTML is escaped. See [Resend batch documentation](https://resend.com/docs/api-reference/emails/send-batch-emails).

The frontend uses the existing loading, error and success treatments, a synchronous in-flight guard and a completed-submission guard to prevent rapid duplicate clicks. Requests time out after 25 seconds. Failed requests retain the form details. Submission errors show a fixed safe inline message, not server-provided HTML or raw error text. Invitation download no longer claims to be a preview.

## Vercel preparation

`vercel.json` selects Vite, `npm run build`, and `dist`. Vercel discovers `api/rsvp.ts` as a Node function; it is not bundled into browser assets. There are no client-side path routes requiring a catch-all rewrite, so none is added that could shadow API/assets. TypeScript checks include frontend, API and Vite configuration. See [Vercel Node function documentation](https://vercel.com/docs/functions/runtimes/node-js).

Source changes on `main` are deployed through the existing GitHub/Vercel connection.

## Verification and remaining production work

Tests cover server validation, honeypot rejection, HTML escaping, separate recipients, attendee/decline email content, missing configuration, provider failures, the official SDK request, and the existing browser flow. Browser checks cover the seven approved widths, overflow, validation, navigation, conditional guests, downloads, reduced motion, inline submission failure/retry and duplicate-click protection.

Email acceptance is not delivery confirmation. Before launch, configure a verified Resend sender/domain and the required private variables, then perform real delivery checks for both an attendance and a decline. These have not been performed without credentials.

Validated RSVPs are persisted server-side through Supabase's REST API at `/rest/v1/rsvps`, before the unchanged Resend batch. No Supabase library is added to the frontend. The secret key is sent in the `apikey` header; legacy JWT keys additionally use bearer authorization. Requests have an eight-second timeout and reject redirects so credentials cannot be forwarded to a different destination. See [Supabase API key guidance](https://supabase.com/docs/guides/getting-started/api-keys).

The row contains `first_name`, `surname`, normalized `email`, `mobile`, `attendance` (`ATTENDING` or `NOT ATTENDING`), `has_guest`, `guest_first_name`, and `guest_surname`. Guest names are null without a guest. `id` and `created_at` are omitted, allowing the database defaults to generate them. The table must be accessible through the Supabase Data API with server-key SELECT and INSERT permissions; browser/anonymous write access is unnecessary.

Before insertion, a filtered lookup checks all eight mapped values for an identical saved response. A sequential retry, including one after an email failure, reuses that row and retries the existing emails. Different responses insert a new row. This avoids sequential duplicate writes without changing the supplied schema, but is not atomic across simultaneous requests. A database uniqueness constraint or an idempotency RPC is required to guarantee concurrency-safe deduplication. No database schema or policies are modified by this change.

Missing Supabase configuration, lookup failures, or insertion failures return a safe 503 and stop email delivery. Server logs contain only the failed operation and HTTP status, never credentials, request payloads, or raw provider error bodies. If persistence succeeds and email sending fails, the row remains saved and the existing safe email failure response is returned; a retry checks for that row first. Email delivery itself is not deduplicated, and database persistence plus email delivery is not a distributed transaction.

Automated persistence tests use mocked HTTP responses, with no real credentials or production database writes. Verify a real attending/declining submission after redeployment using the already configured production environment. Production rate limiting and delivery reconciliation remain separate future improvements.

## Assets

Original trophies, campaign imagery, fonts and all six partner logos are retained. Manrope remains the UI font and Cinzel Regular the display font. Asset provenance is in `ASSETS.md`. Generated `dist/`, dependency directories, local caches, screenshots and test reports are ignored.

