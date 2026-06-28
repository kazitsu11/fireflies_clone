"use client";

import { useEffect, useState } from "react";
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
  Plus,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { api } from "@/lib/api";
import type { MeetingDetail, ParticipantInput } from "@/lib/types";
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
  const [participantsOpen, setParticipantsOpen] = useState(false);

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
          <EditableTitle meeting={meeting} />
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" />
              {absoluteDate(meeting.date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" />
              {formatDuration(meeting.duration_seconds)}
            </span>
            <button
              onClick={() => setParticipantsOpen(true)}
              title="Edit participants"
              aria-label="Edit participants"
              className="rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {meeting.participants.length > 0 ? (
                <ParticipantStack participants={meeting.participants} max={5} />
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <Users className="size-4" /> Add participants
                </span>
              )}
            </button>
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
              <DropdownMenuItem onClick={() => setParticipantsOpen(true)}>
                <Users className="size-4" /> Edit participants
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
      <ParticipantsDialog
        meeting={meeting}
        open={participantsOpen}
        onOpenChange={setParticipantsOpen}
      />

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

function EditableTitle({ meeting }: { meeting: MeetingDetail }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(meeting.title);

  const save = useMutation({
    mutationFn: (title: string) => api.updateMeeting(meeting.id, { title }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meeting", meeting.id] });
      qc.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting renamed");
    },
    onError: (e) =>
      toast.error("Couldn't rename meeting", { description: (e as Error).message }),
  });

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            setDraft(meeting.title);
            setEditing(false);
          }
        }}
        onBlur={() => {
          const t = draft.trim();
          setEditing(false);
          if (t && t !== meeting.title) save.mutate(t);
        }}
        aria-label="Meeting title"
        className="w-full max-w-2xl rounded-md border border-input bg-background px-2 py-0.5 text-xl font-semibold tracking-tight outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-2xl"
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(meeting.title);
        setEditing(true);
      }}
      title="Click to rename"
      className="group flex max-w-full items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
        {meeting.title}
      </h1>
      <Pencil className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function ParticipantsDialog({
  meeting,
  open,
  onOpenChange,
}: {
  meeting: MeetingDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<ParticipantInput[]>([]);

  useEffect(() => {
    if (open) {
      setRows(
        meeting.participants.map((p) => ({
          name: p.name,
          email: p.email,
          speaker_label: p.speaker_label,
        })),
      );
    }
  }, [open, meeting.participants]);

  const save = useMutation({
    mutationFn: (participants: ParticipantInput[]) =>
      api.updateMeeting(meeting.id, { participants }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meeting", meeting.id] });
      qc.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Participants updated");
      onOpenChange(false);
    },
    onError: (e) =>
      toast.error("Couldn't update participants", { description: (e as Error).message }),
  });

  const valid = rows.length > 0 && rows.every((r) => r.name.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit participants</DialogTitle>
          <DialogDescription>
            Add, rename, or remove people in this meeting.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto py-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={row.name}
                placeholder="Name"
                aria-label={`Participant ${i + 1} name`}
                onChange={(e) =>
                  setRows((rs) =>
                    rs.map((r, idx) => (idx === i ? { ...r, name: e.target.value } : r)),
                  )
                }
                className="flex-1"
              />
              <Input
                value={row.speaker_label ?? ""}
                placeholder="Speaker label"
                aria-label={`Participant ${i + 1} speaker label`}
                onChange={(e) =>
                  setRows((rs) =>
                    rs.map((r, idx) =>
                      idx === i ? { ...r, speaker_label: e.target.value } : r,
                    ),
                  )
                }
                className="w-40"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove participant"
                onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() =>
              setRows((rs) => [...rs, { name: "", speaker_label: `Speaker ${rs.length + 1}` }])
            }
          >
            <Plus className="size-4" /> Add participant
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!valid || save.isPending}
            onClick={() => save.mutate(rows.map((r) => ({ ...r, name: r.name.trim() })))}
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
