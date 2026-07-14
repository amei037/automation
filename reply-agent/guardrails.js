'use strict';

const INTENTS = ['grading', 'condition', 'value', 'care', 'other'];

function text(value) {
  return String(value || '').trim();
}

function validateInput(input) {
  const source = input || {};
  const errors = [];
  const required = ['opportunity_id', 'title', 'excerpt', 'subreddit', 'url', 'radar_intent'];

  required.forEach((field) => {
    if (!text(source[field])) errors.push(`${field} is required.`);
  });

  if (!/^https:\/\/(?:www\.)?reddit\.com\/r\/[^/]+\/comments\/[^/]+(?:\/|$)/i.test(text(source.url))) {
    errors.push('url must be a canonical Reddit post URL.');
  }
  if (!Number.isFinite(Number(source.radar_score)) || Number(source.radar_score) < 0 || Number(source.radar_score) > 100) {
    errors.push('radar_score must be a number from 0 to 100.');
  }

  return errors;
}

function evaluateContext(status) {
  const source = status || {};
  const missing = [];
  if (!source.post_fetched || source.post_removed || source.post_restricted) missing.push('complete_post');
  if (!source.rules_fetched) missing.push('subreddit_rules');

  return {
    decision: missing.length ? 'needs_context' : 'ready',
    missing
  };
}

function assessQuestion(input) {
  const source = input || {};
  const subreddit = text(source.subreddit).toLowerCase();
  const haystack = `${text(source.title)} ${text(source.excerpt)}`.toLowerCase();
  const cardSignals = /\b(card|cards|pokemon|pokémon|tcg|sports? card|rookie|holo|foil|psa|bgs|cgc|grading|grade this|raw)\b/;
  const cardSubredditSignal = /(pokemon|poke|tcg|card|grading)/;
  const irrelevantSignals = /\b(knife|blade|steel|lockup|factory edge|shipping|relationship|emotional abuse|divorce)\b/;
  const irrelevantSubreddits = /^(knife_swap|emotionalabuse)$/;

  if (irrelevantSubreddits.test(subreddit) || (irrelevantSignals.test(haystack) && !cardSignals.test(haystack))) {
    return { decision: 'skip', relevance: 'irrelevant', user_intent: 'other', missing_information: [] };
  }

  let userIntent = 'other';
  if (/\b(grade|grading|psa|bgs|cgc|slab)\b/.test(haystack)) userIntent = 'grading';
  else if (/\b(condition|centering|corner|edge|surface|crease|scratch|dent)\b/.test(haystack)) userIntent = 'condition';
  else if (/\b(value|worth|price|sell|raw vs|investment)\b/.test(haystack)) userIntent = 'value';
  else if (/\b(clean|care|restore|repair|polish|remove)\b/.test(haystack)) userIntent = 'care';

  const relevance = cardSignals.test(haystack) || cardSubredditSignal.test(subreddit) ? 'relevant' : 'uncertain';
  return {
    decision: relevance === 'relevant' ? 'draft' : 'needs_context',
    relevance,
    user_intent: INTENTS.includes(userIntent) ? userIntent : 'other',
    missing_information: []
  };
}

function wordCount(draft) {
  const value = text(draft);
  return value ? value.split(/\s+/).length : 0;
}

function reviewDraft(draft) {
  const value = text(draft);
  const flags = [];
  const count = wordCount(value);

  if (count < 80 || count > 180) flags.push(`word_count:${count}`);
  if (/\b(DEDC|The Lab|our (?:app|product|service)|our website)\b/i.test(value)) flags.push('brand_or_product');
  if (/https?:\/\/|www\.|\[[^\]]+\]\([^)]+\)/i.test(value)) flags.push('external_link');
  if (/\b(guarantee(?:d|s)?|definitely|certainly|will (?:get|grade|sell)|risk[- ]free)\b/i.test(value)) flags.push('guaranteed_outcome');
  if (/\b(?:PSA|BGS|CGC)\s*(?:grade\s*)?\d+(?:\.\d+)?\b|[$€£]\s*\d+/i.test(value)) flags.push('specific_grade_or_value');
  if (/\b(download|sign up|buy now|click|visit|DM me|message me)\b/i.test(value)) flags.push('call_to_action');
  if (/\b(I am|I'm)\s+(?:an?\s+)?(?:independent|unaffiliated)/i.test(value)) flags.push('identity_misrepresentation');

  return flags;
}

module.exports = {
  INTENTS,
  validateInput,
  evaluateContext,
  assessQuestion,
  reviewDraft,
  wordCount
};
