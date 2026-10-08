export interface RSVPData { firstName: string; surname: string; email: string; mobile: string; attending: boolean | null; bringingGuest: boolean; guestFirstName: string; guestSurname: string }
export type RSVPSubmit = (data: RSVPData, website?: string) => Promise<{ success: true }>;
export const submitRSVP: RSVPSubmit = async (data, website = '') => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch('/api/rsvp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({
      firstName: data.firstName, surname: data.surname, email: data.email, mobile: data.mobile,
      attending: data.attending, bringingGuest: data.bringingGuest,
      guestFirstName: data.guestFirstName, guestSurname: data.guestSurname, website,
    }) });
    const result: unknown = await response.json();
    if (!response.ok || !result || typeof result !== 'object' || !('success' in result) || result.success !== true) throw new Error('RSVP submission failed');
    return { success: true };
  } finally { clearTimeout(timeout); }
};
export function downloadFile(content: string, filename: string, type: string) { const url = URL.createObjectURL(new Blob([content], { type })); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export function saveCalendar() { downloadFile(['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Feather Awards//XVIII//EN','BEGIN:VEVENT','UID:feather-awards-xviii-2026@featherawards.local','DTSTAMP:20261007T000000Z','DTSTART:20261105T160000Z','SUMMARY:18th Annual Feather Awards','LOCATION:The Venue\\, Melrose Arch','DESCRIPTION:18:00 Red Carpet (South Africa). Make a signature statement.','END:VEVENT','END:VCALENDAR',''].join('\r\n'), 'feather-awards-xviii.ics', 'text/calendar;charset=utf-8'); }
