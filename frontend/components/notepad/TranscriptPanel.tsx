"use client";

import { useEffect, useMemo, useState } from "react";

import type { Segment } from "@/lib/types";
import { Transcript } from "./Transcript";
import { TranscriptSearch } from "./TranscriptSearch";

/** Right column: search bar + transcript, owning the client-side search state. */
export function TranscriptPanel({ segments }: { segments: Segment[] }) {
  const [query, setQuery] = useState("");
  const [matchIdx, setMatchIdx] = useState(0);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as Segment[];
    return segments.filter((s) => s.text.toLowerCase().includes(q));
  }, [segments, query]);

  useEffect(() => {
    setMatchIdx(0);
  }, [query]);

  const safeIdx = matches.length ? matchIdx % matches.length : 0;
  const current = matches[safeIdx] ?? null;

  return (
    <>
      <TranscriptSearch
        query={query}
        onQueryChange={setQuery}
        matchCount={matches.length}
        matchIdx={safeIdx}
        onPrev={() =>
          matches.length && setMatchIdx((i) => (i - 1 + matches.length) % matches.length)
        }
        onNext={() => matches.length && setMatchIdx((i) => (i + 1) % matches.length)}
      />
      <Transcript
        segments={segments}
        query={query}
        currentMatchSegmentId={current?.id ?? null}
        scrollToSegmentId={current?.id ?? null}
      />
    </>
  );
}
