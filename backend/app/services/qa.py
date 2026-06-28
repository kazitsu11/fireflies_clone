"""Ask-a-question over a meeting transcript.

Strictly optional and behind the same env-key check as the summarizer
(graceful-degradation pattern): when no API key is present,
`ai_enabled()` is False and the endpoint disables cleanly — the feature never
breaks the page or the deployed demo.
"""

from __future__ import annotations

import os

from . import summarizer


def ai_enabled() -> bool:
    """True only when an LLM API key is configured on the server."""
    return summarizer._llm_enabled()


def answer_question(segments, question: str) -> str:
    """Answer `question` grounded in the meeting transcript (requires a key)."""
    transcript = summarizer._format_transcript([summarizer._as_dict(s) for s in segments])
    prompt = (
        "You are a helpful meeting assistant. Answer the user's question using ONLY "
        "the meeting transcript below. If the answer is not in the transcript, say you "
        "could not find it in this meeting. Be concise and cite speakers where useful.\n\n"
        f"TRANSCRIPT:\n{transcript}\n\nQUESTION: {question}\n\nANSWER:"
    )
    if os.getenv("ANTHROPIC_API_KEY"):
        return summarizer._call_anthropic(prompt)
    return summarizer._call_openai(prompt)
