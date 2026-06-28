"use client";

import { FileText, ListTree, Sparkles } from "lucide-react";

import type { MeetingDetail } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { usePlayer } from "./PlayerContext";
import { Chapters } from "./Chapters";
import { KeywordChips } from "./KeywordChips";
import { SectionHeading } from "./SectionHeading";

export function SummaryPanel({ meeting }: { meeting: MeetingDetail }) {
  const { seekTo } = usePlayer();
  const summary = meeting.summary;

  return (
    <div className="space-y-8">
      <section id="overview" className="scroll-mt-4 space-y-3">
        <SectionHeading
          icon={FileText}
          title="Overview"
          trailing={
            <Badge
              variant="secondary"
              className="gap-1 bg-violet-50 font-normal text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
            >
              <Sparkles className="size-3" />
              AI summary
            </Badge>
          }
        />
        {summary?.overview ? (
          <p className="text-sm leading-relaxed text-foreground/90">{summary.overview}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No summary yet — use “Regenerate notes” to generate one.
          </p>
        )}
        <KeywordChips keywords={meeting.keywords} />
      </section>

      <section id="chapters" className="scroll-mt-4 space-y-3">
        <SectionHeading icon={ListTree} title="Notes" />
        <Chapters chapters={summary?.chapters ?? []} onJump={seekTo} />
      </section>
    </div>
  );
}
