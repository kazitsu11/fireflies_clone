import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Stub for the meeting detail / Notepad page. Phase 4 builds the full
 * three-pane notepad (player + summary + transcript with two-way sync).
 * Next 16: route params are async (a Promise).
 */
export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link href="/meetings" />}
        className="gap-1.5"
      >
        <ArrowLeft className="size-4" /> Back to meetings
      </Button>
      <div className="mt-6 rounded-xl border border-dashed bg-card p-10 text-center">
        <h1 className="text-lg font-semibold tracking-tight">Meeting Notepad</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The media player, AI summary, and interactive transcript (with two-way
          sync) are built in Phase 4.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Meeting ID: <code className="rounded bg-muted px-1.5 py-0.5">{id}</code>
        </p>
      </div>
    </div>
  );
}
