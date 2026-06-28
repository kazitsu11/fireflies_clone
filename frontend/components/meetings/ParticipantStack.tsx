import type { Participant } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Deterministic avatar tint per participant so colors are stable across renders.
const TINTS = [
  "bg-violet-100 text-violet-700",
  "bg-indigo-100 text-indigo-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];

function tintFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return TINTS[Math.abs(hash) % TINTS.length];
}

export function ParticipantStack({
  participants,
  max = 4,
}: {
  participants: Participant[];
  max?: number;
}) {
  const shown = participants.slice(0, max);
  const overflow = participants.length - shown.length;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {shown.map((p) => (
          <Avatar
            key={p.id}
            className="size-7 ring-2 ring-card"
            title={p.name}
          >
            <AvatarFallback className={cn("text-[11px] font-semibold", tintFor(p.name))}>
              {initials(p.name)}
            </AvatarFallback>
          </Avatar>
        ))}
        {overflow > 0 && (
          <div className="grid size-7 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground ring-2 ring-card">
            +{overflow}
          </div>
        )}
      </div>
      <span className="text-sm text-muted-foreground tabular-nums">
        {participants.length}
      </span>
    </div>
  );
}
