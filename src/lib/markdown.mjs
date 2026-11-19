// A small Markdown-to-HTML converter for the writing samples. No dependencies.
// Handles: # headings, paragraphs, - and 1. lists, > quotes, --- rules, | tables |,
// ``` code fences, **bold**, *italic*, `code`, [links](url) and - [ ] checkboxes.

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function inline(text) {
  let s = esc(text);
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?=[^*\w]|$)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^_\w])_([^_\n]+)_(?=[^_\w]|$)/g, '$1<em>$2</em>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[+i]}</code>`);
  return s;
}

export function markdown(src, { headingOffset = 0, slug = true } = {}) {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;
  const isBlockStart = (l) => /^(#{1,6}\s|>|\s*[-*]\s|\s*\d+[.)]\s|\||```|---\s*$|\*\*\*\s*$)/.test(l);
  while (i < lines.length) {
    let line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^```/.test(line)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre tabindex="0"><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }
    let m;
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      const level = Math.min(6, m[1].length + headingOffset);
      const text = m[2].trim();
      const id = slug ? ' id="' + text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '"' : '';
      out.push(`<h${level}${id}>${inline(text)}</h${level}>`);
      i++; continue;
    }
    if (/^(---|\*\*\*)\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
    if (/^>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${markdown(buf.join('\n'), { headingOffset, slug: false })}</blockquote>`);
      continue;
    }
    if (/^\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(/^\|\s*:?-{2,}/.test(rows[1] || '') ? 2 : 1).map(cells);
      out.push('<div class="table-scroll" tabindex="0" role="region" aria-label="Table"><table><thead><tr>' + head.map((h) => `<th scope="col">${inline(h)}</th>`).join('') +
        '</tr></thead><tbody>' + body.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') +
        '</tbody></table></div>');
      continue;
    }
    if ((m = line.match(/^(\s*)([-*]|\d+[.)])\s+/))) {
      const ordered = /\d/.test(m[2]);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+[.)])\s+/.test(lines[i])) {
        let item = lines[i++].replace(/^\s*([-*]|\d+[.)])\s+/, '');
        while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) item += ' ' + lines[i++].trim();
        items.push(item);
      }
      const li = items.map((t) => {
        const cb = t.match(/^\[( |x)\]\s+(.*)$/i);
        if (cb) return `<li class="check"><span class="box" aria-hidden="true">${cb[1].trim() ? '&#10003;' : ''}</span><span>${inline(cb[2])}</span></li>`;
        return `<li>${inline(t)}</li>`;
      }).join('');
      out.push(ordered ? `<ol>${li}</ol>` : `<ul>${li}</ul>`);
      continue;
    }
    const buf = [line.trim()]; i++;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) buf.push(lines[i++].trim());
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}
