#!/usr/bin/env python3
"""Compare compatible keyword exports without assigning product relevance."""

from __future__ import annotations

import argparse
import csv
import io
import json
import math
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


ENCODINGS = ("utf-8-sig", "utf-8", "gb18030", "utf-16")
ALIASES = {
    "keyword": ("关键词", "keyword", "search term", "search_term", "query"),
    "rank": ("排名", "搜索自然排名", "rank", "current rank", "position"),
    "rank_change": ("排名变动", "rank change", "rank_change", "change"),
    "popularity": ("流行度", "popularity", "search popularity"),
    "index": ("指数", "index", "search index"),
    "results": ("结果数", "result count", "results"),
}


def normalize(value: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", value).strip().lower().split())


def decode(path: Path) -> str:
    raw = path.read_bytes()
    for encoding in ENCODINGS:
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError(f"Unable to decode {path.name}")


def delimiter(text: str) -> str:
    try:
        return csv.Sniffer().sniff(text[:8192], delimiters=",;\t|").delimiter
    except csv.Error:
        return ","


def map_columns(headers: list[str]) -> dict[str, str]:
    normalized = {normalize(header): header for header in headers}
    mapped: dict[str, str] = {}
    for canonical, aliases in ALIASES.items():
        for alias in aliases:
            if normalize(alias) in normalized:
                mapped[canonical] = normalized[normalize(alias)]
                break
    return mapped


def number(value: Any) -> float | None:
    text = str(value or "").strip().replace(",", "")
    if not text or text in {"—", "-", "落榜", "新进榜"}:
        return None
    if text.endswith("%"):
        text = text[:-1]
    try:
        parsed = float(text)
    except ValueError:
        return None
    return parsed if math.isfinite(parsed) else None


def load(path: Path) -> tuple[dict[str, dict[str, Any]], int]:
    text = decode(path)
    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter(text))
    headers = [str(value or "").strip() for value in (reader.fieldnames or [])]
    mapped = map_columns(headers)
    if "keyword" not in mapped:
        raise ValueError(f"{path.name}: no recognized keyword column")

    by_keyword: dict[str, dict[str, Any]] = {}
    duplicates = 0
    for row_number, row in enumerate(reader, start=2):
        raw_keyword = str(row.get(mapped["keyword"]) or "").strip()
        key = normalize(raw_keyword)
        if not key:
            continue
        observation = {
            "raw_keyword": raw_keyword,
            "row": row_number,
            "rank": number(row.get(mapped.get("rank", ""))),
            "rank_change_raw": str(row.get(mapped.get("rank_change", "")) or "").strip() or None,
            "popularity": number(row.get(mapped.get("popularity", ""))),
            "index": number(row.get(mapped.get("index", ""))),
            "results": number(row.get(mapped.get("results", ""))),
        }
        if key in by_keyword:
            duplicates += 1
            previous_rank = by_keyword[key].get("rank")
            current_rank = observation.get("rank")
            if current_rank is not None and (previous_rank is None or current_rank < previous_rank):
                by_keyword[key] = observation
        else:
            by_keyword[key] = observation
    return by_keyword, duplicates


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("files", nargs="+", type=Path)
    parser.add_argument("--min-sources", type=int, default=1)
    parser.add_argument("--limit", type=int, default=200)
    parser.add_argument("--contains", default=None)
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args()
    if args.min_sources < 1 or args.limit < 1:
        raise SystemExit("--min-sources and --limit must be positive")

    sources: dict[str, dict[str, dict[str, Any]]] = {}
    duplicate_counts: dict[str, int] = {}
    for path in args.files:
        if not path.is_file():
            raise SystemExit(f"File not found: {path}")
        label = path.stem
        observations, duplicates = load(path)
        sources[label] = observations
        duplicate_counts[label] = duplicates

    combined: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for source, observations in sources.items():
        for keyword, observation in observations.items():
            combined[keyword].append({"source": source, **observation})

    overlap = Counter(len(observations) for observations in combined.values())
    candidates = []
    contains = normalize(args.contains) if args.contains else None
    for keyword, observations in combined.items():
        if len(observations) < args.min_sources:
            continue
        if contains and contains not in keyword:
            continue
        ranks = [item["rank"] for item in observations if item["rank"] is not None]
        popularity = [item["popularity"] for item in observations if item["popularity"] is not None]
        indexes = [item["index"] for item in observations if item["index"] is not None]
        candidates.append(
            {
                "keyword": keyword,
                "source_count": len(observations),
                "best_rank": min(ranks) if ranks else None,
                "provider_popularity_values": sorted(set(popularity)),
                "provider_index_values": sorted(set(indexes)),
                "flags": {
                    "numeric_only": keyword.isdigit(),
                    "zero_provider_signal": bool(popularity or indexes)
                    and max(popularity or [0]) == 0
                    and max(indexes or [0]) == 0,
                },
                "observations": observations,
            }
        )

    candidates.sort(
        key=lambda item: (
            -item["source_count"],
            item["flags"]["numeric_only"],
            -max(item["provider_popularity_values"] or [0]),
            item["best_rank"] if item["best_rank"] is not None else math.inf,
            item["keyword"],
        )
    )
    result = {
        "sources": [
            {
                "source": source,
                "unique_keywords": len(observations),
                "duplicate_rows_resolved_to_best_rank": duplicate_counts[source],
            }
            for source, observations in sources.items()
        ],
        "unique_keywords_across_sources": len(combined),
        "overlap_histogram": dict(sorted(overlap.items())),
        "filters": {
            "min_sources": args.min_sources,
            "contains": args.contains,
            "limit": args.limit,
        },
        "notice": "No relevance or opportunity score is calculated. Apply verified product fit and intent separately.",
        "candidates": candidates[: args.limit],
        "truncated": len(candidates) > args.limit,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2 if args.pretty else None))


if __name__ == "__main__":
    main()
