# Deployment

Backend → **Render** (FastAPI + SQLite, reseeded on boot). Frontend → **Vercel**
(Next.js). Deploy the backend first so you have its URL for the frontend.

## 0. Push to GitHub

```bash
git remote add origin https://github.com/<you>/fireflies-clone.git
git push -u origin main
```

## 1. Backend → Render

Either use the committed [`render.yaml`](render.yaml) blueprint (New → Blueprint →
pick the repo) or create a Web Service manually:

- **Root directory:** `backend`
- **Runtime:** Python · **Build:** `pip install -r requirements.txt`
- **Start:** `python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  - `app.seed` runs `Base.metadata.create_all` + an idempotent wipe-and-reseed, so
    a fresh (empty) ephemeral DB always boots with the 5 demo meetings. No Alembic
    step is needed at boot.
- **Env vars:**
  - `PYTHON_VERSION=3.13.0`
  - `CORS_ORIGINS=https://<your-frontend>.vercel.app` (set after step 2; comma-sep for multiple)
  - *(optional)* `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` to enable LLM summaries + AI Q&A

Copy the resulting URL, e.g. `https://fireflies-clone-api.onrender.com`.
(Free tier sleeps when idle — the first request after a while is a cold start.)

## 2. Frontend → Vercel

- **Import** the GitHub repo → **Root Directory:** `frontend` (framework auto-detects Next.js).
- **Env var:** `NEXT_PUBLIC_API_BASE_URL=https://fireflies-clone-api.onrender.com`
  (required — without it the deployed app calls `localhost:8000`).
- Deploy → copy the URL, e.g. `https://fireflies-clone.vercel.app`.

## 3. Close the loop (CORS)

Set `CORS_ORIGINS` on Render to the Vercel URL from step 2 and let the backend
redeploy. (`backend/app/main.py` reads `CORS_ORIGINS` as a comma-separated list.)

## 4. Verify the live demo end-to-end

- [ ] Dashboard at the Vercel URL lists the **5 seeded meetings**.
- [ ] Open a meeting → audio **plays**, and the transcript **highlights + auto-scrolls**
      as it plays; clicking a line seeks the player.
- [ ] Topbar search → `/search?q=onboarding` returns grouped results.
- [ ] Create flow: upload a `.txt`/`.vtt`/`.json` → redirects to a working Notepad.
- [ ] The **Ask about this meeting** panel shows its disabled "Requires API key" state.
- [ ] Toggle dark mode; reload — the theme persists (cookie).

## Platform notes

- **SQLite is ephemeral** on Render's free filesystem; reseed-on-boot is intentional,
  so runtime-created meetings reset on each deploy/restart. For persistence, attach a
  Render Disk at `backend/fireflies.db` and move seeding to a one-time job.
- **AI Q&A ships keyless by design** — the keyed answering path is implemented but
  unverified, so the live demo runs without a key (clean disabled state). Add
  `ANTHROPIC_API_KEY` to enable it.
- **Cold starts:** Render free dynos sleep; the first hit may take ~30s.
