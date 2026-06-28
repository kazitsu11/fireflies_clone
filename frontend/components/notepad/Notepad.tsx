"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailHeader } from "./DetailHeader";
import { InsightsPanel } from "./InsightsPanel";
import { MediaPlayer } from "./MediaPlayer";
import { PlayerProvider } from "./PlayerContext";
import { TranscriptPanel } from "./TranscriptPanel";

type Tab = "summary" | "transcript";

export function Notepad({ id }: { id: string }) {
  const {
    data: meeting,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({ queryKey: ["meeting", id], queryFn: () => api.getMeeting(id) });

  const [tab, setTab] = useState<Tab>("summary");

  if (isPending) return <NotepadSkeleton />;

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <AlertCircle className="size-7 text-destructive" />
        <div>
          <p className="font-medium">Couldn&apos;t load this meeting</p>
          <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <PlayerProvider>
    <div className="flex h-full flex-col">
      <DetailHeader meeting={meeting} />

      <div className="border-b bg-card px-4 py-3 sm:px-6">
        <MediaPlayer src={meeting.audio_url ?? "/sample-audio.mp3"} />
      </div>

      {/* Tab switcher (under lg only) */}
      <div className="flex border-b bg-card lg:hidden">
        {(["summary", "transcript"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 border-b-2 py-2.5 text-sm font-medium capitalize transition-colors",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[1fr_minmax(360px,440px)] xl:grid-cols-[240px_1fr_minmax(380px,460px)]">
        {/* Left insights rail (xl+) */}
        <aside className="hidden overflow-y-auto border-r xl:block">
          <InsightsPanel meeting={meeting} />
        </aside>

        {/* Center: summary + action items */}
        <section
          className={cn(
            "min-h-0 overflow-y-auto",
            tab === "summary" ? "block" : "hidden",
            "lg:block",
          )}
        >
          <div className="space-y-6 p-4 sm:p-6">
            <div id="overview" className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              Summary (overview, keywords, chapters) — step 15
            </div>
            <div id="action-items" className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              Action items — step 15
            </div>
          </div>
        </section>

        {/* Right: transcript */}
        <section
          className={cn(
            "flex min-h-0 flex-col lg:border-l",
            tab === "transcript" ? "flex" : "hidden",
            "lg:flex",
          )}
        >
          <TranscriptPanel segments={meeting.segments} />
        </section>
      </div>
    </div>
    </PlayerProvider>
  );
}

function NotepadSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-card px-6 py-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-7 w-80" />
        <Skeleton className="mt-3 h-4 w-64" />
      </div>
      <div className="border-b bg-card px-6 py-4">
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
      <div className="grid flex-1 grid-cols-[1fr_400px]">
        <div className="space-y-4 p-6">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
        <div className="space-y-3 border-l p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
