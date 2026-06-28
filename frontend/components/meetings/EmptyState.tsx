import Link from "next/link";
import { CalendarSearch, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Shown when there are no meetings, or no matches for the active filters. */
export function EmptyState({
  filtered,
  onClear,
}: {
  filtered: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
      <div className="grid size-12 place-items-center rounded-xl bg-accent text-accent-foreground">
        <CalendarSearch className="size-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold">
        {filtered ? "No meetings match your filters" : "No meetings yet"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {filtered
          ? "Try a different search term, participant, or date range."
          : "Upload or paste a transcript and we'll generate notes, a summary, and action items."}
      </p>
      <div className="mt-5">
        {filtered ? (
          <Button variant="outline" onClick={onClear}>
            Clear filters
          </Button>
        ) : (
          <Button
            nativeButton={false}
            render={<Link href="/meetings/new" />}
            className="gap-1.5"
          >
            <Plus className="size-4" /> New meeting
          </Button>
        )}
      </div>
    </div>
  );
}
