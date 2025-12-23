export interface QA {
  id: string;
  dealId: string;
  question: string;
  answer?: string;
  askedByLenderId: string;
  askedAt: string;
  answeredAt?: string;
  status: "Open" | "Answered" | "Closed";
  category: "Financial" | "Legal" | "Operational" | "General";
}

export const mockQAs: QA[] = [
  {
    id: "qa1",
    dealId: "101",
    question: "Can you provide a breakdown of the EBITDA adjustments for 2024?",
    answer: "The adjustments are detailed in Tab 4 of the financial model. Primarily one-time integration costs.",
    askedByLenderId: "len_blackrock",
    askedAt: "2025-06-01T10:00:00Z",
    answeredAt: "2025-06-02T14:00:00Z",
    status: "Answered",
    category: "Financial"
  },
  {
    id: "qa2",
    dealId: "101",
    question: "Is there an accordion feature in the credit agreement?",
    askedByLenderId: "len_apollo",
    askedAt: "2025-06-05T09:30:00Z",
    status: "Open",
    category: "Legal"
  }
];
