"""Transcript parsing: .txt / .vtt / .json -> normalized segments.

Every parser returns a list of dicts shaped like:
    {"speaker": str, "start_ms": int, "end_ms": int | None, "text": str, "idx": int}

`idx` is assigned sequentially (0, 1, 2 …) in parse order so the
segment-ordering guarantee from Phase 1 holds when the segments are persisted.

Timestamps:
  - .txt / .vtt clock strings ("HH:MM:SS.mmm", "MM:SS", …) are parsed to ms.
  - When a .txt line has no timestamp, we synthesize an increasing clock by
    estimating each line's spoken duration from its word count.
  - In .json, `start_ms`/`end_ms` are treated as milliseconds; `start`/`end`
    are treated as seconds (the common ASR convention) and scaled to ms.
"""

from __future__ import annotations

import json
import re

ALLOWED_FORMATS = {"txt", "vtt", "json"}

# Spoken-pace estimate: ~150 wpm ≈ 2.5 words/sec ≈ 400 ms/word, floored.
_MS_PER_WORD = 400
_MIN_SEGMENT_MS = 1500

# [00:01:23] Sarah Chen: text   (timestamp + "Speaker:" prefix)
_TXT_TS_SPEAKER = re.compile(
    r"^\s*\[(?P<ts>[\d:.]+)\]\s*(?P<speaker>[A-Za-z0-9][A-Za-z0-9 .'_-]{0,49}?):\s*(?P<text>.*)$"
)
# [00:01:23] text   (timestamp, no speaker prefix)
_TXT_TS_ONLY = re.compile(r"^\s*\[(?P<ts>[\d:.]+)\]\s*(?P<text>.*)$")
# Sarah Chen: text   (bare "Speaker:" prefix, no timestamp)
_TXT_SPEAKER = re.compile(
    r"^\s*(?P<speaker>[A-Za-z0-9][A-Za-z0-9 .'_-]{0,49}?):\s+(?P<text>.+)$"
)

_VTT_TIMING = re.compile(r"(?P<start>[\d:.]+)\s*-->\s*(?P<end>[\d:.]+)")
_VTT_VOICE = re.compile(r"<v\s+(?P<name>[^>]+)>(?P<text>.*)", re.DOTALL)
_ANY_TAG = re.compile(r"<[^>]+>")
_NAME_PREFIX = re.compile(
    r"^(?P<speaker>[A-Za-z0-9][A-Za-z0-9 .'_-]{0,49}?):\s+(?P<text>.+)$", re.DOTALL
)


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _timestamp_to_ms(ts: str) -> int:
    """Parse 'HH:MM:SS.mmm' / 'MM:SS' / 'SS' (with optional .mmm) to ms."""
    ts = ts.strip()
    millis = 0
    if "." in ts:
        ts, frac = ts.rsplit(".", 1)
        millis = int(frac.ljust(3, "0")[:3])
    parts = [int(p) for p in ts.split(":") if p != ""]
    if len(parts) == 3:
        h, m, s = parts
    elif len(parts) == 2:
        h, m, s = 0, parts[0], parts[1]
    elif len(parts) == 1:
        h, m, s = 0, 0, parts[0]
    else:
        return 0
    return (h * 3600 + m * 60 + s) * 1000 + millis


def _estimate_ms(text: str) -> int:
    return max(_MIN_SEGMENT_MS, len(text.split()) * _MS_PER_WORD)


def _finalize(rows: list[list]) -> list[dict]:
    """Fill timestamps, derive end_ms, and assign idx.

    `rows` items are [start_ms_or_None, speaker, text]. Missing starts are
    filled from a running clock; end_ms snaps to the next segment's start.
    """
    segments: list[dict] = []
    clock = 0
    for start, speaker, text in rows:
        if start is None:
            start = clock
        duration = _estimate_ms(text)
        clock = start + duration
        segments.append(
            {
                "speaker": speaker,
                "start_ms": int(start),
                "end_ms": int(start + duration),
                "text": text,
            }
        )

    for i in range(len(segments) - 1):
        segments[i]["end_ms"] = segments[i + 1]["start_ms"]

    for i, seg in enumerate(segments):
        seg["idx"] = i
    return segments


def _strip_tags(text: str) -> str:
    return _ANY_TAG.sub("", text).strip()


# --------------------------------------------------------------------------- #
# .txt
# --------------------------------------------------------------------------- #
def parse_txt(content: str) -> list[dict]:
    rows: list[list] = []
    last_speaker: str | None = None

    for raw_line in content.splitlines():
        if not raw_line.strip():
            continue

        m = _TXT_TS_SPEAKER.match(raw_line)
        if m:
            last_speaker = m.group("speaker").strip()
            rows.append(
                [_timestamp_to_ms(m.group("ts")), last_speaker, m.group("text").strip()]
            )
            continue

        m = _TXT_TS_ONLY.match(raw_line)
        if m:
            rows.append(
                [_timestamp_to_ms(m.group("ts")), last_speaker or "Speaker", m.group("text").strip()]
            )
            continue

        m = _TXT_SPEAKER.match(raw_line)
        if m:
            last_speaker = m.group("speaker").strip()
            rows.append([None, last_speaker, m.group("text").strip()])
            continue

        # Unmatched line: treat as a continuation of the previous segment.
        if rows:
            rows[-1][2] = f"{rows[-1][2]} {raw_line.strip()}".strip()
        else:
            rows.append([None, "Speaker", raw_line.strip()])

    return _finalize(rows)


# --------------------------------------------------------------------------- #
# .vtt
# --------------------------------------------------------------------------- #
def parse_vtt(content: str) -> list[dict]:
    segments: list[dict] = []
    blocks = re.split(r"\n\s*\n", content.strip())

    for block in blocks:
        lines = [ln for ln in block.splitlines() if ln.strip()]
        timing_idx = next((i for i, ln in enumerate(lines) if "-->" in ln), None)
        if timing_idx is None:
            continue  # WEBVTT header / NOTE / STYLE block

        timing = _VTT_TIMING.search(lines[timing_idx])
        if not timing:
            continue
        start = _timestamp_to_ms(timing.group("start"))
        end = _timestamp_to_ms(timing.group("end"))

        text = " ".join(lines[timing_idx + 1 :]).strip()
        speaker = "Speaker"

        voice = _VTT_VOICE.search(text)
        if voice:
            speaker = voice.group("name").strip()
            text = voice.group("text")
        text = _strip_tags(text)

        if speaker == "Speaker":
            prefix = _NAME_PREFIX.match(text)
            if prefix:
                speaker = prefix.group("speaker").strip()
                text = prefix.group("text").strip()

        segments.append(
            {"speaker": speaker, "start_ms": start, "end_ms": end, "text": text}
        )

    for i, seg in enumerate(segments):
        seg["idx"] = i
    return segments


# --------------------------------------------------------------------------- #
# .json
# --------------------------------------------------------------------------- #
def _coerce_ms(item: dict, ms_key: str, sec_key: str) -> int | None:
    if item.get(ms_key) is not None:
        return int(item[ms_key])
    if item.get(sec_key) is not None:
        return int(float(item[sec_key]) * 1000)
    return None


def parse_json(content: str) -> list[dict]:
    data = json.loads(content)

    # Accept a bare list, or an object wrapping the list under a common key.
    if isinstance(data, dict):
        for key in ("segments", "transcript", "results"):
            if isinstance(data.get(key), list):
                data = data[key]
                break
        else:
            data = [data]

    segments: list[dict] = []
    for item in data:
        speaker = (
            item.get("speaker")
            or item.get("name")
            or item.get("speaker_label")
            or "Speaker"
        )
        text = item.get("text") or item.get("content") or ""
        start_ms = _coerce_ms(item, "start_ms", "start")
        end_ms = _coerce_ms(item, "end_ms", "end")
        segments.append(
            {
                "speaker": str(speaker),
                "start_ms": int(start_ms) if start_ms is not None else 0,
                "end_ms": end_ms,
                "text": str(text),
            }
        )

    # No timing anywhere → synthesize an increasing clock from word counts.
    if segments and all(s["start_ms"] == 0 for s in segments):
        clock = 0
        for seg in segments:
            duration = _estimate_ms(seg["text"])
            seg["start_ms"] = clock
            seg["end_ms"] = clock + duration
            clock += duration

    for i, seg in enumerate(segments):
        seg["idx"] = i
    return segments


# --------------------------------------------------------------------------- #
# Dispatch
# --------------------------------------------------------------------------- #
def detect_format(filename: str) -> str:
    """Return the transcript format from a filename, or raise ValueError."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_FORMATS:
        raise ValueError(
            f"Unsupported file type '.{ext}'. Allowed: {sorted(ALLOWED_FORMATS)}"
        )
    return ext


def parse_transcript(content: str, fmt: str) -> list[dict]:
    """Parse `content` using the parser for `fmt` ('txt' | 'vtt' | 'json')."""
    fmt = fmt.lower().lstrip(".")
    if fmt == "txt":
        return parse_txt(content)
    if fmt == "vtt":
        return parse_vtt(content)
    if fmt == "json":
        return parse_json(content)
    raise ValueError(f"Unsupported transcript format: {fmt}")
