'use strict';

const grading = {
  messageId: 'gmail-grading-1',
  sourceTime: new Date('2026-07-10T01:02:03Z'),
  subject: 'should i grade - Reddit Links - Should I grade this card?',
  body: [
    'Should I grade this card?',
    'I pulled this yesterday. The centering looks good but I am unsure about the corners.',
    'Subreddit: r/PokemonTCG',
    'Author: u/cardcollector',
    'https://old.reddit.com/r/PokemonTCG/comments/abc123/should_i_grade_this/?utm_source=f5bot#top'
  ].join('\n')
};

const value = {
  messageId: 'gmail-value-1',
  sourceTime: new Date('2026-07-10T02:03:04Z'),
  subject: 'card value - Reddit Links - Raw vs graded value?',
  body: [
    'How much is this card worth if it gets a PSA 10?',
    'r/PokeInvesting',
    'https://www.reddit.com/r/PokeInvesting/comments/def456/raw_vs_graded_value/?context=3'
  ].join('\n')
};

const malformed = {
  messageId: 'gmail-malformed-1',
  sourceTime: new Date('2026-07-10T03:04:05Z'),
  subject: 'centering alert without a Reddit link',
  body: 'This alert is malformed and has no usable URL.'
};

const htmlOnlyLink = {
  messageId: 'gmail-html-link-1',
  sourceTime: new Date('2026-07-10T04:05:06Z'),
  subject: 'worth grading - Reddit Links - Is this worth grading?',
  body: '<p>The corners look clean.</p><a href="https://www.reddit.com/r/PokemonTCG/comments/html123/is_this_worth_grading/?utm_source=f5bot">Open post</a>'
};

const gmailWrappedLink = {
  messageId: 'gmail-wrapped-link-1',
  sourceTime: new Date('2026-07-10T05:06:07Z'),
  subject: 'worth grading - Reddit Links - Are these worth grading?',
  body: '<a href="https://www.google.com/url?q=https%3A%2F%2Fwww.reddit.com%2Fr%2FPokemoncardappraisal%2Fcomments%2Fwrapped123%2Fare_these_worth_grading%2F&amp;source=gmail">Are these worth grading?</a>'
};

const multiPostDigest = {
  messageId: 'gmail-multi-post-1',
  sourceTime: new Date('2026-07-10T06:07:08Z'),
  subject: 'F5Bot found something: centering, worth grading, should i grade',
  body: [
    '<h1>F5Bot found something!</h1>',
    '<h2>Keyword: "centering"</h2>',
    '<p>Reddit Posts (/r/Knife_Swap/): <a href="https://www.reddit.com/r/Knife_Swap/comments/knife123/slicer/">Curtiss F3 Medium Slicer</a> by Raccoon_Tactical<br><span>Centering: Perfect. Shipping included. Factory edge.</span></p>',
    '<h2>Keyword: "worth grading"</h2>',
    '<p>Reddit Posts (/r/Pokemoncardappraisal/): <a href="https://www.reddit.com/r/Pokemoncardappraisal/comments/card123/are_these_worth_grading/">Are these worth grading?</a> by card_owner<br><span>Not sure whether to keep these raw.</span></p>',
    '<h2>Keyword: "should i grade"</h2>',
    '<p>Reddit Posts (/r/sportscards/): <a href="https://www.reddit.com/r/sportscards/comments/sport123/first_big_retail_pull/">First big retail pull</a> by CardLot<br><span>Should I grade?</span></p>',
    '<p>Do you have comments or suggestions about F5Bot?</p>'
  ].join('')
};

const rules = [
  { ruleId: 'grading-worth', enabled: true, category: 'grading', pattern: 'worth grading', matchType: 'phrase', scoreDelta: 40 },
  { ruleId: 'grading-should', enabled: true, category: 'grading', pattern: 'should i grade', matchType: 'phrase', scoreDelta: 40 },
  { ruleId: 'grading-psa', enabled: true, category: 'grading', pattern: 'psa grade', matchType: 'phrase', scoreDelta: 40 },
  { ruleId: 'condition-centering', enabled: true, category: 'condition', pattern: 'centering', matchType: 'contains', scoreDelta: 20 },
  { ruleId: 'value-card', enabled: true, category: 'value', pattern: 'card value', matchType: 'phrase', scoreDelta: 15 },
  { ruleId: 'value-worth', enabled: true, category: 'value', pattern: 'how much.*worth|raw vs graded|psa 10 value', matchType: 'regex', scoreDelta: 15 },
  { ruleId: 'target-pokemontcg', enabled: true, category: 'other', pattern: '^PokemonTCG$', matchType: 'subreddit', scoreDelta: 20 },
  { ruleId: 'target-pokeinvesting', enabled: true, category: 'other', pattern: '^PokeInvesting$', matchType: 'subreddit', scoreDelta: 20 },
  { ruleId: 'question', enabled: true, category: 'other', pattern: '\\?|should i|is this|how much|worth', matchType: 'regex', scoreDelta: 10 },
  { ruleId: 'marketplace', enabled: true, category: 'other', pattern: 'for sale|buy now|shipping', matchType: 'regex', scoreDelta: -40 },
  { ruleId: 'spam', enabled: true, category: 'other', pattern: 'hiring|job opening|promo code', matchType: 'regex', scoreDelta: -50 }
];

const thresholds = { medium: 50, high: 70 };

module.exports = {
  grading,
  value,
  malformed,
  htmlOnlyLink,
  gmailWrappedLink,
  multiPostDigest,
  rules,
  thresholds
};
