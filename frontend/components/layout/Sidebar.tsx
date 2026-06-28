"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Blocks,
  Bot,
  ChevronsUpDown,
  House,
  LogOut,
  NotebookText,
  Settings,
  Upload,
  Users,
  type LucideIcon,
} from "lucide-react";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { label: string; href: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { label: "Home", href: "/", icon: House },
  { label: "Meetings", href: "/meetings", icon: NotebookText },
  { label: "Upload", href: "/meetings/new", icon: Upload },
];

const COMING_SOON: { label: string; icon: LucideIcon }[] = [
  { label: "Integrations", icon: Blocks },
  { label: "Team", icon: Users },
  { label: "AI Apps", icon: Bot },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/meetings")
    return pathname === "/meetings" || pathname.startsWith("/meetings/");
  return pathname === href;
}

function initials(name?: string): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: api.getMe });

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-[68px]" : "w-60",
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center px-4">
        <Link href="/meetings" aria-label="Fireflies home">
          <Logo collapsed={collapsed} />
        </Link>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {!collapsed && (
          <p className="px-3 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
            Workspace
          </p>
        )}
        {NAV.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href, pathname)}
            collapsed={collapsed}
          />
        ))}

        {!collapsed && (
          <p className="px-3 pb-1.5 pt-5 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
            Coming soon
          </p>
        )}
        <div className={cn(collapsed && "mt-4 border-t border-sidebar-border pt-4")}>
          {COMING_SOON.map((item) => (
            <ComingSoonLink key={item.label} item={item} collapsed={collapsed} />
          ))}
        </div>
      </nav>

      {/* Account block */}
      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              collapsed && "justify-center",
            )}
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-violet-600 text-xs font-semibold text-white">
                {initials(user?.name)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-sidebar-foreground">
                    {user?.name ?? "Demo User"}
                  </p>
                  <p className="truncate text-xs text-sidebar-foreground/50">
                    {user?.email ?? "demo@fireflies.local"}
                  </p>
                </div>
                <ChevronsUpDown className="size-4 text-sidebar-foreground/50" />
              </>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{user?.name ?? "Demo User"}</p>
              <p className="text-xs text-muted-foreground">
                {user?.email ?? "demo@fireflies.local"}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/settings" />}>
              <Settings className="size-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        collapsed && "justify-center px-0",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function ComingSoonLink({
  item,
  collapsed,
}: {
  item: { label: string; icon: LucideIcon };
  collapsed: boolean;
}) {
  const Icon = item.icon;
  const content = (
    <div
      aria-disabled
      className={cn(
        "flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/40",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      {!collapsed && (
        <>
          <span>{item.label}</span>
          <Badge
            variant="secondary"
            className="ml-auto bg-sidebar-accent text-[10px] text-sidebar-foreground/60"
          >
            Soon
          </Badge>
        </>
      )}
    </div>
  );
  return (
    <Tooltip>
      <TooltipTrigger render={content} />
      <TooltipContent side="right">Coming soon</TooltipContent>
    </Tooltip>
  );
}
