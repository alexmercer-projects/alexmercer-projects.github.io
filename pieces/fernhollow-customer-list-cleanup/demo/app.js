(function () {
  "use strict";
  var D = window.FERNHOLLOW;
  if (!D) return;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };
  var show = function (s) { return s === "" ? '<span class="blank">blank</span>' : esc(s).replace(/ {2,}/g, function (m) { return m.replace(/ /g, "&middot;"); }); };
  var num = function (n) { return Number(n).toLocaleString("en-US"); };

  // numbers in the copy
  document.querySelectorAll("[data-stat]").forEach(function (el) {
    var v = D.stats[el.getAttribute("data-stat")];
    if (v != null) el.textContent = el.closest(".term") ? String(v) : num(v);
  });
  document.querySelectorAll("[data-size]").forEach(function (el) {
    var b = D.files[el.getAttribute("data-size")];
    if (b) el.textContent = b > 1024 * 1024 ? (b / 1048576).toFixed(1) + " MB" : Math.round(b / 1024) + " KB";
  });

  // 01 before / after
  var heads = ["Row"].concat(D.header.map(function (h) { return h.trim(); }));
  var ba = $("#ba-table");
  var view = "before";
  function drawBA() {
    var h = "<thead><tr>" + heads.map(function (x) { return '<th scope="col">' + esc(x) + "</th>"; }).join("") + "</tr></thead><tbody>";
    D.sample.forEach(function (r, ri) {
      h += '<tr><th scope="row">' + r.row + "</th>";
      r.cells.forEach(function (c, ci) {
        var changed = !!c.rule, flag = !!c.review;
        var cls = changed ? (view === "before" ? "is-bad" : "is-fixed") : "";
        if (flag) cls += " is-flag";
        var val = view === "before" ? c.before : c.after;
        var attrs = (changed || flag) ? ' tabindex="0" data-r="' + ri + '" data-c="' + ci + '"' : "";
        h += '<td class="' + cls + '"' + attrs + ">" + show(val) + "</td>";
      });
      h += "</tr>";
    });
    ba.innerHTML = h + "</tbody>";
  }
  function explain(td) {
    var c = D.sample[+td.getAttribute("data-r")].cells[+td.getAttribute("data-c")];
    var col = heads[+td.getAttribute("data-c") + 1];
    var out = "<b>" + esc(col) + ":</b> ";
    if (c.rule) out += '<span class="mono">' + show(c.before) + '</span> <span class="arrow">&rarr;</span> <span class="mono">' + show(c.after) + "</span> <span class=\"chip\">" + esc(c.rule) + "</span>";
    if (c.review) out += (c.rule ? " " : "") + '<span class="chip chip--flag">Needs review</span> ' + esc(c.review);
    $("#ba-why").innerHTML = out;
    ba.querySelectorAll(".is-picked").forEach(function (x) { x.classList.remove("is-picked"); });
    td.classList.add("is-picked");
  }
  ba.addEventListener("click", function (e) { var td = e.target.closest("td[data-r]"); if (td) explain(td); });
  ba.addEventListener("mouseover", function (e) { var td = e.target.closest("td[data-r]"); if (td) explain(td); });
  ba.addEventListener("focusin", function (e) { var td = e.target.closest("td[data-r]"); if (td) explain(td); });
  document.querySelectorAll(".toggle__b").forEach(function (b) {
    b.addEventListener("click", function () {
      view = b.getAttribute("data-view");
      document.querySelectorAll(".toggle__b").forEach(function (x) {
        var on = x === b; x.classList.toggle("is-on", on); x.setAttribute("aria-pressed", on);
      });
      drawBA();
    });
  });
  drawBA();

  // 02 rules
  $("#rules").innerHTML = D.rules.map(function (r) {
    return '<article class="rule"><header><h3>' + esc(r.rule) + '</h3><span class="rule__n">' + num(r.count) + "</span></header>" +
      "<p>" + esc(r.text) + "</p>" +
      '<p class="eg"><span class="eg__b">' + show(r.before) + '</span><span class="arrow" aria-label="becomes">&rarr;</span><span class="eg__a">' + show(r.after) + "</span></p></article>";
  }).join("");

  // 03 repeats
  var cols = [["business", "Business"], ["contact", "Contact"], ["email", "Email"], ["phone", "Phone"], ["zip", "ZIP"], ["last_order", "Last order"]];
  $("#dups").innerHTML = D.featured.map(function (g) {
    var rows = g.rows.slice().sort(function (a, b) { return (a.row === g.kept_row ? -1 : 0) - (b.row === g.kept_row ? -1 : 0); });
    var why = g.links.map(function (l) { return '<span class="chip">' + esc(l.why) + "</span>"; }).join(" ");
    var body = rows.map(function (r) {
      var kept = r.row === g.kept_row, src = kept && g.result ? g.result : r;
      return '<div class="dup__row' + (kept ? " is-kept" : "") + '"><p class="dup__tag">' + (kept ? "Kept &middot; row " + r.row + ", after the merge" : "Merged in &middot; row " + r.row) + "</p><dl>" +
        cols.map(function (c) { return "<div><dt>" + c[1] + "</dt><dd>" + show(src[c[0]]) + "</dd></div>"; }).join("") + "</dl></div>";
    }).join("");
    var notes = [];
    (g.replaced || []).forEach(function (x) { notes.push("Swapped the broken " + x.field.toLowerCase() + " <span class=\"mono\">" + esc(x.old) + "</span> for <span class=\"mono\">" + esc(x.new) + "</span> from row " + x.from_row); });
    g.filled.forEach(function (x) { notes.push("Filled the blank " + x.field.toLowerCase() + " with <span class=\"mono\">" + esc(x.value) + "</span> from row " + x.from_row); });
    g.conflicts.forEach(function (x) { notes.push("Row " + x.from_row + " had a different " + x.field.toLowerCase() + ", <span class=\"mono\">" + esc(x.value) + "</span>, so it went into Notes"); });
    if (!notes.length) notes.push("Nothing to fill in; the newer row already had everything.");
    return '<article class="dup"><header><h3>' + esc(rows[0].business) + "</h3><p>" + why + "</p></header>" +
      '<div class="dup__rows">' + body + '</div><ul class="dup__notes">' + notes.map(function (n) { return "<li>" + n + "</li>"; }).join("") + "</ul></article>";
  }).join("") + '<p class="dups__more">Showing ' + D.featured.length + " of " + D.groupCount + ' merged customers. The rest are in duplicates.csv and the Duplicates tab.</p>';
  var apart = D.separate.map(function (s) {
    return "<li><b>" + esc(s.business) + "</b><span>Rows " + s.rows.join(" and ") + ": " + esc(s.why.replace("same name, different town", "same name in two towns, so two locations")) + "</span></li>";
  }).concat(D.possible.map(function (p) {
    return "<li><b>" + esc(p.businesses.join(" / ")) + "</b><span>Rows " + p.rows.join(" and ") + ": " + esc(p.why) + ". Not merged; on the review list.</span></li>";
  }));
  $("#apart").innerHTML = apart.join("");

  // 04 review
  $("#review-table").innerHTML = "<thead><tr><th scope=\"col\">Row</th><th scope=\"col\">Customer</th><th scope=\"col\">Field</th><th scope=\"col\">Why it needs a person</th></tr></thead><tbody>" +
    D.review.map(function (x) {
      return "<tr><td>" + x.row + "</td><td><b>" + esc(x.business) + '</b><span class="id">' + esc(x.customer_id || "") + '</span></td><td><span class="chip chip--flag">' + esc(x.field) + "</span></td><td>" + esc(x.issue) + "</td></tr>";
    }).join("") + "</tbody>";
  $("#removed").innerHTML = D.removed.map(function (x) {
    var vals = x.raw.filter(function (v) { return v.trim(); }).join(" | ");
    return "<li><b>Row " + x.row + "</b> " + esc(x.reason) + (vals ? ' <span class="mono">' + esc(vals.length > 90 ? vals.slice(0, 90) + "..." : vals) + "</span>" : "") + "</li>";
  }).join("");

  // 05 change log
  var sel = $("#rule");
  D.rules.forEach(function (r) { var o = document.createElement("option"); o.value = r.rule; o.textContent = r.rule + " (" + r.count + ")"; sel.appendChild(o); });
  var shown = 40, list = D.changes;
  function filter() {
    var q = $("#q").value.trim().toLowerCase(), rule = sel.value;
    list = D.changes.filter(function (c) {
      if (rule && c.rule !== rule) return false;
      if (!q) return true;
      return (c.row + " " + c.business + " " + c.field + " " + c.before + " " + c.after).toLowerCase().indexOf(q) > -1;
    });
  }
  function drawLog() {
    var rows = list.slice(0, shown);
    $("#log-table").innerHTML = "<thead><tr><th scope=\"col\">Row</th><th scope=\"col\">Business</th><th scope=\"col\">Field</th><th scope=\"col\">Before</th><th scope=\"col\">After</th><th scope=\"col\">Rule</th></tr></thead><tbody>" +
      (rows.length ? rows.map(function (c) {
        return "<tr><td>" + c.row + "</td><td>" + esc(c.business) + "</td><td>" + esc(c.field) + '</td><td class="mono b4">' + show(c.before) + '</td><td class="mono af">' + show(c.after) + "</td><td><span class=\"chip\">" + esc(c.rule) + "</span></td></tr>";
      }).join("") : '<tr><td colspan="6" class="none">No changes match that.</td></tr>') + "</tbody>";
    $("#log-count").textContent = "Showing " + num(Math.min(shown, list.length)) + " of " + num(list.length) + " changes";
    $("#more").hidden = shown >= list.length;
  }
  $("#q").addEventListener("input", function () { shown = 40; filter(); drawLog(); });
  sel.addEventListener("change", function () { shown = 40; filter(); drawLog(); });
  $("#more").addEventListener("click", function () { shown += 40; drawLog(); });
  drawLog();
})();
