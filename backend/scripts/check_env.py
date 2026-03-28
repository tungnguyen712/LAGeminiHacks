#!/usr/bin/env python3
"""Print whether API keys look configured (never prints secret values).

Run from repo root or from backend/:
  python3 backend/scripts/check_env.py
  cd backend && python3 scripts/check_env.py
"""

import os
import sys
from pathlib import Path

_backend = Path(__file__).resolve().parent.parent
os.chdir(_backend)
sys.path.insert(0, str(_backend))

from config import settings  # noqa: E402


def _looks_placeholder(value: str) -> bool:
    v = value.strip().lower()
    if not v:
        return True
    # Match .env.example style only (avoid "here" — it false-positives on substrings like "there")
    if v in (
        "your_google_maps_api_key_here",
        "your_gemini_api_key_here",
        "your_google_maps_sdk_key_here",
    ):
        return True
    hints = ("your_google_maps", "your_gemini", "placeholder", "changeme", "xxx")
    return any(h in v for h in hints) or len(v) < 12


def main() -> int:
    g = settings.google_maps_api_key.strip()
    m = settings.gemini_api_key.strip()
    problems: list[str] = []

    if not g:
        problems.append("GOOGLE_MAPS_API_KEY is empty — copy .env.example to .env and set a real key.")
    elif _looks_placeholder(g):
        problems.append(
            "GOOGLE_MAPS_API_KEY still looks like a placeholder — use a key from Google Cloud (Routes API enabled)."
        )

    if not m:
        problems.append("GEMINI_API_KEY is empty — get a key from Google AI Studio.")
    elif _looks_placeholder(m):
        problems.append("GEMINI_API_KEY still looks like a placeholder — paste your real Gemini API key.")

    if problems:
        print("Environment issues:\n")
        for p in problems:
            print(f"  • {p}")
        print("\nSee README.md → API keys setup.\n")
        return 1

    warnings: list[str] = []
    if len(g) < 35 or not g.startswith("AIza"):
        warnings.append(
            "GOOGLE_MAPS_API_KEY length/shape looks unusual (Cloud keys are often ~39 chars, starting with AIza). "
            "Check for a truncated paste or wrong credential type."
        )
    if len(m) < 30:
        warnings.append(
            "GEMINI_API_KEY looks short — confirm you copied the full key from AI Studio."
        )

    print("Keys look non-placeholder. Verify with Google:")
    print("  cd backend && source .venv/bin/activate && pytest tests/ -v -m integration\n")
    if warnings:
        print("Warnings (not blocking):\n")
        for w in warnings:
            print(f"  • {w}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
