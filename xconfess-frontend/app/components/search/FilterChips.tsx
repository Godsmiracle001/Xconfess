"use client";

import { X } from "lucide-react";
import type { SearchFilters } from "@/app/lib/types/search";
import { cn } from "@/app/lib/utils/cn";

export type FilterChipKey = keyof SearchFilters | "query";

interface FilterChipsProps {
  filters: SearchFilters;
  query?: string;
  onRemoveFilter: (key: FilterChipKey) => void;
  onClearAll: () => void;
  statusChip?: {
    label: string;
    tone?: "warning" | "info";
  } | null;
  className?: string;
}

function formatDate(s: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    const date = new Date(y, m - 1, d);
    if (Number.isNaN(date.getTime())) return s;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  // Fallback for other date formats (ISO with time, etc.)
  try {
    const date = new Date(s);
    if (Number.isNaN(date.getTime())) return s;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return s;
  }
}

function formatSort(s: SearchFilters["sort"]) {
  const map: Record<SearchFilters["sort"], string> = {
    newest: "Newest",
    oldest: "Oldest",
    reactions: "Most reactions",
  };
  return map[s] ?? s;
}

export function FilterChips({
  filters,
  query,
  onRemoveFilter,
  onClearAll,
  statusChip,
  className,
}: FilterChipsProps) {
  const chips: { key: FilterChipKey; label: string }[] = [];

  if (query && query.trim()) {
    chips.push({ key: "query", label: `"${query.trim()}"` });
  }
  if (filters.dateFrom) {
    chips.push({ key: "dateFrom", label: `From ${formatDate(filters.dateFrom)}` });
  }
  if (filters.dateTo) {
    chips.push({ key: "dateTo", label: `To ${formatDate(filters.dateTo)}` });
  }
  if (filters.minReactions != null && filters.minReactions > 0) {
    chips.push({
      key: "minReactions",
      label: `Min ${filters.minReactions} reactions`,
    });
  }
  if (filters.sort && filters.sort !== "newest") {
    chips.push({ key: "sort", label: formatSort(filters.sort) });
  }

  if (chips.length === 0) return null;

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="list"
      aria-label="Active filters"
    >
      {statusChip && (
        <span
          role="listitem"
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
            statusChip.tone === "warning"
              ? "bg-amber-900/30 text-amber-200 border border-amber-700/60"
              : "bg-blue-900/20 text-blue-200 border border-blue-700/40"
          }`}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-80" />
          <span>{statusChip.label}</span>
        </span>
      )}
      {chips.map(({ key, label }) => (
        <span
          key={`${key}-${label}`}
          role="listitem"
          className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200"
        >
          <span>{label}</span>
          <button
            type="button"
            onClick={() => onRemoveFilter(key)}
            className="p-0.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
            aria-label={`Remove filter: ${label}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-sm text-zinc-400 hover:text-white transition-colors"
      >
        Clear all
      </button>
    </div>
  );
}
