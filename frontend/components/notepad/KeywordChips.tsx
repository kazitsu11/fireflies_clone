import type { Keyword } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export function KeywordChips({ keywords }: { keywords: Keyword[] }) {
  if (keywords.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {keywords.map((k) => (
        <Badge
          key={k.id}
          variant="secondary"
          className="bg-violet-50 font-normal text-violet-700"
        >
          {k.term}
        </Badge>
      ))}
    </div>
  );
}
