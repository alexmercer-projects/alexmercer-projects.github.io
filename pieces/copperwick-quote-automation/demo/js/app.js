/* Copperwick quote automation demo. Runs Rules.gs and Emails.gs (copied to rules.js and emails.js) in the page. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var STATIC = /[?&]static\b/.test(location.search);
  var cfg = buildConfig(DEMO_SETTINGS, DEMO_ROUTING);
  var loadedAt = Date.now();
  var start = new Date(DEMO_START[0], DEMO_START[1], DEMO_START[2], DEMO_START[3], DEMO_START[4]);
  function clock() { return new Date(start.getTime() + (Date.now() - loadedAt)); }
  function at(daysAgo, h, m) { return new Date(start.getFullYear(), start.getMonth(), start.getDate() - daysAgo, h, m); }
  function $(s, el) { return (el || document).querySelector(s); }
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }

  /* ---------- replay the example history through the real rules ---------- */
  var state;
  function seed() {
    var rows = [], log = [], seq = 1;
    var lastRun = null;
    var events = DEMO_HISTORY.map(function (x) { return { t: at(x[0], x[1], x[2]), req: x[3], later: x[4] }; })
      .sort(function (a, b) { return a.t - b.t; });
    var hour = new Date(events[0].t); hour.setMinutes(0, 0, 0);
    var pending = [];
    function hourlyUntil(t) {
      while (hour.getTime() + 3600000 <= t.getTime()) {
        hour = new Date(hour.getTime() + 3600000);
        pending = pending.filter(function (p) {
          if (p.when <= hour) { p.row.status = p.later; p.row.updated = p.when; log.push([p.when, 'Status', p.row.ref, 'Set to ' + p.later + ' by ' + p.row.estimator]); return false; }
          return true;
        });
        findOverdue(rows, hour).forEach(function (row) {
          row.remindedAt = new Date(hour); row.updated = new Date(hour);
          log.push([new Date(hour), 'Reminder', row.ref, 'Still New past ' + fmtDateTime(row.dueBy) + ', sent to ' + row.estimatorEmail + ' and ' + cfg.owner.email]);
        });
      }
    }
    events.forEach(function (ev) {
      hourlyUntil(ev.t);
      var r = ev.req, md = new Date(ev.t.getFullYear(), ev.t.getMonth(), ev.t.getDate() + r.moveIn);
      var raw = {}; for (var k in r) raw[k] = r[k];
      raw.moveDate = md; raw.source = 'Google Form';
      var res = processRequest(raw, { now: ev.t, rows: rows, seq: seq, cfg: cfg });
      if (res.outcome === 'merged') rows[res.index] = res.row; else { rows.push(res.row); seq++; }
      log.push([ev.t, res.outcome, res.row.ref, res.log.map(function (l) { return l.step + ': ' + l.detail; }).join(' | ')]);
      lastRun = { res: res, t: ev.t };
      if (ev.later) pending.push({ row: res.row, later: ev.later, when: new Date(ev.t.getTime() + 50 * 60000) });
    });
    hourlyUntil(start);
    return { rows: rows, log: log, seq: seq, flash: -1, lastRun: lastRun };
  }
  state = seed();

  /* ---------- sheet rendering ---------- */
  var ALL = COLUMNS_VIEW();
  function COLUMNS_VIEW() {
    return [
      ['Ref', 'ref'], ['Received', 'received', 'dt'], ['Source', 'source'], ['Status', 'status', 'status'], ['Priority', 'priority', 'prio'],
      ['Name', 'name'], ['Email', 'email'], ['Phone', 'phone'], ['Move date', 'moveDate', 'd'], ['From', 'fromTown'],
      ['To', 'toTown'], ['Home size', 'homeSize'], ['Notes', 'notes', 'wide'], ['Area', 'area'], ['Estimator', 'estimator'],
      ['Estimator email', 'estimatorEmail'], ['Reply by', 'dueBy', 'dt'], ['Reminded at', 'remindedAt', 'dt'], ['Tags', 'tags'],
      ['Flags', 'flags', 'wide'], ['Repeats', 'repeats', 'n'], ['Updated', 'updated', 'dt']
    ];
  }
  var LIVE = ['ref', 'received', 'status', 'priority', 'name', 'phone', 'email', 'moveDate', 'fromTown', 'toTown', 'estimator', 'dueBy', 'tags', 'flags', 'repeats'];
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function shortDT(d) { if (!d) return ''; d = new Date(d); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + fmtTime(d); }
  function shortD(d) { if (!d) return ''; d = new Date(d); return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear(); }
  function cell(row, col) {
    var v = row[col[1]], kind = col[2];
    if (kind === 'dt') return esc(shortDT(v));
    if (kind === 'd') return esc(shortD(v));
    if (kind === 'status') return '<span class="st st--' + String(v).toLowerCase().replace(/\s+/g, '-') + '">' + esc(v) + '</span>';
    if (kind === 'prio') return v === 'Rush' ? '<span class="rush">Rush</span>' : esc(v);
    if (kind === 'n') return v ? esc(v) : '';
    return esc(v);
  }
  function letters(i) { return String.fromCharCode(65 + i); }
  function renderGrid(el, cols, rows, opts) {
    opts = opts || {};
    var t = '<table><thead><tr class="letters"><th class="rn"></th>' + cols.map(function (c, i) { return '<th>' + letters(i) + '</th>'; }).join('') + '</tr>' +
      '<tr class="hdr"><th class="rn">1</th>' + cols.map(function (c) { return '<th class="' + (c[2] === 'wide' ? 'wide' : '') + '">' + esc(c[0]) + '</th>'; }).join('') + '</tr></thead><tbody>';
    rows.forEach(function (r, i) {
      var cls = (opts.flash === i ? 'flash ' : '') + (r.status === 'Spam' ? 'is-spam' : '');
      t += '<tr class="' + cls + '"><td class="rn">' + (i + 2) + '</td>' + cols.map(function (c) {
        return '<td class="' + (c[2] === 'wide' ? 'wide' : '') + (c[1] === 'ref' ? ' ref' : '') + '">' + (opts.raw ? r[c[1]] : cell(r, c)) + '</td>';
      }).join('') + '</tr>';
    });
    el.innerHTML = t + '</tbody></table>';
  }
  function liveCols() { return ALL.filter(function (c) { return LIVE.indexOf(c[1]) !== -1; }).sort(function (a, b) { return LIVE.indexOf(a[1]) - LIVE.indexOf(b[1]); }); }
  function renderLive() {
    var el = $('#live-sheet');
    renderGrid(el, liveCols(), state.rows, { flash: state.flash });
    if (state.flash >= 0) {
      var tr = el.querySelectorAll('tbody tr')[state.flash];
      if (tr) el.scrollTop = Math.max(0, tr.offsetTop - el.clientHeight + tr.offsetHeight + 8);
    } else el.scrollTop = el.scrollHeight;
  }

  /* ---------- the form ---------- */
  var form = $('#qform');
  function options(sel, list, placeholder) {
    sel.innerHTML = (placeholder ? '<option value="">' + esc(placeholder) + '</option>' : '') + list.map(function (v) { return '<option>' + esc(v) + '</option>'; }).join('');
  }
  var towns = DEMO_ROUTING.map(function (r) { return r.town; });
  options($('#f-size'), DEMO_HOME_SIZES, 'Choose…');
  options($('#f-from'), towns, 'Choose…');
  options($('#f-to'), towns.concat([DEMO_OUTSIDE]), 'Choose…');
  function iso(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function plusDays(n) { var d = clock(); return iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); }
  var PRESETS = {
    normal: { name: 'Ana Lopez', email: 'ana.lopez@example.com', phone: '555-010-4471', moveDate: 24, homeSize: '2 bedrooms', fromTown: 'Coldwater', toTown: 'Sorrel Bend', notes: 'Second floor apartment, parking out front' },
    rush: { name: 'Caleb Ferris', email: 'caleb.f@example.com', phone: '555-010-3902', moveDate: 3, homeSize: '1 bedroom', fromTown: 'Easton Mills', toTown: 'Fallow Creek', notes: 'Lease ends Friday' },
    repeat: { name: 'Diego Ramos', email: 'diego.ramos@example.com', phone: '555-010-2675', moveDate: 28, homeSize: '3 bedrooms', fromTown: 'Pell Corner', toTown: 'Easton Mills', notes: 'Date might move a couple of days, still need a quote' },
    typo: { name: 'Ruth Sandoval', email: 'ruth.sandoval@yaho.com', phone: '555-010-6138', moveDate: 16, homeSize: '2 bedrooms', fromTown: 'Wyeth', toTown: 'Coldwater', notes: '' },
    long: { name: 'Wes Carrow', email: 'wes.carrow@example.com', phone: '555-010-7720', moveDate: 40, homeSize: '4 bedrooms', fromTown: 'Alder Flats', toTown: DEMO_OUTSIDE, notes: 'Moving out of state, we have a piano' },
    spam: { name: 'Rank Booster', email: 'seo@example.com', phone: '', moveDate: 2, homeSize: 'Studio', fromTown: 'Brannock', toTown: 'Brannock', notes: 'Get page one fast http://example.com/x http://example.com/y', bot: true }
  };
  function fill(p) {
    ['name', 'email', 'phone', 'homeSize', 'fromTown', 'toTown', 'notes'].forEach(function (k) { form.elements[k].value = p[k]; });
    form.elements.moveDate.value = plusDays(p.moveDate);
    $('#f-bot').checked = !!p.bot;
    form.elements.website.value = p.bot ? 'example.com' : '';
  }
  document.querySelectorAll('[data-preset]').forEach(function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('[data-preset]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
      fill(PRESETS[b.dataset.preset]);
      submit();
      if (!STATIC && window.innerWidth < 1040) $('.console').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  $('#f-bot').addEventListener('change', function () { form.elements.website.value = this.checked ? 'example.com' : ''; });
  form.addEventListener('submit', function (e) { e.preventDefault(); document.querySelectorAll('[data-preset]').forEach(function (x) { x.classList.remove('is-on'); }); submit(); });

  var runToken = 0;
  function showLastRun() {
    if (!state.lastRun) return;
    var res = state.lastRun.res;
    var logEl = $('#run-log');
    logEl.innerHTML = '';
    logEl.appendChild(h('li', 'meta', '<span class="i">$</span><span><b>Last run: ' + esc(fmtDateTime(state.lastRun.t)) + '</b> · ' + esc(res.row.ref) + ' · pick an example to send a new one</span>'));
    res.log.forEach(function (l) { logEl.appendChild(h('li', 's-' + l.state + ' still', '<span class="i">' + ICON[l.state] + '</span><span><b>' + esc(l.step) + '</b> ' + esc(l.detail) + '</span>')); });
    $('#run-status').textContent = 'last run: ' + LABEL[res.outcome]; $('#run-status').className = 'console__status mono is-' + res.outcome;
    showMail(res);
  }
  function submit() {
    var raw = { source: 'Website' };
    ['name', 'email', 'phone', 'moveDate', 'homeSize', 'fromTown', 'toTown', 'notes', 'website'].forEach(function (k) { raw[k] = form.elements[k].value; });
    var now = clock();
    var res = processRequest(raw, { now: now, rows: state.rows, seq: state.seq, cfg: cfg });
    if (res.outcome === 'merged') { state.rows[res.index] = res.row; state.flash = res.index; }
    else { state.rows.push(res.row); state.seq++; state.flash = state.rows.length - 1; }
    state.log.push([now, res.outcome, res.row.ref, res.log.map(function (l) { return l.step + ': ' + l.detail; }).join(' | ')]);
    showRun(res, now);
  }

  var LABEL = { logged: 'logged', merged: 'updated existing row', check: 'held: check contact', spam: 'caught as spam' };
  var ICON = { ok: '✓', warn: '!', stop: '×', mail: '→', skip: '–' };
  function showRun(res, now) {
    var token = ++runToken;
    var logEl = $('#run-log'), status = $('#run-status');
    logEl.innerHTML = '';
    status.textContent = 'running…'; status.className = 'console__status mono is-run';
    var lines = res.log.slice();
    var head = h('li', 'meta', '<span class="i">$</span><span><b>' + esc(fmtDateTime(now)) + '</b> · demo clock · ' + esc(res.row.ref) + '</span>');
    logEl.appendChild(head);
    var i = 0;
    function next() {
      if (token !== runToken) return;
      if (i >= lines.length) {
        status.textContent = LABEL[res.outcome]; status.className = 'console__status mono is-' + res.outcome;
        renderLive(); renderTabs(); showMail(res);
        return;
      }
      var l = lines[i++];
      var li = h('li', 's-' + l.state, '<span class="i">' + ICON[l.state] + '</span><span><b>' + esc(l.step) + '</b> ' + esc(l.detail) + '</span>');
      logEl.appendChild(li);
      logEl.scrollTop = logEl.scrollHeight;
      if (STATIC || !document.documentElement.classList.contains('anim')) next(); else setTimeout(next, 150);
    }
    next();
  }

  function messageFor(kind, row) {
    if (kind === 'confirmation') return confirmationEmail(row, cfg);
    if (kind === 'alert') return alertEmail(row, cfg, '');
    if (kind === 'repeat') return repeatEmail(row, cfg);
    if (kind === 'reminder') return reminderEmail(row, cfg);
  }
  var KIND = { confirmation: 'To the customer', alert: 'To the estimator', repeat: 'Heads-up', reminder: 'Reminder' };
  function mailView(kind, to, row, replyTo) {
    var m = messageFor(kind, row);
    return '<div class="mail__meta"><span><b>To</b> ' + esc(to) + '</span>' + (replyTo ? '<span><b>Reply-to</b> ' + esc(replyTo) + '</span>' : '') + '</div>' +
      '<div class="mail__subject">' + esc(m.subject) + '</div><div class="mail__html">' + m.html + '</div>';
  }
  function replyToFor(kind, row) { return kind === 'confirmation' ? cfg.replyTo : row.email; }
  function showMail(res) {
    var tabs = $('#mail-tabs'), body = $('#mail-body');
    tabs.innerHTML = '';
    if (!res.emails.length) { body.innerHTML = '<p class="muted">No emails for this one. ' + (res.outcome === 'spam' ? 'Spam is logged on the sheet as Spam and nobody is emailed.' : '') + '</p>'; return; }
    res.emails.forEach(function (e, i) {
      var b = h('button', '', esc(KIND[e.kind]) + '<small>' + esc(e.to) + '</small>');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        tabs.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
        body.innerHTML = mailView(e.kind, e.to, res.row, replyToFor(e.kind, res.row));
      });
      tabs.appendChild(b);
    });
    if (res.outcome === 'check') tabs.appendChild(h('span', 'mail__held', 'No customer email until the contact details are checked'));
    if (res.outcome === 'merged') tabs.appendChild(h('span', 'mail__held', 'No second confirmation to the customer'));
    body.innerHTML = mailView(res.emails[0].kind, res.emails[0].to, res.row, replyToFor(res.emails[0].kind, res.row));
  }

  $('#reset').addEventListener('click', function () {
    state = seed();
    showLastRun();
    document.querySelectorAll('[data-preset]').forEach(function (x) { x.classList.remove('is-on'); });
    form.reset();
    renderLive(); renderTabs();
  });

  /* ---------- the four tabs ---------- */
  var currentTab = 'requests';
  function renderTabs() {
    var el = $('#tab-sheet');
    if (currentTab === 'requests') renderGrid(el, ALL, state.rows, {});
    else if (currentTab === 'routing') renderGrid(el, [['Town', 'town'], ['Area', 'area'], ['Estimator', 'estimator'], ['Email', 'email']], DEMO_ROUTING.map(function (r) { return { town: esc(r.town), area: esc(r.area), estimator: esc(r.estimator), email: esc(r.email) }; }), { raw: true });
    else if (currentTab === 'settings') renderGrid(el, [['Setting', 'k'], ['Value', 'v']], Object.keys(DEMO_SETTINGS).map(function (k) { return { k: esc(k), v: esc(DEMO_SETTINGS[k]) }; }), { raw: true });
    else renderGrid(el, [['When', 'w'], ['What', 'what'], ['Ref', 'ref'], ['Details', 'd', 'wide']], state.log.slice().reverse().map(function (l) { return { w: esc(shortDT(l[0])), what: esc(l[1]), ref: esc(l[2]), d: '<span class="logd">' + esc(l[3]) + '</span>' }; }), { raw: true });
  }
  document.querySelectorAll('#sheet-tabs [data-tab]').forEach(function (b) {
    b.addEventListener('click', function () {
      currentTab = b.dataset.tab;
      document.querySelectorAll('#sheet-tabs [data-tab]').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      renderTabs();
    });
  });

  /* ---------- static examples built from the seeded rows ---------- */
  function byName(n) { for (var i = 0; i < state.rows.length; i++) if (state.rows[i].name === n) return state.rows[i]; }
  var diego = byName('Diego Ramos'), omar = byName('Omar Haddad');
  if (diego) {
    $('#hero-ref').textContent = diego.ref;
    var hs = document.querySelectorAll('#hero-steps li span:not(.t)');
    if (hs[3]) hs[3].textContent = 'Status New, reply by ' + fmtTime(diego.dueBy);
    var last = document.querySelector('#hero-steps li.later span:not(.t)');
    if (last) last.textContent = 'Still New at ' + fmtTime(diego.dueBy) + '? Rosa and the office get a reminder';
    var samples = $('#mail-samples');
    var again = {}; for (var k in diego) again[k] = diego[k]; again.repeats = 1;
    [['confirmation', diego.email, diego, 'Confirmation · to the customer'], ['alert', diego.estimatorEmail, diego, 'Alert · to the estimator'], ['repeat', diego.estimatorEmail, again, 'Heads-up · same person again']].forEach(function (s) {
      var card = h('article', 'mailcard card');
      card.innerHTML = '<p class="mailcard__k mono">' + esc(s[3]) + '</p>' + mailView(s[0], s[1], s[2], replyToFor(s[0], s[2]));
      samples.appendChild(card);
    });
  }
  if (omar) {
    var seven = at(0, cfg.digestHour, 0);
    var day = $('#day-line');
    var rec = new Date(omar.received);
    var FULLDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    $('.day__title .muted').textContent = ' · ' + FULLDAY[rec.getDay()] + ' ' + MONTHS[rec.getMonth()] + ' ' + rec.getDate();
    [[rec, 'Request in', omar.name + ', office move, ' + omar.fromTown + ' → ' + omar.toTown + '. Routed to ' + omar.estimator + ', alert sent.'],
     [omar.dueBy, 'Reply-by passes', 'Status is still New on the sheet. Nobody has called.'],
     [omar.remindedAt, 'Hourly check', 'One reminder to ' + omar.estimatorEmail + ' and ' + cfg.owner.email + '. "Reminded at" is stamped so it only fires once.'],
     [seven, 'Next morning', 'The digest lists ' + omar.ref + ' under Overdue until someone changes the status.']
    ].forEach(function (s, i) {
      day.appendChild(h('li', i === 2 ? 'is-hot' : '', '<span class="mono">' + esc(i === 3 ? WEEKDAYS[seven.getDay()] + ' ' + fmtTime(seven) : fmtTime(s[0])) + '</span><b>' + esc(s[1]) + '</b><p>' + esc(s[2]) + '</p>'));
    });
    var asOf = state.rows.filter(function (r) { return new Date(r.received) < seven; });
    var dg = digestEmail(buildDigest(asOf, seven, cfg), cfg);
    $('#digest-subject').textContent = dg.subject;
    $('#digest-html').innerHTML = dg.html;
  }

  renderLive();
  renderTabs();
  showLastRun();

  /* ---------- nav highlight + fade-ins ---------- */
  var links = [].slice.call(document.querySelectorAll('.nav a'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) links.forEach(function (a) { a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id); }); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { so.observe(s); });
  } else document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-in'); });
})();
