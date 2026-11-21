/* Copied from apps-script/Rules.gs by tools/build.mjs. Edit the .gs file, not this one. */
/**
 * Rules.gs: the decisions, with no Google services in it.
 *
 * Everything here is plain JavaScript: it takes a request, the rows already in
 * the sheet, the settings and the time, and returns what should happen. Code.gs
 * does the reading, writing and sending. Keeping the two apart means the rules
 * can be tested without a Google account, and the demo page runs this exact file.
 */

var STATUS = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUOTED: 'Quoted',
  BOOKED: 'Booked',
  LOST: 'Lost',
  CHECK: 'Check contact',
  SPAM: 'Spam'
};

/** Statuses that count as still open, for duplicates, reminders and the digest. */
var OPEN_STATUSES = [STATUS.NEW, STATUS.CONTACTED, STATUS.QUOTED, STATUS.CHECK];

var DAY_MS = 24 * 60 * 60 * 1000;

/** Collapse whitespace and trim. Anything that isn't text becomes ''. */
function cleanText(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) value = value.join(', ');
  return String(value).replace(/\s+/g, ' ').trim();
}

/** Digits only, with a leading US country code 1 removed from 11-digit numbers. */
function cleanPhone(value) {
  var digits = cleanText(value).replace(/\D/g, '');
  if (digits.length === 11 && digits.charAt(0) === '1') digits = digits.slice(1);
  return digits;
}

/** (555) 010-4471 style, or the raw digits if it isn't 10 digits long. */
function formatPhone(digits) {
  if (!digits) return '';
  if (digits.length !== 10) return digits;
  return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
}

/** Accepts 2026-12-04, 12/4/2026 or a Date. Returns a Date at local midnight, or null. */
function parseMoveDate(value) {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  var text = cleanText(value);
  var m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  var y, mo, d;
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else {
    m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if (!m) return null;
    mo = +m[1]; d = +m[2]; y = +m[3]; if (y < 100) y += 2000;
  }
  var date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Whole calendar days from today to the move date (0 = today). */
function daysUntil(moveDate, now) {
  return Math.round((startOfDay(moveDate) - startOfDay(now)) / DAY_MS);
}

/** Turn whatever the form sent into one tidy request object. */
function normalizeRequest(raw) {
  raw = raw || {};
  return {
    name: cleanText(raw.name),
    email: cleanText(raw.email).toLowerCase(),
    phone: cleanPhone(raw.phone),
    moveDate: parseMoveDate(raw.moveDate),
    moveDateText: cleanText(raw.moveDate),
    fromTown: cleanText(raw.fromTown),
    toTown: cleanText(raw.toTown),
    homeSize: cleanText(raw.homeSize),
    notes: cleanText(raw.notes).slice(0, 1000),
    website: cleanText(raw.website), // honeypot: hidden from people, bots fill it in
    source: cleanText(raw.source) || 'Form'
  };
}

var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Typos common enough to point out. The customer email is held, not "fixed". */
var DOMAIN_TYPOS = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gnail.com': 'gmail.com',
  'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'hotmial.com': 'hotmail.com', 'outlok.com': 'outlook.com',
  'iclod.com': 'icloud.com'
};

/** Problems that stop the customer email, and smaller notes that don't. */
function validateRequest(req, now, cfg) {
  var problems = [];
  var notes = [];
  if (!req.name) problems.push('No name');
  if (!req.email && !req.phone) problems.push('No email or phone');
  if (req.email && !EMAIL_RE.test(req.email)) problems.push('Email looks wrong: ' + req.email);
  if (req.email && EMAIL_RE.test(req.email)) {
    var domain = req.email.split('@')[1];
    if (DOMAIN_TYPOS[domain]) problems.push('Email domain may be a typo (' + domain + ', did they mean ' + DOMAIN_TYPOS[domain] + '?)');
  }
  if (req.phone && req.phone.length !== 10) notes.push('Phone is not 10 digits');
  if (!req.moveDate) {
    if (req.moveDateText) notes.push('Move date not understood: ' + req.moveDateText);
    else notes.push('No move date');
  } else {
    var days = daysUntil(req.moveDate, now);
    if (days < 0) notes.push('Move date is in the past');
    else if (days > cfg.farOutDays) notes.push('Move date is more than ' + cfg.farOutDays + ' days out');
  }
  if (req.fromTown && !cfg.towns[req.fromTown]) notes.push('Moving from outside the listed towns');
  return { problems: problems, notes: notes, ok: problems.length === 0 };
}

/** Honeypot filled in, or more links in the notes than a real person sends. */
function spamCheck(req, cfg) {
  if (req.website) return { spam: true, reason: 'Hidden field was filled in' };
  var links = (req.notes.match(/https?:\/\/|www\./gi) || []).length;
  if (links > cfg.maxLinks) return { spam: true, reason: links + ' links in the notes' };
  return { spam: false, reason: '' };
}

/** Same email or same phone, still open, received within the window. Newest match wins. */
function findDuplicate(req, rows, now, cfg) {
  var since = now.getTime() - cfg.duplicateDays * DAY_MS;
  var match = null;
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (OPEN_STATUSES.indexOf(row.status) === -1) continue;
    var received = row.received instanceof Date ? row.received.getTime() : new Date(row.received).getTime();
    if (!(received >= since)) continue;
    var sameEmail = req.email && row.email && req.email === String(row.email).toLowerCase();
    var samePhone = req.phone && row.phone && req.phone === cleanPhone(row.phone);
    if (sameEmail || samePhone) {
      if (!match || received > new Date(match.row.received).getTime()) {
        match = { row: row, index: i, on: sameEmail ? 'email' : 'phone' };
      }
    }
  }
  return match;
}

/** Who gets it. Long-distance first, then the area of the town they're leaving. */
function route(req, cfg) {
  var toLocal = !!cfg.towns[req.toTown];
  var fromArea = cfg.towns[req.fromTown];
  if (req.toTown && !toLocal) {
    return { area: 'Long distance', person: cfg.longDistance, reason: 'Destination is not one of the local towns, so it is long distance' };
  }
  if (fromArea && cfg.areas[fromArea]) {
    var a = cfg.areas[fromArea];
    return { area: a.name, person: { name: a.estimator, email: a.email }, reason: req.fromTown + ' is in the ' + a.name + ' area' };
  }
  return { area: 'Unassigned', person: cfg.owner, reason: 'Town not on the routing tab, so it goes to the office' };
}

/** Rush if the move is close; tags for jobs that need more than a phone quote. */
function prioritize(req, now, cfg) {
  var tags = [];
  var priority = 'Normal';
  if (req.moveDate) {
    var days = daysUntil(req.moveDate, now);
    if (days >= 0 && days <= cfg.rushDays) {
      priority = 'Rush';
      tags.push(days === 0 ? 'Moving today' : 'Moving in ' + days + (days === 1 ? ' day' : ' days'));
    }
  }
  if (cfg.siteVisitSizes.indexOf(req.homeSize) !== -1) tags.push('Site visit');
  if (/piano|safe|pool table|hot tub/i.test(req.notes)) tags.push('Heavy item');
  if (/storage/i.test(req.notes)) tags.push('Storage');
  return { priority: priority, tags: tags };
}

function isOpenAt(date, cfg) {
  var day = date.getDay();
  var hour = date.getHours() + date.getMinutes() / 60;
  return cfg.hours.days.indexOf(day) !== -1 && hour >= cfg.hours.open && hour < cfg.hours.close;
}

/**
 * Add business hours to a time. Requests that arrive after hours start the
 * clock at the next opening. Rush requests use half the usual window.
 */
function addBusinessHours(start, hours, cfg) {
  var t = new Date(start.getTime());
  var left = hours * 60; // minutes
  var guard = 0;
  while (left > 0 && guard < 60 * 24 * 14) {
    guard++;
    if (!isOpenAt(t, cfg)) {
      // jump to the next opening
      var next = new Date(t.getFullYear(), t.getMonth(), t.getDate(), cfg.hours.open, 0, 0, 0);
      if (t >= next) next = new Date(next.getTime() + DAY_MS);
      while (cfg.hours.days.indexOf(next.getDay()) === -1) next = new Date(next.getTime() + DAY_MS);
      // keep the wall-clock opening hour across daylight saving changes
      next = new Date(next.getFullYear(), next.getMonth(), next.getDate(), cfg.hours.open, 0, 0, 0);
      t = next;
      continue;
    }
    var close = new Date(t.getFullYear(), t.getMonth(), t.getDate(), cfg.hours.close, 0, 0, 0);
    var room = Math.round((close - t) / 60000);
    if (left <= room) { t = new Date(t.getTime() + left * 60000); left = 0; }
    else { left -= room; t = close; }
  }
  return t;
}

function pad(n, width) {
  var s = String(n);
  while (s.length < width) s = '0' + s;
  return s;
}

/** CWM-2611-0042: prefix, year and month received, then a running number. */
function makeRef(cfg, now, seq) {
  return cfg.refPrefix + '-' + pad(now.getFullYear() % 100, 2) + pad(now.getMonth() + 1, 2) + '-' + pad(seq, 4);
}

/**
 * The whole decision for one request. Returns the row to write (or the row to
 * update), the emails to send and a step-by-step log. Nothing is sent here.
 *
 * ctx: { now: Date, rows: [existing rows], seq: next running number, cfg }
 */
function processRequest(raw, ctx) {
  var cfg = ctx.cfg, now = ctx.now;
  var req = normalizeRequest(raw);
  var log = [];
  var emails = [];
  var step = function (name, detail, state) { log.push({ step: name, detail: detail, state: state || 'ok' }); };

  step('Received', 'From ' + req.source + (req.name ? ', ' + req.name : ''));

  var spam = spamCheck(req, cfg);
  if (spam.spam) {
    step('Spam check', spam.reason + '. Logged as Spam, nobody is emailed.', 'stop');
    return {
      outcome: 'spam',
      row: buildRow(req, ctx, { status: STATUS.SPAM, priority: '', tags: [], route: null, flags: ['Spam: ' + spam.reason], dueBy: null }),
      emails: emails, log: log
    };
  }
  step('Spam check', 'Passed (hidden field empty, ' + ((req.notes.match(/https?:\/\/|www\./gi) || []).length) + ' links)');

  var check = validateRequest(req, now, cfg);
  if (check.ok) step('Contact check', (req.email ? 'Email looks right' : 'No email') + (req.phone ? ', phone ' + formatPhone(req.phone) : ''));
  else step('Contact check', check.problems.join('; ') + '. Held for a person to check.', 'warn');
  check.notes.forEach(function (n) { step('Note', n, 'warn'); });

  var dup = findDuplicate(req, ctx.rows, now, cfg);
  if (dup) {
    var prev = dup.row;
    step('Duplicate check', 'Same ' + dup.on + ' as ' + prev.ref + ' (' + prev.status + '). Added to that row instead of making a new one.', 'warn');
    var merged = mergeIntoRow(prev, req, now, check);
    step('Sheet', 'Updated ' + prev.ref + ': repeat count ' + merged.repeats + ', newest details kept');
    if (prev.estimatorEmail) {
      emails.push({ to: prev.estimatorEmail, kind: 'repeat', ref: prev.ref });
      step('Email', 'Heads-up to ' + prev.estimator + ': this person asked again', 'mail');
    }
    step('Customer email', 'Not sent again (they already have ' + prev.ref + ')', 'skip');
    return { outcome: 'merged', row: merged, index: dup.index, emails: emails, log: log };
  }
  step('Duplicate check', 'No open request with this email or phone in the last ' + cfg.duplicateDays + ' days');

  var r = route(req, cfg);
  step('Routing', r.reason + ' → ' + r.person.name, r.area === 'Unassigned' ? 'warn' : 'ok');

  var p = prioritize(req, now, cfg);
  var replyWindow = p.priority === 'Rush' ? cfg.responseHours / 2 : cfg.responseHours;
  var dueBy = addBusinessHours(now, replyWindow, cfg);
  step('Priority', p.priority + (p.tags.length ? ' · ' + p.tags.join(', ') : '') + '. Reply due within ' + replyWindow + ' business ' + (replyWindow === 1 ? 'hour' : 'hours'));

  var flags = check.problems.concat(check.notes);
  var status = check.ok ? STATUS.NEW : STATUS.CHECK;
  var row = buildRow(req, ctx, { status: status, priority: p.priority, tags: p.tags, route: r, flags: flags, dueBy: dueBy });
  step('Sheet', 'New row ' + row.ref + ' on Requests, status ' + status);

  emails.push({ to: r.person.email, kind: 'alert', ref: row.ref });
  step('Email', 'New-request alert to ' + r.person.name + ' <' + r.person.email + '>', 'mail');

  if (check.ok && req.email) {
    emails.push({ to: req.email, kind: 'confirmation', ref: row.ref });
    step('Customer email', 'Confirmation with ' + row.ref + ' sent to ' + req.email, 'mail');
  } else {
    step('Customer email', check.ok ? 'No email given, so the estimator calls instead' : 'Held until someone checks the contact details', 'skip');
  }
  return { outcome: status === STATUS.NEW ? 'logged' : 'check', row: row, emails: emails, log: log };
}

function buildRow(req, ctx, d) {
  return {
    ref: makeRef(ctx.cfg, ctx.now, ctx.seq),
    received: ctx.now,
    source: req.source,
    status: d.status,
    priority: d.priority,
    name: req.name,
    email: req.email,
    phone: formatPhone(req.phone),
    moveDate: req.moveDate,
    fromTown: req.fromTown,
    toTown: req.toTown,
    homeSize: req.homeSize,
    notes: req.notes,
    area: d.route ? d.route.area : '',
    estimator: d.route ? d.route.person.name : '',
    estimatorEmail: d.route ? d.route.person.email : '',
    dueBy: d.dueBy,
    remindedAt: null,
    tags: d.tags.join(', '),
    flags: d.flags.join('; '),
    repeats: 0,
    updated: ctx.now
  };
}

/** Keep the original ref and estimator, take the newest details, note the repeat. */
function mergeIntoRow(prev, req, now, check) {
  var row = {};
  for (var k in prev) if (Object.prototype.hasOwnProperty.call(prev, k)) row[k] = prev[k];
  if (req.moveDate) row.moveDate = req.moveDate;
  if (req.homeSize) row.homeSize = req.homeSize;
  if (req.toTown) row.toTown = req.toTown;
  if (req.phone && !cleanPhone(row.phone)) row.phone = formatPhone(req.phone);
  if (req.email && !row.email) row.email = req.email;
  if (req.notes && row.notes.indexOf(req.notes) === -1) row.notes = (row.notes ? row.notes + ' | ' : '') + req.notes;
  row.repeats = (+prev.repeats || 0) + 1;
  if (!check.ok) row.flags = (row.flags ? row.flags + '; ' : '') + check.problems.join('; ');
  row.updated = now;
  return row;
}

/** Still New after the reply window, and not reminded yet. */
function findOverdue(rows, now) {
  return rows.filter(function (row) {
    if (row.status !== STATUS.NEW || row.remindedAt) return false;
    var due = row.dueBy instanceof Date ? row.dueBy : new Date(row.dueBy);
    return !isNaN(due.getTime()) && due <= now;
  });
}

/** The numbers and lists for the morning email to the office. */
function buildDigest(rows, now, cfg) {
  var since = new Date(startOfDay(now).getTime() - DAY_MS);
  var today = startOfDay(now);
  var yesterday = rows.filter(function (r) { var t = new Date(r.received); return t >= since && t < today; });
  var open = rows.filter(function (r) { return OPEN_STATUSES.indexOf(r.status) !== -1; });
  var byPerson = {};
  open.forEach(function (r) {
    var key = r.estimator || 'Unassigned';
    byPerson[key] = byPerson[key] || { name: key, open: 0, overdue: 0, rush: 0 };
    byPerson[key].open++;
    if (r.status === STATUS.NEW && new Date(r.dueBy) <= now) byPerson[key].overdue++;
    if (r.priority === 'Rush') byPerson[key].rush++;
  });
  var movesSoon = open.filter(function (r) {
    if (!r.moveDate) return false;
    var d = daysUntil(new Date(r.moveDate), now);
    return d >= 0 && d <= cfg.rushDays;
  }).sort(function (a, b) { return new Date(a.moveDate) - new Date(b.moveDate); });
  return {
    date: now,
    received: yesterday.filter(function (r) { return r.status !== STATUS.SPAM; }).length,
    spam: yesterday.filter(function (r) { return r.status === STATUS.SPAM; }).length,
    needsCheck: open.filter(function (r) { return r.status === STATUS.CHECK; }),
    overdue: open.filter(function (r) { return r.status === STATUS.NEW && new Date(r.dueBy) <= now; }),
    movesSoon: movesSoon,
    people: Object.keys(byPerson).sort().map(function (k) { return byPerson[k]; }),
    open: open.length
  };
}

/** Settings and routing tabs as plain data, turned into the config the rules use. */
function buildConfig(settings, routing) {
  var num = function (key, fallback) { var v = parseFloat(settings[key]); return isNaN(v) ? fallback : v; };
  var list = function (key, fallback) { return settings[key] ? String(settings[key]).split(',').map(cleanText).filter(String) : fallback; };
  var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var cfg = {
    businessName: settings['Business name'] || 'Copperwick Moving Co.',
    refPrefix: settings['Reference prefix'] || 'CWM',
    replyTo: settings['Reply-to email'] || '',
    phone: settings['Office phone'] || '',
    owner: { name: settings['Office name'] || 'Office', email: settings['Office email'] || '' },
    longDistance: { name: settings['Long-distance name'] || 'Office', email: settings['Long-distance email'] || settings['Office email'] || '' },
    responseHours: num('Reply within (business hours)', 2),
    rushDays: num('Rush if moving within (days)', 7),
    duplicateDays: num('Duplicate window (days)', 14),
    farOutDays: num('Flag moves further out than (days)', 365),
    maxLinks: num('Max links in notes', 1),
    digestHour: num('Morning digest hour', 7),
    siteVisitSizes: list('Site visit for', ['4 bedrooms', '5+ bedrooms']),
    hours: {
      open: num('Open (hour)', 8),
      close: num('Close (hour)', 18),
      days: list('Open days', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map(function (d) { return dayNames.indexOf(d.slice(0, 3)); }).filter(function (d) { return d >= 0; })
    },
    towns: {},
    areas: {}
  };
  routing.forEach(function (r) {
    var town = cleanText(r.town), area = cleanText(r.area);
    if (!town || !area) return;
    cfg.towns[town] = area;
    if (!cfg.areas[area]) cfg.areas[area] = { name: area, estimator: cleanText(r.estimator), email: cleanText(r.email) };
  });
  return cfg;
}
