"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Bell, Blocks, User } from "lucide-react";

import { api } from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function initials(name?: string) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function SettingsPage() {
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: api.getMe });

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile and preferences.
        </p>
      </header>

      <Section icon={User} title="Profile">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="bg-violet-600 text-base font-semibold text-white">
              {initials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={user?.name ?? ""} readOnly disabled />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email ?? ""} readOnly disabled />
            </div>
          </div>
        </div>
      </Section>

      <Section icon={Bell} title="Notifications" badge="Coming soon">
        <ToggleRow label="Email me a summary after each meeting" />
        <ToggleRow label="Notify me when I'm assigned an action item" />
        <ToggleRow label="Weekly digest of meeting activity" />
      </Section>

      <Section icon={Blocks} title="Workspace" badge="Coming soon">
        <p className="text-sm text-muted-foreground">
          Integrations, team members, and sharing will live here.
        </p>
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  badge,
  children,
}: {
  icon: typeof User;
  title: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="size-[18px] text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/80">
          {title}
        </h2>
        {badge && (
          <Badge variant="secondary" className="ml-auto bg-muted font-normal text-muted-foreground">
            {badge}
          </Badge>
        )}
      </div>
      {children}
    </section>
  );
}

/** Static (disabled) preference toggle — a clean placeholder, not a live control. */
function ToggleRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between py-2 opacity-70">
      <span className="text-sm">{label}</span>
      <span
        aria-hidden
        className="relative inline-flex h-5 w-9 cursor-not-allowed items-center rounded-full bg-muted"
      >
        <span className="ml-0.5 size-4 rounded-full bg-background shadow" />
      </span>
    </div>
  );
}
