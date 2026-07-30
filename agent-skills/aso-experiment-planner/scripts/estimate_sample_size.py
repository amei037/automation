#!/usr/bin/env python3
"""Estimate two-proportion sample size for planning, not platform adjudication."""

from __future__ import annotations

import argparse
import json
import math
from statistics import NormalDist


def probability(value: str) -> float:
    parsed = float(value)
    if not 0 < parsed < 1:
        raise argparse.ArgumentTypeError("value must be between 0 and 1")
    return parsed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", required=True, type=probability)
    effect = parser.add_mutually_exclusive_group(required=True)
    effect.add_argument("--relative-mde", type=probability)
    effect.add_argument("--absolute-mde", type=probability)
    parser.add_argument("--confidence", type=probability, default=0.95)
    parser.add_argument("--power", type=probability, default=0.80)
    parser.add_argument("--variants", type=int, default=2)
    parser.add_argument("--daily-eligible-impressions", type=float)
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args()

    if args.variants < 2:
        raise SystemExit("--variants must be at least 2")
    if args.daily_eligible_impressions is not None and args.daily_eligible_impressions <= 0:
        raise SystemExit("--daily-eligible-impressions must be positive")

    p1 = args.baseline
    absolute_mde = args.absolute_mde if args.absolute_mde is not None else p1 * args.relative_mde
    p2 = p1 + absolute_mde
    if p2 >= 1:
        raise SystemExit("baseline plus MDE must be less than 1")

    alpha = 1 - args.confidence
    z_alpha = NormalDist().inv_cdf(1 - alpha / 2)
    z_power = NormalDist().inv_cdf(args.power)
    pooled = (p1 + p2) / 2
    numerator = (
        z_alpha * math.sqrt(2 * pooled * (1 - pooled))
        + z_power * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))
    ) ** 2
    per_variant = math.ceil(numerator / (absolute_mde**2))
    total = per_variant * args.variants
    duration_days = (
        math.ceil(total / args.daily_eligible_impressions)
        if args.daily_eligible_impressions is not None
        else None
    )

    result = {
        "baseline_conversion": p1,
        "treatment_conversion_at_mde": p2,
        "absolute_mde": absolute_mde,
        "relative_mde": absolute_mde / p1,
        "confidence": args.confidence,
        "power": args.power,
        "variants": args.variants,
        "sample_per_variant": per_variant,
        "total_sample": total,
        "estimated_days": duration_days,
        "assumptions": [
            "Independent equal-allocation groups.",
            "Two-sided normal approximation for two proportions.",
            "Eligible impressions are stable and map to the tested population.",
            "Use the platform's own statistical reporting for the final decision.",
        ],
    }
    print(json.dumps(result, indent=2 if args.pretty else None))


if __name__ == "__main__":
    main()
