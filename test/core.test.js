'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../apps-script/Core.gs');
const fixtures = require('./fixtures');

const integrationSandbox = { module: { exports: {} }, RadarCore: core };
const integrationSource = fs.readFileSync(require.resolve('../apps-script/Code.gs'), 'utf8');
vm.runInNewContext(
  `${integrationSource}\nmodule.exports = {
    getDemoFixtures: getDemoFixtures_,
    prepareParsedAlert: typeof prepareParsedAlert_ === 'function' ? prepareParsedAlert_ : undefined,
    repairRadarDataQuality: typeof repairRadarDataQuality === 'function' ? repairRadarDataQuality : undefined,
    migrateMetricsHeaders: typeof migrateMetricsHeaders_ === 'function' ? migrateMetricsHeaders_ : undefined
  };`,
  integrationSandbox
);
const integration = integrationSandbox.module.exports;

test('marks demo fixtures clearly and never links to a real Reddit post', () => {
  const demoFixtures = integration.getDemoFixtures();

  for (const fixture of demoFixtures) {
    assert.match(core.parseF5BotAlert(fixture).title, /^\[DEMO\]/);
    assert.match(fixture.body, /\/comments\/demo-placeholder-\d+\//);
  }
});

test('normalizes Reddit subdomains and removes tracking data', () => {
  assert.equal(
    core.normalizeRedditUrl('https://old.reddit.com/r/PokemonTCG/comments/abc/card/?utm_source=x#top'),
    'https://www.reddit.com/r/PokemonTCG/comments/abc/card'
  );
});

test('preserves redd.it short links and rejects non-Reddit URLs', () => {
  assert.equal(core.normalizeRedditUrl('https://redd.it/abc123/?share_id=x'), 'https://redd.it/abc123');
  assert.equal(core.normalizeRedditUrl('https://example.com/r/test/comments/1'), '');
  assert.equal(core.normalizeRedditUrl('not a url'), '');
});

test('extracts post fields from an F5Bot alert', () => {
  const parsed = core.parseF5BotAlert(fixtures.grading);

  assert.equal(parsed.messageId, 'gmail-grading-1');
  assert.equal(parsed.title, 'Should I grade this card?');
  assert.match(parsed.excerpt, /centering looks good/i);
  assert.equal(parsed.subreddit, 'PokemonTCG');
  assert.equal(parsed.author, 'cardcollector');
  assert.equal(parsed.url, 'https://www.reddit.com/r/PokemonTCG/comments/abc123/should_i_grade_this');
});

test('returns an empty URL for malformed alerts', () => {
  assert.equal(core.parseF5BotAlert(fixtures.malformed).url, '');
});

test('extracts a Reddit URL that exists only in an HTML anchor attribute', () => {
  assert.equal(
    core.parseF5BotAlert(fixtures.htmlOnlyLink).url,
    'https://www.reddit.com/r/PokemonTCG/comments/html123/is_this_worth_grading'
  );
});

test('extracts a Reddit URL encoded inside a Gmail redirect', () => {
  assert.equal(
    core.parseF5BotAlert(fixtures.gmailWrappedLink).url,
    'https://www.reddit.com/r/Pokemoncardappraisal/comments/wrapped123/are_these_worth_grading'
  );
});

test('parses and scores each post in an F5Bot digest independently', () => {
  const alerts = core.parseF5BotAlerts(fixtures.multiPostDigest);
  const config = core.getRadarDefaults('');
  const thresholds = {
    medium: config.settings.medium_threshold,
    high: config.settings.high_threshold
  };

  assert.equal(alerts.length, 3);
  assert.deepEqual(
    alerts.map((alert) => [alert.subreddit, alert.author, alert.title]),
    [
      ['Knife_Swap', 'Raccoon_Tactical', 'Curtiss F3 Medium Slicer'],
      ['Pokemoncardappraisal', 'card_owner', 'Are these worth grading?'],
      ['sportscards', 'CardLot', 'First big retail pull']
    ]
  );

  const scored = alerts.map((alert) => core.scoreOpportunity(alert, config.rules, thresholds));
  assert.equal(scored[0].score, 0);
  assert.equal(scored[0].priority, 'ignored');
  assert.equal(scored[1].intent, 'grading');
  assert.equal(scored[1].priority, 'medium');
  assert.equal(scored[2].intent, 'grading');
  assert.equal(scored[2].priority, 'high');
});

test('matches contains, phrase, subreddit, and safe regex rules', () => {
  assert.equal(core.matchRule('Good CENTERING', { matchType: 'contains', pattern: 'centering' }, ''), true);
  assert.equal(core.matchRule('Should I grade this?', { matchType: 'phrase', pattern: 'should i grade' }, ''), true);
  assert.equal(core.matchRule('', { matchType: 'subreddit', pattern: '^PokemonTCG$' }, 'PokemonTCG'), true);
  assert.equal(core.matchRule('PSA 10 value', { matchType: 'regex', pattern: 'psa 10.*value' }, ''), true);
  assert.equal(core.matchRule('anything', { matchType: 'regex', pattern: '[' }, ''), false);
});

test('classifies all four configured F5Bot phrases', () => {
  for (const phrase of ['card value', 'psa grade', 'should i grade', 'worth grading']) {
    const result = core.scoreOpportunity(
      { title: `${phrase}?`, excerpt: '', subreddit: 'PokemonTCG' },
      fixtures.rules,
      fixtures.thresholds
    );
    assert.ok(result.score > 0, phrase);
  }
});

test('scores grading intent as high priority with evidence', () => {
  const parsed = core.parseF5BotAlert(fixtures.grading);
  const result = core.scoreOpportunity(parsed, fixtures.rules, fixtures.thresholds);

  assert.equal(result.score, 70);
  assert.equal(result.intent, 'grading');
  assert.equal(result.priority, 'high');
  assert.deepEqual(result.matchedRules, ['grading-should', 'target-pokemontcg', 'question']);
});

test('clamps noisy marketplace posts to zero', () => {
  const result = core.scoreOpportunity(
    {
      title: 'Card value - for sale with shipping and promo code',
      excerpt: 'Buy now. Job opening for sellers.',
      subreddit: 'PokemonTCG'
    },
    fixtures.rules,
    fixtures.thresholds
  );

  assert.equal(result.score, 0);
  assert.equal(result.priority, 'ignored');
});

test('uses intent tie order grading, condition, value, other', () => {
  const tieRules = [
    { ruleId: 'value', enabled: true, category: 'value', pattern: 'test', matchType: 'contains', scoreDelta: 10 },
    { ruleId: 'grading', enabled: true, category: 'grading', pattern: 'test', matchType: 'contains', scoreDelta: 10 }
  ];

  assert.equal(
    core.scoreOpportunity({ title: 'test', excerpt: '', subreddit: '' }, tieRules, fixtures.thresholds).intent,
    'grading'
  );
});

test('uses normalized URL as the primary stable ID', () => {
  const canonical = 'https://www.reddit.com/r/x/comments/1/post';
  assert.equal(core.makeStableId('one', canonical), core.makeStableId('two', canonical));
  assert.notEqual(core.makeStableId('one', ''), core.makeStableId('two', ''));
});

test('builds a normalized content key only when author and title exist', () => {
  assert.equal(
    core.makeContentKey({ author: ' Card_User ', title: 'Should I Grade This?!' }),
    'card_user|should i grade this'
  );
  assert.equal(
    core.makeContentKey({ author: 'card_user', title: '  should   i grade this  ' }),
    'card_user|should i grade this'
  );
  assert.notEqual(
    core.makeContentKey({ author: 'other_user', title: 'Should I grade this?' }),
    core.makeContentKey({ author: 'card_user', title: 'Should I grade this?' })
  );
  assert.equal(core.makeContentKey({ author: '', title: 'Should I grade this?' }), '');
});

test('identifies explicit test and demo opportunities', () => {
  assert.equal(core.isTestOrDemoOpportunity({ title: '[TEST] Example', url: '' }), true);
  assert.equal(core.isTestOrDemoOpportunity({ title: '[DEMO] Example', url: '' }), true);
  assert.equal(core.isTestOrDemoOpportunity({
    title: 'Example',
    url: 'https://www.reddit.com/r/test/comments/demo-placeholder-1/example'
  }), true);
  assert.equal(core.isTestOrDemoOpportunity({
    title: 'Example',
    url: 'https://www.reddit.com/r/test/comments/demo1/example'
  }), true);
  assert.equal(core.isTestOrDemoOpportunity({
    title: 'Should I grade this?',
    url: 'https://www.reddit.com/r/PokeGrading/comments/abc123/example'
  }), false);
});

test('normalizes parsed URLs before accepting an alert', () => {
  const prepared = integration.prepareParsedAlert({
    messageId: 'gmail-1',
    title: 'Should I grade this?',
    url: 'https://old.reddit.com/r/PokeGrading/comments/abc123/post/?utm_source=x'
  });
  assert.equal(prepared.messageId, 'gmail-1');
  assert.equal(prepared.title, 'Should I grade this?');
  assert.equal(prepared.url, 'https://www.reddit.com/r/PokeGrading/comments/abc123/post');
  assert.equal(integration.prepareParsedAlert({
    title: 'Should I grade this?',
    url: 'Should I grade this? : r/PokeGrading'
  }), null);
});

test('defines the exact spreadsheet schema and default settings', () => {
  const config = core.getRadarDefaults('owner@example.com');

  assert.deepEqual(Object.keys(config.sheets), [
    'Opportunities',
    'Keywords',
    'Processed',
    'Metrics',
    'Settings'
  ]);
  assert.equal(config.sheets.Opportunities.length, 16);
  assert.deepEqual(config.sheets.Processed, [
    'id',
    'gmail_message_id',
    'normalized_url',
    'processed_at',
    'result',
    'error_message'
  ]);
  assert.deepEqual(config.sheets.Metrics, [
    'date',
    'processed_items',
    'created_opportunities',
    'high_priority_opportunities',
    'duplicate_items',
    'ignored_items',
    'replied_opportunities',
    'average_review_minutes'
  ]);
  assert.equal(config.settings.notification_email, 'owner@example.com');
  assert.equal(config.settings.source_label, 'reddit-radar');
  assert.equal(config.settings.batch_size, 50);
  assert.equal(config.settings.high_threshold, 70);
});

test('production seed rules classify every configured F5Bot keyword', () => {
  const config = core.getRadarDefaults('');
  const thresholds = {
    medium: config.settings.medium_threshold,
    high: config.settings.high_threshold
  };

  for (const phrase of ['card value', 'psa grade', 'should i grade', 'worth grading']) {
    const result = core.scoreOpportunity(
      { title: `${phrase}?`, excerpt: '', subreddit: 'PokemonTCG' },
      config.rules,
      thresholds
    );
    assert.ok(result.score > 0, phrase);
  }
});

test('does not score centering by itself', () => {
  const config = core.getRadarDefaults('');
  const result = core.scoreOpportunity(
    { title: 'Perfect centering', excerpt: '', subreddit: 'Knife_Swap' },
    config.rules,
    { medium: config.settings.medium_threshold, high: config.settings.high_threshold }
  );

  assert.equal(result.score, 0);
  assert.equal(result.priority, 'ignored');
});

test('applies low, medium, and high thresholds at exact boundaries', () => {
  const makeRule = (score) => [{
    ruleId: `score-${score}`,
    enabled: true,
    category: 'grading',
    pattern: 'match',
    matchType: 'contains',
    scoreDelta: score
  }];
  const alert = { title: 'match', excerpt: '', subreddit: '' };

  assert.equal(core.scoreOpportunity(alert, makeRule(49), fixtures.thresholds).priority, 'low');
  assert.equal(core.scoreOpportunity(alert, makeRule(50), fixtures.thresholds).priority, 'medium');
  assert.equal(core.scoreOpportunity(alert, makeRule(70), fixtures.thresholds).priority, 'high');
});

test('builds an HTML-safe high-priority email summary', () => {
  const html = core.buildNotificationHtml([{
    score: 90,
    intent: 'grading',
    title: '<script>alert("x")</script>',
    subreddit: 'PokemonTCG',
    url: 'https://www.reddit.com/r/PokemonTCG/comments/abc/post'
  }]);

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /90/);
  assert.match(html, /https:\/\/www\.reddit\.com\/r\/PokemonTCG\/comments\/abc\/post/);
});

test('neutralizes spreadsheet formula prefixes in untrusted text', () => {
  assert.equal(core.safeCellText('=IMPORTXML("https://example.com")'), '\'=IMPORTXML("https://example.com")');
  assert.equal(core.safeCellText('+1+1'), "'+1+1");
  assert.equal(core.safeCellText('  =1+1'), "'  =1+1");
  assert.equal(core.safeCellText('\t=1+1'), "'\t=1+1");
  assert.equal(core.safeCellText('\r-1+1'), "'\r-1+1");
  assert.equal(core.safeCellText('\n@SUM(A1:A2)'), "'\n@SUM(A1:A2)");
  assert.equal(core.safeCellText('normal title'), 'normal title');
});

test('deduplicates against opportunities when a processed audit row is missing', () => {
  const processedRows = [];
  const opportunityRows = [[
    'radar-existing', '', '', '', '', '', '',
    'https://www.reddit.com/r/PokemonTCG/comments/partial/write'
  ]];
  const index = core.buildDedupIndex(processedRows, opportunityRows);

  assert.equal(index.ids['radar-existing'], true);
  assert.equal(index.urls['https://www.reddit.com/r/PokemonTCG/comments/partial/write'], true);
});

test('deduplicates cross-posts by normalized author and title', () => {
  const opportunityRows = [[
    'radar-existing', '', '', 'PokeGrading', 'Card_User', 'Should I Grade This?!', '',
    'https://www.reddit.com/r/PokeGrading/comments/one/post'
  ]];
  const index = core.buildDedupIndex([], opportunityRows);

  assert.equal(index.contentKeys['card_user|should i grade this'], 'radar-existing');
  assert.equal(index.contentKeys['other_user|should i grade this'], undefined);
});

test('reconciles legacy rows and is idempotent', () => {
  const config = core.getRadarDefaults('');
  const thresholds = {
    medium: config.settings.medium_threshold,
    high: config.settings.high_threshold
  };
  const opportunity = ({
    id, subreddit, author, title, url, score = 100, status = 'new', notes = ''
  }) => [
    id, '2026-07-10', '2026-07-10', subreddit, author, title, '', url,
    'grading', score, 'legacy-rule', 'high', status, 'owner', '2026-07-11', notes
  ];
  const processed = (id, url) => [
    id, `gmail-${id}`, url, '2026-07-10', 'created', ''
  ];
  const lowDuplicate = opportunity({
    id: 'low',
    subreddit: 'PokeGrading',
    author: 'same_user',
    title: 'Should I grade this?',
    url: 'https://www.reddit.com/r/PokeGrading/comments/low/post',
    status: 'reviewing',
    notes: 'keep manual fields only if retained'
  });
  const highDuplicate = opportunity({
    id: 'high',
    subreddit: 'sportscards',
    author: 'same_user',
    title: 'Should I grade this?',
    url: 'https://old.reddit.com/r/sportscards/comments/high/post/?utm_source=x',
    status: 'replied',
    notes: 'published'
  });
  const demo = opportunity({
    id: 'demo',
    subreddit: 'PokemonTCG',
    author: 'demo_user',
    title: '[DEMO] Should I grade this?',
    url: 'https://www.reddit.com/r/PokemonTCG/comments/demo-placeholder-1/post'
  });
  const invalid = opportunity({
    id: 'invalid',
    subreddit: 'PokeGrading',
    author: 'broken_user',
    title: 'Worth grading?',
    url: 'Worth grading? : r/PokeGrading'
  });

  const first = core.reconcileRadarData(
    [lowDuplicate, highDuplicate, demo, invalid],
    [
      processed('low', lowDuplicate[7]),
      processed('high', highDuplicate[7]),
      processed('demo', demo[7]),
      processed('invalid', invalid[7])
    ],
    config.rules,
    thresholds
  );

  assert.equal(first.opportunityRows.length, 1);
  assert.equal(first.opportunityRows[0][0], 'high');
  assert.equal(first.opportunityRows[0][7], 'https://www.reddit.com/r/sportscards/comments/high/post');
  assert.equal(first.opportunityRows[0][9], 70);
  assert.equal(first.opportunityRows[0][11], 'high');
  assert.equal(first.opportunityRows[0][12], 'replied');
  assert.equal(first.opportunityRows[0][15], 'published');
  assert.equal(first.processedRows.some((row) => row[0] === 'demo'), false);
  assert.equal(first.processedRows.find((row) => row[0] === 'low')[4], 'duplicate');
  assert.match(first.processedRows.find((row) => row[0] === 'low')[5], /high/);
  assert.equal(first.processedRows.find((row) => row[0] === 'invalid')[4], 'ignored');
  assert.deepEqual(first.summary, {
    removedTests: 1,
    invalidUrls: 1,
    contentDuplicates: 1
  });

  const second = core.reconcileRadarData(
    first.opportunityRows,
    first.processedRows,
    config.rules,
    thresholds
  );
  assert.deepEqual(second.opportunityRows, first.opportunityRows);
  assert.deepEqual(second.processedRows, first.processedRows);
  assert.deepEqual(second.summary, {
    removedTests: 0,
    invalidUrls: 0,
    contentDuplicates: 0
  });
});

test('exposes Apps Script migration entry points', () => {
  assert.equal(typeof integration.repairRadarDataQuality, 'function');
  assert.equal(typeof integration.migrateMetricsHeaders, 'function');
});

test('allows messages with an error audit row to be retried', () => {
  const index = core.buildDedupIndex([[
    'radar-error',
    'gmail-error-1',
    '',
    new Date('2026-07-10T05:00:00Z'),
    'error',
    'No Reddit URL found.'
  ]], []);

  assert.equal(index.ids['radar-error'], undefined);
  assert.equal(index.messageIds['gmail-error-1'], undefined);
});
