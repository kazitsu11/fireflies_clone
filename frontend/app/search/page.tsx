import { Suspense } from "react";

import { SearchResults } from "@/components/search/SearchResults";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl p-6" />}>
      <SearchResults />
    </Suspense>
  );
}
