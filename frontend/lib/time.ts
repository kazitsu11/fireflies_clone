/** Time + date formatting helpers (ms ↔ clock strings, relative dates). */

/** Milliseconds → "M:SS" (or "H:MM:SS" past an hour). For the player/transcript. */
export function msToClock(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

/** "M:SS" / "H:MM:SS" → milliseconds. Inverse of msToClock. */
export function clockToMs(clock: string): number {
  const parts = clock.split(":").map((p) => parseInt(p, 10));
  if (parts.some(Number.isNaN)) return 0;
  let seconds = 0;
  for (const part of parts) seconds = seconds * 60 + part;
  return seconds * 1000;
}

/** Seconds → human duration like "8 min" or "1h 5m" (for cards/tables). */
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "0 min";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours > 0) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${Math.max(1, minutes)} min`;
}

const RELATIVE: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** ISO date string → relative label like "2 days ago" / "just now". */
export function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSeconds = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);
  if (abs < 45) return "just now";
  for (const [unit, secs] of RELATIVE) {
    if (abs >= secs) return rtf.format(Math.round(diffSeconds / secs), unit);
  }
  return rtf.format(Math.round(diffSeconds / 60), "minute");
}

/** ISO date string → "Jun 26, 2026, 2:30 PM" (absolute, for tooltips/detail). */
export function absoluteDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
