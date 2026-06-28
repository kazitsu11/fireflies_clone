/** Build downloadable Markdown / plain-text exports from a meeting's detail. */

import type { MeetingDetail } from "./types";
import { absoluteDate, formatDuration, msToClock } from "./time";

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "meeting"
  );
}

export function buildMarkdown(m: MeetingDetail): string {
  const out: string[] = [`# ${m.title}`, ""];
  const meta = [absoluteDate(m.date), formatDuration(m.duration_seconds)]
    .filter(Boolean)
    .join(" · ");
  if (meta) out.push(`_${meta}_`, "");
  if (m.participants.length)
    out.push(`**Participants:** ${m.participants.map((p) => p.name).join(", ")}`, "");

  if (m.summary?.overview) out.push("## Overview", "", m.summary.overview, "");
  if (m.keywords.length)
    out.push(`**Keywords:** ${m.keywords.map((k) => k.term).join(", ")}`, "");

  if (m.summary && m.summary.chapters.length) {
    out.push("## Notes", "");
    for (const ch of m.summary.chapters) {
      out.push(`### [${msToClock(ch.start_ms)}] ${ch.title}`);
      for (const b of ch.bullets) out.push(`- ${b}`);
      out.push("");
    }
  }

  if (m.action_items.length) {
    out.push("## Action items", "");
    for (const a of m.action_items) {
      const note = [a.assignee, a.start_ms != null ? msToClock(a.start_ms) : null]
        .filter(Boolean)
        .join(", ");
      out.push(`- [${a.completed ? "x" : " "}] ${a.text}${note ? ` _(${note})_` : ""}`);
    }
    out.push("");
  }

  out.push("## Transcript", "");
  for (const s of m.segments)
    out.push(`**[${msToClock(s.start_ms)}] ${s.speaker}:** ${s.text}`, "");

  return out.join("\n");
}

export function buildText(m: MeetingDetail): string {
  const out: string[] = [m.title.toUpperCase()];
  const meta = [absoluteDate(m.date), formatDuration(m.duration_seconds)]
    .filter(Boolean)
    .join(" · ");
  if (meta) out.push(meta);
  if (m.participants.length)
    out.push(`Participants: ${m.participants.map((p) => p.name).join(", ")}`);
  out.push("");

  if (m.summary?.overview) out.push("OVERVIEW", m.summary.overview, "");
  if (m.keywords.length)
    out.push(`Keywords: ${m.keywords.map((k) => k.term).join(", ")}`, "");

  if (m.summary && m.summary.chapters.length) {
    out.push("NOTES");
    for (const ch of m.summary.chapters) {
      out.push(`[${msToClock(ch.start_ms)}] ${ch.title}`);
      for (const b of ch.bullets) out.push(`  - ${b}`);
    }
    out.push("");
  }

  if (m.action_items.length) {
    out.push("ACTION ITEMS");
    for (const a of m.action_items) {
      const note = [a.assignee, a.start_ms != null ? msToClock(a.start_ms) : null]
        .filter(Boolean)
        .join(", ");
      out.push(`[${a.completed ? "x" : " "}] ${a.text}${note ? ` (${note})` : ""}`);
    }
    out.push("");
  }

  out.push("TRANSCRIPT");
  for (const s of m.segments) out.push(`[${msToClock(s.start_ms)}] ${s.speaker}: ${s.text}`);

  return out.join("\n");
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportMeeting(m: MeetingDetail, format: "md" | "txt") {
  const slug = slugify(m.title);
  if (format === "md") download(`${slug}.md`, buildMarkdown(m), "text/markdown");
  else download(`${slug}.txt`, buildText(m), "text/plain");
}
