"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Clock3, ListChecks, Pencil, Plus, Trash2, User } from "lucide-react";

import { api } from "@/lib/api";
import type { ActionItem, MeetingDetail } from "@/lib/types";
import { msToClock } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlayer } from "./PlayerContext";
import { SectionHeading } from "./SectionHeading";

export function ActionItems({ meeting }: { meeting: MeetingDetail }) {
  const { seekTo } = usePlayer();
  const qc = useQueryClient();
  const meetingId = meeting.id;
  const items = meeting.action_items;
  const invalidate = () => qc.invalidateQueries({ queryKey: ["meeting", meetingId] });

  const toggle = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      api.updateActionItem(id, { completed }),
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey: ["meeting", meetingId] });
      const prev = qc.getQueryData<MeetingDetail>(["meeting", meetingId]);
      qc.setQueryData<MeetingDetail>(["meeting", meetingId], (old) =>
        old
          ? {
              ...old,
              action_items: old.action_items.map((a) =>
                a.id === id ? { ...a, completed } : a,
              ),
            }
          : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["meeting", meetingId], ctx.prev);
      toast.error("Couldn't update action item");
    },
    onSettled: invalidate,
  });

  const add = useMutation({
    mutationFn: (text: string) => api.createActionItem(meetingId, { text }),
    onSuccess: () => {
      invalidate();
      toast.success("Action item added");
    },
    onError: () => toast.error("Couldn't add action item"),
  });

  const edit = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      api.updateActionItem(id, { text }),
    onSuccess: () => {
      invalidate();
      toast.success("Action item updated");
    },
    onError: () => toast.error("Couldn't update action item"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteActionItem(id),
    onSuccess: () => {
      invalidate();
      toast.success("Action item deleted");
    },
    onError: () => toast.error("Couldn't delete action item"),
  });

  const [newText, setNewText] = useState("");
  const done = items.filter((i) => i.completed).length;

  return (
    <section id="action-items" className="scroll-mt-4 space-y-3">
      <SectionHeading icon={ListChecks} title="Action items" trailing={`${done}/${items.length}`} />

      <ul className="space-y-1">
        {items.map((item) => (
          <ActionItemRow
            key={item.id}
            item={item}
            onToggle={(completed) => toggle.mutate({ id: item.id, completed })}
            onEdit={(text) => edit.mutate({ id: item.id, text })}
            onDelete={() => remove.mutate(item.id)}
            onJump={seekTo}
          />
        ))}
        {items.length === 0 && (
          <li className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
            No action items yet. Add one below.
          </li>
        )}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = newText.trim();
          if (t) {
            add.mutate(t);
            setNewText("");
          }
        }}
        className="flex items-center gap-2"
      >
        <Input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Add an action item…"
          className="h-9"
        />
        <Button type="submit" size="sm" className="gap-1.5" disabled={!newText.trim() || add.isPending}>
          <Plus className="size-4" /> Add
        </Button>
      </form>
    </section>
  );
}

function ActionItemRow({
  item,
  onToggle,
  onEdit,
  onDelete,
  onJump,
}: {
  item: ActionItem;
  onToggle: (completed: boolean) => void;
  onEdit: (text: string) => void;
  onDelete: () => void;
  onJump: (ms: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);

  return (
    <li className="group flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50">
      <button
        role="checkbox"
        aria-checked={item.completed}
        aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
        onClick={() => onToggle(!item.completed)}
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
          item.completed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input hover:border-primary",
        )}
      >
        {item.completed && <Check className="size-3.5" />}
      </button>

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              } else if (e.key === "Escape") {
                setText(item.text);
                setEditing(false);
              }
            }}
            onBlur={() => {
              const t = text.trim();
              if (t && t !== item.text) onEdit(t);
              setEditing(false);
            }}
            className="h-7 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        ) : (
          <p
            onDoubleClick={() => setEditing(true)}
            className={cn(
              "text-sm leading-snug",
              item.completed && "text-muted-foreground line-through",
            )}
          >
            {item.text}
          </p>
        )}

        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          {item.assignee && (
            <span className="inline-flex items-center gap-1">
              <User className="size-3" />
              {item.assignee}
            </span>
          )}
          {item.start_ms != null && (
            <button
              onClick={() => onJump(item.start_ms!)}
              className="inline-flex items-center gap-1 tabular-nums outline-none transition-colors hover:text-primary focus-visible:text-primary"
              aria-label={`Jump to ${msToClock(item.start_ms)}`}
            >
              <Clock3 className="size-3" />
              {msToClock(item.start_ms)}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground"
          aria-label="Edit action item"
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          aria-label="Delete action item"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </li>
  );
}
