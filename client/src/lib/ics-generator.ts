import { format, parseISO, addDays } from "date-fns";

export interface ICSEvent {
  uid: string;
  summary: string;
  description: string;
  startDate: string; // ISO string
  endDate?: string; // ISO string (optional, defaults to startDate + 1 day for all-day events)
  location?: string;
}

/**
 * Formats a date string into ICS format (YYYYMMDD)
 */
function formatDateToICS(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, "yyyyMMdd");
}

/**
 * Generates an ICS file content string from a list of events
 */
export function generateICS(events: ICSEvent[]): string {
  const now = new Date();
  const dtStamp = format(now, "yyyyMMdd'T'HHmmss'Z'");

  let icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CapitalFlow//Investor Portal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];

  events.forEach(event => {
    // For all-day events in ICS, DTEND is exclusive (the day after)
    const startStr = formatDateToICS(event.startDate);
    const endStr = event.endDate 
      ? formatDateToICS(event.endDate) 
      : formatDateToICS(addDays(parseISO(event.startDate), 1).toISOString());

    icsContent.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;VALUE=DATE:${startStr}`,
      `DTEND;VALUE=DATE:${endStr}`,
      `SUMMARY:${escapeICS(event.summary)}`,
      `DESCRIPTION:${escapeICS(event.description)}`,
      "STATUS:CONFIRMED",
      "TRANSP:TRANSPARENT", // Show as free (don't block calendar), or OPAQUE to block. Usually deadlines shouldn't block the whole day.
      "END:VEVENT"
    );
  });

  icsContent.push("END:VCALENDAR");

  return icsContent.join("\r\n");
}

/**
 * Helper to escape special characters in ICS text fields
 */
function escapeICS(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Triggers a browser download of the generated ICS content
 */
export function downloadICS(filename: string, events: ICSEvent[]) {
  const content = generateICS(events);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  link.href = url;
  link.setAttribute("download", filename.endsWith(".ics") ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  
  link.click();
  
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
