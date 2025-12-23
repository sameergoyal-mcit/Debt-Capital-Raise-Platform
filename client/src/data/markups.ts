import { formatISO, subHours, subDays } from "date-fns";

export interface Markup {
  id: string;
  documentId: string;
  lenderId: string;
  dealId: string;
  uploadedAt: string; // ISO date
  filename: string;
  status: "Pending Review" | "Reviewed" | "Incorporated" | "Rejected";
  uploadedBy: string; // User name or email
}

const mockMarkups: Markup[] = [
  {
    id: "m1",
    documentId: "d1", // Credit Agreement
    lenderId: "1", // BlackRock
    dealId: "101",
    uploadedAt: formatISO(subHours(new Date(), 2)),
    filename: "Credit Agreement v3 - BlackRock Comments.docx",
    status: "Pending Review",
    uploadedBy: "John Smith (BlackRock)"
  },
  {
    id: "m2",
    documentId: "d1", // Credit Agreement
    lenderId: "2", // Apollo
    dealId: "101",
    uploadedAt: formatISO(subDays(new Date(), 1)),
    filename: "Credit Agreement v3 - Apollo Markup.docx",
    status: "Reviewed",
    uploadedBy: "Mike Ross (Apollo)"
  },
  {
    id: "m3",
    documentId: "d3", // Security Agreement
    lenderId: "1", // BlackRock
    dealId: "101",
    uploadedAt: formatISO(subDays(new Date(), 3)),
    filename: "Security Agreement - BlackRock Riders.docx",
    status: "Incorporated",
    uploadedBy: "Sarah Jones (BlackRock)"
  }
];

let markups = [...mockMarkups];

export function getMarkups(dealId: string, documentId: string) {
  return markups
    .filter(m => m.dealId === dealId && m.documentId === documentId)
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export function getLenderMarkups(dealId: string, documentId: string, lenderId: string) {
    return markups
      .filter(m => m.dealId === dealId && m.documentId === documentId && m.lenderId === lenderId)
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export function uploadMarkup(markup: Markup) {
  markups.unshift(markup);
  return markup;
}
