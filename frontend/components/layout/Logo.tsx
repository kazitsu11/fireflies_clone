import { Sparkles } from "lucide-react";

/** Brand mark: a violet gradient tile + wordmark (mark only when collapsed). */
export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm ring-1 ring-white/10">
        <Sparkles className="size-5 text-white" strokeWidth={2.25} />
      </div>
      {!collapsed && (
        <span className="text-[17px] font-semibold tracking-tight text-white">
          fireflies
        </span>
      )}
    </div>
  );
}
