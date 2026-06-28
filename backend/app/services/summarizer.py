"""Summarization service.

`generate_summary(segments)` always returns this shape::

    {
      "overview": str,
      "keywords": [str, ...],
      "chapters": [{"title": str, "bullets": [str], "start_ms": int}, ...],
      "action_items": [{"text": str, "assignee": str|None,
                        "start_ms": int|None, "completed": bool}, ...],
      "generated_by": "seed" | "llm",
    }

The **offline deterministic mock** is the critical path — it has no external
dependencies and is what the deployed demo uses. The LLM path is strictly
optional: it only runs when an API key env var is set, it imports the SDK
lazily, and ANY failure (missing SDK, network, bad key, bad JSON) falls back
to the mock. The demo therefore never depends on an LLM key.
"""

from __future__ import annotations

import json
import os
import re
from collections import Counter

# Chapter timestamps and action-item timestamps reference real segment
# start_ms values, so the frontend can jump-to-moment.

_STOPWORDS = {
    "the", "and", "that", "this", "with", "have", "will", "from", "they",
    "what", "your", "youre", "were", "their", "there", "about", "would",
    "could", "should", "going", "just", "like", "well", "yeah", "okay",
    "right", "think", "know", "want", "really", "kind", "thing", "things",
    "make", "made", "need", "lets", "into", "over", "than", "then", "them",
    "some", "more", "much", "very", "also", "been", "being", "here", "when",
    "where", "which", "while", "because", "around", "still", "those", "these",
    "gonna", "wanna", "stuff", "sure", "good", "great", "thanks", "thank",
    "guys", "everyone", "team", "today", "actually", "basically", "maybe",
}

# Words/phrases that flag a line as an action item.
_ACTION_RE = re.compile(r"\b(will|action|to-?do|follow[- ]up)\b", re.IGNORECASE)
_WORD_RE = re.compile(r"[A-Za-z][A-Za-z'’-]{2,}")


# --------------------------------------------------------------------------- #
# Normalization
# --------------------------------------------------------------------------- #
def _as_dict(seg) -> dict:
    """Accept either a plain dict or an ORM segment object."""
    if isinstance(seg, dict):
        return {
            "speaker": seg.get("speaker", "Speaker"),
            "start_ms": int(seg.get("start_ms", 0) or 0),
            "text": seg.get("text", "") or "",
        }
    return {
        "speaker": getattr(seg, "speaker", "Speaker"),
        "start_ms": int(getattr(seg, "start_ms", 0) or 0),
        "text": getattr(seg, "text", "") or "",
    }


def _first_sentence(text: str, limit: int = 140) -> str:
    text = text.strip()
    parts = re.split(r"(?<=[.!?])\s+", text, maxsplit=1)
    sentence = parts[0] if parts else text
    return sentence[: limit - 1].rstrip() + "…" if len(sentence) > limit else sentence


def _shorten(text: str, limit: int = 110) -> str:
    text = text.strip()
    return text[: limit - 1].rstrip() + "…" if len(text) > limit else text


# --------------------------------------------------------------------------- #
# Offline deterministic mock
# --------------------------------------------------------------------------- #
def _keyword_counts(segments: list[dict]) -> Counter:
    counter: Counter = Counter()
    for seg in segments:
        for word in _WORD_RE.findall(seg["text"].lower()):
            if len(word) >= 4 and word not in _STOPWORDS:
                counter[word] += 1
    return counter


def _mock_summary(segments: list[dict]) -> dict:
    if not segments:
        return {
            "overview": "No transcript was available to summarize.",
            "keywords": [],
            "chapters": [],
            "action_items": [],
            "generated_by": "seed",
        }

    counts = _keyword_counts(segments)
    keywords = [w.capitalize() for w, _ in counts.most_common(6)]

    n = len(segments)
    num_chapters = max(1, min(4, round(n / 10)))
    chunk = -(-n // num_chapters)  # ceil division

    chapters: list[dict] = []
    for start_i in range(0, n, chunk):
        chunk_segs = segments[start_i : start_i + chunk]
        chunk_counts = _keyword_counts(chunk_segs)
        top = [w.capitalize() for w, _ in chunk_counts.most_common(2)]
        title = ", ".join(top) if top else f"Section {len(chapters) + 1}"
        bullets = [_first_sentence(s["text"]) for s in chunk_segs[:3] if s["text"].strip()]
        chapters.append(
            {"title": title, "bullets": bullets, "start_ms": chunk_segs[0]["start_ms"]}
        )

    speakers = list(dict.fromkeys(s["speaker"] for s in segments))
    speaker_phrase = (
        speakers[0]
        if len(speakers) == 1
        else ", ".join(speakers[:-1]) + f" and {speakers[-1]}"
    )
    overview = (
        f"A {n}-part conversation between {speaker_phrase}. "
        f"It opened with \"{_shorten(segments[0]['text'])}\" "
        f"and wrapped up with \"{_shorten(segments[-1]['text'])}\"."
    )
    if keywords:
        overview += f" Key topics: {', '.join(keywords[:4])}."

    action_items: list[dict] = []
    for seg in segments:
        if _ACTION_RE.search(seg["text"]):
            action_items.append(
                {
                    "text": _shorten(seg["text"], 200),
                    "assignee": seg["speaker"],
                    "start_ms": seg["start_ms"],
                    "completed": False,
                }
            )
        if len(action_items) >= 5:
            break

    return {
        "overview": overview,
        "keywords": keywords,
        "chapters": chapters,
        "action_items": action_items,
        "generated_by": "seed",
    }


# --------------------------------------------------------------------------- #
# Optional LLM path (only runs when a key is present; degrades to mock)
# --------------------------------------------------------------------------- #
def _llm_enabled() -> bool:
    return bool(os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY"))


def _format_transcript(segments: list[dict]) -> str:
    lines = []
    for seg in segments:
        secs = seg["start_ms"] // 1000
        lines.append(f"[{secs // 60:02d}:{secs % 60:02d}] {seg['speaker']}: {seg['text']}")
    return "\n".join(lines)


def _build_prompt(transcript: str, language: str) -> str:
    return (
        "You are a meeting-notes assistant. Summarize the transcript below and "
        "respond with ONLY a JSON object (no markdown) of this exact shape:\n"
        '{"overview": str, "keywords": [str], '
        '"chapters": [{"title": str, "bullets": [str], "start_ms": int}], '
        '"action_items": [{"text": str, "assignee": str|null, "start_ms": int}]}\n'
        "Rules: 4-6 keywords; 3-4 chapters; start_ms are millisecond offsets that "
        f"should match a real line's timestamp; write in language '{language}'.\n\n"
        f"TRANSCRIPT:\n{transcript}"
    )


def _call_anthropic(prompt: str) -> str:
    import anthropic  # lazy: not a project dependency

    client = anthropic.Anthropic()
    model = os.getenv("LLM_MODEL", "claude-sonnet-4-6")
    message = client.messages.create(
        model=model,
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def _call_openai(prompt: str) -> str:
    from openai import OpenAI  # lazy: not a project dependency

    client = OpenAI()
    model = os.getenv("LLM_MODEL", "gpt-4o-mini")
    resp = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )
    return resp.choices[0].message.content


def _extract_json(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw)
    return raw


def _nearest_start_ms(value, segments: list[dict]) -> int:
    """Snap an LLM-provided timestamp to the closest real segment start."""
    try:
        target = int(value)
    except (TypeError, ValueError):
        return segments[0]["start_ms"] if segments else 0
    return min((s["start_ms"] for s in segments), key=lambda ms: abs(ms - target), default=0)


def _normalize_llm(data: dict, segments: list[dict]) -> dict:
    chapters = []
    for ch in data.get("chapters", []) or []:
        chapters.append(
            {
                "title": str(ch.get("title", "Chapter")),
                "bullets": [str(b) for b in (ch.get("bullets") or [])],
                "start_ms": _nearest_start_ms(ch.get("start_ms"), segments),
            }
        )
    action_items = []
    for ai in data.get("action_items", []) or []:
        action_items.append(
            {
                "text": str(ai.get("text", "")),
                "assignee": ai.get("assignee"),
                "start_ms": _nearest_start_ms(ai.get("start_ms"), segments),
                "completed": bool(ai.get("completed", False)),
            }
        )
    return {
        "overview": str(data.get("overview", "")),
        "keywords": [str(k) for k in (data.get("keywords") or [])],
        "chapters": chapters,
        "action_items": action_items,
        "generated_by": "llm",
    }


def _llm_summary(segments: list[dict], *, language: str) -> dict:
    prompt = _build_prompt(_format_transcript(segments), language)
    raw = _call_anthropic(prompt) if os.getenv("ANTHROPIC_API_KEY") else _call_openai(prompt)
    data = json.loads(_extract_json(raw))
    return _normalize_llm(data, segments)


# --------------------------------------------------------------------------- #
# Public entry point
# --------------------------------------------------------------------------- #
def generate_summary(segments, *, language: str = "en") -> dict:
    """Summarize segments. Uses the LLM path only if a key is set, else the mock.

    Never raises on the LLM path — any failure degrades to the offline mock.
    """
    normalized = [_as_dict(s) for s in segments]
    if _llm_enabled():
        try:
            return _llm_summary(normalized, language=language)
        except Exception:  # noqa: BLE001 - degrade gracefully to the offline mock
            return _mock_summary(normalized)
    return _mock_summary(normalized)
