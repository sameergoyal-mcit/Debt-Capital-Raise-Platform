import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, RotateCcw } from "lucide-react";

export interface DocumentFilters {
  categories: string[];
  types: string[];
  visibility: string[];
  dateRange: "all" | "7days" | "30days" | "custom";
  showNewUpdatedOnly: boolean;
  showUnviewedOnly: boolean;
  sortBy: "updatedAt" | "name" | "category" | "version";
  sortOrder: "asc" | "desc";
}

interface DocumentFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: DocumentFilters;
  onFiltersChange: (filters: DocumentFilters) => void;
  role: "Investor" | "Issuer" | "Bookrunner";
}

const documentCategories = [
  "Lender Presentation",
  "Supplemental Information",
  "KYC & Compliance",
  "Lender Paydown Model",
  "Legal"
];

const documentTypes = [
  "Financial",
  "Legal",
  "Model",
  "Presentation",
  "Compliance",
  "Other"
];

const visibilityOptions = [
  { value: "early", label: "Early Look" },
  { value: "full", label: "Full Access" },
  { value: "legal", label: "Legal Only" }
];

export function DocumentFilterPanel({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  role
}: DocumentFilterPanelProps) {
  const isInternal = role !== "Investor";

  const toggleCategory = (cat: string) => {
    const newCategories = filters.categories.includes(cat)
      ? filters.categories.filter(c => c !== cat)
      : [...filters.categories, cat];
    onFiltersChange({ ...filters, categories: newCategories });
  };

  const toggleType = (type: string) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types: newTypes });
  };

  const toggleVisibility = (vis: string) => {
    const newVis = filters.visibility.includes(vis)
      ? filters.visibility.filter(v => v !== vis)
      : [...filters.visibility, vis];
    onFiltersChange({ ...filters, visibility: newVis });
  };

  const resetFilters = () => {
    onFiltersChange({
      categories: [],
      types: [],
      visibility: [],
      dateRange: "all",
      showNewUpdatedOnly: false,
      showUnviewedOnly: false,
      sortBy: "updatedAt",
      sortOrder: "desc"
    });
  };

  const activeFilterCount = 
    filters.categories.length + 
    filters.types.length + 
    filters.visibility.length +
    (filters.dateRange !== "all" ? 1 : 0) +
    (filters.showNewUpdatedOnly ? 1 : 0) +
    (filters.showUnviewedOnly ? 1 : 0);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[320px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Documents
            {activeFilterCount > 0 && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </SheetTitle>
          <SheetDescription>
            Filter and sort documents in the data room.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Categories */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Category</Label>
            <div className="space-y-2">
              {documentCategories.map(cat => (
                <label key={cat} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.categories.includes(cat)}
                    onCheckedChange={() => toggleCategory(cat)}
                  />
                  <span className="text-sm">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Document Types */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Document Type</Label>
            <div className="space-y-2">
              {documentTypes.map(type => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.types.includes(type)}
                    onCheckedChange={() => toggleType(type)}
                  />
                  <span className="text-sm">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Visibility (internal only) */}
          {isInternal && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Visibility Tier</Label>
              <div className="space-y-2">
                {visibilityOptions.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={filters.visibility.includes(opt.value)}
                      onCheckedChange={() => toggleVisibility(opt.value)}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Date Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Updated</Label>
            <Select 
              value={filters.dateRange} 
              onValueChange={(v) => onFiltersChange({ ...filters, dateRange: v as DocumentFilters["dateRange"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Show New/Updated Only</Label>
              <Switch
                checked={filters.showNewUpdatedOnly}
                onCheckedChange={(v) => onFiltersChange({ ...filters, showNewUpdatedOnly: v })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="text-sm">
                {isInternal ? "Show Unviewed by Lenders" : "Show Unviewed Only"}
              </Label>
              <Switch
                checked={filters.showUnviewedOnly}
                onCheckedChange={(v) => onFiltersChange({ ...filters, showUnviewedOnly: v })}
              />
            </div>
          </div>

          {/* Sort */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Sort By</Label>
            <div className="flex gap-2">
              <Select 
                value={filters.sortBy} 
                onValueChange={(v) => onFiltersChange({ ...filters, sortBy: v as DocumentFilters["sortBy"] })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updatedAt">Updated Date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="version">Version</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={filters.sortOrder} 
                onValueChange={(v) => onFiltersChange({ ...filters, sortOrder: v as "asc" | "desc" })}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest</SelectItem>
                  <SelectItem value="asc">Oldest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reset */}
          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={resetFilters}
          >
            <RotateCcw className="h-4 w-4" />
            Reset Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export const defaultDocumentFilters: DocumentFilters = {
  categories: [],
  types: [],
  visibility: [],
  dateRange: "all",
  showNewUpdatedOnly: false,
  showUnviewedOnly: false,
  sortBy: "updatedAt",
  sortOrder: "desc"
};
