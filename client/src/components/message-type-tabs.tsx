import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export type MessageFilter = "all" | "dd" | "process";

interface MessageTypeTabsProps {
  value: MessageFilter;
  onChange: (value: MessageFilter) => void;
  counts?: {
    all: number;
    dd: number;
    process: number;
  };
}

export function MessageTypeTabs({ value, onChange, counts }: MessageTypeTabsProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as MessageFilter)}>
      <TabsList className="h-9">
        <TabsTrigger value="all" className="text-xs gap-1.5 px-3">
          All Messages
          {counts && counts.all > 0 && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {counts.all}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="dd" className="text-xs gap-1.5 px-3">
          Due Diligence
          {counts && counts.dd > 0 && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {counts.dd}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="process" className="text-xs gap-1.5 px-3">
          Deal Process
          {counts && counts.process > 0 && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {counts.process}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

export function categorizeMessage(content: string): "dd" | "process" {
  const ddKeywords = [
    "ebitda", "financials", "covenant", "diligence", "qoe", 
    "quality of earnings", "audit", "projection", "model",
    "revenue", "margin", "capex", "debt"
  ];
  
  const lower = content.toLowerCase();
  const isDueDiligence = ddKeywords.some(kw => lower.includes(kw));
  
  return isDueDiligence ? "dd" : "process";
}
