'use strict';

var RadarCore = (function () {
  var INTENT_ORDER = ['grading', 'condition', 'value', 'other'];

  function decodeHtml_(value) {
    return String(value || '')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&nbsp;/gi, ' ');
  }

  function htmlToText_(value) {
    return decodeHtml_(value)
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h[1-6])\s*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\r/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .trim();
  }

  function normalizeRedditUrl(value) {
    var input = decodeHtml_(value).trim().replace(/[),.;>'"]+$/g, '');
    var match = input.match(/^https?:\/\/([^/?#]+)([^?#]*)/i);

    if (!match) return '';

    var host = match[1].toLowerCase().replace(/^www\./, '');
    var path = match[2] || '';

    if (host === 'redd.it') {
      host = 'redd.it';
    } else if (host === 'reddit.com' || /\.reddit\.com$/.test(host)) {
      host = 'www.reddit.com';
    } else {
      return '';
    }

    path = path.replace(/\/{2,}/g, '/').replace(/\/+$/g, '');
    return 'https://' + host + path;
  }

  function extractTitle_(subject) {
    var clean = htmlToText_(subject);
    var parts = clean.split(/\s+-\s+/);
    return (parts[parts.length - 1] || clean).trim();
  }

  function extractRedditUrl_(text) {
    var urls = String(text || '').match(/https?:\/\/[^\s<>"']+/gi) || [];
    for (var i = 0; i < urls.length; i += 1) {
      var normalized = normalizeRedditUrl(urls[i]);
      if (normalized) return normalized;
    }
    return '';
  }

  function extractSubreddit_(text, url) {
    var fromUrl = String(url || '').match(/\/r\/([A-Za-z0-9_]+)/i);
    if (fromUrl) return fromUrl[1];

    var fromText = String(text || '').match(/(?:subreddit\s*:\s*)?r\/([A-Za-z0-9_]+)/i);
    return fromText ? fromText[1] : '';
  }

  function extractAuthor_(text) {
    var labeled = String(text || '').match(/author\s*:\s*(?:u\/)?([A-Za-z0-9_-]+)/i);
    return labeled ? labeled[1] : '';
  }

  function extractExcerpt_(text, title) {
    var lines = String(text || '')
      .split('\n')
      .map(function (line) { return line.trim(); })
      .filter(function (line) {
        if (!line || line === title) return false;
        if (/^https?:\/\//i.test(line)) return false;
        if (/^(subreddit|author)\s*:/i.test(line)) return false;
        if (/^r\/[A-Za-z0-9_]+$/i.test(line)) return false;
        return true;
      });

    return lines.join(' ').replace(/\s+/g, ' ').trim();
  }

  function parseF5BotAlert(input) {
    var source = input || {};
    var body = htmlToText_(source.body || '');
    var title = extractTitle_(source.subject || '');
    var url = extractRedditUrl_(body + '\n' + (source.subject || ''));

    return {
      messageId: String(source.messageId || ''),
      sourceTime: source.sourceTime || null,
      title: title,
      excerpt: extractExcerpt_(body, title),
      subreddit: extractSubreddit_(body, url),
      author: extractAuthor_(body),
      url: url
    };
  }

  function matchRule(text, rule, subreddit) {
    var matchType = String((rule && rule.matchType) || '').toLowerCase();
    var pattern = String((rule && rule.pattern) || '');
    var target = matchType === 'subreddit' ? String(subreddit || '') : String(text || '');

    if (!pattern) return false;

    if (matchType === 'contains' || matchType === 'phrase') {
      return target.toLowerCase().indexOf(pattern.toLowerCase()) !== -1;
    }

    if (matchType === 'regex' || matchType === 'subreddit') {
      try {
        return new RegExp(pattern, 'i').test(target);
      } catch (error) {
        return false;
      }
    }

    return false;
  }

  function chooseIntent_(totals) {
    var bestIntent = 'other';
    var bestScore = 0;

    INTENT_ORDER.forEach(function (intent) {
      var score = Number(totals[intent] || 0);
      if (score > bestScore) {
        bestIntent = intent;
        bestScore = score;
      }
    });

    return bestIntent;
  }

  function scoreOpportunity(alert, rules, thresholds) {
    var source = alert || {};
    var limits = thresholds || { medium: 50, high: 70 };
    var haystack = [source.title, source.excerpt].filter(Boolean).join('\n');
    var score = 0;
    var matchedRules = [];
    var totals = { grading: 0, condition: 0, value: 0, other: 0 };

    (rules || []).forEach(function (rule) {
      if (!rule || rule.enabled === false) return;
      if (!matchRule(haystack, rule, source.subreddit)) return;

      var delta = Number(rule.scoreDelta || 0);
      var category = INTENT_ORDER.indexOf(rule.category) >= 0 ? rule.category : 'other';
      score += delta;
      matchedRules.push(String(rule.ruleId || 'unnamed-rule'));
      if (delta > 0) totals[category] += delta;
    });

    score = Math.max(0, Math.min(100, score));

    var priority = 'ignored';
    if (score >= Number(limits.high)) priority = 'high';
    else if (score >= Number(limits.medium)) priority = 'medium';
    else if (score > 0) priority = 'low';

    var result = {};
    Object.keys(source).forEach(function (key) { result[key] = source[key]; });
    result.score = score;
    result.intent = chooseIntent_(totals);
    result.matchedRules = matchedRules;
    result.priority = priority;
    return result;
  }

  function hash_(value) {
    var hash = 2166136261;
    var text = String(value || '');
    for (var i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  }

  function makeStableId(messageId, normalizedUrl) {
    var source = normalizedUrl ? 'url:' + normalizedUrl : 'message:' + String(messageId || '');
    return 'radar-' + hash_(source);
  }

  function getRadarDefaults(notificationEmail) {
    var sheets = {
      Opportunities: [
        'id', 'discovered_at', 'source_time', 'subreddit', 'author', 'title',
        'excerpt', 'url', 'intent', 'score', 'matched_rules', 'priority',
        'status', 'owner', 'reviewed_at', 'notes'
      ],
      Keywords: [
        'rule_id', 'enabled', 'category', 'pattern', 'match_type',
        'score_delta', 'description'
      ],
      Processed: [
        'id', 'gmail_message_id', 'normalized_url', 'processed_at', 'result',
        'error_message'
      ],
      Metrics: [
        'date', 'alerts_scanned', 'unique_opportunities', 'high_priority',
        'duplicates', 'ignored', 'replied', 'average_review_minutes'
      ],
      Settings: ['key', 'value', 'description']
    };

    var settings = {
      notification_email: String(notificationEmail || ''),
      source_label: 'reddit-radar',
      processed_label: 'reddit-radar-processed',
      error_label: 'reddit-radar-error',
      lookback_days: 7,
      batch_size: 50,
      medium_threshold: 50,
      high_threshold: 70
    };

    var rules = [
      rule_('grading-worth', 'grading', 'worth grading', 'phrase', 40, 'Explicit grading decision'),
      rule_('grading-should', 'grading', 'should i grade', 'phrase', 40, 'Explicit grading question'),
      rule_('grading-psa', 'grading', 'psa grade', 'phrase', 40, 'PSA grading intent'),
      rule_('condition-centering', 'condition', 'centering', 'contains', 20, 'Centering inspection'),
      rule_('condition-details', 'condition', 'surface|corners?|edges?|scratches?|whitening', 'regex', 20, 'Condition inspection detail'),
      rule_('value-card', 'value', 'card value', 'phrase', 15, 'Card value intent'),
      rule_('value-comparison', 'value', 'how much.*worth|raw vs graded|psa 10 value', 'regex', 15, 'Value comparison'),
      rule_('target-pokemontcg', 'other', '^PokemonTCG$', 'subreddit', 20, 'Target subreddit'),
      rule_('target-mtgfinance', 'other', '^mtgfinance$', 'subreddit', 20, 'Target subreddit'),
      rule_('target-baseballcards', 'other', '^baseballcards$', 'subreddit', 20, 'Target subreddit'),
      rule_('target-tradingcardcommunity', 'other', '^tradingcardcommunity$', 'subreddit', 20, 'Target subreddit'),
      rule_('target-basketballcards', 'other', '^basketballcards$', 'subreddit', 20, 'Target subreddit'),
      rule_('target-pokeinvesting', 'other', '^PokeInvesting$', 'subreddit', 20, 'Target subreddit'),
      rule_('target-sportscards', 'other', '^sportscards$', 'subreddit', 20, 'Target subreddit'),
      rule_('target-hockeycards', 'other', '^hockeycards$', 'subreddit', 20, 'Target subreddit'),
      rule_('question-language', 'other', '\\?|should i|is this|how much|worth', 'regex', 10, 'Question wording'),
      rule_('noise-marketplace', 'other', 'for sale|buy now|shipping', 'regex', -40, 'Marketplace-only noise'),
      rule_('noise-spam', 'other', 'hiring|job opening|promo code', 'regex', -50, 'Promotion or hiring noise')
    ];

    return { sheets: sheets, settings: settings, rules: rules };
  }

  function rule_(ruleId, category, pattern, matchType, scoreDelta, description) {
    return {
      ruleId: ruleId,
      enabled: true,
      category: category,
      pattern: pattern,
      matchType: matchType,
      scoreDelta: scoreDelta,
      description: description
    };
  }

  return {
    normalizeRedditUrl: normalizeRedditUrl,
    parseF5BotAlert: parseF5BotAlert,
    matchRule: matchRule,
    scoreOpportunity: scoreOpportunity,
    makeStableId: makeStableId,
    getRadarDefaults: getRadarDefaults
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RadarCore;
}
