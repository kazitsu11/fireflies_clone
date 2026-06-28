"use client";

import { Play } from "lucide-react";

import type { Chapter } from "@/lib/types";
import { msToClock } from "@/lib/time";

export function Chapters({
  chapters,
  onJump,
}: {
  chapters: Chapter[];
  onJump: (ms: number) => void;
}) {
  if (chapters.length === 0) {
    return <p className="text-sm text-muted-foreground">No notes for this meeting yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {chapters.map((ch) => (
        <li key={ch.id} className="rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <h4 className="font-medium leading-snug">{ch.title}</h4>
            <button
              onClick={() => onJump(ch.start_ms)}
              className="inline-flex shrink-0 items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-xs font-medium tabular-nums text-violet-700 outline-none transition-colors hover:bg-violet-100 focus-visible:ring-2 focus-visible:ring-ring dark:bg-violet-500/15 dark:text-violet-300 dark:hover:bg-violet-500/25"
              aria-label={`Jump to ${msToClock(ch.start_ms)}`}
            >
              <Play className="size-3 fill-current" />
              {msToClock(ch.start_ms)}
            </button>
          </div>
          {ch.bullets.length > 0 && (
            <ul className="mt-2.5 space-y-1.5">
              {ch.bullets.map((b, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground/80">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-violet-400" />
                  {b}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
