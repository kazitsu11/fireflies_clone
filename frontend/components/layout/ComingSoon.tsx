import { Construction } from "lucide-react";

/** Friendly placeholder for routes whose feature ships in a later phase. */
export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Construction className="size-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold tracking-tight">{title}</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
