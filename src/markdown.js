// A SKILL.md's Markdown as a tree, for the web view: the page turns it into elements, so nothing
// from a repository is ever HTML. Plain JavaScript: the server sends this file to the browser as
// it is, and the tests import it.
//
// A node is `[tag, attributes, ...children]`, a child a node or a string. The tags are only these:
// h1–h6, p, pre, code, blockquote, ul, ol, li, hr, table, thead, tbody, tr, th, td, strong, em,
// del and a; the only attribute is a link's `href`, as the file has it.

const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const RULE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const QUOTE = /^ {0,3}> ?/;
const ITEM = /^( {0,3})([-*+]|\d{1,9}[.)])(?:[ \t]+|$)/;
const INDENTED = /^(?: {4}|\t)/;
const DELIMITER = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;

/** The blocks of a Markdown text. */
export function markdown(text) {
  return blocks(text.replace(/\r\n?/g, '\n').split('\n'));
}

function blocks(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    let match;
    if (!line.trim()) {
      i++;
    } else if (INDENTED.test(line)) {
      // Indented code, as it is: its blank lines too, but not the ones after it.
      const code = [];
      for (; i < lines.length && (INDENTED.test(lines[i]) || !lines[i].trim()); i++) code.push(lines[i].replace(INDENTED, ''));
      while (!code.at(-1)?.trim()) code.pop();
      out.push(['pre', {}, ['code', {}, code.join('\n')]]);
    } else if ((match = FENCE.exec(line))) {
      const fence = match[1];
      const code = [];
      for (i++; i < lines.length && !isClosingFence(lines[i], fence); i++) code.push(lines[i]);
      i++;
      out.push(['pre', {}, ['code', {}, code.join('\n')]]);
    } else if ((match = HEADING.exec(line))) {
      out.push([`h${match[1].length}`, {}, ...inline(match[2] ?? '')]);
      i++;
    } else if (RULE.test(line)) {
      out.push(['hr', {}]);
      i++;
    } else if (QUOTE.test(line)) {
      const quoted = [];
      for (; i < lines.length && QUOTE.test(lines[i]); i++) quoted.push(lines[i].replace(QUOTE, ''));
      out.push(['blockquote', {}, ...blocks(quoted)]);
    } else if (ITEM.test(line)) {
      i = list(lines, i, out);
    } else if (isTable(lines, i)) {
      i = table(lines, i, out);
    } else {
      // A paragraph, up to a blank line or a block that interrupts it; a table does, as on GitHub.
      const paragraph = [lines[i++].trim()];
      for (; i < lines.length && lines[i].trim() && !startsBlock(lines[i]) && !isTable(lines, i); i++) paragraph.push(lines[i].trim());
      out.push(['p', {}, ...inline(paragraph.join(' '))]);
    }
  }
  return out;
}

function isClosingFence(line, fence) {
  const trimmed = line.trim();
  return trimmed.startsWith(fence) && new RegExp(`^\\${fence[0]}+$`).test(trimmed);
}

/** A header row at `i`, then a delimiter row with as many columns. */
function isTable(lines, i) {
  const [head, delimiter] = [lines[i], lines[i + 1] ?? ''];
  return head.includes('|') && delimiter.includes('-') && DELIMITER.test(delimiter) && cells(head).length === cells(delimiter).length;
}

/** A table row's cells; an escaped \| stays in its cell. */
function cells(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/(?<!\\)\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

function startsBlock(line) {
  return FENCE.test(line) || HEADING.test(line) || RULE.test(line) || QUOTE.test(line) || ITEM.test(line);
}

/** A list from line `start`: its items, each with the lines indented under it. */
function list(lines, start, out) {
  const ordered = /\d/.test(ITEM.exec(lines[start])[2]);
  const items = [];
  let loose = false;
  let i = start;
  while (i < lines.length) {
    const match = ITEM.exec(lines[i]);
    if (!match || /\d/.test(match[2]) !== ordered) break;
    const indent = match[0].length;
    const item = [lines[i].slice(indent)];
    for (i++; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) {
        // A blank line, then more of the same item: a loose list.
        const next = lines.slice(i + 1).find((l) => l.trim());
        if (next === undefined || !/^\s/.test(next)) break;
        loose = true;
        item.push('');
      } else if (/^\s/.test(line) && !(ITEM.test(line) && leading(line) < indent && leading(line) <= 3)) {
        item.push(line.slice(Math.min(indent, leading(line))));
      } else if (!startsBlock(line) && item.at(-1) !== '') {
        item.push(line); // a lazy continuation of the item's paragraph
      } else break;
    }
    items.push(item);
    // A blank line between items also makes the list loose.
    if (i < lines.length && !lines[i].trim()) {
      const next = lines.slice(i).findIndex((l) => l.trim());
      const following = next > 0 ? ITEM.exec(lines[i + next]) : null;
      if (following && /\d/.test(following[2]) === ordered) {
        loose = true;
        i += next;
      }
    }
  }
  out.push([ordered ? 'ol' : 'ul', {}, ...items.map((item) => ['li', {}, ...itemContent(blocks(item), loose)])]);
  return i;
}

/** A tight list's paragraphs are only their text. */
function itemContent(content, loose) {
  return loose ? content : content.flatMap((node) => (node[0] === 'p' ? node.slice(2) : [node]));
}

function leading(line) {
  return line.length - line.trimStart().length;
}

function table(lines, start, out) {
  const head = cells(lines[start]);
  const rows = [];
  let i = start + 2;
  for (; i < lines.length && lines[i].trim() && lines[i].includes('|') && !startsBlock(lines[i]); i++) rows.push(cells(lines[i]));
  const row = (tag, values) => ['tr', {}, ...head.map((_, index) => [tag, {}, ...inline(values[index] ?? '')])];
  out.push(['table', {}, ['thead', {}, row('th', head)], ['tbody', {}, ...rows.map((values) => row('td', values))]]);
  return i;
}

// A link's text: its brackets balanced, as on GitHub, nested up to 4 deep; an escaped one is text.
const LABEL = Array.from({ length: 4 }).reduce((inner) => String.raw`(?:\\.|[^[\]\\]|\[${inner}\])*`, String.raw`(?:\\.|[^[\]\\])*`);
const DESTINATION = String.raw`\(\s*<?([^\s<>()]*(?:\([^\s()]*\)[^\s<>()]*)*)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)`;
const LINK = new RegExp(String.raw`\[(${LABEL})\]${DESTINATION}`);

// An email autolink's address, as CommonMark has it: `<kotlin-team@example.com>`.
const LABEL_PART = '[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?';
const EMAIL = String.raw`[A-Za-z0-9.!#$%&'*+/=?^_\`{|}~-]+@${LABEL_PART}(?:\.${LABEL_PART})*`;

// A code span binds tighter than the rest, as on GitHub; only an escape, an autolink, an email one, or a link's `](destination "title")`
// after a `[`, is read before it.
const SPANS = new RegExp(
  String.raw`\\[!-/:-@[-\`{-~]|<https?:\/\/[^\s<>]+>|<${EMAIL}>|(?<=\[${LABEL})\]${DESTINATION.replace('<?(', '<?(?:')}|(\`+)([^\`]|[^\`][\s\S]*?[^\`])\1(?!\`)`,
  'g',
);

// A link, not an image, nor an escaped `[`: a `!` or `\` right before it, after an even run of backslashes.
const INNER_LINK = new RegExp(String.raw`(?<!(?<!\\)(?:\\\\)*[!\\])${LINK.source}`);

const INLINE = new RegExp(
  [
    /\uE001\uE000*/, // a code span, masked
    `!?${LINK.source}`, // 1, 2: a link; an image as its link
    /<(https?:\/\/[^\s<>]+)>/, // 3: an autolink
    `<(${EMAIL})>`, // 4: an email autolink
    /\*\*(?=\S)([\s\S]*?\S)\*\*|__(?=\S)([\s\S]*?\S)__(?!\w)/, // 5, 6: strong
    // 7, 8: emphasis; a strong inside it is one piece, so its closing ** does not end the emphasis, and stars with a space
    // on each side are text. Each character starts at most one piece, so text with no closing * fails fast.
    /\*(?=[^\s*])((?:\*\*(?=[^\s*])(?:\\[\s\S]|[^*\\])+?(?<=\S)\*\*|\\[\s\S]|(?<=\s)\*+(?=\s)|[^*\\])+?)(?<=[^\s*]|\*\*)\*|(?<!\w)_(?=[^\s_])([\s\S]*?[^\s_])_(?!\w)/,
    /~~(?=\S)([\s\S]*?\S)~~/, // 9: struck out
    /\\([!-/:-@[-`{-~])/, // 10: an escaped character
    // 11: a bare URL, as on GitHub: at the start, or after a space, *, _, ~ or (; no _ in the last two parts of its domain.
    /(?<![^\s*_~(])((?:https?:\/\/|www\.)(?:(?:[\w-]+\.)*[A-Za-z0-9-]+\.)?[A-Za-z0-9-]+(?![\w-]|\.[\w-])[^\s<\uE000-\uE002]*)/,
  ]
    .map((part) => (typeof part === 'string' ? part : part.source))
    .join('|'),
  'gd',
);

/**
 * The text with each code span masked, as long as it was: a U+E001, then U+E000s, so the `*`, `_`,
 * `~` and `]` in it end nothing; those two characters in the text itself become U+E002. The code
 * spans' content, by where they start.
 */
function mask(text) {
  const codes = new Map();
  const masked = text.replace(/[\uE000\uE001]/g, '\uE002').replace(SPANS, (span, ticks, _code, index) => {
    if (ticks === undefined) return span;
    const code = text.slice(index + ticks.length, index + span.length - ticks.length);
    codes.set(index, code.length > 2 && code.startsWith(' ') && code.endsWith(' ') ? code.slice(1, -1) : code);
    return '\uE001' + '\uE000'.repeat(span.length - 1);
  });
  return { masked, codes };
}

/** The inline content of a block: text, code, links, strong, emphasis; in a link's text, no link. */
export function inline(text, inLink = false) {
  const out = [];
  let last = 0;
  const push = (node) => {
    if (typeof node === 'string' && typeof out.at(-1) === 'string') out[out.length - 1] += node;
    else if (node !== '') out.push(node);
  };
  const { masked, codes } = mask(text);
  const parts = new RegExp(INLINE);
  for (let match; (match = parts.exec(masked)); ) {
    // A link holds no other link, as on GitHub: its `[` is text, and the inner one is read after it.
    if (match[1] !== undefined && masked[match.index] === '[' && INNER_LINK.test(masked.slice(...match.indices[1]))) {
      parts.lastIndex = match.index + 1;
      continue;
    }
    push(text.slice(last, match.index));
    last = match.index + match[0].length;
    // Each part as the text has it, code spans and all.
    const [, label, href, autolink, email, strong1, strong2, em1, em2, del, escaped, bare] = match.indices.map((at) => at && text.slice(...at));
    if (codes.has(match.index)) push(['code', {}, codes.get(match.index)]);
    else if (label !== undefined) push(['a', { href }, ...inline(label, true)]);
    else if (autolink !== undefined) push(['a', { href: autolink }, autolink]);
    else if (email !== undefined) push(['a', { href: `mailto:${email}` }, email]);
    else if (strong1 !== undefined || strong2 !== undefined) push(['strong', {}, ...inline(strong1 ?? strong2, inLink)]);
    else if (em1 !== undefined || em2 !== undefined) push(['em', {}, ...inline(em1 ?? em2, inLink)]);
    else if (del !== undefined) push(['del', {}, ...inline(del, inLink)]);
    else if (escaped !== undefined) push(escaped);
    else {
      // In a link's text, a URL is text, as on GitHub: no link in a link.
      const url = trimURL(bare);
      push(inLink ? url : ['a', { href: url.startsWith('www.') ? `http://${url}` : url }, url]);
      last = match.index + url.length;
      parts.lastIndex = last;
    }
  }
  push(text.slice(last));
  return out;
}

/**
 * A bare URL without what GitHub leaves after it: trailing punctuation, an unmatched `)`, an entity-like `&amp;`. One
 * walk back from its end, the parentheses counted once, so a long tail of them fails fast.
 */
function trimURL(url) {
  let end = url.length;
  let unmatched = count(url, ')') - count(url, '(');
  for (;;) {
    const last = url[end - 1];
    const amp = last === ';' ? url.lastIndexOf('&', end - 1) : -1;
    if ("?!.,:*_~'\"".includes(last)) end--;
    else if (last === ')' && unmatched > 0) end--, unmatched--;
    else if (amp >= 0 && /^&[A-Za-z0-9]+;$/.test(url.slice(amp, end))) end = amp;
    else return url.slice(0, end);
  }
}

function count(text, character) {
  return text.split(character).length - 1;
}
