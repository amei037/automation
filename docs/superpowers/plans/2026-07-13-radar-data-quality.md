# Reddit Radar Data Quality Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean the live Radar data in place and prevent legacy rows, content duplicates, invalid Reddit URLs, and misleading Metrics labels from recurring.

**Architecture:** Add small pure data-quality helpers to `RadarCore`, use them in the Gmail processing path, and expose one idempotent Apps Script repair function for existing rows. Keep the five-sheet structure and current scoring thresholds unchanged.

**Tech Stack:** Google Apps Script, JavaScript compatible with Apps Script V8, Node.js built-in test runner, clasp.

## Global Constraints

- Preserve genuine opportunity rows and all manual workflow fields on retained rows.
- Deduplicate content only when both normalized author and title match.
- Reject invalid Reddit URLs before writing opportunities or notifications.
- Do not change scoring thresholds or add model/API dependencies.
- The repair function must be safe to run more than once.

---

### Task 1: Pure Data-quality Helpers

**Files:**
- Modify: `test/core.test.js`
- Modify: `apps-script/Core.gs`

**Interfaces:**
- Produces: `RadarCore.makeContentKey(source) -> string`
- Produces: `RadarCore.isTestOrDemoOpportunity(source) -> boolean`
- Extends: `RadarCore.buildDedupIndex(processedRows, opportunityRows)` with `contentKeys`

- [x] **Step 1: Write failing tests**

Add tests proving that identical normalized author/title values produce one
content key, different authors do not collide, blank authors produce no key,
test/demo markers are detected, and the dedup index contains existing content
keys.

- [x] **Step 2: Run tests and verify RED**

Run: `npm test`

Expected: FAIL because `makeContentKey` and `isTestOrDemoOpportunity` are not exported and `contentKeys` is absent.

- [x] **Step 3: Implement minimal helpers**

Normalize identity text with lowercase text, collapsed whitespace, and removed
punctuation. Build content keys only from non-empty author and title. Detect
`[TEST]`, `[DEMO]`, `test-placeholder`, `demo-placeholder`, and legacy
`/comments/demo1|demo2/` markers. Populate `contentKeys` from opportunity
columns `author` (E), `title` (F), and `id` (A).

- [x] **Step 4: Run tests and verify GREEN**

Run: `npm test`

Expected: all tests pass.

---

### Task 2: Runtime URL Gate and Content Deduplication

**Files:**
- Modify: `test/core.test.js`
- Modify: `apps-script/Code.gs`

**Interfaces:**
- Produces: `prepareParsedAlert_(parsed) -> normalized alert | null`
- Consumes: `RadarCore.makeContentKey(alert)` and `index.contentKeys`

- [x] **Step 1: Write failing integration tests**

Expose `prepareParsedAlert_` through the existing VM test harness. Assert that
a Reddit URL is canonicalized and a title-shaped non-URL is rejected.

- [x] **Step 2: Run tests and verify RED**

Run: `npm test`

Expected: FAIL because `prepareParsedAlert_` does not exist.

- [x] **Step 3: Implement URL gating and duplicate checks**

Normalize every parsed URL before ID creation. Record invalid items as errors.
After exact ID/URL checks, check the content key; record matches as duplicate
with the retained opportunity ID. Add accepted content keys to the in-memory
index so duplicates in the same email batch are also blocked.

- [x] **Step 4: Run tests and verify GREEN**

Run: `npm test`

Expected: all tests pass.

---

### Task 3: Metrics Schema and Idempotent Repair

**Files:**
- Modify: `test/core.test.js`
- Modify: `apps-script/Core.gs`
- Modify: `apps-script/Code.gs`

**Interfaces:**
- Produces: `repairRadarDataQuality()` Apps Script administration function
- Produces: `migrateMetricsHeaders_()`
- Changes Metrics headers to `date`, `processed_items`,
  `created_opportunities`, `high_priority_opportunities`, `duplicate_items`,
  `ignored_items`, `replied_opportunities`, `average_review_minutes`

- [x] **Step 1: Update schema tests and verify RED**

Assert the exact new Metrics headers.

Run: `npm test`

Expected: FAIL because the current schema still uses the old labels.

- [x] **Step 2: Implement header migration**

Allow `setupRadar()` to migrate the exact legacy Metrics header row before
normal header validation. Reject unknown header shapes.

- [x] **Step 3: Implement `repairRadarDataQuality()`**

Read both source sheets, remove explicit test/demo rows, normalize URLs,
re-score retained rows, and select the highest-scoring row for each content
key. Reconcile matching Processed rows by deleting test/demo audits, marking
invalid rows ignored, and marking removed content duplicates duplicate. Rewrite
only data rows, restore opportunity configuration, sort, and refresh Metrics.

- [x] **Step 4: Verify idempotence in pure tests and run full suite**

Run: `npm test`

Expected: all tests pass and a second reconciliation produces the same rows.

---

### Task 4: Deploy and Verify Live Data

**Files:**
- Modify: live Google Apps Script project
- Modify: live `DEDC Reddit Radar` Google Sheet data rows

**Interfaces:**
- Consumes: `repairRadarDataQuality()`
- Produces: reconciled `Opportunities`, `Processed`, and `Metrics`

- [x] **Step 1: Run local verification**

Run: `npm test && git diff --check`

Expected: all tests pass and no whitespace errors.

- [x] **Step 2: Push Apps Script source**

Run: `npx clasp push`

Expected: `Code.gs`, `Core.gs`, and `appsscript.json` upload successfully.

- [x] **Step 3: Execute repair once**

Run `repairRadarDataQuality()` in the Apps Script editor and confirm successful
completion.

- [x] **Step 4: Inspect live sheets**

Confirm that no test/demo or invalid URL rows remain, no duplicate non-empty
content keys remain, current-rule scores match stored scores, and Metrics
headers/totals reconcile to source rows.

- [x] **Step 5: Run the repair a second time**

Confirm row counts and values do not change, proving idempotence.
