import { subHours, subDays, subMinutes } from "date-fns";

export interface MessageParticipant {
  id: string;
  role: "Bookrunner" | "Issuer" | "Investor" | "Counsel";
  name: string;
  email: string;
  lenderId?: string; // If investor
  avatar?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: "pdf" | "image" | "doc";
  size: string;
}

// Mention system for @tagging
export interface Mention {
  type: "role" | "user";
  value: string;       // Role name like "Bookrunner" or user ID
  displayName: string; // Display text like "@Bookrunner" or "@John Smith"
  startIndex: number;  // Position in message body
  endIndex: number;    // End position in message body
}

export const MENTIONABLE_ROLES = ["Bookrunner", "Issuer", "Lender"] as const;
export type MentionableRole = typeof MENTIONABLE_ROLES[number];

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: string; // ISO
  attachments?: Attachment[];
  readBy: string[]; // User IDs
  mentions?: Mention[]; // @mentions in message body

  // New fields for Q&A Sync
  category?: "due_diligence" | "deal_process";
  dealId?: string;
  qaId?: string; // Link to Q&A item if category == due_diligence
}

export interface MessageThread {
  id: string;
  dealId?: string; // Optional, if linked to specific deal
  dealName?: string;
  category: "Issuer" | "Investor" | "Counsel";
  subject: string;
  participants: MessageParticipant[];
  lastMessageAt: string; // ISO
  unreadCount: number;
  lenderId?: string; // For investor threads
  status: "active" | "archived";
}

// Mock Participants (exported for use in conversation dialogs)
export const sarah: MessageParticipant = { id: "u1", role: "Bookrunner", name: "Sarah Jenkins", email: "sarah@capitalflow.com" };
export const michael: MessageParticipant = { id: "u2", role: "Issuer", name: "Michael Ross", email: "mross@atlaspe.com" };
export const david: MessageParticipant = { id: "u3", role: "Investor", name: "David Chen", email: "dchen@blackrock.com", lenderId: "1" };
export const jessica: MessageParticipant = { id: "u4", role: "Investor", name: "Jessica Wu", email: "jwu@apollo.com", lenderId: "2" };
export const legal: MessageParticipant = { id: "u5", role: "Counsel", name: "Robert Suits", email: "rsuits@kirkland.com" };

// Mock Threads
export const mockThreads: MessageThread[] = [
  {
    id: "t1",
    dealId: "101",
    dealName: "Project Titan",
    category: "Issuer",
    subject: "Internal Sync: Structuring Updates",
    participants: [sarah, michael],
    lastMessageAt: subMinutes(new Date(), 15).toISOString(),
    unreadCount: 1,
    status: "active"
  },
  {
    id: "t2",
    dealId: "101",
    dealName: "Project Titan",
    category: "Investor",
    subject: "BlackRock / CapitalFlow - Project Titan Q&A",
    participants: [sarah, david],
    lenderId: "1",
    lastMessageAt: subHours(new Date(), 2).toISOString(),
    unreadCount: 0,
    status: "active"
  },
  {
    id: "t3",
    dealId: "101",
    dealName: "Project Titan",
    category: "Investor",
    subject: "Apollo / CapitalFlow - Due Diligence Access",
    participants: [sarah, jessica],
    lenderId: "2",
    lastMessageAt: subDays(new Date(), 1).toISOString(),
    unreadCount: 2,
    status: "active"
  },
  {
    id: "t4",
    category: "Counsel",
    subject: "Legal Opinion Review",
    participants: [sarah, legal],
    lastMessageAt: subDays(new Date(), 3).toISOString(),
    unreadCount: 0,
    status: "active"
  }
];

// Mock Messages
export const mockMessages: Record<string, Message[]> = {
  "t1": [
    {
      id: "m1-1",
      threadId: "t1",
      senderId: "u2",
      body: "Hi Sarah, checking in on the leverage read from the market. Are we still comfortable with 4.5x?",
      createdAt: subHours(new Date(), 24).toISOString(),
      readBy: ["u1"]
    },
    {
      id: "m1-2",
      threadId: "t1",
      senderId: "u1",
      body: "Yes, feedback has been positive. We might even be able to push for 4.75x if the OID is right. I'm preparing a summary deck now.",
      createdAt: subHours(new Date(), 23).toISOString(),
      readBy: ["u2"]
    },
    {
      id: "m1-3",
      threadId: "t1",
      senderId: "u2",
      body: "That sounds great. When can we review the updated term sheet?",
      createdAt: subMinutes(new Date(), 15).toISOString(),
      readBy: []
    }
  ],
  "t2": [
    {
      id: "m2-1",
      threadId: "t2",
      senderId: "u3",
      body: "Sarah - thanks for the invite. Can you clarify the definition of EBITDA used in the marketing deck? Is it Pro Forma for the acquisition synergies?",
      createdAt: subHours(new Date(), 2).toISOString(),
      readBy: ["u1"],
      category: "due_diligence",
      dealId: "101",
      qaId: "qa1"
    },
    {
      id: "m2-2",
      threadId: "t2",
      senderId: "u1",
      body: "Hi David, yes, it includes $5M of run-rate cost synergies validated by the QofE. I've attached the bridge.",
      createdAt: subHours(new Date(), 1).toISOString(),
      readBy: ["u3"],
      attachments: [{ id: "a1", name: "EBITDA_Bridge.pdf", url: "#", type: "pdf", size: "1.2 MB" }],
      category: "due_diligence",
      dealId: "101",
      qaId: "qa1"
    }
  ],
  "t3": [
    {
      id: "m3-1",
      threadId: "t3",
      senderId: "u4",
      body: "Having trouble accessing the VDR. Can you reset my permissions?",
      createdAt: subDays(new Date(), 1).toISOString(),
      readBy: []
    }
  ],
  "t4": [
    {
      id: "m4-1",
      threadId: "t4",
      senderId: "u5",
      body: "Draft opinion attached for review.",
      createdAt: subDays(new Date(), 3).toISOString(),
      readBy: ["u1"]
    }
  ]
};

export function getThreadsForUser(role: string, lenderId?: string) {
  if (role === "Bookrunner") {
    return mockThreads;
  }
  if (role === "Issuer") {
    // Issuer sees their threads + investor threads for their deals (assuming 101 is their deal)
    return mockThreads.filter(t => t.dealId === "101" || t.category === "Issuer");
  }
  if (role === "Investor") {
    // Investor sees only threads where they are a participant (or match lenderId)
    return mockThreads.filter(t => t.lenderId === lenderId);
  }
  return [];
}

export function getMessages(threadId: string) {
  return mockMessages[threadId] || [];
}

// Get all available participants for recipient selection
export function getAllParticipants(): MessageParticipant[] {
  return [sarah, michael, david, jessica, legal];
}

// Parse @mentions from message text
export function parseMentions(text: string, participants: MessageParticipant[]): Mention[] {
  const mentions: Mention[] = [];
  const mentionRegex = /@(\w+(?:\s+\w+)?)/g;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const mentionText = match[1];
    const startIndex = match.index;
    const endIndex = startIndex + match[0].length;

    // Check if it's a role mention
    const matchedRole = MENTIONABLE_ROLES.find(
      role => role.toLowerCase() === mentionText.toLowerCase()
    );

    if (matchedRole) {
      mentions.push({
        type: "role",
        value: matchedRole,
        displayName: `@${matchedRole}`,
        startIndex,
        endIndex
      });
      continue;
    }

    // Check if it's a user mention (match by name)
    const matchedUser = participants.find(
      p => p.name.toLowerCase() === mentionText.toLowerCase() ||
           p.name.toLowerCase().replace(/\s+/g, "") === mentionText.toLowerCase()
    );

    if (matchedUser) {
      mentions.push({
        type: "user",
        value: matchedUser.id,
        displayName: `@${matchedUser.name}`,
        startIndex,
        endIndex
      });
    }
  }

  return mentions;
}

// Interface for creating new threads
export interface CreateThreadPayload {
  dealId?: string;
  dealName?: string;
  category: "Issuer" | "Investor" | "Counsel";
  subject: string;
  participants: MessageParticipant[];
  lenderId?: string;
  initialMessage: string;
  senderId: string;
}

let threadIdCounter = 100;

// Create a new message thread
export function createThread(payload: CreateThreadPayload): MessageThread {
  const threadId = `t-${++threadIdCounter}-${Date.now()}`;
  const now = new Date().toISOString();

  const newThread: MessageThread = {
    id: threadId,
    dealId: payload.dealId,
    dealName: payload.dealName,
    category: payload.category,
    subject: payload.subject,
    participants: payload.participants,
    lastMessageAt: now,
    unreadCount: 0,
    lenderId: payload.lenderId,
    status: "active"
  };

  mockThreads.unshift(newThread); // Add to beginning

  // Create initial message
  const initialMsg: Message = {
    id: `m-${threadId}-init`,
    threadId: threadId,
    senderId: payload.senderId,
    body: payload.initialMessage,
    createdAt: now,
    readBy: [payload.senderId],
    category: "deal_process"
  };

  mockMessages[threadId] = [initialMsg];

  return newThread;
}
