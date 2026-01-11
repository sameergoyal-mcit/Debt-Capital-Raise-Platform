// Internal role type for capability mapping
type RoleKey = "Bookrunner" | "Issuer" | "Investor";

// Map normalized role strings to capability keys
function normalizeRole(role: string): RoleKey {
  const lower = role.toLowerCase();
  if (lower === "bookrunner") return "Bookrunner";
  if (lower === "issuer" || lower === "sponsor") return "Issuer";
  if (lower === "investor" || lower === "lender") return "Investor";
  return "Investor"; // Default to investor for unknown roles
}

export interface Capabilities {
  viewInvestorBook: boolean;
  sendReminders: boolean;
  downloadPackage: boolean;
  seeAllQA: boolean;
  seeAllCommitments: boolean;
  manageDeals: boolean;
  createDeal: boolean;
  editTermSheet: boolean;
  publishDeal: boolean;
  inviteLenders: boolean;
  viewExecutionTracker: boolean;
  uploadDocuments: boolean;
  answerQA: boolean;
  submitCommitment: boolean;
  uploadMarkup: boolean;
  signNDA: boolean;
}

const roleCapabilities: Record<RoleKey, Capabilities> = {
  Bookrunner: {
    viewInvestorBook: true,
    sendReminders: true,
    downloadPackage: true,
    seeAllQA: true,
    seeAllCommitments: true,
    manageDeals: true,
    createDeal: false,
    editTermSheet: true,
    publishDeal: true,
    inviteLenders: true,
    viewExecutionTracker: true,
    uploadDocuments: true,
    answerQA: true,
    submitCommitment: false,
    uploadMarkup: false,
    signNDA: false
  },
  Issuer: {
    viewInvestorBook: true,
    sendReminders: true,
    downloadPackage: true,
    seeAllQA: true,
    seeAllCommitments: true,
    manageDeals: true,
    createDeal: true,
    editTermSheet: true,
    publishDeal: false,
    inviteLenders: false,
    viewExecutionTracker: true,
    uploadDocuments: true,
    answerQA: true,
    submitCommitment: false,
    uploadMarkup: false,
    signNDA: false
  },
  Investor: {
    viewInvestorBook: false,
    sendReminders: false,
    downloadPackage: true,
    seeAllQA: false,
    seeAllCommitments: false,
    manageDeals: false,
    createDeal: false,
    editTermSheet: false,
    publishDeal: false,
    inviteLenders: false,
    viewExecutionTracker: false,
    uploadDocuments: false,
    answerQA: false,
    submitCommitment: true,
    uploadMarkup: true,
    signNDA: true
  }
};

const defaultCapabilities: Capabilities = {
  viewInvestorBook: false,
  sendReminders: false,
  downloadPackage: false,
  seeAllQA: false,
  seeAllCommitments: false,
  manageDeals: false,
  createDeal: false,
  editTermSheet: false,
  publishDeal: false,
  inviteLenders: false,
  viewExecutionTracker: false,
  uploadDocuments: false,
  answerQA: false,
  submitCommitment: false,
  uploadMarkup: false,
  signNDA: false
};

export function can(role: string | undefined): Capabilities {
  if (!role) {
    return defaultCapabilities;
  }
  const normalizedRole = normalizeRole(role);
  return roleCapabilities[normalizedRole] || roleCapabilities.Investor;
}

export function isInternal(role: string | undefined): boolean {
  if (!role) return false;
  const lower = role.toLowerCase();
  return lower === "bookrunner" || lower === "issuer" || lower === "sponsor";
}

export function isInvestor(role: string | undefined): boolean {
  if (!role) return false;
  const lower = role.toLowerCase();
  return lower === "investor" || lower === "lender";
}
