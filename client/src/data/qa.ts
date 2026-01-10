import { formatISO } from "date-fns";
import { mockMessages, Message } from "./messages";

export const QACategories = [
  "Financials",
  "Legal / Documentation",
  "Operations",
  "Management",
  "Commercial",
  "Collateral",
  "IT / Cybersecurity",
  "Environmental / ESG",
  "Tax",
  "Other"
] as const;

export type QACategory = typeof QACategories[number];

// Material source types for draft answers (VDR categories)
export const MaterialSources = [
  "lender_presentation",
  "supplemental_information",
  "kyc",
  "paydown_model",
  "legal",
  "other"
] as const;

export type MaterialSource = typeof MaterialSources[number];

// Draft answer status
export type DraftStatus = "none" | "generating" | "ready" | "submitted";

// Human-readable labels for material sources
export const MaterialSourceLabels: Record<MaterialSource, string> = {
  lender_presentation: "Lender Presentation",
  supplemental_information: "Supplemental Information",
  kyc: "KYC Documents",
  paydown_model: "Lender Paydown Model",
  legal: "Legal Docs",
  other: "Other"
};

export interface QAItem {
  id: string;
  dealId: string;
  lenderId: string;
  question: string;
  questionCreatedAt: string; // ISO
  answer?: string;
  answerUpdatedAt?: string; // ISO
  status: "open" | "answered" | "draft" | "closed";
  originSource: "messages" | "qa"; // renamed to avoid conflict with new 'source' field
  threadId?: string;   // link back to messages thread
  messageIds?: string[]; // optional linkage
  topic?: string;
  category?: QACategory;
  asker?: string;
  reopenedAt?: string; // ISO - when question was re-opened
  reopenReason?: string;

  // New fields for draft answer workflow
  materialSource: MaterialSource;  // VDR category source for the answer
  sourceNotes?: string;            // required if materialSource == "other" (free text)
  draftAnswer?: string;            // internal draft - NEVER shown to investors
  draftStatus: DraftStatus;        // draft workflow status
  submittedAnswer?: string;        // the answer visible to investors
  submittedBy?: string;            // email of person who submitted
  submittedAt?: string;            // ISO timestamp when submitted
}

// Initial Mock Data
let qaItems: QAItem[] = [
  {
    id: "qa1",
    dealId: "101",
    lenderId: "1",
    question: "Can you clarify the definition of EBITDA used in the marketing deck? Is it Pro Forma for the acquisition synergies?",
    questionCreatedAt: formatISO(new Date(Date.now() - 7200000)), // 2 hours ago
    answer: "Hi David, yes, it includes $5M of run-rate cost synergies validated by the QofE. I've attached the bridge.",
    answerUpdatedAt: formatISO(new Date(Date.now() - 3600000)), // 1 hour ago
    status: "answered",
    originSource: "messages",
    threadId: "t2",
    topic: "Financials",
    category: "Financials",
    asker: "BlackRock",
    materialSource: "lender_presentation",
    draftAnswer: "Hi David, yes, it includes $5M of run-rate cost synergies validated by the QofE. I've attached the bridge.",
    draftStatus: "submitted",
    submittedAnswer: "Hi David, yes, it includes $5M of run-rate cost synergies validated by the QofE. I've attached the bridge.",
    submittedBy: "bookrunner@bank.com",
    submittedAt: formatISO(new Date(Date.now() - 3600000))
  },
  {
    id: "qa2",
    dealId: "101",
    lenderId: "2",
    question: "Please clarify the change of control provisions in the current credit agreement draft regarding the sponsor equity cure.",
    questionCreatedAt: formatISO(new Date(Date.now() - 18000000)), // 5 hours ago
    status: "draft",
    originSource: "qa",
    topic: "Legal",
    category: "Legal / Documentation",
    asker: "Apollo",
    answer: "The sponsor equity cure is limited to 2 times over the life of the facility and cannot be used in consecutive quarters. We believe this is market standard for this credit profile.",
    materialSource: "legal",
    draftAnswer: "The sponsor equity cure is limited to 2 times over the life of the facility and cannot be used in consecutive quarters. We believe this is market standard for this credit profile.",
    draftStatus: "ready"
  },
  {
    id: "qa3",
    dealId: "101",
    lenderId: "3",
    question: "What is the expected capex requirement for the next 3 years and how is this funded?",
    questionCreatedAt: formatISO(new Date(Date.now() - 86400000)), // 1 day ago
    status: "open",
    originSource: "qa",
    category: "Financials",
    asker: "Ares Management",
    materialSource: "supplemental_information",
    draftAnswer: "Based on the Supplemental Information package, the projected capex requirements can be found in the financial projections section. Please refer to the addbacks and adjustments summary for detailed capital expenditure breakdowns. We're happy to provide additional context on specific line items.",
    draftStatus: "ready"
  },
  {
    id: "qa4",
    dealId: "101",
    lenderId: "1",
    question: "Can you provide the customer concentration breakdown by revenue?",
    questionCreatedAt: formatISO(new Date(Date.now() - 172800000)), // 2 days ago
    answer: "Top 10 customers represent 35% of revenue. No single customer exceeds 8%. We can provide detailed breakdown under NDA.",
    answerUpdatedAt: formatISO(new Date(Date.now() - 100000000)),
    status: "closed",
    originSource: "qa",
    category: "Commercial",
    asker: "BlackRock",
    materialSource: "supplemental_information",
    draftAnswer: "Top 10 customers represent 35% of revenue. No single customer exceeds 8%. We can provide detailed breakdown under NDA.",
    draftStatus: "submitted",
    submittedAnswer: "Top 10 customers represent 35% of revenue. No single customer exceeds 8%. We can provide detailed breakdown under NDA.",
    submittedBy: "bookrunner@bank.com",
    submittedAt: formatISO(new Date(Date.now() - 100000000))
  }
];

// Helper Functions

export function getQAs(dealId: string, lenderId?: string) {
  return qaItems.filter(qa => {
    if (qa.dealId !== dealId) return false;
    if (lenderId && qa.lenderId !== lenderId) return false;
    return true;
  });
}

// Alias functions as specified
export function getQAsByDeal(dealId: string): QAItem[] {
  return qaItems.filter(qa => qa.dealId === dealId);
}

export function getQAsByDealAndLender(dealId: string, lenderId: string): QAItem[] {
  return qaItems.filter(qa => qa.dealId === dealId && qa.lenderId === lenderId);
}

export function getQA(id: string) {
  return qaItems.find(q => q.id === id);
}

export function createQA(qa: QAItem) {
  qaItems.push(qa);
  return qa;
}

export function updateQA(id: string, updates: Partial<QAItem>) {
  const index = qaItems.findIndex(q => q.id === id);
  if (index !== -1) {
    qaItems[index] = { ...qaItems[index], ...updates };
    return qaItems[index];
  }
  return null;
}

// ============================================================
// Auto-Draft Generation from Materials
// ============================================================

// Suggest material source based on question keywords
function suggestMaterialSource(question: string): MaterialSource {
  const lower = question.toLowerCase();

  // KYC / AML / Sanctions
  if (lower.includes("kyc") || lower.includes("aml") || lower.includes("sanctions") ||
      lower.includes("know your customer") || lower.includes("compliance check")) {
    return "kyc";
  }

  // Model / Sweep / Paydown
  if (lower.includes("model") || lower.includes("sweep") || lower.includes("paydown") ||
      lower.includes("amortization") || lower.includes("cash waterfall")) {
    return "paydown_model";
  }

  // Covenant / Leverage / EBITDA addback / Legal
  if (lower.includes("covenant") || lower.includes("leverage") || lower.includes("addback") ||
      lower.includes("credit agreement") || lower.includes("term sheet") || lower.includes("legal") ||
      lower.includes("documentation") || lower.includes("change of control")) {
    return "legal";
  }

  // Financials / Projection - could be lender_presentation or supplemental
  if (lower.includes("financial") || lower.includes("projection") || lower.includes("forecast") ||
      lower.includes("ebitda") || lower.includes("revenue") || lower.includes("margin")) {
    return "lender_presentation";
  }

  // Supplemental / Addback adjustments
  if (lower.includes("supplemental") || lower.includes("adjustment") || lower.includes("capex") ||
      lower.includes("working capital") || lower.includes("customer concentration")) {
    return "supplemental_information";
  }

  return "other";
}

// Generate auto-draft based on question and material source
export function autoDraftFromMaterials(question: string, source: MaterialSource): string {
  const lower = question.toLowerCase();

  // Source-specific templates
  const templates: Record<MaterialSource, string> = {
    lender_presentation: `Thank you for your question. Based on the Lender Presentation (CIM), the relevant information can be found in the financial overview and business summary sections. The presentation includes detailed analysis of the company's financial performance, market position, and key investment highlights. Please let us know if you need clarification on any specific section or would like to schedule a follow-up call to discuss further.`,

    supplemental_information: `Thank you for your question. The Supplemental Information package contains detailed supporting materials including financial projections, addbacks and adjustments, and operational data. Please refer to the relevant tabs for the specific information you're looking for. We're happy to provide additional context on any line items or methodology used in the analysis.`,

    kyc: `Thank you for your inquiry. The KYC documentation package is available in the VDR under the KYC Documents folder. This includes all required compliance materials, beneficial ownership information, and regulatory documentation. Please note that processing typically takes 3-5 business days once all materials are submitted. Let us know if you need any specific forms or have questions about the requirements.`,

    paydown_model: `Thank you for your question. The Lender Paydown Model is available in the VDR and includes detailed cash flow projections, mandatory prepayment scenarios, and excess cash flow sweep assumptions. Key tabs to review include the Summary, Amortization Schedule, and Sensitivity Analysis. Please let us know if you need a walkthrough of the model mechanics or have questions about specific assumptions.`,

    legal: `Thank you for your question regarding the transaction documentation. Please refer to the draft Credit Agreement and Term Sheet in the Legal Docs section of the VDR. If you have specific comments or redline requests, please share them and we'll coordinate with counsel. We aim to address documentation questions within 2 business days.`,

    other: `Thank you for your question. We've received your inquiry and are reviewing the relevant materials to provide a comprehensive response. In the meantime, please feel free to review the VDR for any related documentation. Could you provide any additional context that would help us better address your question?`
  };

  let draft = templates[source];

  // Enhance based on question keywords
  if (lower.includes("financial") || lower.includes("projection")) {
    if (source === "lender_presentation") {
      draft = `Thank you for your question regarding the financial projections. The detailed financials can be found in Section 4 of the Lender Presentation, which covers historical performance, management projections, and key assumptions. The bridge analysis and supporting schedules are included in the appendix. Please let us know if you'd like to discuss any specific metrics or assumptions.`;
    } else if (source === "supplemental_information") {
      draft = `Thank you for your question. The financial details you're asking about are covered in the Supplemental Information package. This includes detailed addbacks, EBITDA adjustments, and supporting schedules. Please review the reconciliation tabs for the specific breakdown. We're happy to walk through any items in detail.`;
    }
  }

  if (lower.includes("covenant") || lower.includes("leverage") || lower.includes("addback")) {
    draft = `Thank you for your question regarding the covenant and documentation terms. The draft Credit Agreement outlines the covenant package including leverage tests, coverage ratios, and permitted adjustments. For EBITDA addbacks specifically, please refer to the defined terms section. We're coordinating with counsel and can address specific redline requests within 48 hours.`;
  }

  if (lower.includes("kyc") || lower.includes("aml") || lower.includes("sanctions")) {
    draft = `Thank you for your KYC-related inquiry. The complete KYC package is available in the designated VDR folder. This includes organizational documents, beneficial ownership information, and required compliance certifications. Our operations team typically processes submissions within 3-5 business days. Please reach out if you need any specific forms or have questions about requirements for your institution.`;
  }

  if (lower.includes("model") || lower.includes("sweep") || lower.includes("paydown")) {
    draft = `Thank you for your question about the paydown model. The model includes detailed cash flow projections, mandatory amortization schedules, and excess cash flow sweep mechanics under various scenarios. Key assumptions are outlined in the Summary tab. Please let us know if you'd like to schedule a model walkthrough call or have questions about specific inputs.`;
  }

  return draft;
}

// ============================================================
// Question & Answer Workflow Functions
// ============================================================

interface AddQuestionPayload {
  dealId: string;
  lenderId: string;
  question: string;
  asker?: string;
  category?: QACategory;
  threadId?: string;
  originSource?: "messages" | "qa";
}

// Add a new question with auto-generated draft
export function addQuestion(payload: AddQuestionPayload): QAItem {
  const suggestedSource = suggestMaterialSource(payload.question);
  const suggestedCategory = payload.category || suggestCategory(payload.question);

  const newQA: QAItem = {
    id: `qa-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    dealId: payload.dealId,
    lenderId: payload.lenderId,
    question: payload.question,
    questionCreatedAt: formatISO(new Date()),
    status: "open",
    originSource: payload.originSource || "qa",
    threadId: payload.threadId,
    category: suggestedCategory,
    asker: payload.asker,
    materialSource: suggestedSource,
    draftStatus: "generating",
  };

  // Auto-generate draft answer
  const draftAnswer = autoDraftFromMaterials(payload.question, suggestedSource);
  newQA.draftAnswer = draftAnswer;
  newQA.draftStatus = "ready";

  qaItems.push(newQA);
  return newQA;
}

// Update draft answer
export function updateDraftAnswer(qaId: string, draftAnswer: string): void {
  const qa = getQA(qaId);
  if (qa) {
    updateQA(qaId, {
      draftAnswer,
      draftStatus: draftAnswer.length > 0 ? "ready" : "none"
    });
  }
}

// Set draft source and optionally regenerate draft
export function setDraftSource(qaId: string, source: MaterialSource, sourceNotes?: string): void {
  const qa = getQA(qaId);
  if (qa) {
    const updates: Partial<QAItem> = {
      materialSource: source,
      sourceNotes: source === "other" ? sourceNotes : undefined
    };

    // Auto-regenerate draft when source changes
    updates.draftAnswer = autoDraftFromMaterials(qa.question, source);
    updates.draftStatus = "ready";

    updateQA(qaId, updates);
  }
}

// Regenerate draft answer (e.g., when user clicks "Regenerate Draft")
export function generateDraftAnswer(qaId: string): void {
  const qa = getQA(qaId);
  if (qa) {
    updateQA(qaId, { draftStatus: "generating" });
    const newDraft = autoDraftFromMaterials(qa.question, qa.materialSource);
    updateQA(qaId, {
      draftAnswer: newDraft,
      draftStatus: "ready"
    });
  }
}

// Submit answer to investor
export function submitAnswer(qaId: string, submittedByEmail: string): boolean {
  const qa = getQA(qaId);
  if (!qa || !qa.draftAnswer || qa.draftAnswer.trim().length === 0) {
    return false;
  }

  // If source is "other", sourceNotes is required
  if (qa.materialSource === "other" && (!qa.sourceNotes || qa.sourceNotes.trim().length === 0)) {
    return false;
  }

  const now = formatISO(new Date());

  updateQA(qaId, {
    submittedAnswer: qa.draftAnswer,
    submittedBy: submittedByEmail,
    submittedAt: now,
    draftStatus: "submitted",
    status: "answered",
    answer: qa.draftAnswer, // Also update legacy answer field for compatibility
    answerUpdatedAt: now
  });

  // Sync to messages thread if linked
  if (qa.threadId && qa.originSource === "messages") {
    const newMessage: Message = {
      id: `m-qa-reply-${Date.now()}`,
      threadId: qa.threadId,
      senderId: "u1", // Mock Bookrunner
      body: `Submitted Response: ${qa.draftAnswer}`,
      createdAt: now,
      readBy: [],
      category: "due_diligence",
      dealId: qa.dealId,
      qaId: qa.id
    };

    if (mockMessages[qa.threadId]) {
      mockMessages[qa.threadId].push(newMessage);
    }
  }

  return true;
}

// ============================================================
// Sync Functions
// ============================================================

export function syncAnswerToMessage(qaId: string, answer: string, senderId: string) {
  const qa = getQA(qaId);
  if (qa && qa.threadId && qa.originSource === "messages") {
    // In a real app, this would post a message to the backend
  }
}

export function findOpenQAForThread(threadId: string) {
  return qaItems
    .filter(q => q.threadId === threadId && q.status === "open")
    .sort((a, b) => new Date(b.questionCreatedAt).getTime() - new Date(a.questionCreatedAt).getTime())[0];
}

export function reopenQA(id: string, reason?: string) {
  const qa = getQA(id);
  if (qa && (qa.status === "answered" || qa.status === "closed")) {
    const updates: Partial<QAItem> = {
      status: "open",
      reopenedAt: formatISO(new Date()),
      reopenReason: reason,
      draftStatus: "ready" // Keep draft for re-editing
    };
    return updateQA(id, updates);
  }
  return null;
}

// ============================================================
// Stats & Category Helpers
// ============================================================

export function getQAStats(dealId: string) {
  const items = getQAs(dealId);
  return {
    total: items.length,
    open: items.filter(q => q.status === "open").length,
    draft: items.filter(q => q.status === "draft").length,
    answered: items.filter(q => q.status === "answered").length,
    closed: items.filter(q => q.status === "closed").length,
    byCategory: QACategories.reduce((acc, cat) => {
      acc[cat] = items.filter(q => q.category === cat).length;
      return acc;
    }, {} as Record<QACategory, number>),
    byDraftStatus: {
      none: items.filter(q => q.draftStatus === "none").length,
      generating: items.filter(q => q.draftStatus === "generating").length,
      ready: items.filter(q => q.draftStatus === "ready").length,
      submitted: items.filter(q => q.draftStatus === "submitted").length
    }
  };
}

export function suggestCategory(questionText: string): QACategory {
  const lower = questionText.toLowerCase();

  if (lower.includes("ebitda") || lower.includes("revenue") || lower.includes("margin") ||
      lower.includes("capex") || lower.includes("cash flow") || lower.includes("financial")) {
    return "Financials";
  }
  if (lower.includes("contract") || lower.includes("agreement") || lower.includes("covenant") ||
      lower.includes("legal") || lower.includes("documentation") || lower.includes("credit")) {
    return "Legal / Documentation";
  }
  if (lower.includes("customer") || lower.includes("sales") || lower.includes("market") ||
      lower.includes("competition") || lower.includes("pricing")) {
    return "Commercial";
  }
  if (lower.includes("management") || lower.includes("team") || lower.includes("ceo") ||
      lower.includes("executive") || lower.includes("leadership")) {
    return "Management";
  }
  if (lower.includes("operations") || lower.includes("facility") || lower.includes("supply chain") ||
      lower.includes("manufacturing") || lower.includes("logistics")) {
    return "Operations";
  }
  if (lower.includes("collateral") || lower.includes("security") || lower.includes("asset")) {
    return "Collateral";
  }
  if (lower.includes("cyber") || lower.includes("it ") || lower.includes("technology") ||
      lower.includes("software") || lower.includes("system")) {
    return "IT / Cybersecurity";
  }
  if (lower.includes("esg") || lower.includes("environmental") || lower.includes("sustainability") ||
      lower.includes("climate")) {
    return "Environmental / ESG";
  }
  if (lower.includes("tax") || lower.includes("deduction") || lower.includes("credits")) {
    return "Tax";
  }

  return "Other";
}
