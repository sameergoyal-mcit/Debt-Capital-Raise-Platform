// Finance-grade institutional color system
// Muted, professional palette for debt capital markets

export const statusColors = {
  // Status colors - muted and professional
  complete: {
    bg: "bg-green-900/10",
    text: "text-green-800",
    border: "border-green-800/20",
    hex: "#166534"
  },
  pending: {
    bg: "bg-amber-900/10",
    text: "text-amber-800",
    border: "border-amber-800/20",
    hex: "#92400E"
  },
  blocked: {
    bg: "bg-red-900/10",
    text: "text-red-900",
    border: "border-red-900/20",
    hex: "#7F1D1D"
  },
  info: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-300",
    hex: "#334155"
  },
  // Row priority markers
  priority: {
    blocking: "border-l-4 border-l-red-800",
    deadline: "border-l-4 border-l-amber-700",
    normal: "border-l-4 border-l-slate-300"
  }
} as const;

// Button hierarchy classes
export const buttonStyles = {
  primary: "bg-slate-700 hover:bg-slate-800 text-white",
  secondary: "border border-slate-300 bg-transparent hover:bg-slate-50 text-slate-700",
  destructive: "bg-transparent text-red-800 hover:text-red-900 hover:bg-red-50"
} as const;

// Tabular numeric font for financial data
export const numericFont = "font-mono tabular-nums";

// Row striping for tables
export const tableRow = {
  even: "bg-white",
  odd: "bg-slate-50/50",
  hover: "hover:bg-slate-100/70"
} as const;

export type StatusType = "complete" | "pending" | "blocked" | "info";

export function getStatusColor(status: StatusType) {
  return statusColors[status];
}

export function getPriorityBorder(priority: "blocking" | "deadline" | "normal") {
  return statusColors.priority[priority];
}
