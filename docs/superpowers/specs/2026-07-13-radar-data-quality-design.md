# Reddit Radar Data Quality Repair

## Goal

Repair the existing Radar data in place and prevent the same four quality
problems from recurring: legacy test data, content duplicates, invalid Reddit
URLs, and misleading Metrics labels.

## Scope

The repair preserves genuine opportunities and the existing five-sheet
workflow. It does not change scoring thresholds, add AI classification, or
modify Gmail/F5Bot subscriptions.

## Runtime Changes

### URL validation

Every parsed URL is normalized with `RadarCore.normalizeRedditUrl` before it is
used as an ID, written to Sheets, or included in a notification. A parsed item
without a valid Reddit URL is recorded as an error and never becomes an
opportunity.

### Content deduplication

Exact URL remains the primary duplicate key. A second content key uses the
normalized author and title when both are present. This catches the same author
cross-posting or reposting the same title while avoiding collisions between
different users who use generic titles such as "Should I grade this?".

When an incoming content key already exists, the item is recorded as a
duplicate and is not written to `Opportunities` or included in a high-priority
email.

### Metrics terminology

The Metrics headers are migrated to describe what is actually counted:

- `processed_items`: rows written to `Processed`, including created,
  duplicate, ignored, and error items.
- `created_opportunities`: processed rows whose result is `created`.
- `high_priority_opportunities`: high-priority rows currently present in
  `Opportunities`.
- `duplicate_items`, `ignored_items`, `replied_opportunities`, and
  `average_review_minutes` retain their literal meanings.

## In-place Repair

An idempotent `repairRadarDataQuality()` administration function performs one
transaction-like reconciliation:

1. Remove test and demo opportunity rows identified by placeholder URLs or
   `[TEST]` / `[DEMO]` titles.
2. Normalize every remaining URL and remove rows that still have no valid
   Reddit URL.
3. Re-score every remaining opportunity with the current enabled rules.
4. Deduplicate same-author, same-title rows, keeping the highest-scoring row;
   ties keep the earliest row in the source data.
5. Reconcile matching `Processed` rows: delete test/demo audit rows, mark
   removed invalid rows as `ignored`, and mark removed content duplicates as
   `duplicate` with the retained opportunity ID in the reason.
6. Migrate Metrics headers and rebuild Metrics from the reconciled sheets.

The function rewrites only data rows in `Opportunities` and `Processed`. It
keeps headers, formatting, data validation, conditional formatting, and manual
workflow fields on retained opportunities.

## Safety Rules

- A duplicate is removed only when both normalized author and title match.
- Rows with a blank author are not content-deduplicated automatically.
- Test/demo detection uses explicit markers, not dates.
- The repair can be run repeatedly with the same result.
- Existing unrecognized rows are preserved unless their URL is invalid.

## Verification

Automated tests cover content keys, URL gating, schema headers, and repair-plan
classification. After deployment, verification compares row counts before and
after repair, confirms every opportunity URL is valid, confirms no duplicate
content keys remain, and reconciles Metrics totals against the two source
sheets.
