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

  return {
    normalizeRedditUrl: normalizeRedditUrl,
    parseF5BotAlert: parseF5BotAlert,
    matchRule: matchRule,
    scoreOpportunity: scoreOpportunity,
    makeStableId: makeStableId
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RadarCore;
}
