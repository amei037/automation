const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const guardrails = require('../reply-agent/guardrails');
const radarSamples = require('./reply-fixtures');

const validInput = {
  opportunity_id: 'opp-1',
  title: 'Should I grade this card?',
  excerpt: 'I pulled this yesterday and am unsure about the condition.',
  subreddit: 'PokemonCardValue',
  url: 'https://www.reddit.com/r/PokemonCardValue/comments/abc123/should_i_grade/',
  radar_intent: 'grading',
  radar_score: 80
};

test('validates the Radar handoff contract', () => {
  assert.deepEqual(guardrails.validateInput(validInput), []);
  assert.match(
    guardrails.validateInput({ ...validInput, url: 'https://example.com/post' }).join(' '),
    /Reddit post URL/
  );
  assert.match(
    guardrails.validateInput({ ...validInput, opportunity_id: '' }).join(' '),
    /opportunity_id/
  );
});

test('requires the complete post and subreddit rules before drafting', () => {
  assert.equal(
    guardrails.evaluateContext({ post_fetched: true, rules_fetched: false, post_removed: false }).decision,
    'needs_context'
  );
  assert.equal(
    guardrails.evaluateContext({ post_fetched: true, rules_fetched: true, post_removed: false }).decision,
    'ready'
  );
  assert.equal(
    guardrails.evaluateContext({ post_fetched: true, rules_fetched: true, post_removed: true }).decision,
    'needs_context'
  );
});

test('skips obvious non-card keyword collisions independently of Radar score', () => {
  const knife = guardrails.assessQuestion({
    ...validInput,
    title: 'Perfect centering and solid lockup',
    excerpt: 'M390 steel, factory edge, shipped tomorrow.',
    subreddit: 'Knife_Swap',
    radar_score: 100
  });
  const emotional = guardrails.assessQuestion({
    ...validInput,
    title: 'Nine months out',
    excerpt: 'I stopped centering everyone else over my own needs.',
    subreddit: 'emotionalabuse',
    radar_score: 100
  });
  const grading = guardrails.assessQuestion(validInput);

  assert.equal(knife.decision, 'skip');
  assert.equal(emotional.decision, 'skip');
  assert.equal(grading.relevance, 'relevant');
  assert.equal(grading.user_intent, 'grading');
});

test('matches human relevance labels for the ten archived Radar samples', () => {
  let matches = 0;

  for (const sample of radarSamples) {
    const assessed = guardrails.assessQuestion({ ...validInput, ...sample, radar_score: 100 });
    if (assessed.relevance === sample.expected) matches += 1;
    if (sample.removed) {
      assert.equal(
        guardrails.evaluateContext({ post_fetched: true, rules_fetched: true, post_removed: true }).decision,
        'needs_context'
      );
    }
  }

  assert.equal(matches, 10, `Expected 10/10 relevance matches, received ${matches}/10.`);
});

test('blocks promotional, linked, guaranteed, and wrongly sized drafts', () => {
  const safeDraft = Array(95).fill('Helpful').join(' ') + '.';
  assert.deepEqual(guardrails.reviewDraft(safeDraft), []);
  assert.match(guardrails.reviewDraft('Try the DEDC app for a guaranteed PSA 10. https://example.com').join(' '), /brand_or_product/);
  assert.match(guardrails.reviewDraft('Try the DEDC app for a guaranteed PSA 10. https://example.com').join(' '), /external_link/);
  assert.match(guardrails.reviewDraft('Try the DEDC app for a guaranteed PSA 10. https://example.com').join(' '), /guaranteed_outcome/);
  assert.match(guardrails.reviewDraft('Too short.').join(' '), /word_count/);
});

test('ships the orchestrator and all five project skills', () => {
  const root = path.join(__dirname, '..');
  const skills = [
    'read-reddit-context',
    'assess-card-question',
    'apply-dedc-knowledge-boundaries',
    'draft-reddit-help-reply',
    'review-reddit-reply'
  ];

  for (const skill of skills) {
    const skillFile = path.join(root, '.agents', 'skills', skill, 'SKILL.md');
    assert.equal(fs.existsSync(skillFile), true, skillFile);
  }

  const agentFile = path.join(root, '.agents', 'agents', 'reddit-knowledge-reply-agent.md');
  const schemaFile = path.join(root, 'reply-agent', 'output.schema.json');
  assert.equal(fs.existsSync(agentFile), true);
  assert.equal(fs.existsSync(schemaFile), true);
});
