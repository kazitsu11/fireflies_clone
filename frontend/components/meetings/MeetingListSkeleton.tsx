import { Skeleton } from "@/components/ui/skeleton";

/** Loading placeholder that mirrors the meeting row layout. */
export function MeetingListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y rounded-xl border bg-card" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5">
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex -space-x-2">
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="size-7 rounded-full" />
          </div>
          <Skeleton className="size-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}
