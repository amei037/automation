'use strict';

var RADAR_SHEET_NAMES = {
  opportunities: 'Opportunities',
  keywords: 'Keywords',
  processed: 'Processed',
  metrics: 'Metrics',
  settings: 'Settings'
};

function setupRadar() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var defaults = RadarCore.getRadarDefaults(getOwnerEmail_());

  Object.keys(defaults.sheets).forEach(function (sheetName) {
    var sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
    ensureHeaders_(sheet, defaults.sheets[sheetName]);
    formatBaseSheet_(sheet, defaults.sheets[sheetName].length);
  });

  seedSettings_(spreadsheet.getSheetByName(RADAR_SHEET_NAMES.settings), defaults.settings);
  seedRules_(spreadsheet.getSheetByName(RADAR_SHEET_NAMES.keywords), defaults.rules);
  configureOpportunitySheet_(spreadsheet.getSheetByName(RADAR_SHEET_NAMES.opportunities));
  SpreadsheetApp.flush();
}

function runDemo() {
  setupRadar();

  var rules = loadRules_();
  var settings = loadSettings_();
  var thresholds = {
    medium: settings.medium_threshold,
    high: settings.high_threshold
  };
  var fixtures = getDemoFixtures_();
  var existing = loadProcessedIndex_();
  var opportunityRows = [];
  var processedRows = [];

  fixtures.forEach(function (fixture) {
    var parsed = RadarCore.parseF5BotAlert(fixture);
    var id = RadarCore.makeStableId(parsed.messageId, parsed.url);
    if (existing.ids[id] || (parsed.url && existing.urls[parsed.url])) return;

    var scored = RadarCore.scoreOpportunity(parsed, rules, thresholds);
    scored.id = id;
    if (scored.score > 0) {
      opportunityRows.push(toOpportunityRow_(scored, new Date()));
      processedRows.push(toProcessedRow_(id, parsed, 'created', 'demo fixture'));
    } else {
      processedRows.push(toProcessedRow_(id, parsed, 'ignored', 'demo fixture scored zero'));
    }
    existing.ids[id] = true;
    if (parsed.url) existing.urls[parsed.url] = true;
  });

  appendRows_(getSheet_(RADAR_SHEET_NAMES.opportunities), opportunityRows);
  appendRows_(getSheet_(RADAR_SHEET_NAMES.processed), processedRows);
  sortOpportunities_();
  refreshMetrics();
}

function processF5BotAlerts() {
  ensureRadarReady_();

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;

  try {
    var settings = loadSettings_();
    var rules = loadRules_();
    var thresholds = {
      medium: settings.medium_threshold,
      high: settings.high_threshold
    };
    var labels = {
      source: getOrCreateLabel_(settings.source_label),
      processed: getOrCreateLabel_(settings.processed_label),
      error: getOrCreateLabel_(settings.error_label)
    };
    var query = 'label:"' + escapeGmailLabel_(settings.source_label) +
      '" -label:"' + escapeGmailLabel_(settings.error_label) +
      '" is:unread newer_than:' + Math.floor(settings.lookback_days) + 'd';
    var threads = GmailApp.search(query, 0, Math.min(Math.floor(settings.batch_size), 50));
    var messages = collectUnreadMessages_(threads, Math.min(Math.floor(settings.batch_size), 50));
    var existing = loadProcessedIndex_();
    var opportunityRows = [];
    var processedRows = [];
    var actions = [];
    var highPriority = [];

    messages.forEach(function (message) {
      var messageId = message.getId();
      if (existing.messageIds[messageId]) {
        actions.push({ message: message, label: labels.processed, markRead: true });
        return;
      }

      var parsed = RadarCore.parseF5BotAlert({
        messageId: messageId,
        sourceTime: message.getDate(),
        subject: message.getSubject(),
        body: message.getPlainBody() + '\n' + message.getBody()
      });
      var id = RadarCore.makeStableId(messageId, parsed.url);

      if (!parsed.url) {
        processedRows.push(toProcessedRow_(id, parsed, 'error', 'No Reddit URL found.'));
        actions.push({ message: message, label: labels.error, markRead: false });
        existing.messageIds[messageId] = true;
        return;
      }

      if (existing.ids[id] || existing.urls[parsed.url]) {
        processedRows.push(toProcessedRow_(id, parsed, 'duplicate', 'Normalized Reddit URL already processed.'));
        actions.push({ message: message, label: labels.processed, markRead: true });
        existing.messageIds[messageId] = true;
        return;
      }

      var scored = RadarCore.scoreOpportunity(parsed, rules, thresholds);
      scored.id = id;
      if (scored.score === 0) {
        processedRows.push(toProcessedRow_(id, parsed, 'ignored', 'Opportunity score is zero.'));
      } else {
        opportunityRows.push(toOpportunityRow_(scored, new Date()));
        processedRows.push(toProcessedRow_(id, parsed, 'created', ''));
        if (scored.priority === 'high') highPriority.push(scored);
      }

      actions.push({ message: message, label: labels.processed, markRead: true });
      existing.ids[id] = true;
      existing.messageIds[messageId] = true;
      existing.urls[parsed.url] = true;
    });

    appendRows_(getSheet_(RADAR_SHEET_NAMES.opportunities), opportunityRows);
    appendRows_(getSheet_(RADAR_SHEET_NAMES.processed), processedRows);
    SpreadsheetApp.flush();
    applyMessageActions_(actions);
    sortOpportunities_();
    refreshMetrics();
    sendHighPrioritySummary_(highPriority, settings.notification_email);
  } finally {
    lock.releaseLock();
  }
}

function installTenMinuteTrigger() {
  ensureRadarReady_();
  removeRadarTriggers();
  ScriptApp.newTrigger('processF5BotAlerts')
    .timeBased()
    .everyMinutes(10)
    .create();
}

function removeRadarTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'processF5BotAlerts') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

function refreshMetrics() {
  var processedRows = readDataRows_(getSheet_(RADAR_SHEET_NAMES.processed));
  var opportunityRows = readDataRows_(getSheet_(RADAR_SHEET_NAMES.opportunities));
  var byDate = {};

  processedRows.forEach(function (row) {
    var key = dateKey_(row[3]);
    if (!key) return;
    var metrics = getDateMetrics_(byDate, key);
    metrics.alerts += 1;
    if (row[4] === 'created') metrics.unique += 1;
    if (row[4] === 'duplicate') metrics.duplicates += 1;
    if (row[4] === 'ignored') metrics.ignored += 1;
  });

  opportunityRows.forEach(function (row) {
    var key = dateKey_(row[1]);
    if (!key) return;
    var metrics = getDateMetrics_(byDate, key);
    if (row[11] === 'high') metrics.high += 1;
    if (row[12] === 'replied') metrics.replied += 1;

    var discoveredAt = asDate_(row[1]);
    var reviewedAt = asDate_(row[14]);
    if (discoveredAt && reviewedAt && reviewedAt >= discoveredAt) {
      metrics.reviewMinutes.push((reviewedAt.getTime() - discoveredAt.getTime()) / 60000);
    }
  });

  var rows = Object.keys(byDate).sort().map(function (key) {
    var metrics = byDate[key];
    var average = metrics.reviewMinutes.length
      ? metrics.reviewMinutes.reduce(function (sum, value) { return sum + value; }, 0) / metrics.reviewMinutes.length
      : '';
    return [
      key,
      metrics.alerts,
      metrics.unique,
      metrics.high,
      metrics.duplicates,
      metrics.ignored,
      metrics.replied,
      average === '' ? '' : Math.round(average * 10) / 10
    ];
  });

  var sheet = getSheet_(RADAR_SHEET_NAMES.metrics);
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }
  appendRows_(sheet, rows);
}

function loadSettings_() {
  var sheet = getSheet_(RADAR_SHEET_NAMES.settings);
  var rows = readDataRows_(sheet);
  var settings = {};

  rows.forEach(function (row) {
    var key = String(row[0] || '').trim();
    if (!key) return;
    settings[key] = row[1];
  });

  ['lookback_days', 'batch_size', 'medium_threshold', 'high_threshold'].forEach(function (key) {
    settings[key] = Number(settings[key]);
    if (!isFinite(settings[key]) || settings[key] <= 0) {
      throw new Error('Settings sheet has an invalid value for ' + key + '.');
    }
  });

  ['source_label', 'processed_label', 'error_label'].forEach(function (key) {
    settings[key] = String(settings[key] || '').trim();
    if (!settings[key]) throw new Error('Settings sheet is missing ' + key + '.');
  });
  settings.notification_email = String(settings.notification_email || '').trim();
  if (settings.medium_threshold >= settings.high_threshold || settings.high_threshold > 100) {
    throw new Error('Settings thresholds must satisfy medium < high <= 100.');
  }
  return settings;
}

function loadRules_() {
  var rows = readDataRows_(getSheet_(RADAR_SHEET_NAMES.keywords));
  return rows
    .filter(function (row) { return String(row[0] || '').trim(); })
    .map(function (row) {
      return {
        ruleId: String(row[0]),
        enabled: row[1] === true || String(row[1]).toLowerCase() === 'true',
        category: String(row[2] || 'other').toLowerCase(),
        pattern: String(row[3] || ''),
        matchType: String(row[4] || '').toLowerCase(),
        scoreDelta: Number(row[5] || 0),
        description: String(row[6] || '')
      };
    });
}

function getOwnerEmail_() {
  try {
    return Session.getEffectiveUser().getEmail() || '';
  } catch (error) {
    return '';
  }
}

function getSheet_(name) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Run setupRadar() first. Missing sheet: ' + name);
  return sheet;
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }

  var existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (existing.join('\u001f') !== headers.join('\u001f')) {
    throw new Error('Unexpected headers in sheet ' + sheet.getName() + '.');
  }
}

function formatBaseSheet_(sheet, columnCount) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, columnCount)
    .setBackground('#202124')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setWrap(true);
  sheet.autoResizeColumns(1, columnCount);
}

function seedSettings_(sheet, settings) {
  if (sheet.getLastRow() > 1) return;
  var descriptions = {
    notification_email: 'High-priority summary recipient; blank disables email.',
    source_label: 'Unread F5Bot messages carrying this Gmail label are scanned.',
    processed_label: 'Successfully handled threads receive this Gmail label.',
    error_label: 'Malformed alert threads receive this Gmail label.',
    lookback_days: 'Only alerts newer than this many days are scanned.',
    batch_size: 'Maximum Gmail messages handled per run.',
    medium_threshold: 'Minimum score for medium priority.',
    high_threshold: 'Minimum score for high priority and email notification.'
  };
  var rows = Object.keys(settings).map(function (key) {
    return [key, settings[key], descriptions[key]];
  });
  appendRows_(sheet, rows);
}

function seedRules_(sheet, rules) {
  if (sheet.getLastRow() > 1) return;
  var rows = rules.map(function (rule) {
    return [
      rule.ruleId,
      rule.enabled,
      rule.category,
      rule.pattern,
      rule.matchType,
      rule.scoreDelta,
      rule.description
    ];
  });
  appendRows_(sheet, rows);
  sheet.getRange(2, 2, rows.length, 1).insertCheckboxes();
}

function configureOpportunitySheet_(sheet) {
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['new', 'reviewing', 'replied', 'skipped', 'expired'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 13, Math.max(sheet.getMaxRows() - 1, 1), 1).setDataValidation(statusRule);

  var rowRange = sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), 16);
  var colorRules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$L2="high"')
      .setBackground('#fce8e6')
      .setRanges([rowRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$L2="medium"')
      .setBackground('#fef7e0')
      .setRanges([rowRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$L2="low"')
      .setBackground('#e6f4ea')
      .setRanges([rowRange])
      .build()
  ];
  sheet.setConditionalFormatRules(colorRules);
}

function readDataRows_(sheet) {
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
}

function appendRows_(sheet, rows) {
  if (!rows.length) return;
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function toOpportunityRow_(scored, discoveredAt) {
  return [
    scored.id,
    discoveredAt,
    scored.sourceTime || '',
    RadarCore.safeCellText(scored.subreddit || ''),
    RadarCore.safeCellText(scored.author || ''),
    RadarCore.safeCellText(scored.title || ''),
    RadarCore.safeCellText(scored.excerpt || ''),
    scored.url || '',
    scored.intent,
    scored.score,
    scored.matchedRules.join(', '),
    scored.priority,
    'new',
    '',
    '',
    ''
  ];
}

function toProcessedRow_(id, parsed, result, errorMessage) {
  return [
    id,
    parsed.messageId || '',
    parsed.url || '',
    new Date(),
    result,
    errorMessage || ''
  ];
}

function loadProcessedIndex_() {
  var rows = readDataRows_(getSheet_(RADAR_SHEET_NAMES.processed));
  var index = { ids: {}, messageIds: {}, urls: {} };
  rows.forEach(function (row) {
    if (row[0]) index.ids[String(row[0])] = true;
    if (row[1]) index.messageIds[String(row[1])] = true;
    if (row[2]) index.urls[String(row[2])] = true;
  });
  return index;
}

function sortOpportunities_() {
  var sheet = getSheet_(RADAR_SHEET_NAMES.opportunities);
  if (sheet.getLastRow() < 3) return;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).sort([
    { column: 10, ascending: false },
    { column: 3, ascending: false }
  ]);
}

function getDemoFixtures_() {
  return [
    {
      messageId: 'demo-grading',
      sourceTime: new Date(),
      subject: 'should i grade - Reddit Links - Should I grade this card?',
      body: 'The centering looks good but I am unsure about the corners.\nSubreddit: r/PokemonTCG\nAuthor: u/demo_collector\nhttps://www.reddit.com/r/PokemonTCG/comments/demo1/should_i_grade_this'
    },
    {
      messageId: 'demo-value',
      sourceTime: new Date(),
      subject: 'card value - Reddit Links - Raw vs graded value?',
      body: 'How much is this worth as a PSA 10?\nr/PokeInvesting\nhttps://www.reddit.com/r/PokeInvesting/comments/demo2/raw_vs_graded_value'
    },
    {
      messageId: 'demo-noise',
      sourceTime: new Date(),
      subject: 'card value - Reddit Links - Cards for sale',
      body: 'Buy now with shipping and promo code.\nr/PokemonTCG\nhttps://www.reddit.com/r/PokemonTCG/comments/demo3/cards_for_sale'
    }
  ];
}

function ensureRadarReady_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var missing = Object.keys(RADAR_SHEET_NAMES).some(function (key) {
    return !spreadsheet.getSheetByName(RADAR_SHEET_NAMES[key]);
  });
  if (missing) setupRadar();
}

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

function escapeGmailLabel_(name) {
  return String(name || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function collectUnreadMessages_(threads, limit) {
  var messages = [];
  for (var i = 0; i < threads.length && messages.length < limit; i += 1) {
    var threadMessages = threads[i].getMessages();
    for (var j = 0; j < threadMessages.length && messages.length < limit; j += 1) {
      if (threadMessages[j].isUnread()) messages.push(threadMessages[j]);
    }
  }
  return messages;
}

function applyMessageActions_(actions) {
  actions.forEach(function (action) {
    action.message.getThread().addLabel(action.label);
    if (action.markRead) action.message.markRead();
  });
}

function sendHighPrioritySummary_(items, recipient) {
  if (!items.length || !recipient) return;
  var subject = '[DEDC Reddit Radar] ' + items.length + ' high-priority opportunit' +
    (items.length === 1 ? 'y' : 'ies');
  var plainText = items.map(function (item) {
    return item.score + ' | ' + item.intent + ' | r/' + item.subreddit + ' | ' +
      item.title + '\n' + item.url;
  }).join('\n\n');

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    body: plainText,
    htmlBody: RadarCore.buildNotificationHtml(items)
  });
}

function dateKey_(value) {
  var date = asDate_(value);
  return date ? Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd') : '';
}

function asDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value;
  }
  if (!value) return null;
  var parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function getDateMetrics_(byDate, key) {
  if (!byDate[key]) {
    byDate[key] = {
      alerts: 0,
      unique: 0,
      high: 0,
      duplicates: 0,
      ignored: 0,
      replied: 0,
      reviewMinutes: []
    };
  }
  return byDate[key];
}
