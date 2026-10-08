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

`server/rsvp.ts` separates validation and email generation from delivery. `api/rsvp.ts` uses the official Resend SDK to submit two distinct messages in a single batch:

1. Attendee: the near-black/pink HTML confirmation, event information, and optional guest name. Decline: an acknowledgement, without an attendance confirmation.
2. Team: name, contact details, attendance, plus-one information and UTC submission timestamp.

Both messages also have plain-text versions. All user content inserted in HTML is escaped. See [Resend batch documentation](https://resend.com/docs/api-reference/emails/send-batch-emails).

The frontend uses the existing loading, error and success treatments, a synchronous in-flight guard and a completed-submission guard to prevent rapid duplicate clicks. Requests time out after 25 seconds. Failed requests retain the form details. Submission errors show a fixed safe inline message, not server-provided HTML or raw error text. Invitation download no longer claims to be a preview.

## Vercel preparation

`vercel.json` selects Vite, `npm run build`, and `dist`. Vercel discovers `api/rsvp.ts` as a Node function; it is not bundled into browser assets. There are no client-side path routes requiring a catch-all rewrite, so none is added that could shadow API/assets. TypeScript checks include frontend, server helpers, API and Vite configuration. See [Vercel Node function documentation](https://vercel.com/docs/functions/runtimes/node-js).

No commit, push, deployment or domain setup has been performed.

## Verification and remaining production work

Tests cover server validation, honeypot rejection, HTML escaping, separate recipients, attendee/decline email content, missing configuration, provider failures, the official SDK request, and the existing browser flow. Browser checks cover the seven approved widths, overflow, validation, navigation, conditional guests, downloads, reduced motion, inline submission failure/retry and duplicate-click protection.

Email acceptance is not delivery confirmation. Before launch, configure a verified Resend sender/domain and the required private variables, then perform real delivery checks for both an attendance and a decline. These have not been performed without credentials.

There is no database or durable RSVP record yet. The marked repository boundary in `api/rsvp.ts` is where durable RSVP creation/update and a uniqueness policy should be added before sending. Client guards are not persistent duplicate protection; retries after a network timeout may send another batch. Editing a response currently submits a new response rather than updating a stored record. Production rate limiting or stronger bot controls should be considered beyond the requested basic honeypot. Delivery tracking/retry reconciliation should accompany future persistent storage.

## Assets

Original trophies, campaign imagery, fonts and all six partner logos are retained. Manrope remains the UI font and Cinzel Regular the display font. Asset provenance is in `ASSETS.md`. Generated `dist/`, dependency directories, local caches, screenshots and test reports are ignored.

