export interface RSVPRecord {
  firstName: string; surname: string; email: string; mobile: string;
  attending: boolean; bringingGuest: boolean; guestFirstName: string; guestSurname: string;
}
export class InvalidRSVP extends Error {}
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
export function validEmail(value: string) { return value.length <= 254 && emailPattern.test(value); }
export function validateRSVP(input: unknown): RSVPRecord {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new InvalidRSVP();
  const body = input as Record<string, unknown>;
  const allowed = ['firstName', 'surname', 'email', 'mobile', 'attending', 'bringingGuest', 'guestFirstName', 'guestSurname', 'website'];
  if (Object.keys(body).some(key => !allowed.includes(key))) throw new InvalidRSVP();
  if (body.website !== undefined && (typeof body.website !== 'string' || body.website.trim())) throw new InvalidRSVP();
  function text(key: string, max: number, required = true) {
    const raw = body[key];
    if (raw === undefined && !required) return '';
    if (typeof raw !== 'string' || raw.length > max || /[\u0000-\u001f\u007f]/.test(raw)) throw new InvalidRSVP();
    const value = raw.trim();
    if (required && !value) throw new InvalidRSVP();
    return value;
  }
  if (typeof body.attending !== 'boolean' || typeof body.bringingGuest !== 'boolean') throw new InvalidRSVP();
  if (!body.attending && body.bringingGuest) throw new InvalidRSVP();
  const email = text('email', 254).toLowerCase();
  const mobile = text('mobile', 40);
  const digits = mobile.replace(/\D/g, '');
  if (!validEmail(email) || !/^[+\d\s().-]+$/.test(mobile) || digits.length < 7 || digits.length > 15) throw new InvalidRSVP();
  const guestFirstName = text('guestFirstName', 100, body.bringingGuest);
  const guestSurname = text('guestSurname', 100, body.bringingGuest);
  return { firstName: text('firstName', 100), surname: text('surname', 100), email, mobile, attending: body.attending, bringingGuest: body.bringingGuest,
    guestFirstName: body.bringingGuest ? guestFirstName : '', guestSurname: body.bringingGuest ? guestSurname : '' };
}
export function escapeHTML(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
}
interface EmailConfig { from: string; notification: string; replyTo?: string }
function emailLayout(title: string, content: string) {
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#080509;color:#f6edf2;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border:1px solid #533043;background:#100a10"><tr><td style="padding:32px 24px;line-height:1.7"><p style="color:#e89abf;font-size:12px;letter-spacing:3px">FEATHER AWARDS XVIII</p><h1 style="font-family:Georgia,serif;font-weight:400;font-size:32px;line-height:1.2;color:#f3dfe8">${title}</h1>${content}<p style="margin-top:32px;color:#e89abf;font-size:12px;letter-spacing:3px">FEATHER AWARDS XVIII</p></td></tr></table></td></tr></table></body></html>`;
}
export function createEmails(data: RSVPRecord, config: EmailConfig, timestamp: string) {
  const name = `${data.firstName} ${data.surname}`;
  const guest = `${data.guestFirstName} ${data.guestSurname}`;
  const attendance = data.attending ? 'ATTENDING' : 'NOT ATTENDING';
  const guestText = data.bringingGuest ? `\nYOUR GUEST\n${guest}\n` : '';
  const text = data.attending
    ? `FEATHER AWARDS XVIII\nYOU'RE ON THE LIST.\n\n${data.firstName},\nYour attendance at the 18th Annual Feather Awards has been confirmed.\n\n05 NOVEMBER 2026\nTHE VENUE · MELROSE ARCH\n18:00 · RED CARPET\n\nDRESS CODE\nMAKE A SIGNATURE STATEMENT\n${guestText}\nWe look forward to celebrating with you.\nFEATHER AWARDS XVIII`
    : `FEATHER AWARDS XVIII\n\n${data.firstName},\nThank you for responding. We have received your RSVP and noted that you will not be attending.\nWe hope to celebrate with you another time.\nFEATHER AWARDS XVIII`;
  const content = data.attending
    ? `<p>${escapeHTML(data.firstName)},</p><p>Your attendance at the 18th Annual Feather Awards has been confirmed.</p><p>05 NOVEMBER 2026<br>THE VENUE · MELROSE ARCH<br>18:00 · RED CARPET</p><p style="color:#e89abf">DRESS CODE<br>MAKE A SIGNATURE STATEMENT</p>${data.bringingGuest ? `<p>YOUR GUEST<br>${escapeHTML(guest)}</p>` : ''}<p>We look forward to celebrating with you.</p>`
    : `<p>${escapeHTML(data.firstName)},</p><p>Thank you for responding. We have received your RSVP and noted that you will not be attending.</p><p>We hope to celebrate with you another time.</p>`;
  const rows = [['Name', name], ['Email', data.email], ['Mobile', data.mobile], ['Attendance', attendance], ['Bringing Guest', data.bringingGuest ? 'Yes' : 'No'], ...(data.bringingGuest ? [['Guest Name', guest]] : []), ['Submission timestamp (UTC)', timestamp]];
  return [
    { from: config.from, to: data.email, ...(config.replyTo ? { replyTo: config.replyTo } : {}), subject: data.attending ? "You're on the list — Feather Awards XVIII" : 'Feather Awards XVIII — RSVP received', text, html: emailLayout(data.attending ? "YOU'RE ON THE LIST." : 'RSVP RECEIVED.', content) },
    { from: config.from, to: config.notification, replyTo: data.email, subject: `New RSVP — ${name} — ${attendance}`, text: rows.map(([label, value]) => `${label}: ${value}`).join('\n'), html: emailLayout('NEW RSVP', `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows.map(([label, value]) => `<tr><td style="padding:8px 12px 8px 0;color:#e89abf;vertical-align:top">${escapeHTML(label)}</td><td style="padding:8px 0;overflow-wrap:anywhere">${escapeHTML(value)}</td></tr>`).join('')}</table>`) },
  ];
}
