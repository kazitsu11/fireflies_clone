# Fireflies.ai Clone — Build Specification & Implementation Guide

> **For:** Claude Code
> **Goal:** Build a full-stack Fireflies.ai meeting-assistant clone that looks and feels like the real product, with working post-meeting workflows. Speech-to-text is mocked/seeded — do **not** implement real audio transcription.
> **Estimated scope:** ~24h of work. Prioritize the "Must Have" core features first, then bonuses if time allows.

---

## 0. How to use this document

This is the source of truth. Work through it **phase by phase** (Section 9 is the ordered task list). After each phase, the app should run end-to-end. Do not start a later phase until the current one runs without errors. Commit after every phase with a clear message.

**Rules:**
- You may use libraries freely, but keep the stack below. Don't add a heavy state-management lib (Redux) — React Query/SWR + local state is enough.
- Every file you write, you must be able to explain in an interview. Keep it clean and readable, no clever tricks.
- This is graded on: functionality, UI/UX similarity to Fireflies, DB schema, API design, code quality, modularity. Optimize for those.
- **Do not plagiarize** any existing Fireflies-clone repo. Write original code.

---

## 1. Tech Stack (fixed)

| Layer | Choice |
|---|---|
| Frontend | **Next.js 14+ (App Router) + TypeScript** |
| Styling | **Tailwind CSS** + **shadcn/ui** components + **lucide-react** icons |
| Data fetching | **TanStack Query (React Query)** |
| Backend | **Python + FastAPI** |
| ORM | **SQLAlchemy 2.0** + **Pydantic v2** schemas |
| Migrations | **Alembic** |
| Database | **SQLite** (file: `backend/fireflies.db`) |
| Audio | static sample file in `frontend/public/` + HTML5 `<audio>` |
| LLM (optional bonus) | OpenAI/Anthropic via env key, **gracefully degrade to seeded summaries if no key** |

Repo layout:
```
/
├── frontend/        # Next.js app
├── backend/         # FastAPI app
├── README.md        # setup, architecture, schema, API overview
└── CLAUDE.md        # this file
```

---

## 2. Product reference — what Fireflies actually looks like

Build to match this. Study these patterns:

### 2.1 Global shell
- **Left sidebar** (dark, collapsible, ~240px): logo at top, primary nav — `Home`, `Meetings` (active by default), `Upload`, plus disabled/"Coming soon" items (`Integrations`, `Team`, `AI Apps`). Bottom of sidebar: settings + a fake user avatar/account block.
- **Top bar:** page title on the left, a global search input in the center/right, a "+ Upload" or "+ New Meeting" primary button, notification bell, avatar.
- Color feel: clean, white/very-light-gray content area, dark sidebar, a signature **purple/indigo accent** (`#6D28D9`-ish / Fireflies uses a purple-blue). Rounded corners, soft shadows, lots of whitespace, productivity-tool aesthetic. Sans-serif (Inter).

### 2.2 Meetings dashboard (`/meetings`)
- Header: "Meetings" + count, search bar (by title/keyword), filters (participant, date range, duration), sort (Most recent default).
- A **table or card list** of meetings, each row showing: title, date/time, duration, participant avatars + count, and a 3-dot menu (rename / delete / download). Clicking a row → detail page.
- Empty state when no meetings; loading skeletons while fetching.

### 2.3 Meeting detail / "Notepad" (`/meetings/[id]`)  ← the centerpiece
Three-area layout (Fireflies "Notepad"):
- **Main/center column:** media player at top (audio/video placeholder + seek bar + play/pause + skip ±10s + playback speed), then the **AI Summary** below it: Overview paragraph, Keywords/topics chips, time-stamped **Notes/chapters** (each linked to a transcript timestamp), and **Action Items** (checkboxes, assignee, jump-to-moment).
- **Right column:** the **interactive Transcript** — speaker label + timestamp + line text, virtualized/scrollable. A search box above it highlights matches and lets you step through them.
- **Left column (optional/bonus):** "Insights" / Index (jump to summary sections, action items) — can be simplified or merged into the main column if time-constrained.
- **Two-way sync (REQUIRED):** clicking a transcript line seeks the player to that timestamp; as the player plays, the currently-spoken transcript line auto-highlights and scrolls into view. Clicking a summary chapter/action-item timestamp also seeks.
- Top of page: editable meeting **title** (inline edit), participants, date, duration, and a 3-dot menu (rename, download, delete, regenerate notes).
- Toasts for save/delete/etc. Tabs on mobile (Summary / Transcript) since 3 columns won't fit.

### 2.4 Create meeting
- Modal or `/meetings/new` page with two modes: (a) **paste/upload a transcript** (`.txt`, `.vtt`, `.json`), or (b) a **manual form** (title, participants, date, duration, paste transcript text). On submit → parse transcript into segments → optionally generate summary → persist → redirect to detail.

### 2.5 Placeholders ("Coming Soon" is fine)
Live bot joining calls, real STT, integrations (Zoom/Meet/calendar/CRM), team/sharing, real auth (assume a single default logged-in user). Render these as disabled nav items or simple "Coming soon" panels.

---

## 3. Database schema (SQLite via SQLAlchemy)

Design rationale to put in README: a meeting has many transcript segments, many action items, and one summary (1:1). Topics/keywords and participants are normalized into their own tables with join tables so we can filter by them. Use UUID string PKs.

```
users
  id (PK, str uuid)
  name
  email
  avatar_url
  created_at

meetings
  id (PK)
  title
  description (nullable)
  date (datetime)               # when the meeting happened
  duration_seconds (int)
  audio_url (str, nullable)     # path to sample media
  language (str, default 'en')
  organizer_id (FK -> users.id, nullable)
  created_at, updated_at

participants
  id (PK)
  meeting_id (FK -> meetings.id, cascade delete)
  name
  email (nullable)
  # speaker_label maps transcript speakers to a participant, e.g. "Speaker 1"
  speaker_label (str, nullable)

transcript_segments
  id (PK)
  meeting_id (FK -> meetings.id, cascade delete)
  speaker (str)                 # "Sarah Chen" or "Speaker 1"
  start_ms (int)                # ms offset for seek sync
  end_ms (int, nullable)
  text (str)
  idx (int)                     # ordering within meeting
  # index on (meeting_id, idx)

summaries
  id (PK)
  meeting_id (FK -> meetings.id, unique, cascade delete)   # 1:1
  overview (text)               # short paragraph
  generated_by (str)            # 'seed' | 'llm'
  created_at, updated_at

summary_chapters                # time-stamped notes / outline
  id (PK)
  summary_id (FK -> summaries.id, cascade delete)
  title (str)
  bullets_json (text)           # JSON array of bullet strings
  start_ms (int)                # links to transcript timestamp
  idx (int)

keywords                        # topics / keywords chips
  id (PK)
  meeting_id (FK -> meetings.id, cascade delete)
  term (str)

action_items
  id (PK)
  meeting_id (FK -> meetings.id, cascade delete)
  text (str)
  assignee (str, nullable)
  completed (bool, default false)
  start_ms (int, nullable)      # jump-to-moment
  created_at, updated_at
```

Add `cascade="all, delete-orphan"` on relationships so deleting a meeting cleans up children. Create Alembic initial migration.

---

## 4. Backend — FastAPI

### 4.1 Structure
```
backend/
├── app/
│   ├── main.py            # FastAPI app, CORS, router include
│   ├── database.py        # engine, SessionLocal, Base, get_db dep
│   ├── models.py          # SQLAlchemy models (section 3)
│   ├── schemas.py         # Pydantic request/response models
│   ├── crud.py            # DB operations, kept out of routes
│   ├── routers/
│   │   ├── meetings.py
│   │   ├── action_items.py
│   │   └── search.py
│   ├── services/
│   │   ├── transcript_parser.py   # .txt/.vtt/.json -> segments
│   │   └── summarizer.py          # seed/mock summary; optional LLM
│   └── seed.py            # seeds several full meetings
├── requirements.txt
├── alembic/ + alembic.ini
└── fireflies.db
```

### 4.2 API surface (design cleanly, REST)

```
# Meetings
GET    /api/meetings                 # list; query params: q, participant, date_from, date_to, min_duration, sort
GET    /api/meetings/{id}            # full detail: meeting + participants + segments + summary(+chapters) + keywords + action_items
POST   /api/meetings                 # create from form OR parsed transcript (multipart for file upload, or JSON)
PATCH  /api/meetings/{id}            # edit metadata (title, participants, date, etc.)
DELETE /api/meetings/{id}            # cascade delete
POST   /api/meetings/{id}/regenerate-summary   # re-run summarizer

# Transcript
GET    /api/meetings/{id}/transcript            # segments only (paginated optional)
POST   /api/meetings/{id}/transcript/search?q=  # returns matching segment ids + offsets for highlight

# Action items
GET    /api/meetings/{id}/action-items
POST   /api/meetings/{id}/action-items
PATCH  /api/action-items/{id}        # edit text/assignee/toggle completed
DELETE /api/action-items/{id}

# Global (bonus)
GET    /api/search?q=                # search across all meetings' titles + transcript text
GET    /api/me                       # returns the single default user
```

- Use Pydantic response models everywhere; no raw ORM leakage.
- CORS allow the frontend origin.
- Validate uploads (extension + size). Parse on the server in `transcript_parser.py`.
- Return proper status codes (201 on create, 404 when missing, 422 on bad input).
- Keep route handlers thin → call `crud`/`services`.

### 4.3 Transcript parser (`services/transcript_parser.py`)
Support three formats, each → list of `{speaker, start_ms, end_ms, text}`:
- **.txt** — lines like `[00:01:23] Sarah Chen: text...` (also handle `Speaker: text` with auto-incrementing timestamps if none present).
- **.vtt** — standard WebVTT cue blocks (`00:00:01.000 --> 00:00:04.000`), speaker from `<v Name>` tag or `Name:` prefix.
- **.json** — array of segment objects; accept flexible keys (`speaker`/`name`, `start`/`start_ms`, `text`).

### 4.4 Summarizer (`services/summarizer.py`)
- If `OPENAI_API_KEY`/`ANTHROPIC_API_KEY` present → send transcript text, ask for JSON: `{overview, keywords[], chapters:[{title,bullets[],start_ms}], action_items:[{text,assignee,start_ms}]}`.
- **Else (default):** deterministic mock — derive keywords by simple frequency, chapter every N segments, overview from first/last lines, a few action items from lines containing "will", "action", "todo", "follow up". Must always work offline so the deployed demo never breaks.

---

## 5. Frontend — Next.js

### 5.1 Structure
```
frontend/
├── app/
│   ├── layout.tsx                 # sidebar + topbar shell, providers
│   ├── page.tsx                   # redirect to /meetings
│   ├── meetings/
│   │   ├── page.tsx               # dashboard (list/search/filter/sort)
│   │   ├── new/page.tsx           # create (or modal)
│   │   └── [id]/page.tsx          # notepad detail (the centerpiece)
│   └── settings/page.tsx          # placeholder
├── components/
│   ├── layout/Sidebar.tsx, Topbar.tsx
│   ├── meetings/MeetingCard.tsx, MeetingTable.tsx, MeetingFilters.tsx, CreateMeetingModal.tsx
│   ├── notepad/MediaPlayer.tsx, Transcript.tsx, TranscriptLine.tsx,
│   │           TranscriptSearch.tsx, SummaryPanel.tsx, ActionItems.tsx,
│   │           Chapters.tsx, KeywordChips.tsx, InsightsPanel.tsx
│   └── ui/...                      # shadcn components
├── lib/
│   ├── api.ts                     # typed fetch client
│   ├── types.ts                   # shared TS types matching Pydantic
│   └── time.ts                    # ms <-> "MM:SS" helpers
├── public/sample-audio.mp3        # placeholder media
└── tailwind.config.ts
```

### 5.2 The player↔transcript↔summary sync (do this carefully)
- Lift playback state to the detail page (or a small context): `currentMs`, `isPlaying`, `seekTo(ms)`.
- `MediaPlayer` reports `onTimeUpdate -> currentMs`.
- `Transcript` highlights the segment where `start_ms <= currentMs < nextStart`, and `scrollIntoView({block:'center'})` on the active line (throttle this).
- Clicking a `TranscriptLine`, a chapter, or an action item → `seekTo(start_ms)` → set `audio.currentTime`.
- `TranscriptSearch`: filter/scan segments client-side, wrap matches in `<mark>`, prev/next buttons cycle through matches.

### 5.3 UI fidelity checklist (match Fireflies)
- Dark left sidebar w/ purple active state; clean white content; Inter font; rounded-xl cards; soft shadows.
- Meetings list with avatar stacks + relative dates ("2 days ago").
- Notepad: media player card on top, summary with section headers + emoji-ish icons (Keywords / Overview / Notes / Action Items), transcript on the right with speaker color-coding.
- Skeleton loaders, empty states, toasts (shadcn `useToast`), modals, hover states.
- Responsive: collapse to tabs (Summary | Transcript) under `lg`.
- **Bonus if time:** dark mode toggle (Fireflies has one).

---

## 6. Seed data (REQUIRED — app must be usable on first load)
In `backend/app/seed.py`, create **5–6 realistic meetings**, each with:
- a believable title (e.g. "Q3 Product Roadmap Sync", "Acme Corp — Sales Discovery Call", "Weekly Engineering Standup", "Design Review — Mobile Onboarding", "Customer Success QBR — Globex"),
- 3–5 participants with names + speaker labels,
- **30–60 transcript segments** with realistic multi-speaker dialogue and increasing timestamps,
- a full summary (overview + 4–6 keywords + 3–4 chapters w/ bullets),
- 3–5 action items (mix of completed/not, with assignees and timestamps),
- `audio_url` pointing to the shared sample file.
Provide `python -m app.seed` (idempotent: wipe + reseed). Make the dialogue genuinely readable so the demo impresses.

---

## 7. README.md (deliverable — write it last, thoroughly)
Must include: project overview + screenshot/GIF placeholder, tech stack, **architecture overview** (frontend↔API↔SQLite diagram in text), **database schema** (the tables + relationships from section 3), **API overview** (endpoint table from 4.2), local setup for **both** frontend and backend (exact commands), env vars (optional LLM key), how to seed, how it was deployed, and an **"Assumptions" section** (single default user, mocked STT, sample audio, etc.).

---

## 8. Deployment
- **Backend:** Render or Railway (FastAPI + SQLite on a persistent disk, or note that SQLite resets on redeploy and reseed on boot). Expose CORS to the frontend domain.
- **Frontend:** Vercel. Set `NEXT_PUBLIC_API_BASE_URL` to the deployed backend.
- Confirm the deployed demo works with seeded data and the summarizer's offline fallback (so it never depends on an LLM key).
- Put both links in the README and in the submission.

---

## 9. Ordered task list (work top-down, run after each phase)

**Phase 1 — Backend foundation**
1. Scaffold `backend/`, venv, `requirements.txt` (fastapi, uvicorn, sqlalchemy, pydantic, alembic, python-multipart).
2. `database.py`, `models.py` (all tables, relationships, cascades), Alembic init + first migration.
3. `schemas.py` + `crud.py` + meetings router with full CRUD + detail aggregation. Run, hit `/docs`.

**Phase 2 — Parsing, summary, seed**
4. `transcript_parser.py` (.txt/.vtt/.json) + create-from-upload endpoint.
5. `summarizer.py` (offline mock first; LLM path behind env check).
6. `seed.py` with 5–6 rich meetings. Verify `GET /api/meetings` and detail return full data.
7. action_items + search routers.

**Phase 3 — Frontend shell + dashboard**
8. Scaffold Next.js + Tailwind + shadcn + React Query provider. `lib/api.ts`, `lib/types.ts`, `lib/time.ts`.
9. Sidebar + Topbar shell matching Fireflies. Placeholders for coming-soon items.
10. `/meetings` dashboard: list/cards, search, filters, sort, loading skeletons, empty state, 3-dot menu (delete w/ toast).

**Phase 4 — Notepad (centerpiece)**
11. `/meetings/[id]`: layout (media + summary center, transcript right).
12. `MediaPlayer` (play/pause, seek bar, ±10s, speed) + lifted playback state.
13. `Transcript` + `TranscriptLine` with active-line highlight + autoscroll; click-to-seek both ways.
14. `TranscriptSearch` with highlight + prev/next.
15. `SummaryPanel` (overview, keyword chips, chapters w/ jump-to-time) + `ActionItems` (toggle complete, add, edit, delete, jump-to-time).
16. Inline title edit, participants edit, regenerate-summary button, download (bonus), toasts everywhere.

**Phase 5 — Create flow + polish**
17. `CreateMeetingModal` / `new` page: upload-or-paste transcript + manual form → create → redirect to detail.
18. Responsive tabs under `lg`; settings placeholder page; notifications/toasts pass.
19. UI fidelity pass against the Fireflies checklist (section 5.3).

**Phase 6 — Bonuses (only if time): dark mode, global search page, export (MD/TXT/PDF), tags/topics filtering, "Ask a question about this meeting" chat (LLM, behind env key with graceful disable).**

**Phase 7 — README + deploy + final commit.**

---

## 10. Definition of done
- [ ] All 5 core feature groups work (dashboard, notepad w/ 2-way sync, AI summary+action items, full CRUD w/ persistence, Fireflies-like UX).
- [ ] DB schema is normalized w/ cascades; Alembic migration committed.
- [ ] Clean REST API, thin routes, Pydantic everywhere, `/docs` works.
- [ ] Seeded with 5–6 rich meetings; app usable immediately.
- [ ] Frontend visually resembles Fireflies (sidebar, notepad, purple accent, skeletons, toasts, modals).
- [ ] Summarizer works offline (no LLM dependency for the demo).
- [ ] README complete (setup, architecture, schema, API, assumptions).
- [ ] Public GitHub repo (`frontend/` + `backend/`) + live deployed link, both in submission.
- [ ] Code is clean, modular, and you can explain every file.
