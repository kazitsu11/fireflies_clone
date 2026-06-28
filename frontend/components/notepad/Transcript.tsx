"use client";

import { useEffect, useMemo, useRef } from "react";

import type { Segment } from "@/lib/types";
import { usePlayer } from "./PlayerContext";
import { TranscriptLine } from "./TranscriptLine";

// Distinct, stable speaker colors (assigned by first appearance).
const SPEAKER_COLORS = [
  "text-violet-700",
  "text-indigo-700",
  "text-sky-700",
  "text-emerald-700",
  "text-amber-700",
  "text-rose-700",
  "text-cyan-700",
  "text-fuchsia-700",
];

export function Transcript({
  segments,
  query,
  currentMatchSegmentId,
  scrollToSegmentId,
}: {
  segments: Segment[];
  query?: string;
  currentMatchSegmentId?: string | null;
  scrollToSegmentId?: string | null;
}) {
  const { currentMs, seekTo } = usePlayer();
  const containerRef = useRef<HTMLDivElement>(null);

  const speakerColors = useMemo(() => {
    const map = new Map<string, string>();
    let i = 0;
    for (const s of segments) {
      if (!map.has(s.speaker)) {
        map.set(s.speaker, SPEAKER_COLORS[i % SPEAKER_COLORS.length]);
        i += 1;
      }
    }
    return map;
  }, [segments]);

  // Active = last segment whose start_ms has been reached (segments are ordered).
  const activeIdx = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].start_ms <= currentMs) idx = i;
      else break;
    }
    return idx;
  }, [segments, currentMs]);

  // Auto-scroll the active line into view when it changes (throttled by the fact
  // that activeIdx only changes when playback crosses a line boundary).
  useEffect(() => {
    if (activeIdx < 0) return;
    const el = containerRef.current?.querySelector<HTMLElement>(
      `[data-line-idx="${segments[activeIdx].idx}"]`,
    );
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }, [activeIdx, segments]);

  // Scroll the current search match into view as the user steps through matches.
  useEffect(() => {
    if (!scrollToSegmentId) return;
    const seg = segments.find((s) => s.id === scrollToSegmentId);
    if (!seg) return;
    const el = containerRef.current?.querySelector<HTMLElement>(
      `[data-line-idx="${seg.idx}"]`,
    );
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }, [scrollToSegmentId, segments]);

  return (
    <div
      ref={containerRef}
      className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-3"
    >
      {segments.map((s, i) => (
        <TranscriptLine
          key={s.id}
          segment={s}
          speakerColor={speakerColors.get(s.speaker) ?? "text-foreground"}
          isActive={i === activeIdx}
          onSeek={seekTo}
          query={query}
          isCurrentMatch={!!query && s.id === currentMatchSegmentId}
        />
      ))}
    </div>
  );
}
