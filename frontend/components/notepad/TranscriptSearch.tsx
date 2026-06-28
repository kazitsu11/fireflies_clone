"use client";

import { ChevronDown, ChevronUp, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export function TranscriptSearch({
  query,
  onQueryChange,
  matchCount,
  matchIdx,
  onPrev,
  onNext,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  matchCount: number;
  matchIdx: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const active = query.trim().length > 0;

  return (
    <div className="flex shrink-0 items-center gap-1.5 border-b bg-card px-3 py-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.shiftKey ? onPrev() : onNext();
            }
          }}
          placeholder="Search transcript…"
          aria-label="Search transcript"
          className="h-8 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>
      {active && (
        <div className="flex items-center gap-0.5">
          <span className="px-1 text-xs tabular-nums text-muted-foreground">
            {matchCount ? matchIdx + 1 : 0}/{matchCount}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Previous match"
            disabled={!matchCount}
            onClick={onPrev}
          >
            <ChevronUp className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Next match"
            disabled={!matchCount}
            onClick={onNext}
          >
            <ChevronDown className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Clear search"
            onClick={() => onQueryChange("")}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
