import { formatISO } from "date-fns";
import { mockMessages } from "./messages";

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

export interface QAItem {
  id: string;
  dealId: string;
  lenderId: string;
  question: string;
  questionCreatedAt: string; // ISO
  answer?: string;
  answerUpdatedAt?: string; // ISO
  status: "open" | "answered" | "draft" | "closed";
  source: "messages" | "qa";
  threadId?: string;   // link back to messages thread
  messageIds?: string[]; // optional linkage
  topic?: string;
  category?: QACategory;
  asker?: string;
  reopenedAt?: string; // ISO - when question was re-opened
  reopenReason?: string;
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
    source: "messages",
    threadId: "t2",
    topic: "Financials",
    category: "Financials",
    asker: "BlackRock"
  },
  {
    id: "qa2",
    dealId: "101",
    lenderId: "2",
    question: "Please clarify the change of control provisions in the current credit agreement draft regarding the sponsor equity cure.",
    questionCreatedAt: formatISO(new Date(Date.now() - 18000000)), // 5 hours ago
    status: "draft",
    source: "qa",
    topic: "Legal",
    category: "Legal / Documentation",
    asker: "Apollo",
    answer: "The sponsor equity cure is limited to 2 times over the life of the facility and cannot be used in consecutive quarters. We believe this is market standard for this credit profile."
  },
  {
    id: "qa3",
    dealId: "101",
    lenderId: "3",
    question: "What is the expected capex requirement for the next 3 years and how is this funded?",
    questionCreatedAt: formatISO(new Date(Date.now() - 86400000)), // 1 day ago
    status: "open",
    source: "qa",
    category: "Financials",
    asker: "Ares Management"
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
    source: "qa",
    category: "Commercial",
    asker: "BlackRock"
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

// Sync Functions

export function syncAnswerToMessage(qaId: string, answer: string, senderId: string) {
  const qa = getQA(qaId);
  if (qa && qa.threadId && qa.source === "messages") {
    // In a real app, this would post a message to the backend
    // For mockup, we can try to push to mockMessages if we import it, 
    // but better to just handle the QA update here and assume message UI updates reactively or via reload
    // We already updated the QA item via updateQA
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
      reopenReason: reason
    };
    return updateQA(id, updates);
  }
  return null;
}

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
    }, {} as Record<QACategory, number>)
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
