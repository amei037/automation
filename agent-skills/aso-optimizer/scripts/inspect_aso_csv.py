#!/usr/bin/env python3
"""Inspect ASO CSV exports without modifying source files."""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import math
import statistics
import unicodedata
from collections import Counter
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
    "bidding_apps": ("竞价app数", "bidding apps", "advertiser count"),
    "bidding_share": ("竞价占比", "bidding share", "ad share"),
    "market": ("市场", "国家", "country", "market", "storefront"),
    "date": ("日期", "date", "as of", "as_of", "export date"),
}


def normalize_text(value: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", value).strip().lower().split())


def decode_csv(path: Path) -> tuple[str, str]:
    raw = path.read_bytes()
    for encoding in ENCODINGS:
        try:
            return raw.decode(encoding), encoding
        except UnicodeDecodeError:
            continue
    raise ValueError(f"Unable to decode {path.name} with supported encodings")


def detect_delimiter(text: str) -> str:
    sample = text[:8192]
    try:
        return csv.Sniffer().sniff(sample, delimiters=",;\t|").delimiter
    except csv.Error:
        return ","


def canonical_columns(headers: list[str]) -> dict[str, str]:
    normalized = {normalize_text(header): header for header in headers}
    result: dict[str, str] = {}
    for canonical, aliases in ALIASES.items():
        for alias in aliases:
            exact = normalized.get(normalize_text(alias))
            if exact:
                result[canonical] = exact
                break
    return result


def numeric_value(value: Any) -> float | None:
    text = str(value or "").strip().replace(",", "")
    if not text or text in {"—", "-", "落榜", "新进榜"}:
        return None
    if text.endswith("%"):
        text = text[:-1]
    try:
        number = float(text)
    except ValueError:
        return None
    return number if math.isfinite(number) else None


def inspect(path: Path) -> dict[str, Any]:
    text, encoding = decode_csv(path)
    delimiter = detect_delimiter(text)
    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    headers = [str(value or "").strip() for value in (reader.fieldnames or [])]
    rows = list(reader)
    mapped = canonical_columns(headers)

    missing: dict[str, dict[str, float | int]] = {}
    numeric: dict[str, dict[str, float | int]] = {}
    for header in headers:
        values = [str(row.get(header) or "").strip() for row in rows]
        missing_count = sum(not value for value in values)
        missing[header] = {
            "count": missing_count,
            "rate": round(missing_count / len(rows), 4) if rows else 0,
        }
        numbers = [number for value in values if (number := numeric_value(value)) is not None]
        nonblank = sum(bool(value) for value in values)
        if numbers and len(numbers) / max(nonblank, 1) >= 0.8:
            numeric[header] = {
                "count": len(numbers),
                "min": min(numbers),
                "max": max(numbers),
                "mean": round(statistics.fmean(numbers), 4),
            }

    keyword_header = mapped.get("keyword")
    keyword_counts: Counter[str] = Counter()
    if keyword_header:
        keyword_counts.update(
            normalize_text(str(row.get(keyword_header) or ""))
            for row in rows
            if str(row.get(keyword_header) or "").strip()
        )

    warnings: list[str] = []
    if not headers:
        warnings.append("No header row detected.")
    if not keyword_header:
        warnings.append("No recognized keyword/search-term column detected.")
    if "market" not in mapped:
        warnings.append("Market/storefront is not encoded in a recognized column; capture it as provenance.")
    if "date" not in mapped:
        warnings.append("Observation/export date is not encoded in a recognized column; capture it as provenance.")
    if keyword_counts and len(keyword_counts) < sum(keyword_counts.values()):
        warnings.append("Duplicate normalized keywords exist; preserve rows and resolve duplicates explicitly.")

    return {
        "file": str(path),
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "bytes": path.stat().st_size,
        "encoding": encoding,
        "delimiter": delimiter,
        "rows": len(rows),
        "headers": headers,
        "canonical_columns": mapped,
        "missing": missing,
        "numeric_summary": numeric,
        "keywords": {
            "nonblank": sum(keyword_counts.values()),
            "unique_normalized": len(keyword_counts),
            "duplicate_rows": sum(keyword_counts.values()) - len(keyword_counts),
        }
        if keyword_header
        else None,
        "warnings": warnings,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("files", nargs="+", type=Path)
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args()

    results = []
    for path in args.files:
        if not path.is_file():
            raise SystemExit(f"File not found: {path}")
        results.append(inspect(path))
    print(json.dumps(results, ensure_ascii=False, indent=2 if args.pretty else None))


if __name__ == "__main__":
    main()
