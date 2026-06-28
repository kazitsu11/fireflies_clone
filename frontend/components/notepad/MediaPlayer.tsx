"use client";

import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";

import { msToClock } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePlayer } from "./PlayerContext";

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

export function MediaPlayer({ src }: { src: string }) {
  const { currentMs, durationMs, isPlaying, rate, bindAudio, toggle, skip, seekTo, setRate } =
    usePlayer();
  const ready = durationMs > 0;

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <audio ref={bindAudio} src={src} preload="metadata" />

      <Button
        onClick={toggle}
        size="icon"
        aria-label={isPlaying ? "Pause" : "Play"}
        className="size-11 shrink-0 rounded-full"
      >
        {isPlaying ? (
          <Pause className="size-5 fill-current" />
        ) : (
          <Play className="size-5 translate-x-px fill-current" />
        )}
      </Button>

      <div className="flex shrink-0 items-center">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Back 10 seconds"
          onClick={() => skip(-10_000)}
          className="text-muted-foreground"
        >
          <RotateCcw className="size-[18px]" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Forward 10 seconds"
          onClick={() => skip(10_000)}
          className="text-muted-foreground"
        >
          <RotateCw className="size-[18px]" />
        </Button>
      </div>

      <span
        data-player-ms={Math.round(currentMs)}
        className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground"
      >
        {msToClock(currentMs)}
      </span>

      <SeekBar
        currentMs={currentMs}
        durationMs={durationMs}
        disabled={!ready}
        onSeek={seekTo}
      />

      <span className="w-12 shrink-0 text-xs tabular-nums text-muted-foreground">
        {msToClock(durationMs)}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="shrink-0 tabular-nums" />
          }
        >
          {rate}×
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-24">
          {RATES.map((r) => (
            <DropdownMenuItem
              key={r}
              onClick={() => setRate(r)}
              className={cn("justify-between", r === rate && "font-semibold text-primary")}
            >
              {r}×{r === rate && " ✓"}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Visual progress bar with an invisible range input on top for click/drag/keyboard. */
function SeekBar({
  currentMs,
  durationMs,
  disabled,
  onSeek,
}: {
  currentMs: number;
  durationMs: number;
  disabled: boolean;
  onSeek: (ms: number) => void;
}) {
  const pct = durationMs > 0 ? Math.min(100, (currentMs / durationMs) * 100) : 0;

  return (
    <div className="group relative flex h-5 flex-1 items-center">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div
        className="pointer-events-none absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-primary shadow ring-2 ring-card opacity-0 transition-opacity group-hover:opacity-100"
        style={{ left: `calc(${pct}% - 6px)` }}
      />
      <input
        type="range"
        min={0}
        max={durationMs || 1}
        step={250}
        value={Math.min(currentMs, durationMs || 1)}
        disabled={disabled}
        onChange={(e) => onSeek(Number(e.target.value))}
        aria-label="Seek"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
    </div>
  );
}
