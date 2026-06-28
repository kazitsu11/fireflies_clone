# Fireflies.ai Clone

A full-stack meeting-assistant clone (Next.js + FastAPI + SQLite): a meetings
dashboard, an interactive "Notepad" detail page (media player ↔ transcript ↔
summary two-way sync), AI-style summaries and action items, and a create flow
that parses uploaded/pasted transcripts.

> Full setup, architecture, schema, and API docs are written in Phase 7. This
> file currently captures the project's **assumptions** (started in Phase 5).

## Assumptions

- **Single default user.** There is no real auth yet; the backend serves one
  implicit user via `GET /api/me`, and the frontend treats it as the logged-in
  account. Team/sharing/SSO are "Coming soon" placeholders.
- **Speech-to-text is mocked.** Transcripts come from uploaded/pasted files or
  seed data — there is no real audio transcription. Live bot/STT is a placeholder.
- **`.json` transcript timestamp convention.** When parsing `.json` transcripts,
  `start_ms` / `end_ms` are read as **milliseconds**, while `start` / `end` are
  read as **seconds** (the common ASR-export convention) and scaled to ms.
  `speaker`/`name` and `text`/`content` keys are both accepted.
  (See `backend/app/services/transcript_parser.py`.)
- **Sample-audio duration contract (600s).** Every meeting plays the same static
  `frontend/public/sample-audio.mp3`. Seed timestamps are bounded below
  `SAMPLE_AUDIO_DURATION_SECONDS = 600` (`backend/app/seed.py`) so every
  transcript line, chapter, and action item is seekable and the player seek-bar
  lines up. The committed sample mp3 is a real **10:00** clip, which satisfies
  the contract; swapping in any clip ≥ 600s keeps the alignment valid.
- **LLM summaries are optional.** The summarizer runs an offline deterministic
  mock by default; an Anthropic/OpenAI path activates only if an API key env var
  is set and degrades back to the mock on any failure — so the demo never depends
  on an LLM key.
