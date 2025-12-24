export type DocumentCategory = "Lender Presentation" | "Credit Agreement" | "Security" | "Intercreditor" | "Financials" | "KYC" | "Other";
export type DocumentStatus = "Draft" | "In Review" | "Comments Outstanding" | "Issuer Approved" | "Lender Approved" | "Ready to Sign";

export interface Document {
  id: string;
  name: string;
  category: DocumentCategory;
  status: DocumentStatus;
  version: string;
  lastUpdatedAt: string;
  owner: "Issuer Counsel" | "Lender Counsel" | "Bank" | "Issuer";
  openCommentsCount: number;
  dealId: string;
}

export const mockDocuments: Document[] = [
  {
    id: "d1",
    name: "Credit Agreement v3.docx",
    category: "Credit Agreement",
    status: "Comments Outstanding",
    version: "v3.0",
    lastUpdatedAt: new Date().toISOString(),
    owner: "Lender Counsel",
    openCommentsCount: 12,
    dealId: "101"
  },
  {
    id: "d2",
    name: "Intercreditor Agreement v1.pdf",
    category: "Intercreditor",
    status: "In Review",
    version: "v1.0",
    lastUpdatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    owner: "Issuer Counsel",
    openCommentsCount: 5,
    dealId: "101"
  },
  {
    id: "d3",
    name: "Security Agreement.docx",
    category: "Security",
    status: "Ready to Sign",
    version: "vFinal",
    lastUpdatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    owner: "Lender Counsel",
    openCommentsCount: 0,
    dealId: "101"
  },
  {
    id: "d4",
    name: "FY24 Audited Financials.pdf",
    category: "Financials",
    status: "Issuer Approved",
    version: "vFinal",
    lastUpdatedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    owner: "Issuer",
    openCommentsCount: 0,
    dealId: "101"
  },
  {
    id: "d5",
    name: "KYC Pack - Borrower.zip",
    category: "KYC",
    status: "Lender Approved",
    version: "v1.0",
    lastUpdatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    owner: "Issuer",
    openCommentsCount: 0,
    dealId: "101"
  },
  {
    id: "d6",
    name: "Lender Presentation.pdf",
    category: "Lender Presentation",
    status: "Ready to Sign", // Conceptually "Done"
    version: "vFinal",
    lastUpdatedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    owner: "Bank",
    openCommentsCount: 0,
    dealId: "101"
  }
];

export interface ClosingItem {
  id: string;
  item: string;
  category: "Legal" | "Financial" | "Operational";
  owner: string;
  status: "Pending" | "In Progress" | "Completed" | "Waived";
  dueDate: string;
  linkedDocId?: string;
}

export const mockClosingItems: ClosingItem[] = [
  { id: "c1", item: "Execute Credit Agreement", category: "Legal", owner: "All Parties", status: "Pending", dueDate: "2025-06-30", linkedDocId: "d1" },
  { id: "c2", item: "Perfect Security Interests (UCC-1)", category: "Legal", owner: "Lender Counsel", status: "In Progress", dueDate: "2025-06-28", linkedDocId: "d3" },
  { id: "c3", item: "Funds Flow Memorandum", category: "Financial", owner: "Bank", status: "Pending", dueDate: "2025-06-29" },
  { id: "c4", item: "KYC Clearance", category: "Operational", owner: "Lender", status: "Completed", dueDate: "2025-06-15", linkedDocId: "d5" },
  { id: "c5", item: "Officer's Certificate", category: "Legal", owner: "Issuer Counsel", status: "Pending", dueDate: "2025-06-30" },
  { id: "c6", item: "Good Standing Certificates", category: "Legal", owner: "Issuer Counsel", status: "Completed", dueDate: "2025-06-25" },
];