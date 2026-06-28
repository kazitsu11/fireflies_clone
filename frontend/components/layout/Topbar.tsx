"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Bell, PanelLeft, Plus, Search, Settings } from "lucide-react";

import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function titleFor(pathname: string): string {
  if (pathname === "/" || pathname === "/meetings") return "Meetings";
  if (pathname === "/meetings/new") return "New meeting";
  if (pathname.startsWith("/meetings/")) return "Meeting";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/search")) return "Search";
  return "Fireflies";
}

export function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: api.getMe });

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur-sm md:px-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        className="hidden text-muted-foreground md:inline-flex"
      >
        <PanelLeft className="size-5" />
      </Button>

      <h1 className="text-lg font-semibold tracking-tight">{titleFor(pathname)}</h1>

      {/* Global search */}
      <form onSubmit={onSearch} className="ml-auto hidden w-full max-w-sm sm:block">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search meetings…"
            aria-label="Search meetings"
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
        <Button
          size="sm"
          nativeButton={false}
          className="gap-1.5 font-medium shadow-sm"
          render={<Link href="/meetings/new" />}
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">New meeting</span>
        </Button>

        <ThemeToggle />

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notifications"
                className="relative text-muted-foreground"
              />
            }
          >
            <Bell className="size-5" />
            <span className="absolute right-2 top-2 size-1.5 rounded-full bg-violet-500" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Account */}
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="size-8">
              <AvatarFallback className="bg-violet-600 text-xs font-semibold text-white">
                {(user?.name ?? "Demo User")
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
