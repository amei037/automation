'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../apps-script/Core.gs');
const fixtures = require('./fixtures');

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

test('matches contains, phrase, subreddit, and safe regex rules', () => {
  assert.equal(core.matchRule('Good CENTERING', { matchType: 'contains', pattern: 'centering' }, ''), true);
  assert.equal(core.matchRule('Should I grade this?', { matchType: 'phrase', pattern: 'should i grade' }, ''), true);
  assert.equal(core.matchRule('', { matchType: 'subreddit', pattern: '^PokemonTCG$' }, 'PokemonTCG'), true);
  assert.equal(core.matchRule('PSA 10 value', { matchType: 'regex', pattern: 'psa 10.*value' }, ''), true);
  assert.equal(core.matchRule('anything', { matchType: 'regex', pattern: '[' }, ''), false);
});

test('classifies all five configured F5Bot phrases', () => {
  for (const phrase of ['card value', 'centering', 'psa grade', 'should i grade', 'worth grading']) {
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

  assert.equal(result.score, 90);
  assert.equal(result.intent, 'grading');
  assert.equal(result.priority, 'high');
  assert.deepEqual(result.matchedRules, ['grading-should', 'condition-centering', 'target-pokemontcg', 'question']);
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
