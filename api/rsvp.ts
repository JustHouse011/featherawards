import type { IncomingMessage, ServerResponse } from 'node:http';
import { Resend } from 'resend';
import { createEmails, InvalidRSVP, validateRSVP, validEmail } from '../server/rsvp';

type Request = IncomingMessage & { body?: unknown };
type SendEmails = (emails: ReturnType<typeof createEmails>) => Promise<boolean>;
export function createRSVPHandler(send?: SendEmails, env: NodeJS.ProcessEnv = process.env) {
  return async (req: Request, res: ServerResponse) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    const reply = (status: number, success: boolean, message: string) => { res.statusCode = status; res.end(JSON.stringify({ success, message })); };
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); reply(405, false, 'Method not allowed.'); return; }
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) { reply(415, false, 'Please submit JSON.'); return; }
    try {
      // Vercel parses JSON bodies; also support raw bodies for direct/local requests.
      let body = req.body;
      if (body === undefined) {
        const chunks: Buffer[] = []; let size = 0;
        for await (const chunk of req) { const buffer = Buffer.from(chunk); size += buffer.length; if (size > 8192) { reply(413, false, 'Request too large.'); return; } chunks.push(buffer); }
        body = Buffer.concat(chunks).toString('utf8');
      }
      const serialized = typeof body === 'string' ? body : JSON.stringify(body);
      if (!serialized || Buffer.byteLength(serialized) > 8192) { reply(413, false, 'Request too large.'); return; }
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { throw new InvalidRSVP(); } }
      const data = validateRSVP(body);
      const { RESEND_API_KEY: key, RSVP_FROM_EMAIL: from, RSVP_NOTIFICATION_EMAIL: notification, RSVP_REPLY_TO_EMAIL: replyTo } = env;
      const senderAddress = from?.match(/<([^<>]+)>$/)?.[1] ?? from;
      if (!key || !from || /[\r\n]/.test(from) || !senderAddress || !validEmail(senderAddress) || !notification || !validEmail(notification) || (replyTo && !validEmail(replyTo))) { reply(503, false, 'RSVP is temporarily unavailable. Please try again later.'); return; }
      // A future RSVP repository belongs here, before delivery. Email is not a database.
      const emails = createEmails(data, { from, notification, replyTo }, new Date().toISOString());
      const delivered = send ? await send(emails) : await new Resend(key).batch.send(emails).then(result => !result.error && result.data?.data.length === 2);
      if (!delivered) { reply(502, false, 'We could not confirm your RSVP. Please try again.'); return; }
      reply(200, true, 'RSVP confirmed');
    } catch (error) {
      reply(error instanceof InvalidRSVP ? 400 : 502, false, error instanceof InvalidRSVP ? 'Please check your RSVP details.' : 'We could not confirm your RSVP. Please try again.');
    }
  };
}
export default createRSVPHandler();
