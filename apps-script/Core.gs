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
    var raw = String(text || '');
    var decodedHtml = decodeHtml_(raw);
    var variants = [raw, decodedHtml];

    try {
      variants.push(decodeURIComponent(decodedHtml));
    } catch (error) {
      // A malformed percent escape should not prevent parsing ordinary links.
    }

    for (var i = 0; i < variants.length; i += 1) {
      var urls = variants[i].match(
        /https?:\/\/(?:[a-z0-9-]+\.)?reddit\.com\/[^\s<>"'&]+|https?:\/\/redd\.it\/[^\s<>"'&]+/gi
      ) || [];
      for (var j = 0; j < urls.length; j += 1) {
        var normalized = normalizeRedditUrl(urls[j]);
        if (normalized) return normalized;
      }
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

  function extractAnchorTitle_(html, targetUrl) {
    var anchorPattern = /<a\b[^>]*\bhref\s*=\s*(["'])([\s\S]*?)\1[^>]*>([\s\S]*?)<\/a>/gi;
    var match;

    while ((match = anchorPattern.exec(String(html || ''))) !== null) {
      if (extractRedditUrl_(match[2]) === targetUrl) return htmlToText_(match[3]);
    }
    return '';
  }

  function parseResultBlock_(source, block) {
    var text = htmlToText_(block);
    var url = extractRedditUrl_(block);
    var title = extractAnchorTitle_(block, url);
    var lines = text.split('\n').map(function (line) { return line.trim(); }).filter(Boolean);
    var header = lines[0] || '';
    var authorMatch = header.match(/\s+by\s+([A-Za-z0-9_-]+)\s*$/i);

    return {
      messageId: String(source.messageId || ''),
      sourceTime: source.sourceTime || null,
      title: title || extractTitle_(source.subject || ''),
      excerpt: lines.slice(1).join(' ').replace(/\s+/g, ' ').trim(),
      subreddit: extractSubreddit_(text, url),
      author: authorMatch ? authorMatch[1] : extractAuthor_(text),
      url: url
    };
  }

  function parseF5BotAlert(input) {
    var source = input || {};
    var rawBody = String(source.body || '');
    var body = htmlToText_(rawBody);
    var title = extractTitle_(source.subject || '');
    var url = extractRedditUrl_(rawBody + '\n' + body + '\n' + (source.subject || ''));

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

  function parseF5BotAlerts(input) {
    var source = input || {};
    var rawBody = String(source.body || '');
    var blocks = rawBody.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];
    var results = blocks
      .map(function (block) { return parseResultBlock_(source, block); })
      .filter(function (result) { return result.url; });

    return results.length ? results : [parseF5BotAlert(source)];
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

  function normalizeIdentityText_(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[\u2018\u2019\u201c\u201d]/g, '')
      .replace(/[^a-z0-9_\u00c0-\uffff]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function makeContentKey(source) {
    var item = source || {};
    var author = normalizeIdentityText_(item.author);
    var title = normalizeIdentityText_(item.title);
    return author && title ? author + '|' + title : '';
  }

  function isTestOrDemoOpportunity(source) {
    var item = source || {};
    var title = String(item.title || '');
    var url = String(item.url || '');
    return /^\s*\[(?:test|demo)\]/i.test(title) ||
      /(?:test|demo)-placeholder/i.test(url) ||
      /\/comments\/demo[12](?:\/|$)/i.test(url);
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
        'date', 'processed_items', 'created_opportunities',
        'high_priority_opportunities', 'duplicate_items', 'ignored_items',
        'replied_opportunities', 'average_review_minutes'
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

  function escapeHtml_(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildNotificationHtml(items) {
    var rows = (items || []).map(function (item) {
      var url = normalizeRedditUrl(item.url);
      var title = escapeHtml_(item.title || 'Untitled Reddit post');
      var subreddit = escapeHtml_(item.subreddit ? 'r/' + item.subreddit : 'Reddit');
      var intent = escapeHtml_(item.intent || 'other');
      var score = escapeHtml_(item.score);
      var link = url
        ? '<a href="' + escapeHtml_(url) + '">Open Reddit post</a>'
        : 'Reddit link unavailable';
      return '<li><strong>' + score + ' · ' + intent + ' · ' + subreddit +
        '</strong><br>' + title + '<br>' + link + '</li>';
    });

    return '<h2>DEDC Reddit Radar</h2>' +
      '<p>New high-priority opportunities:</p><ol>' + rows.join('') + '</ol>';
  }

  function safeCellText(value) {
    var text = String(value == null ? '' : value);
    return /^[\s\u0000-\u001f]*[=+\-@]/.test(text) ? "'" + text : text;
  }

  function buildDedupIndex(processedRows, opportunityRows) {
    var index = { ids: {}, messageIds: {}, urls: {}, contentKeys: {} };

    (processedRows || []).forEach(function (row) {
      if (String(row[4] || '').toLowerCase() === 'error') return;
      if (row[0]) index.ids[String(row[0])] = true;
      if (row[1]) index.messageIds[String(row[1])] = true;
      if (row[2]) index.urls[String(row[2])] = true;
    });

    (opportunityRows || []).forEach(function (row) {
      if (row[0]) index.ids[String(row[0])] = true;
      if (row[7]) index.urls[String(row[7])] = true;
      var contentKey = makeContentKey({ author: row[4], title: row[5] });
      if (contentKey) index.contentKeys[contentKey] = String(row[0] || '');
    });

    return index;
  }

  function reconcileRadarData(opportunityRows, processedRows, rules, thresholds) {
    var decisions = {};
    var candidates = [];
    var summary = { removedTests: 0, invalidUrls: 0, contentDuplicates: 0 };

    (opportunityRows || []).forEach(function (sourceRow, index) {
      var row = (sourceRow || []).slice();
      var id = String(row[0] || '');
      var item = {
        subreddit: row[3],
        author: row[4],
        title: row[5],
        excerpt: row[6],
        url: row[7]
      };

      if (isTestOrDemoOpportunity(item)) {
        decisions[id] = { result: 'remove-test' };
        summary.removedTests += 1;
        return;
      }

      var normalizedUrl = normalizeRedditUrl(item.url);
      if (!normalizedUrl) {
        decisions[id] = { result: 'invalid' };
        summary.invalidUrls += 1;
        return;
      }

      item.url = normalizedUrl;
      var scored = scoreOpportunity(item, rules, thresholds);
      row[7] = normalizedUrl;
      row[8] = scored.intent;
      row[9] = scored.score;
      row[10] = scored.matchedRules.join(', ');
      row[11] = scored.priority;
      candidates.push({
        id: id,
        index: index,
        row: row,
        score: scored.score,
        contentKey: makeContentKey(item),
        normalizedUrl: normalizedUrl
      });
    });

    candidates.sort(function (left, right) {
      return right.score - left.score || left.index - right.index;
    });

    var retainedByContentKey = {};
    var retained = [];
    candidates.forEach(function (candidate) {
      var retainedId = candidate.contentKey && retainedByContentKey[candidate.contentKey];
      if (retainedId) {
        decisions[candidate.id] = {
          result: 'duplicate',
          retainedId: retainedId,
          normalizedUrl: candidate.normalizedUrl
        };
        summary.contentDuplicates += 1;
        return;
      }

      if (candidate.contentKey) {
        retainedByContentKey[candidate.contentKey] = candidate.id;
      }
      decisions[candidate.id] = {
        result: 'retained',
        normalizedUrl: candidate.normalizedUrl
      };
      retained.push(candidate);
    });

    retained.sort(function (left, right) { return left.index - right.index; });

    var reconciledProcessed = [];
    (processedRows || []).forEach(function (sourceRow) {
      var row = (sourceRow || []).slice();
      var id = String(row[0] || '');
      var decision = decisions[id];
      if (!decision) {
        reconciledProcessed.push(row);
        return;
      }
      if (decision.result === 'remove-test') return;
      if (decision.normalizedUrl) row[2] = decision.normalizedUrl;
      if (decision.result === 'invalid') {
        row[4] = 'ignored';
        row[5] = 'Removed by data quality repair: invalid Reddit URL.';
      } else if (decision.result === 'duplicate') {
        row[4] = 'duplicate';
        row[5] = 'Content duplicate of ' + decision.retainedId + '.';
      }
      reconciledProcessed.push(row);
    });

    return {
      opportunityRows: retained.map(function (candidate) { return candidate.row; }),
      processedRows: reconciledProcessed,
      summary: summary
    };
  }

  return {
    normalizeRedditUrl: normalizeRedditUrl,
    parseF5BotAlert: parseF5BotAlert,
    parseF5BotAlerts: parseF5BotAlerts,
    matchRule: matchRule,
    scoreOpportunity: scoreOpportunity,
    makeStableId: makeStableId,
    makeContentKey: makeContentKey,
    isTestOrDemoOpportunity: isTestOrDemoOpportunity,
    getRadarDefaults: getRadarDefaults,
    buildNotificationHtml: buildNotificationHtml,
    safeCellText: safeCellText,
    buildDedupIndex: buildDedupIndex,
    reconcileRadarData: reconcileRadarData
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RadarCore;
}
