"use client";

import { Search, SlidersHorizontal } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortValue = "recent" | "oldest" | "longest" | "title";

export interface Filters {
  search: string;
  participant: string; // "all" or a participant name
  keyword: string; // "" or an exact tag
  dateFrom: string; // yyyy-mm-dd or ""
  dateTo: string;
  minDuration: string; // "any" or seconds as string
  sort: SortValue;
}

export const DEFAULT_FILTERS: Filters = {
  search: "",
  participant: "all",
  keyword: "",
  dateFrom: "",
  dateTo: "",
  minDuration: "any",
  sort: "recent",
};

export function filtersAreActive(f: Filters): boolean {
  return (
    f.search.trim() !== "" ||
    f.participant !== "all" ||
    f.keyword !== "" ||
    f.dateFrom !== "" ||
    f.dateTo !== "" ||
    f.minDuration !== "any"
  );
}

type Option = { value: string; label: string };

const DURATION_OPTIONS: Option[] = [
  { value: "any", label: "Any length" },
  { value: "300", label: "5+ min" },
  { value: "900", label: "15+ min" },
  { value: "1800", label: "30+ min" },
];

const SORT_OPTIONS: Option[] = [
  { value: "recent", label: "Most recent" },
  { value: "oldest", label: "Oldest" },
  { value: "longest", label: "Longest" },
  { value: "title", label: "Title (A–Z)" },
];

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: Option[];
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as string)}>
      <SelectTrigger size="sm" className={className}>
        <SelectValue placeholder={placeholder}>
          {(v: string | null) =>
            options.find((o) => o.value === v)?.label ?? placeholder
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function MeetingFilters({
  value,
  onChange,
  participantNames,
}: {
  value: Filters;
  onChange: (patch: Partial<Filters>) => void;
  participantNames: string[];
}) {
  const participantOptions: Option[] = [
    { value: "all", label: "All participants" },
    ...participantNames.map((n) => ({ value: n, label: n })),
  ];

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative w-full lg:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={value.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Search by title or keyword…"
          aria-label="Search meetings"
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
        <FilterSelect
          value={value.participant}
          onChange={(v) => onChange({ participant: v })}
          placeholder="Participant"
          options={participantOptions}
          className="w-[170px]"
        />

        <div className="flex items-center gap-1 rounded-lg border bg-background px-1 text-sm text-muted-foreground">
          <input
            type="date"
            aria-label="From date"
            value={value.dateFrom}
            onChange={(e) => onChange({ dateFrom: e.target.value })}
            className="h-7 rounded-md bg-transparent px-1.5 text-foreground outline-none"
          />
          <span className="text-xs">–</span>
          <input
            type="date"
            aria-label="To date"
            value={value.dateTo}
            onChange={(e) => onChange({ dateTo: e.target.value })}
            className="h-7 rounded-md bg-transparent px-1.5 text-foreground outline-none"
          />
        </div>

        <FilterSelect
          value={value.minDuration}
          onChange={(v) => onChange({ minDuration: v })}
          placeholder="Duration"
          options={DURATION_OPTIONS}
          className="w-[130px]"
        />

        <div className="flex items-center gap-1.5">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          <FilterSelect
            value={value.sort}
            onChange={(v) => onChange({ sort: v as SortValue })}
            placeholder="Sort"
            options={SORT_OPTIONS}
            className="w-[150px]"
          />
        </div>
      </div>
    </div>
  );
}
