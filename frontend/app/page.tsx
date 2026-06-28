/**
 * TEMPORARY Step-8 connectivity landing (server component).
 * Proves the app boots and a real call to the FastAPI backend succeeds.
 * Step 10 replaces this with a redirect to /meetings.
 */
import { API_BASE_URL } from "@/lib/api";
import type { MeetingListItem, User } from "@/lib/types";

async function probe() {
  const [meRes, listRes] = await Promise.all([
    fetch(`${API_BASE_URL}/api/me`, { cache: "no-store" }),
    fetch(`${API_BASE_URL}/api/meetings`, { cache: "no-store" }),
  ]);
  const me: User = await meRes.json();
  const meetings: MeetingListItem[] = await listRes.json();
  return { me, meetings, ok: meRes.ok && listRes.ok };
}

export default async function Home() {
  let result: Awaited<ReturnType<typeof probe>> | null = null;
  let error: string | null = null;
  try {
    result = await probe();
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-8">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Fireflies Clone</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Step 8 — frontend ↔ backend connectivity check
        </p>
        <div className="mt-6 rounded-lg border bg-background p-4 text-sm">
          {error ? (
            <p className="text-destructive">
              Could not reach the backend at <code>{API_BASE_URL}</code>: {error}
            </p>
          ) : (
            <ul className="space-y-1">
              <li>
                API base: <code>{API_BASE_URL}</code>
              </li>
              <li>
                <span className="text-primary font-medium">✓ /api/me</span> →{" "}
                {result?.me.name} ({result?.me.email})
              </li>
              <li>
                <span className="text-primary font-medium">✓ /api/meetings</span>{" "}
                → {result?.meetings.length} meetings seeded
              </li>
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
