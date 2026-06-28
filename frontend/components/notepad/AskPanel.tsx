"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CornerDownLeft, MessagesSquare, Sparkles } from "lucide-react";

import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "./SectionHeading";

export function AskPanel({ meetingId }: { meetingId: string }) {
  const { data: status, isPending } = useQuery({
    queryKey: ["ai-status"],
    queryFn: api.getAiStatus,
    staleTime: Infinity,
  });
  const enabled = !!status?.enabled;

  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);

  const ask = useMutation({
    mutationFn: (q: string) => api.askMeeting(meetingId, q),
    onSuccess: (res, q) => {
      setHistory((h) => [...h, { q, a: res.answer }]);
      setQuestion("");
    },
    onError: (e) =>
      toast.error("Couldn't get an answer", { description: (e as Error).message }),
  });

  // Don't render the section at all until we know the status (avoids a flash).
  if (isPending) return null;

  return (
    <section id="ask" className="scroll-mt-4 space-y-3">
      <SectionHeading
        icon={MessagesSquare}
        title="Ask about this meeting"
        trailing={
          !enabled && (
            <Badge variant="secondary" className="bg-muted font-normal text-muted-foreground">
              Requires API key
            </Badge>
          )
        }
      />

      {!enabled ? (
        <div className="rounded-xl border border-dashed bg-card p-4 text-sm">
          <p className="text-muted-foreground">
            AI Q&amp;A is turned off. Set an{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">ANTHROPIC_API_KEY</code>{" "}
            (or <code className="rounded bg-muted px-1 py-0.5 text-xs">OPENAI_API_KEY</code>)
            on the server to ask questions about this transcript.
          </p>
          <div className="pointer-events-none mt-3 flex gap-2 opacity-50">
            <Input disabled placeholder="e.g. What did we decide about pricing?" />
            <Button disabled className="gap-1.5">
              <Sparkles className="size-4" /> Ask
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((h, i) => (
            <div key={i} className="space-y-1.5 rounded-xl border bg-card p-3 text-sm">
              <p className="font-medium">{h.q}</p>
              <p className="text-foreground/80">{h.a}</p>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = question.trim();
              if (q) ask.mutate(q);
            }}
            className="flex gap-2"
          >
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about this meeting…"
              aria-label="Ask about this meeting"
            />
            <Button type="submit" className="gap-1.5" disabled={!question.trim() || ask.isPending}>
              {ask.isPending ? "Thinking…" : <><CornerDownLeft className="size-4" /> Ask</>}
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}
