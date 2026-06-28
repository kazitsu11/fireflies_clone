"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2, Tag } from "lucide-react";

import { api } from "@/lib/api";
import type { MeetingListParams } from "@/lib/types";
import { useDebounce } from "@/lib/useDebounce";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_FILTERS,
  filtersAreActive,
  MeetingFilters,
  type Filters,
} from "./MeetingFilters";
import { EmptyState } from "./EmptyState";
import { MeetingListSkeleton } from "./MeetingListSkeleton";
import { MeetingRow } from "./MeetingRow";

export function MeetingsDashboard() {
  const searchParams = useSearchParams();
  const qParam = searchParams.get("q");

  const [filters, setFilters] = useState<Filters>(() => ({
    ...DEFAULT_FILTERS,
    search: qParam ?? "",
  }));

  // Keep the search box in sync when the topbar global search updates ?q.
  useEffect(() => {
    if (qParam !== null) setFilters((f) => ({ ...f, search: qParam }));
  }, [qParam]);

  const patch = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }));
  const debouncedSearch = useDebounce(filters.search, 300);

  const params: MeetingListParams = useMemo(
    () => ({
      q: debouncedSearch.trim() || undefined,
      participant: filters.participant !== "all" ? filters.participant : undefined,
      keyword: filters.keyword || undefined,
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
      min_duration:
        filters.minDuration !== "any" ? Number(filters.minDuration) : undefined,
      sort: filters.sort,
    }),
    [
      debouncedSearch,
      filters.participant,
      filters.keyword,
      filters.dateFrom,
      filters.dateTo,
      filters.minDuration,
      filters.sort,
    ],
  );

  const {
    data: meetings,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["meetings", params],
    queryFn: () => api.listMeetings(params),
    placeholderData: keepPreviousData,
  });

  // Participant filter options come from the full, unfiltered list.
  const { data: allMeetings } = useQuery({
    queryKey: ["meetings", "all-for-filter"],
    queryFn: () => api.listMeetings({}),
    staleTime: Infinity,
  });
  const participantNames = useMemo(() => {
    const set = new Set<string>();
    allMeetings?.forEach((m) => m.participants.forEach((p) => set.add(p.name)));
    return Array.from(set).sort();
  }, [allMeetings]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    allMeetings?.forEach((m) => m.keywords.forEach((k) => set.add(k.term)));
    return Array.from(set).sort();
  }, [allMeetings]);

  const active = filtersAreActive(filters);
  const count = meetings?.length ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <MeetingFilters value={filters} onChange={patch} participantNames={participantNames} />

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Tag className="size-3.5" />
            Tags
          </span>
          {allTags.map((t) => {
            const tagActive = filters.keyword === t;
            return (
              <button
                key={t}
                onClick={() => patch({ keyword: tagActive ? "" : t })}
                aria-pressed={tagActive}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  tagActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground/70 hover:bg-accent hover:text-foreground",
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex h-6 items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isPending ? (
            "Loading meetings…"
          ) : (
            <>
              <span className="font-medium text-foreground">{count}</span>{" "}
              {count === 1 ? "meeting" : "meetings"}
              {active && (count === 1 ? " matches your filters" : " match your filters")}
            </>
          )}
        </p>
        {isFetching && !isPending && (
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Refreshing" />
        )}
      </div>

      {isPending ? (
        <MeetingListSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
          <AlertCircle className="size-6 text-destructive" />
          <div>
            <p className="font-medium">Couldn&apos;t load meetings</p>
            <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : count === 0 ? (
        <EmptyState filtered={active} onClear={() => setFilters(DEFAULT_FILTERS)} />
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
          {meetings!.map((m) => (
            <MeetingRow key={m.id} meeting={m} />
          ))}
        </div>
      )}
    </div>
  );
}
