// Download utilities for exporting files

export function downloadTextFile(filename: string, mimeType: string, content: string): void {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(filename, blob);
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function escapeCsvValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCSV(filename: string, headers: string[], rows: string[][]): void {
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(","))
  ].join("\n");
  
  downloadTextFile(filename, "text/csv;charset=utf-8;", csvContent);
}

export function downloadCsvFromRecords(
  filename: string,
  rows: Record<string, string | number | boolean | null | undefined>[]
): void {
  if (rows.length === 0) {
    downloadTextFile(filename, "text/csv;charset=utf-8", "");
    return;
  }
  const headers = Object.keys(rows[0]);
  const headerRow = headers.map(escapeCsvValue).join(",");
  const dataRows = rows.map((row) =>
    headers.map((h) => escapeCsvValue(row[h])).join(",")
  );
  const csvContent = [headerRow, ...dataRows].join("\n");
  downloadTextFile(filename, "text/csv;charset=utf-8", csvContent);
}

export function downloadPlaceholderDoc(docName: string, version: string): void {
  const content = `This is a demo placeholder for ${docName} (${version}).

This file would contain the actual document content in a production environment.

Generated on: ${new Date().toLocaleString()}
`;
  downloadTextFile(`${docName.replace(/\.[^/.]+$/, "")}_placeholder.txt`, "text/plain", content);
}

// ICS calendar file generator
export function generateICS(events: Array<{
  title: string;
  start: Date;
  end?: Date;
  description?: string;
  location?: string;
}>): string {
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const icsEvents = events.map((event, i) => {
    const end = event.end || new Date(event.start.getTime() + 3600000); // 1 hour default
    return `BEGIN:VEVENT
UID:${Date.now()}-${i}@capitalflow.app
DTSTART:${formatDate(event.start)}
DTEND:${formatDate(end)}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ""}
LOCATION:${event.location || ""}
END:VEVENT`;
  }).join("\n");

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CapitalFlow//Deal Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
${icsEvents}
END:VCALENDAR`;
}

export function downloadICS(filename: string, events: Array<{
  title: string;
  start: Date;
  end?: Date;
  description?: string;
}>): void {
  const icsContent = generateICS(events);
  downloadTextFile(filename, "text/calendar;charset=utf-8", icsContent);
}
