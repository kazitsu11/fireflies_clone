import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function SectionHeading({
  icon: Icon,
  title,
  trailing,
}: {
  icon: LucideIcon;
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-[18px] text-primary" />
      <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/80">
        {title}
      </h3>
      {trailing != null && (
        <span className="ml-auto text-xs font-medium tabular-nums text-muted-foreground">
          {trailing}
        </span>
      )}
    </div>
  );
}
