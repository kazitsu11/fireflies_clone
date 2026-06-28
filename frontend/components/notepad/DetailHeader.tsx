"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Download,
  MoreHorizontal,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";

import { api } from "@/lib/api";
import type { MeetingDetail } from "@/lib/types";
import { absoluteDate, formatDuration } from "@/lib/time";
import { ParticipantStack } from "@/components/meetings/ParticipantStack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function DetailHeader({ meeting }: { meeting: MeetingDetail }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const regenerate = useMutation({
    mutationFn: () => api.regenerateSummary(meeting.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meeting", meeting.id] });
      toast.success("Notes regenerated");
    },
    onError: (e) =>
      toast.error("Couldn't regenerate notes", { description: (e as Error).message }),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteMeeting(meeting.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting deleted");
      router.push("/meetings");
    },
    onError: (e) =>
      toast.error("Couldn't delete meeting", { description: (e as Error).message }),
  });

  return (
    <header className="border-b bg-card px-4 py-3 sm:px-6">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link href="/meetings" />}
        className="-ml-2 mb-1.5 gap-1.5 text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Meetings
      </Button>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
            {meeting.title}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              {absoluteDate(meeting.date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" />
              {formatDuration(meeting.duration_seconds)}
            </span>
            {meeting.participants.length > 0 && (
              <ParticipantStack participants={meeting.participants} max={5} />
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="hidden gap-1.5 sm:inline-flex"
            disabled={regenerate.isPending}
            onClick={() => regenerate.mutate()}
          >
            <Sparkles className="size-4" />
            {regenerate.isPending ? "Regenerating…" : "Regenerate notes"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Meeting actions" />
              }
            >
              <MoreHorizontal className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                <Pencil className="size-4" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={regenerate.isPending}
                onClick={() => regenerate.mutate()}
              >
                <Sparkles className="size-4" /> Regenerate notes
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toast.info("Download will be available soon.")}
              >
                <Download className="size-4" /> Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <RenameDialog meeting={meeting} open={renameOpen} onOpenChange={setRenameOpen} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{meeting.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the meeting, its transcript, summary, and
              action items. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                remove.mutate();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {remove.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}

function RenameDialog({
  meeting,
  open,
  onOpenChange,
}: {
  meeting: MeetingDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(meeting.title);

  const rename = useMutation({
    mutationFn: (newTitle: string) => api.updateMeeting(meeting.id, { title: newTitle }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meeting", meeting.id] });
      qc.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting renamed");
      onOpenChange(false);
    },
    onError: (e) =>
      toast.error("Couldn't rename meeting", { description: (e as Error).message }),
  });

  const trimmed = title.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) setTitle(meeting.title); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (trimmed) rename.mutate(trimmed);
          }}
        >
          <DialogHeader>
            <DialogTitle>Rename meeting</DialogTitle>
            <DialogDescription>
              Give this meeting a clear, recognizable title.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor="detail-title">Title</Label>
            <Input
              id="detail-title"
              value={title}
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!trimmed || rename.isPending}>
              {rename.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
