import { formatISO } from "date-fns";
import { mockMessages } from "./messages";

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
  asker?: string;
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
    asker: "Apollo",
    answer: "The sponsor equity cure is limited to 2 times over the life of the facility and cannot be used in consecutive quarters. We believe this is market standard for this credit profile."
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
    // Find the most recent open question in this thread
    return qaItems
        .filter(q => q.threadId === threadId && q.status === "open")
        .sort((a, b) => new Date(b.questionCreatedAt).getTime() - new Date(a.questionCreatedAt).getTime())[0];
}
