import { formatISO } from "date-fns";

export type AccessAction = 
  | "view_doc"
  | "download_doc"
  | "upload_markup"
  | "submit_commitment"
  | "view_qa"
  | "submit_qa"
  | "sign_nda"
  | "view_deal"
  | "view_messages";

export interface AccessLogEntry {
  id: string;
  lenderId: string;
  lenderName: string;
  dealId: string;
  action: AccessAction;
  resourceId?: string;
  resourceName?: string;
  timestamp: string;
  ipAddress?: string;
}

let accessLogs: AccessLogEntry[] = [
  {
    id: "log1",
    lenderId: "1",
    lenderName: "Ares Management",
    dealId: "101",
    action: "sign_nda",
    timestamp: formatISO(new Date(Date.now() - 86400000 * 5)),
    ipAddress: "192.168.1.100"
  },
  {
    id: "log2",
    lenderId: "1",
    lenderName: "Ares Management",
    dealId: "101",
    action: "view_doc",
    resourceId: "d1",
    resourceName: "Credit Agreement v3.docx",
    timestamp: formatISO(new Date(Date.now() - 86400000 * 2)),
    ipAddress: "192.168.1.100"
  },
  {
    id: "log3",
    lenderId: "2",
    lenderName: "Blue Owl Capital",
    dealId: "101",
    action: "sign_nda",
    timestamp: formatISO(new Date(Date.now() - 86400000 * 4)),
    ipAddress: "10.0.0.55"
  },
  {
    id: "log4",
    lenderId: "2",
    lenderName: "Blue Owl Capital",
    dealId: "101",
    action: "submit_commitment",
    timestamp: formatISO(new Date(Date.now() - 86400000 * 1)),
    ipAddress: "10.0.0.55"
  },
  {
    id: "log5",
    lenderId: "1",
    lenderName: "Ares Management",
    dealId: "101",
    action: "submit_qa",
    resourceName: "EBITDA definition question",
    timestamp: formatISO(new Date(Date.now() - 7200000)),
    ipAddress: "192.168.1.100"
  },
  {
    id: "log6",
    lenderId: "3",
    lenderName: "Golub Capital",
    dealId: "101",
    action: "view_deal",
    timestamp: formatISO(new Date(Date.now() - 3600000)),
    ipAddress: "172.16.0.22"
  },
  {
    id: "log7",
    lenderId: "1",
    lenderName: "Ares Management",
    dealId: "101",
    action: "download_doc",
    resourceId: "d6",
    resourceName: "Lender Presentation.pdf",
    timestamp: formatISO(new Date(Date.now() - 1800000)),
    ipAddress: "192.168.1.100"
  }
];

let logIdCounter = 8;

export function logAccess(entry: Omit<AccessLogEntry, "id" | "timestamp">): AccessLogEntry {
  const newEntry: AccessLogEntry = {
    ...entry,
    id: `log${logIdCounter++}`,
    timestamp: formatISO(new Date())
  };
  accessLogs.unshift(newEntry);
  return newEntry;
}

export function getAccessLogs(dealId: string, options?: { 
  lenderId?: string; 
  action?: AccessAction;
  limit?: number;
}): AccessLogEntry[] {
  let filtered = accessLogs.filter(log => log.dealId === dealId);
  
  if (options?.lenderId) {
    filtered = filtered.filter(log => log.lenderId === options.lenderId);
  }
  if (options?.action) {
    filtered = filtered.filter(log => log.action === options.action);
  }
  
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }
  
  return filtered;
}

export function getActionLabel(action: AccessAction): string {
  const labels: Record<AccessAction, string> = {
    view_doc: "Viewed document",
    download_doc: "Downloaded document",
    upload_markup: "Uploaded markup",
    submit_commitment: "Submitted commitment",
    view_qa: "Viewed Q&A",
    submit_qa: "Submitted question",
    sign_nda: "Signed NDA",
    view_deal: "Accessed deal",
    view_messages: "Viewed messages"
  };
  return labels[action];
}
