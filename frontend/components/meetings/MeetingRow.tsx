"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Clock,
  Download,
  ListChecks,
  MoreVertical,
  NotebookText,
  Pencil,
  Trash2,
} from "lucide-react";

import { api } from "@/lib/api";
import type { MeetingListItem } from "@/lib/types";
import { formatDuration, relativeDate } from "@/lib/time";
import { ParticipantStack } from "./ParticipantStack";
import { Badge } from "@/components/ui/badge";
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

export function MeetingRow({ meeting }: { meeting: MeetingListItem }) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const goToDetail = () => router.push(`/meetings/${meeting.id}`);

  return (
    <>
      <div
        data-meeting-row
        role="button"
        tabIndex={0}
        onClick={goToDetail}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            goToDetail();
          }
        }}
        className="group flex cursor-pointer items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 sm:gap-4 sm:px-5"
      >
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
          <NotebookText className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{meeting.title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {formatDuration(meeting.duration_seconds)}
            </span>
            <span>{relativeDate(meeting.date)}</span>
            {meeting.action_item_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <ListChecks className="size-3.5" />
                {meeting.action_item_count} action{" "}
                {meeting.action_item_count === 1 ? "item" : "items"}
              </span>
            )}
          </div>
        </div>

        {/* Keyword chips */}
        <div className="hidden items-center gap-1.5 xl:flex">
          {meeting.keywords.slice(0, 3).map((k) => (
            <Badge
              key={k.id}
              variant="secondary"
              className="bg-violet-50 font-normal text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
            >
              {k.term}
            </Badge>
          ))}
        </div>

        <div className="hidden sm:block">
          <ParticipantStack participants={meeting.participants} />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Meeting actions"
                className="shrink-0 text-muted-foreground"
                onClick={(e) => e.stopPropagation()}
              />
            }
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem onClick={() => setRenameOpen(true)}>
              <Pencil className="size-4" /> Rename
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

      <RenameDialog meeting={meeting} open={renameOpen} onOpenChange={setRenameOpen} />
      <DeleteDialog meeting={meeting} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}

function RenameDialog({
  meeting,
  open,
  onOpenChange,
}: {
  meeting: MeetingListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(meeting.title);

  useEffect(() => {
    if (open) setTitle(meeting.title);
  }, [open, meeting.title]);

  const rename = useMutation({
    mutationFn: (newTitle: string) =>
      api.updateMeeting(meeting.id, { title: newTitle }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting renamed");
      onOpenChange(false);
    },
    onError: (e) =>
      toast.error("Couldn't rename meeting", { description: (e as Error).message }),
  });

  const trimmed = title.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <Label htmlFor="meeting-title">Title</Label>
            <Input
              id="meeting-title"
              value={title}
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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

function DeleteDialog({
  meeting,
  open,
  onOpenChange,
}: {
  meeting: MeetingListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: () => api.deleteMeeting(meeting.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting deleted");
      onOpenChange(false);
    },
    onError: (e) =>
      toast.error("Couldn't delete meeting", { description: (e as Error).message }),
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
  );
}
