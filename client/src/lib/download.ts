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
  URL.revokeObjectURL(url);
}

export function downloadCSV(filename: string, headers: string[], rows: string[][]): void {
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(","))
  ].join("\n");
  
  downloadTextFile(filename, "text/csv;charset=utf-8;", csvContent);
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
