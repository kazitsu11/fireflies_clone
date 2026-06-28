"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileUp, Plus, Type, Upload, X } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import type { MeetingCreateInput, MeetingDetail, ParticipantInput } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "upload" | "manual";

const ACCEPT = ".txt,.vtt,.json";
const textareaClass =
  "min-h-32 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";
const selectClass =
  "h-9 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export function CreateMeeting() {
  const router = useRouter();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("upload");
  const [submitting, setSubmitting] = useState(false);

  // Shared
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);

  // Upload / paste
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteFormat, setPasteFormat] = useState("txt");
  const [sourceError, setSourceError] = useState<string | null>(null);

  // Manual
  const [participants, setParticipants] = useState<ParticipantInput[]>([
    { name: "", speaker_label: "Speaker 1" },
  ]);
  const [date, setDate] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [manualText, setManualText] = useState("");
  const [manualFormat, setManualFormat] = useState("txt");

  async function onCreated(meeting: MeetingDetail) {
    qc.invalidateQueries({ queryKey: ["meetings"] });
    toast.success("Meeting created");
    router.push(`/meetings/${meeting.id}`);
  }

  function onError(e: unknown) {
    const msg = e instanceof ApiError ? e.message : (e as Error).message;
    setSourceError(msg);
    toast.error("Couldn't create meeting", { description: msg });
  }

  async function submitUpload(e: React.FormEvent) {
    e.preventDefault();
    setSourceError(null);
    setTitleError(null);
    if (!file && !pasteText.trim()) {
      setSourceError("Upload a file or paste a transcript to continue.");
      return;
    }
    if (!file && pasteText.trim() && !title.trim()) {
      setTitleError("Add a title for a pasted transcript.");
      return;
    }
    setSubmitting(true);
    try {
      const meeting = file
        ? await api.uploadTranscript(file, { title: title.trim() || undefined })
        : await api.createMeeting({
            title: title.trim(),
            transcript_text: pasteText,
            transcript_format: pasteFormat as MeetingCreateInput["transcript_format"],
          });
      await onCreated(meeting);
    } catch (err) {
      onError(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    setTitleError(null);
    setSourceError(null);
    if (!title.trim()) {
      setTitleError("Title is required.");
      return;
    }
    setSubmitting(true);
    try {
      const body: MeetingCreateInput = {
        title: title.trim(),
        participants: participants
          .filter((p) => p.name.trim())
          .map((p) => ({ ...p, name: p.name.trim() })),
        date: date ? new Date(date).toISOString() : undefined,
        duration_seconds: durationMin ? Math.round(Number(durationMin) * 60) : undefined,
        transcript_text: manualText.trim() || undefined,
        transcript_format: manualText.trim()
          ? (manualFormat as MeetingCreateInput["transcript_format"])
          : undefined,
      };
      const meeting = await api.createMeeting(body);
      await onCreated(meeting);
    } catch (err) {
      onError(err);
    } finally {
      setSubmitting(false);
    }
  }

  function pickFile(f: File | null) {
    setSourceError(null);
    setFile(f);
    if (f && !ACCEPT.split(",").some((ext) => f.name.toLowerCase().endsWith(ext))) {
      setSourceError(`Unsupported file type. Use ${ACCEPT}.`);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Create a meeting</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload or paste a transcript, or enter details manually. We&apos;ll generate
          notes, a summary, and action items.
        </p>
      </div>

      <div className="mb-6 inline-flex rounded-lg border bg-muted p-0.5">
        <ModeButton active={mode === "upload"} onClick={() => setMode("upload")} icon={FileUp}>
          Upload or paste
        </ModeButton>
        <ModeButton active={mode === "manual"} onClick={() => setMode("manual")} icon={Type}>
          Manual entry
        </ModeButton>
      </div>

      {mode === "upload" ? (
        <form onSubmit={submitUpload} className="space-y-5">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pickFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className={cn(
              "rounded-xl border-2 border-dashed bg-card p-8 text-center transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-input",
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            <Upload className="mx-auto size-7 text-muted-foreground" />
            {file ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-sm">
                <span className="font-medium">{file.name}</span>
                <button
                  type="button"
                  aria-label="Remove file"
                  onClick={() => pickFile(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Drag a transcript here, or{" "}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  browse
                </button>
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Accepts .txt, .vtt, or .json</p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-2 text-xs text-muted-foreground">
                or paste transcript text
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <textarea
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value);
                setSourceError(null);
              }}
              disabled={!!file}
              aria-label="Paste transcript"
              placeholder={"[00:00:00] Sarah Chen: Welcome everyone…\n[00:00:06] Tom Reyes: Thanks Sarah."}
              className={cn(textareaClass, file && "opacity-50")}
            />
            {!file && (
              <div className="flex items-center gap-2">
                <Label htmlFor="paste-format" className="text-xs text-muted-foreground">
                  Format
                </Label>
                <select
                  id="paste-format"
                  value={pasteFormat}
                  onChange={(e) => setPasteFormat(e.target.value)}
                  className={selectClass}
                >
                  <option value="txt">.txt</option>
                  <option value="vtt">.vtt</option>
                  <option value="json">.json</option>
                </select>
              </div>
            )}
          </div>

          {sourceError && <p className="text-sm text-destructive">{sourceError}</p>}

          <TitleField
            value={title}
            onChange={setTitle}
            error={titleError}
            label={file ? "Title (optional — derived from the file)" : "Title"}
          />

          <SubmitRow submitting={submitting} />
        </form>
      ) : (
        <form onSubmit={submitManual} className="space-y-5">
          <TitleField value={title} onChange={setTitle} error={titleError} label="Title" required />

          <div className="space-y-2">
            <Label>Participants</Label>
            <div className="space-y-2">
              {participants.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={p.name}
                    placeholder="Name"
                    aria-label={`Participant ${i + 1} name`}
                    onChange={(e) =>
                      setParticipants((rs) =>
                        rs.map((r, idx) => (idx === i ? { ...r, name: e.target.value } : r)),
                      )
                    }
                    className="flex-1"
                  />
                  <Input
                    value={p.speaker_label ?? ""}
                    placeholder="Speaker label"
                    aria-label={`Participant ${i + 1} speaker label`}
                    onChange={(e) =>
                      setParticipants((rs) =>
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
                    onClick={() => setParticipants((rs) => rs.filter((_, idx) => idx !== i))}
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
                  setParticipants((rs) => [
                    ...rs,
                    { name: "", speaker_label: `Speaker ${rs.length + 1}` },
                  ])
                }
              >
                <Plus className="size-4" /> Add participant
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min={0}
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-text">Transcript (optional)</Label>
            <textarea
              id="manual-text"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder={"[00:00:00] Sarah Chen: Welcome everyone…"}
              className={textareaClass}
            />
            {manualText.trim() && (
              <div className="flex items-center gap-2">
                <Label htmlFor="manual-format" className="text-xs text-muted-foreground">
                  Format
                </Label>
                <select
                  id="manual-format"
                  value={manualFormat}
                  onChange={(e) => setManualFormat(e.target.value)}
                  className={selectClass}
                >
                  <option value="txt">.txt</option>
                  <option value="vtt">.vtt</option>
                  <option value="json">.json</option>
                </select>
              </div>
            )}
          </div>

          {sourceError && <p className="text-sm text-destructive">{sourceError}</p>}

          <SubmitRow submitting={submitting} />
        </form>
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof FileUp;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

function TitleField({
  value,
  onChange,
  error,
  label,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  error: string | null;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="title">{label}</Label>
      <Input
        id="title"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Q3 Roadmap Sync"
        aria-invalid={!!error}
        aria-describedby={error ? "title-error" : undefined}
        required={required}
      />
      {error && (
        <p id="title-error" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function SubmitRow({ submitting }: { submitting: boolean }) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-end gap-2 pt-1">
      <Button type="button" variant="outline" onClick={() => router.push("/meetings")}>
        Cancel
      </Button>
      <Button type="submit" disabled={submitting} className="gap-1.5">
        {submitting ? "Creating…" : "Create meeting"}
      </Button>
    </div>
  );
}
