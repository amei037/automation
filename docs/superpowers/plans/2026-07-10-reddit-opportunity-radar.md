# Reddit Opportunity Radar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-cost Gmail-to-Google-Sheets Reddit opportunity radar for F5Bot alerts.

**Architecture:** Keep parsing and scoring in an Apps Script-compatible pure core so Node can test it without Google credentials. Keep Gmail, Sheets, email, labels, metrics, and trigger operations in a separate Google integration file.

**Tech Stack:** Google Apps Script V8, JavaScript ES2019-compatible syntax, Node.js built-in `node:test`, no runtime dependencies.

## Global Constraints

- No AI or LLM calls.
- No Reddit API access, scraping, posting, voting, or messaging.
- Gmail source label defaults to `reddit-radar`.
- Process at most 50 messages from the last seven days per run.
- Trigger interval is 10 minutes.
- Scores are clamped to 0-100; high is 70+, medium is 50-69, low is 1-49.
- Google-hosted Gmail access requires a user-run authorization smoke test.

---

### Task 1: Pure Alert Parsing And Scoring Core

**Files:**
- Create: `apps-script/Core.gs`
- Create: `test/core.test.js`
- Create: `test/fixtures.js`
- Create: `package.json`

**Interfaces:**
- Produces: `RadarCore.normalizeRedditUrl(url) -> string`
- Produces: `RadarCore.parseF5BotAlert(input) -> Alert`
- Produces: `RadarCore.matchRule(text, rule) -> boolean`
- Produces: `RadarCore.scoreOpportunity(alert, rules, thresholds) -> ScoredAlert`
- Produces: `RadarCore.makeStableId(messageId, normalizedUrl) -> string`

- [ ] **Step 1: Write failing Node tests for URL normalization and F5Bot parsing**

```js
test('normalizes tracking variants to one Reddit URL', () => {
  assert.equal(
    core.normalizeRedditUrl('https://old.reddit.com/r/PokemonTCG/comments/abc/card/?utm_source=x#top'),
    'https://www.reddit.com/r/PokemonTCG/comments/abc/card'
  );
});

test('extracts post fields from an F5Bot alert', () => {
  const parsed = core.parseF5BotAlert(fixtures.grading);
  assert.equal(parsed.subreddit, 'PokemonTCG');
  assert.equal(parsed.url, 'https://www.reddit.com/r/PokemonTCG/comments/abc123/should_i_grade_this');
});
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node --test test/core.test.js`

Expected: FAIL because `apps-script/Core.gs` does not exist or exports no functions.

- [ ] **Step 3: Implement parsing, normalization, safe regex matching, scoring, and stable IDs**

`Core.gs` exposes one global `RadarCore` object and conditionally exports it for
Node. The parser returns the exact shape below; the scorer preserves those fields
and adds the exact scoring fields below.

```js
const parsedAlert = {
  messageId: 'gmail-message-id',
  sourceTime: new Date('2026-07-10T00:00:00Z'),
  title: 'Should I grade this?',
  excerpt: 'The card has clean corners and good centering.',
  subreddit: 'PokemonTCG',
  author: 'collector',
  url: 'https://www.reddit.com/r/PokemonTCG/comments/abc123/should_i_grade_this'
};

const scoredAlert = {
  ...parsedAlert,
  score: 90,
  intent: 'grading',
  matchedRules: ['grading-decision', 'condition-centering', 'target-pokemontcg'],
  priority: 'high'
};
```

URL normalization accepts only `reddit.com` subdomains and `redd.it`, canonicalizes
Reddit subdomains to `www.reddit.com`, removes query/fragment/trailing slash, and
returns an empty string for invalid or non-Reddit input. Stable IDs hash the
normalized URL when present and otherwise hash the Gmail message ID.

- [ ] **Step 4: Run all core tests**

Run: `npm test`

Expected: all parsing, normalization, malformed-email, scoring, and deduplication tests pass.

- [ ] **Step 5: Commit the pure core**

```bash
git add package.json apps-script/Core.gs test/core.test.js test/fixtures.js
git commit -m "add tested reddit alert core"
```

### Task 2: Spreadsheet Setup And Configuration

**Files:**
- Create: `apps-script/Code.gs`
- Create: `apps-script/appsscript.json`
- Extend: `test/core.test.js`

**Interfaces:**
- Consumes: `RadarCore` from Task 1.
- Produces: `setupRadar() -> void`
- Produces: `loadSettings_() -> Object`
- Produces: `loadRules_() -> Rule[]`
- Produces: `runDemo() -> void`

- [ ] **Step 1: Extend tests with exact sheet headers, settings, and seed rule fixtures**

```js
test('seed rules classify all five configured F5Bot phrases', () => {
  for (const phrase of ['card value', 'centering', 'psa grade', 'should i grade', 'worth grading']) {
    assert.ok(core.scoreOpportunity({ title: phrase, excerpt: '', subreddit: 'PokemonTCG' }, fixtures.rules, fixtures.thresholds).score > 0);
  }
});
```

- [ ] **Step 2: Run tests and confirm the new seed-rule assertion fails**

Run: `npm test`

Expected: FAIL until fixture rules match the production seeds.

- [ ] **Step 3: Implement sheet creation, formatting, settings validation, rules, and demo rows**

`setupRadar()` creates `Opportunities`, `Keywords`, `Processed`, `Metrics`, and
`Settings`, freezes header rows, installs validations and conditional formatting,
and writes idempotent defaults. `runDemo()` scores embedded fixtures and appends
only non-duplicate demo opportunities.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 5: Commit spreadsheet setup**

```bash
git add apps-script/Code.gs apps-script/appsscript.json test/core.test.js test/fixtures.js
git commit -m "add sheets setup and demo"
```

### Task 3: Gmail Processing, Notifications, And Metrics

**Files:**
- Modify: `apps-script/Code.gs`
- Extend: `test/core.test.js`

**Interfaces:**
- Consumes: setup sheets, settings, and rules from Task 2.
- Produces: `processF5BotAlerts() -> void`
- Produces: `installTenMinuteTrigger() -> void`
- Produces: `removeRadarTriggers() -> void`
- Produces: `refreshMetrics() -> void`

- [ ] **Step 1: Add tests for duplicate keys, score boundaries, and HTML-safe summary data**

```js
test('uses the normalized URL as the primary duplicate key', () => {
  assert.equal(
    core.makeStableId('one', 'https://www.reddit.com/r/x/comments/1/post'),
    core.makeStableId('two', 'https://www.reddit.com/r/x/comments/1/post')
  );
});
```

- [ ] **Step 2: Run tests and verify the new boundary tests fail if behavior is missing**

Run: `npm test`

Expected: FAIL before the required core adjustments.

- [ ] **Step 3: Implement bounded Gmail processing and summary notification**

`processF5BotAlerts()` acquires `LockService`, searches unread source-label messages
while excluding the error label, parses and deduplicates each message, appends rows
in batches, labels/marks successful messages, records malformed messages as errors,
refreshes daily metrics, sorts opportunities, and sends one high-priority summary.

- [ ] **Step 4: Implement idempotent trigger management**

`installTenMinuteTrigger()` removes existing triggers for `processF5BotAlerts` and
creates exactly one `everyMinutes(10)` trigger. `removeRadarTriggers()` removes only
triggers owned by this project for that handler.

- [ ] **Step 5: Run all tests and static syntax checks**

Run: `npm test`

Expected: PASS with no failures.

- [ ] **Step 6: Commit Gmail automation**

```bash
git add apps-script/Core.gs apps-script/Code.gs test/core.test.js
git commit -m "add gmail alert automation"
```

### Task 4: Chinese Setup Guide And Handoff Verification

**Files:**
- Modify: `README.md`
- Create: `docs/SETUP_ZH.md`
- Create: `.gitignore`

**Interfaces:**
- Consumes: public Apps Script functions from Tasks 2-3.
- Produces: copy/paste installation, authorization, Gmail filter, demo, trigger,
  troubleshooting, and three-day trial instructions.

- [ ] **Step 1: Write exact setup instructions**

Document creation of a Google Sheet, Apps Script files, the manifest, Gmail labels,
the F5Bot sender filter, first authorization via `setupRadar`, `runDemo`, live Gmail
smoke test, `installTenMinuteTrigger`, and how to inspect execution failures.

- [ ] **Step 2: Document privacy and operational boundaries**

State that the Sheet must remain private, the script reads only source-labeled
messages, no Reddit credentials are used, and all Reddit replies remain manual.

- [ ] **Step 3: Run repository verification**

Run: `npm test`

Expected: all tests pass.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 4: Commit documentation**

```bash
git add README.md docs/SETUP_ZH.md .gitignore docs/superpowers
git commit -m "document reddit radar setup"
```
