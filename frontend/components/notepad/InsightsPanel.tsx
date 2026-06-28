"use client";

import {
  BookOpen,
  Clock,
  FileText,
  ListChecks,
  ListTodo,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { MeetingDetail } from "@/lib/types";
import { formatDuration } from "@/lib/time";

function jumpTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function InsightsPanel({ meeting }: { meeting: MeetingDetail }) {
  const done = meeting.action_items.filter((a) => a.completed).length;

  const stats: { icon: LucideIcon; label: string; value: string | number }[] = [
    { icon: Clock, label: "Duration", value: formatDuration(meeting.duration_seconds) },
    { icon: Users, label: "Participants", value: meeting.participants.length },
    {
      icon: ListChecks,
      label: "Action items",
      value: `${done}/${meeting.action_items.length}`,
    },
    { icon: Tag, label: "Keywords", value: meeting.keywords.length },
  ];

  const links: { icon: LucideIcon; label: string; id: string }[] = [
    { icon: FileText, label: "Overview", id: "overview" },
    {
      icon: BookOpen,
      label: `Chapters (${meeting.summary?.chapters.length ?? 0})`,
      id: "chapters",
    },
    {
      icon: ListTodo,
      label: `Action items (${meeting.action_items.length})`,
      id: "action-items",
    },
  ];

  return (
    <div className="space-y-6 p-4">
      <section>
        <p className="px-1 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Insights
        </p>
        <dl className="space-y-1.5">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center justify-between px-1 text-sm">
              <dt className="inline-flex items-center gap-2 text-muted-foreground">
                <Icon className="size-4" />
                {label}
              </dt>
              <dd className="font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <p className="px-1 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Jump to
        </p>
        <nav className="space-y-0.5">
          {links.map(({ icon: Icon, label, id }) => (
            <button
              key={id}
              onClick={() => jumpTo(id)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground/80 outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="size-4 text-muted-foreground" />
              {label}
            </button>
          ))}
        </nav>
      </section>
    </div>
  );
}
