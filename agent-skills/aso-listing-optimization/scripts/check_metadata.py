#!/usr/bin/env python3
"""Validate Apple or Google store metadata from a JSON input file."""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any


LIMITS = {
    "apple": {
        "name": ("characters", 30),
        "subtitle": ("characters", 30),
        "keywords": ("utf8_bytes", 100),
        "promotional_text": ("characters", 170),
        "description": ("characters", 4000),
    },
    "google": {
        "app_name": ("characters", 30),
        "short_description": ("characters", 80),
        "full_description": ("characters", 4000),
    },
}
ALIASES = {
    "apple": {"title": "name", "keyword_field": "keywords", "promo_text": "promotional_text"},
    "google": {"title": "app_name", "name": "app_name", "short_desc": "short_description", "description": "full_description"},
}
CLAIM_PATTERNS = {
    "superlative": re.compile(r"(?:\bbest\b|\bmost accurate\b|\bfastest\b|\bnumber\s*one\b|#1)", re.I),
    "official_or_affiliation": re.compile(r"\b(official|endorsed by|certified by|partner of)\b", re.I),
    "guarantee": re.compile(r"\b(guarantee|guaranteed|risk[- ]free)\b", re.I),
    "promotional": re.compile(r"\b(free|discount|sale|no ads)\b", re.I),
}


def normalize_field(platform: str, field: str) -> str:
    key = field.strip().lower()
    return ALIASES[platform].get(key, key)


def tokens(value: str) -> list[str]:
    normalized = unicodedata.normalize("NFKC", value).lower()
    return re.findall(r"[^\W_]+", normalized, flags=re.UNICODE)


def load_input(path: Path) -> tuple[str, dict[str, str], list[str]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    platform = str(payload.get("platform") or "").strip().lower()
    if platform not in LIMITS:
        raise ValueError("platform must be 'apple' or 'google'")
    raw_fields = payload.get("fields")
    if not isinstance(raw_fields, dict):
        raise ValueError("fields must be an object")
    fields = {
        normalize_field(platform, str(key)): str(value or "")
        for key, value in raw_fields.items()
    }
    approved_claims = [str(value).strip().lower() for value in payload.get("approved_claims", [])]
    return platform, fields, approved_claims


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args()

    platform, fields, approved_claims = load_input(args.input)
    errors: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []
    metrics: dict[str, dict[str, Any]] = {}

    for field, value in fields.items():
        if field not in LIMITS[platform]:
            warnings.append({"field": field, "code": "unknown_field", "message": "Field is not validated."})
            continue
        unit, limit = LIMITS[platform][field]
        character_count = len(value)
        byte_count = len(value.encode("utf-8"))
        used = byte_count if unit == "utf8_bytes" else character_count
        metrics[field] = {
            "characters": character_count,
            "utf8_bytes": byte_count,
            "limit": limit,
            "limit_unit": unit,
            "within_limit": used <= limit,
        }
        if used > limit:
            errors.append(
                {
                    "field": field,
                    "code": "limit_exceeded",
                    "message": f"{used} {unit} exceeds limit {limit}.",
                }
            )

    searchable = (
        ("name", "subtitle", "keywords")
        if platform == "apple"
        else ("app_name", "short_description", "full_description")
    )
    appearances: dict[str, set[str]] = defaultdict(set)
    for field in searchable:
        value = fields.get(field, "")
        for token in tokens(value.replace(",", " ")):
            appearances[token].add(field)
    duplicates = {
        token: sorted(locations)
        for token, locations in appearances.items()
        if len(locations) > 1
    }
    if platform == "apple" and duplicates:
        warnings.append(
            {
                "field": "searchable_fields",
                "code": "duplicate_tokens",
                "message": "Review repeated tokens across Apple searchable fields.",
                "details": duplicates,
            }
        )

    for field, value in fields.items():
        lowered = value.lower()
        for claim_type, pattern in CLAIM_PATTERNS.items():
            matches = sorted(set(match.group(0) for match in pattern.finditer(value)))
            unapproved = [match for match in matches if match.lower() not in approved_claims]
            if unapproved:
                warnings.append(
                    {
                        "field": field,
                        "code": f"claim_review_{claim_type}",
                        "message": "Human evidence/policy review required.",
                        "matches": unapproved,
                    }
                )
        if platform == "google" and field == "app_name" and CLAIM_PATTERNS["promotional"].search(lowered):
            warnings.append(
                {
                    "field": field,
                    "code": "google_title_promotional_language",
                    "message": "Google policy review required for promotional language in the app name.",
                }
            )

    result = {
        "platform": platform,
        "valid": not errors,
        "metrics": metrics,
        "errors": errors,
        "warnings": warnings,
        "notice": "Warnings require human review; the validator does not determine legal truth.",
    }
    print(json.dumps(result, ensure_ascii=False, indent=2 if args.pretty else None))
    raise SystemExit(0 if not errors else 2)


if __name__ == "__main__":
    main()
