// Debt capital markets document folder terminology
export type DocumentCategory = 
  | "Lender Presentation" 
  | "Supplemental Information" 
  | "KYC & Compliance" 
  | "Lender Paydown Model" 
  | "Legal";
export type DocumentStatus = "Draft" | "In Review" | "Comments Outstanding" | "Issuer Approved" | "Lender Approved" | "Ready to Sign";

export interface DocumentVersion {
  version: string;
  uploadedAt: string;
  uploadedBy: string;
  changeSummary?: string;
}

export interface Document {
  id: string;
  name: string;
  category: DocumentCategory;
  status: DocumentStatus;
  version: string;
  lastUpdatedAt: string;
  owner: "Issuer Counsel" | "Lender Counsel" | "Bank" | "Issuer" | "Deal Team";
  openCommentsCount: number;
  dealId: string;
  changeSummary?: string;
  versionHistory?: DocumentVersion[];
  fileSize?: string;
  accessTier?: "early" | "full" | "legal";
  type?: "document" | "interactive_model";
  fileKey?: string;
  isNew?: boolean;
  isUpdated?: boolean;
}

export const mockDocuments: Document[] = [
  {
    id: "d1",
    name: "Credit Agreement v3.docx",
    category: "Legal",
    status: "Comments Outstanding",
    version: "v3.0",
    lastUpdatedAt: new Date().toISOString(),
    owner: "Lender Counsel",
    openCommentsCount: 12,
    dealId: "101",
    changeSummary: "Updated financial covenants per lender feedback. Revised EBITDA definition in Section 7.1.",
    fileSize: "2.4 MB",
    accessTier: "legal",
    versionHistory: [
      { version: "v1.0", uploadedAt: new Date(Date.now() - 86400000 * 14).toISOString(), uploadedBy: "Issuer Counsel" },
      { version: "v2.0", uploadedAt: new Date(Date.now() - 86400000 * 7).toISOString(), uploadedBy: "Issuer Counsel", changeSummary: "Added pricing grid and flex provisions" },
      { version: "v3.0", uploadedAt: new Date().toISOString(), uploadedBy: "Lender Counsel", changeSummary: "Updated financial covenants per lender feedback" }
    ]
  },
  {
    id: "d2",
    name: "Intercreditor Agreement v1.pdf",
    category: "Legal",
    status: "In Review",
    version: "v1.0",
    lastUpdatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    owner: "Issuer Counsel",
    openCommentsCount: 5,
    dealId: "101",
    changeSummary: "Initial draft for review. Based on standard form.",
    fileSize: "890 KB",
    accessTier: "legal"
  },
  {
    id: "d3",
    name: "Security Agreement.docx",
    category: "Legal",
    status: "Ready to Sign",
    version: "vFinal",
    lastUpdatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    owner: "Lender Counsel",
    openCommentsCount: 0,
    dealId: "101",
    fileSize: "1.1 MB",
    accessTier: "legal"
  },
  {
    id: "d4",
    name: "FY24 Audited Financials.pdf",
    category: "Supplemental Information",
    status: "Issuer Approved",
    version: "vFinal",
    lastUpdatedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    owner: "Issuer",
    openCommentsCount: 0,
    dealId: "101",
    fileSize: "5.2 MB",
    accessTier: "full"
  },
  {
    id: "d5",
    name: "KYC Pack - Borrower.zip",
    category: "KYC & Compliance",
    status: "Lender Approved",
    version: "v1.0",
    lastUpdatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    owner: "Issuer",
    openCommentsCount: 0,
    dealId: "101",
    fileSize: "12.3 MB",
    accessTier: "full"
  },
  {
    id: "d6",
    name: "Lender Presentation.pdf",
    category: "Lender Presentation",
    status: "Ready to Sign",
    version: "vFinal",
    lastUpdatedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    owner: "Bank",
    openCommentsCount: 0,
    dealId: "101",
    fileSize: "8.7 MB",
    accessTier: "early"
  },
  {
    id: "d7",
    name: "Management Presentation.pptx",
    category: "Lender Presentation",
    status: "Issuer Approved",
    version: "v2.0",
    lastUpdatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    owner: "Issuer",
    openCommentsCount: 0,
    dealId: "101",
    changeSummary: "Added Q3 actuals and updated FY25 projections",
    fileSize: "15.4 MB",
    accessTier: "early",
    versionHistory: [
      { version: "v1.0", uploadedAt: new Date(Date.now() - 86400000 * 20).toISOString(), uploadedBy: "Issuer" },
      { version: "v2.0", uploadedAt: new Date(Date.now() - 86400000 * 3).toISOString(), uploadedBy: "Issuer", changeSummary: "Added Q3 actuals and updated FY25 projections" }
    ]
  },
  {
    id: "d8",
    name: "Quality of Earnings Report.pdf",
    category: "Supplemental Information",
    status: "Issuer Approved",
    version: "vFinal",
    lastUpdatedAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    owner: "Issuer",
    openCommentsCount: 0,
    dealId: "101",
    fileSize: "3.1 MB",
    accessTier: "full"
  },
  {
    id: "d9",
    name: "Lender Paydown Model.xlsx",
    category: "Lender Paydown Model",
    status: "Issuer Approved",
    version: "v1.2",
    lastUpdatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    owner: "Bank",
    openCommentsCount: 0,
    dealId: "101",
    changeSummary: "Revised margin grid per updated term sheet",
    fileSize: "1.8 MB",
    accessTier: "full",
    versionHistory: [
      { version: "v1.0", uploadedAt: new Date(Date.now() - 86400000 * 12).toISOString(), uploadedBy: "Bank" },
      { version: "v1.2", uploadedAt: new Date(Date.now() - 86400000 * 5).toISOString(), uploadedBy: "Bank", changeSummary: "Revised margin grid per updated term sheet" }
    ]
  },
  {
    id: "d10",
    name: "5-Year Debt Paydown Model",
    category: "Lender Paydown Model",
    status: "Issuer Approved",
    version: "v1.0",
    lastUpdatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    owner: "Deal Team",
    openCommentsCount: 0,
    dealId: "101",
    changeSummary: "Interactive financial model with paydown projections",
    accessTier: "full",
    type: "interactive_model",
    fileKey: "model:sample-model-1",
    isNew: true
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