"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search as SearchIcon } from "lucide-react";

import { api } from "@/lib/api";
import type { GlobalSearchHit } from "@/lib/types";
import { msToClock } from "@/lib/time";
import { useDebounce } from "@/lib/useDebounce";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function highlight(text: string, q: string): ReactNode {
  const needle = q.trim().toLowerCase();
  if (!needle) return text;
  const lower = text.toLowerCase();
  const parts: ReactNode[] = [];
  let i = 0;
  let idx = lower.indexOf(needle);
  let key = 0;
  while (idx !== -1) {
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark key={key++} className="rounded-sm bg-amber-200/70 px-0.5 text-amber-950 dark:bg-amber-400/25 dark:text-amber-100">
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    i = idx + q.length;
    idx = lower.indexOf(needle, i);
  }
  if (i < text.length) parts.push(text.slice(i));
  return parts;
}

export function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [input, setInput] = useState(searchParams.get("q") ?? "");
  const q = useDebounce(input.trim(), 300);

  // Keep the URL shareable as the (debounced) query changes.
  useEffect(() => {
    router.replace(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }, [q, router]);

  const { data: hits, isFetching } = useQuery({
    queryKey: ["search", q],
    queryFn: () => api.globalSearch(q),
    enabled: q.length > 0,
  });

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { title: string; titleMatch: boolean; transcripts: GlobalSearchHit[] }
    >();
    for (const h of hits ?? []) {
      const g =
        map.get(h.meeting_id) ??
        { title: h.meeting_title, titleMatch: false, transcripts: [] };
      if (h.kind === "title") g.titleMatch = true;
      else g.transcripts.push(h);
      map.set(h.meeting_id, g);
    }
    return [...map.entries()].map(([id, g]) => ({ id, ...g }));
  }, [hits]);

  const totalHits = hits?.length ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Across every meeting&apos;s title and transcript.
        </p>
      </div>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search meetings and transcripts…"
          aria-label="Search all meetings"
          className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>

      {q.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card px-6 py-14 text-center">
          <SearchIcon className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Start typing to search across all your meetings.
          </p>
        </div>
      ) : isFetching && !hits ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : totalHits === 0 ? (
        <div className="rounded-xl border border-dashed bg-card px-6 py-14 text-center">
          <p className="text-sm text-muted-foreground">
            No results for “<span className="font-medium text-foreground">{q}</span>”.
            Try a different term.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{totalHits}</span>{" "}
            {totalHits === 1 ? "result" : "results"} in {groups.length}{" "}
            {groups.length === 1 ? "meeting" : "meetings"}
          </p>
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.id} className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <Link
                  href={`/meetings/${g.id}`}
                  className="flex items-center gap-2 border-b px-4 py-3 outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent/60"
                >
                  <FileText className="size-4 text-violet-600 dark:text-violet-300" />
                  <span className="font-medium">{highlight(g.title, q)}</span>
                  {g.titleMatch && (
                    <Badge
                      variant="secondary"
                      className="ml-1 bg-violet-50 font-normal text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
                    >
                      Title match
                    </Badge>
                  )}
                </Link>
                {g.transcripts.length > 0 && (
                  <ul className="divide-y">
                    {g.transcripts.map((h) => (
                      <li key={h.segment_id}>
                        <Link
                          href={`/meetings/${g.id}`}
                          className="flex gap-3 px-4 py-2.5 text-sm outline-none transition-colors hover:bg-accent/50 focus-visible:bg-accent/50"
                        >
                          {h.start_ms != null && (
                            <span className="shrink-0 tabular-nums text-muted-foreground">
                              {msToClock(h.start_ms)}
                            </span>
                          )}
                          <span className="text-foreground/90">{highlight(h.snippet, q)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
