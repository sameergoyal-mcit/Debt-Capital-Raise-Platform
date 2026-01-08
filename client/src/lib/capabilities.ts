type UserRole = "Bookrunner" | "Issuer" | "Investor";

interface Capabilities {
  viewInvestorBook: boolean;
  sendReminders: boolean;
  downloadPackage: boolean;
  seeAllQA: boolean;
  seeAllCommitments: boolean;
  manageDeals: boolean;
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

const roleCapabilities: Record<UserRole, Capabilities> = {
  Bookrunner: {
    viewInvestorBook: true,
    sendReminders: true,
    downloadPackage: true,
    seeAllQA: true,
    seeAllCommitments: true,
    manageDeals: true,
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

export function can(role: UserRole | undefined): Capabilities {
  if (!role) {
    return {
      viewInvestorBook: false,
      sendReminders: false,
      downloadPackage: false,
      seeAllQA: false,
      seeAllCommitments: false,
      manageDeals: false,
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
  }
  return roleCapabilities[role] || roleCapabilities.Investor;
}

export function isInternal(role: UserRole | undefined): boolean {
  return role === "Bookrunner" || role === "Issuer";
}

export function isInvestor(role: UserRole | undefined): boolean {
  return role === "Investor";
}
