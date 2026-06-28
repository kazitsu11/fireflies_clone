import { Suspense } from "react";

import { MeetingListSkeleton } from "@/components/meetings/MeetingListSkeleton";
import { MeetingsDashboard } from "@/components/meetings/MeetingsDashboard";

export default function MeetingsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
          <MeetingListSkeleton />
        </div>
      }
    >
      <MeetingsDashboard />
    </Suspense>
  );
}
