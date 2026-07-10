# Reddit Opportunity Radar Design

## Goal

Build a zero-cost prototype that turns F5Bot Gmail alerts into a deduplicated,
ranked Google Sheets queue for DEDC Lab.

## Scope

Included:

- Read unread F5Bot alerts carrying the Gmail label `reddit-radar`.
- Extract Reddit URL, title, excerpt, subreddit, author, and alert time.
- Score posts with deterministic rules stored in Google Sheets.
- Deduplicate by normalized Reddit URL and Gmail message ID.
- Record opportunities, processing history, settings, and daily metrics.
- Send one summary email per run when new high-priority posts exist.
- Provide a fixture demo and a 10-minute Apps Script trigger installer.

Excluded:

- AI or LLM calls.
- Direct Reddit API access or scraping.
- Automatic Reddit posting, voting, or messaging.
- KOL discovery.
- Automatic card grading or valuation advice.

## Architecture

```text
F5Bot -> Gmail label -> Apps Script -> parse -> deduplicate -> score
                                                      |          |
                                                      v          v
                                                Google Sheets  email alert
```

`apps-script/Core.gs` contains pure parsing, normalization, matching, scoring,
and deduplication helpers. `apps-script/Code.gs` contains Google service calls,
sheet setup, Gmail processing, notifications, metrics, and triggers.

## Sheets

- `Opportunities`: normalized post data, intent, score, priority, workflow status.
- `Keywords`: editable positive and negative matching rules.
- `Processed`: append-only Gmail/message audit and deduplication keys.
- `Metrics`: daily scanned, unique, high-priority, duplicate, ignored, and replied counts.
- `Settings`: notification recipient, Gmail labels, batch limits, and score thresholds.

## Scoring

- Explicit grading decision phrase: +40.
- Condition inspection term: +20.
- Value or raw-versus-graded term: +15.
- Target subreddit: +20.
- Explicit question wording: +10.
- Marketplace-only listing: -40.
- Generic promotion, hiring, or spam: -50.

Scores are clamped to 0-100. High is 70+, medium is 50-69, low is 1-49,
and zero is ignored. Category ties resolve as grading, condition, value, other.

## Gmail Behavior

The script processes at most 50 unread messages from the source label received
within the last seven days. Successful or duplicate messages are labeled
`reddit-radar-processed` and marked read. Invalid messages receive
`reddit-radar-error`, stay unread, and are excluded from subsequent searches.

The free F5Bot configuration currently monitors these post-only phrases:
`card value`, `centering`, `psa grade`, `should i grade`, and `worth grading`.

## Safety And Reliability

- Hold a script lock to prevent overlapping trigger runs.
- Bound Gmail batches and write Sheet rows in batches.
- Treat message content as untrusted text.
- Never request or store Reddit credentials.
- Never publish the spreadsheet publicly.
- Do not generate or publish Reddit replies.

## Verification

Node's built-in test runner executes the pure Apps Script-compatible core with
fixtures covering grading, condition, value, marketplace noise, duplicate URLs,
tracking parameters, malformed messages, and priority thresholds. The user then
runs one Gmail smoke test after authorizing the script in Google Sheets.

## Success Criteria

During a three-day trial:

- No unhandled scheduled-job error.
- No duplicate Reddit URL in `Opportunities`.
- Alerts appear within 15 minutes under normal trigger timing.
- At least five opportunities are judged relevant by a human.
- Metrics demonstrate discovery volume and review status to management.
