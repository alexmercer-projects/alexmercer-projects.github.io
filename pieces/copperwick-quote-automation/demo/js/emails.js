/* Copied from apps-script/Emails.gs by tools/build.mjs. Edit the .gs file, not this one. */
/**
 * Emails.gs: the wording of every email, as plain functions.
 * Each returns { subject, text, html }. Code.gs sends them; the demo page shows them.
 */

function esc(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fmtDate(d) {
  if (!d) return 'not given';
  d = new Date(d);
  return WEEKDAYS[d.getDay()] + ' ' + MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

function fmtTime(d) {
  d = new Date(d);
  var h = d.getHours(), m = d.getMinutes();
  return (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m + ' ' + (h < 12 ? 'AM' : 'PM');
}

function fmtDateTime(d) {
  d = new Date(d);
  return WEEKDAYS[d.getDay()] + ' ' + MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + fmtTime(d);
}

function firstName(name) {
  return String(name || '').split(' ')[0] || 'there';
}

/** A simple, readable HTML wrapper that survives Gmail and Outlook. */
function wrapHtml(cfg, title, bodyHtml) {
  return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1d1a17;max-width:560px">' +
    '<div style="font-weight:bold;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#a4502a;margin-bottom:14px">' + esc(cfg.businessName) + '</div>' +
    bodyHtml +
    '<div style="margin-top:22px;padding-top:12px;border-top:1px solid #e4ddd2;font-size:12.5px;color:#6b635a">' + esc(cfg.businessName) + (cfg.phone ? ' · ' + esc(cfg.phone) : '') + '</div>' +
    '</div>';
}

function detailTable(pairs) {
  return '<table style="border-collapse:collapse;margin:12px 0;font-size:14px">' + pairs.map(function (p) {
    return '<tr><td style="padding:4px 14px 4px 0;color:#6b635a;vertical-align:top">' + esc(p[0]) + '</td><td style="padding:4px 0;font-weight:bold">' + esc(p[1]) + '</td></tr>';
  }).join('') + '</table>';
}

function detailText(pairs) {
  return pairs.map(function (p) { return p[0] + ': ' + p[1]; }).join('\n');
}

/** To the customer, right after they submit. */
function confirmationEmail(row, cfg) {
  var pairs = [
    ['Reference', row.ref],
    ['Move date', fmtDate(row.moveDate)],
    ['From', row.fromTown || 'not given'],
    ['To', row.toTown || 'not given'],
    ['Home size', row.homeSize || 'not given']
  ];
  var when = row.priority === 'Rush'
    ? 'Because your move is coming up soon, ' + firstName(row.estimator) + ' will call you first, by ' + fmtDateTime(row.dueBy) + '.'
    : firstName(row.estimator) + ', who handles quotes for your area, will be in touch by ' + fmtDateTime(row.dueBy) + '.';
  var text = 'Hi ' + firstName(row.name) + ',\n\n' +
    'Thanks for asking ' + cfg.businessName + ' for a moving quote. We have your request:\n\n' +
    detailText(pairs) + '\n\n' + when + '\n\n' +
    'If anything above is wrong, just reply to this email and mention ' + row.ref + '.\n\n' + cfg.businessName;
  var html = wrapHtml(cfg, 'Quote request',
    '<p style="margin:0 0 12px">Hi ' + esc(firstName(row.name)) + ',</p>' +
    '<p style="margin:0 0 4px">Thanks for asking ' + esc(cfg.businessName) + ' for a moving quote. We have your request:</p>' +
    detailTable(pairs) +
    '<p style="margin:0 0 12px">' + esc(when) + '</p>' +
    '<p style="margin:0">If anything above is wrong, just reply to this email and mention ' + esc(row.ref) + '.</p>');
  return { subject: 'We got your moving quote request (' + row.ref + ')', text: text, html: html };
}

/** To the estimator the request was routed to. */
function alertEmail(row, cfg, sheetUrl) {
  var pairs = [
    ['Name', row.name],
    ['Phone', row.phone || 'not given'],
    ['Email', row.email || 'not given'],
    ['Move date', fmtDate(row.moveDate)],
    ['From → to', (row.fromTown || '?') + ' → ' + (row.toTown || '?')],
    ['Home size', row.homeSize || 'not given'],
    ['Reply by', fmtDateTime(row.dueBy)]
  ];
  if (row.tags) pairs.push(['Tags', row.tags]);
  if (row.flags) pairs.push(['Check', row.flags]);
  if (row.notes) pairs.push(['Notes', row.notes]);
  var head = (row.priority === 'Rush' ? 'RUSH · ' : '') + (row.status === STATUS.CHECK ? 'CHECK CONTACT · ' : '');
  var text = 'New quote request ' + row.ref + ' for ' + (row.area || 'the office') + '.\n\n' + detailText(pairs) +
    '\n\nWhen you have called them, set the status on the sheet to Contacted so the reminder doesn\'t fire.' + (sheetUrl ? '\n' + sheetUrl : '');
  var html = wrapHtml(cfg, 'New request',
    '<p style="margin:0 0 4px"><b>New quote request ' + esc(row.ref) + '</b> for ' + esc(row.area || 'the office') + '.</p>' +
    detailTable(pairs) +
    '<p style="margin:0">When you have called them, set the status on the sheet to <b>Contacted</b> so the reminder doesn\'t fire.' +
    (sheetUrl ? ' <a href="' + esc(sheetUrl) + '" style="color:#a4502a">Open the sheet</a>' : '') + '</p>');
  return { subject: head + 'New quote: ' + row.name + ', ' + fmtDate(row.moveDate) + ' (' + row.ref + ')', text: text, html: html };
}

/** To the estimator when the same person asks again. */
function repeatEmail(row, cfg) {
  var text = row.name + ' sent the quote form again (' + row.repeats + (row.repeats === 1 ? ' repeat' : ' repeats') + ' on ' + row.ref + ').\n' +
    'Status on the sheet: ' + row.status + '. Move date now: ' + fmtDate(row.moveDate) + '.\n' +
    (row.notes ? 'Notes: ' + row.notes + '\n' : '') + '\nThey may be waiting on a call.';
  var html = wrapHtml(cfg, 'Repeat',
    '<p style="margin:0 0 10px"><b>' + esc(row.name) + '</b> sent the quote form again (' + row.repeats + (row.repeats === 1 ? ' repeat' : ' repeats') + ' on ' + esc(row.ref) + ').</p>' +
    detailTable([['Status on the sheet', row.status], ['Move date now', fmtDate(row.moveDate)], ['Phone', row.phone || 'not given']]) +
    '<p style="margin:0">They may be waiting on a call.</p>');
  return { subject: 'Asked again: ' + row.name + ' (' + row.ref + ')', text: text, html: html };
}

/** To the estimator, and copied to the office, when the reply window passes. */
function reminderEmail(row, cfg) {
  var text = row.ref + ' (' + row.name + ', ' + row.phone + ') is still marked New. It was due by ' + fmtDateTime(row.dueBy) +
    '.\nIf you have already called, set the status to Contacted.';
  var html = wrapHtml(cfg, 'Reminder',
    '<p style="margin:0 0 10px"><b>' + esc(row.ref) + '</b> is still marked New. It was due by ' + esc(fmtDateTime(row.dueBy)) + '.</p>' +
    detailTable([['Name', row.name], ['Phone', row.phone || 'not given'], ['Move date', fmtDate(row.moveDate)]]) +
    '<p style="margin:0">If you have already called, set the status to Contacted.</p>');
  return { subject: 'Still waiting: ' + row.name + ' (' + row.ref + ')', text: text, html: html };
}

/** The morning email to the office. */
function digestEmail(d, cfg) {
  var line = function (r) { return r.ref + ' · ' + r.name + ' · ' + fmtDate(r.moveDate) + ' · ' + (r.estimator || 'Unassigned'); };
  var section = function (title, items, empty) {
    return { title: title, items: items.map(line), empty: empty };
  };
  var parts = [
    section('Overdue (still New past the reply time)', d.overdue, 'None'),
    section('Moving within ' + cfg.rushDays + ' days', d.movesSoon, 'None'),
    section('Contact details to check', d.needsCheck, 'None')
  ];
  var text = cfg.businessName + ', ' + fmtDate(d.date) + '\n\n' +
    'Yesterday: ' + d.received + ' requests, ' + d.spam + ' spam caught. Open now: ' + d.open + '.\n\n' +
    d.people.map(function (p) { return p.name + ': ' + p.open + ' open, ' + p.overdue + ' overdue, ' + p.rush + ' rush'; }).join('\n') + '\n\n' +
    parts.map(function (s) { return s.title + '\n' + (s.items.length ? s.items.map(function (i) { return '  ' + i; }).join('\n') : '  ' + s.empty); }).join('\n\n');
  var html = wrapHtml(cfg, 'Digest',
    '<p style="margin:0 0 10px"><b>' + esc(fmtDate(d.date)) + '</b>. Yesterday: ' + d.received + ' requests, ' + d.spam + ' spam caught. Open now: ' + d.open + '.</p>' +
    '<table style="border-collapse:collapse;font-size:14px;margin:6px 0 14px">' +
    '<tr><td style="padding:4px 14px 4px 0;color:#6b635a">Estimator</td><td style="padding:4px 10px;color:#6b635a">Open</td><td style="padding:4px 10px;color:#6b635a">Overdue</td><td style="padding:4px 10px;color:#6b635a">Rush</td></tr>' +
    d.people.map(function (p) { return '<tr><td style="padding:4px 14px 4px 0;font-weight:bold">' + esc(p.name) + '</td><td style="padding:4px 10px">' + p.open + '</td><td style="padding:4px 10px">' + p.overdue + '</td><td style="padding:4px 10px">' + p.rush + '</td></tr>'; }).join('') +
    '</table>' +
    parts.map(function (s) {
      return '<p style="margin:12px 0 4px;font-weight:bold">' + esc(s.title) + '</p>' +
        (s.items.length ? '<ul style="margin:0;padding-left:18px">' + s.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' : '<p style="margin:0;color:#6b635a">' + esc(s.empty) + '</p>');
    }).join(''));
  return { subject: 'Quote requests for ' + fmtDate(d.date) + ': ' + d.overdue.length + ' overdue, ' + d.open + ' open', text: text, html: html };
}
