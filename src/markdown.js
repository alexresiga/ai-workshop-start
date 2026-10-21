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
// Marks a line with no `>` that a quote took in, to go on with the paragraph the quote ends in: a lazy continuation, as on
// GitHub. Only a paragraph takes it; anywhere else, every quote it is in ends just before it. U+0000 is never in the text.
const LAZY = '\u0000';

/** The blocks of a Markdown text. */
export function markdown(text) {
  return blocks(text.replace(/\r\n?/g, '\n').replace(/\u0000/g, '\uFFFD').split('\n'));
}

function blocks(lines) {
  return parse(lines).nodes;
}

/** The blocks of these lines, up to the first lazy line that no paragraph takes: `end`. */
function parse(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    let match;
    if (line.startsWith(LAZY)) {
      break;
    } else if (!line.trim()) {
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
      for (i++; i < lines.length && !isClosingFence(lines[i], fence) && !lines[i].startsWith(LAZY); i++) code.push(lines[i]);
      if (!lines[i]?.startsWith(LAZY)) i++;
      out.push(['pre', {}, ['code', {}, code.join('\n')]]);
    } else if ((match = HEADING.exec(line))) {
      out.push([`h${match[1].length}`, {}, ...inline(match[2] ?? '')]);
      i++;
    } else if (RULE.test(line)) {
      out.push(['hr', {}]);
      i++;
    } else if (QUOTE.test(line)) {
      // The `>` lines, and each line with no `>` that may go on with a paragraph, marked: the quote ends before the first
      // that none takes.
      const start = i;
      const quoted = [];
      for (; i < lines.length; i++) {
        if (QUOTE.test(lines[i])) quoted.push(lines[i].replace(QUOTE, ''));
        else if (canBeLazy(lines, i, quoted)) quoted.push(lines[i].startsWith(LAZY) ? lines[i] : LAZY + lines[i]);
        else break;
      }
      const { nodes, end } = parse(quoted);
      out.push(['blockquote', {}, ...nodes]);
      i = start + end;
    } else if (ITEM.test(line)) {
      i = list(lines, i, out);
    } else if (isTable(lines, i)) {
      i = table(lines, i, out);
    } else {
      // A paragraph, up to a blank line or a block that interrupts it; a table does, as on GitHub.
      const paragraph = [lines[i++].trim()];
      for (; i < lines.length && lines[i].trim() && !startsBlock(lines[i]) && !isTable(lines, i); i++) paragraph.push(lines[i].replace(LAZY, '').trim());
      out.push(['p', {}, ...inline(paragraph.join(' '))]);
    }
  }
  return { nodes: out, end: i };
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

/** A line with no `>` right after a quoted line that is not blank, and that starts no block: it may go on with a paragraph. */
function canBeLazy(lines, i, quoted) {
  return !!quoted.at(-1)?.trim() && (lines[i].startsWith(LAZY) || (!!lines[i].trim() && !startsBlock(lines[i]) && !isTable(lines, i)));
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
    item.start = i;
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
  // An item that ends before a lazy line no paragraph takes ends the list there too.
  const content = [];
  for (const item of items) {
    const { nodes, end } = parse(item);
    content.push(['li', {}, ...itemContent(nodes, loose)]);
    if (end < item.length) {
      i = item.start + end;
      break;
    }
  }
  out.push([ordered ? 'ol' : 'ul', {}, ...content]);
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
  for (; i < lines.length && lines[i].trim() && lines[i].includes('|') && !startsBlock(lines[i]) && !lines[i].startsWith(LAZY); i++) rows.push(cells(lines[i]));
  const row = (tag, values) => ['tr', {}, ...head.map((_, index) => [tag, {}, ...inline(values[index] ?? '')])];
  out.push(['table', {}, ['thead', {}, row('th', head)], ['tbody', {}, ...rows.map((values) => row('td', values))]]);
  return i;
}

const INLINE = new RegExp(
  [
    /(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/, // 1, 2: code
    /!?\[((?:\\.|[^\]\\])*)\]\(\s*<?([^\s<>()]*(?:\([^\s()]*\)[^\s<>()]*)*)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/, // 3, 4: a link; an image as its link
    /<(https?:\/\/[^\s<>]+)>/, // 5: an autolink
    /\*\*(?=\S)([\s\S]*?\S)\*\*|__(?=\S)([\s\S]*?\S)__(?!\w)/, // 6, 7: strong
    /\*(?=[^\s*])([\s\S]*?[^\s*])\*|(?<!\w)_(?=[^\s_])([\s\S]*?[^\s_])_(?!\w)/, // 8, 9: emphasis
    /~~(?=\S)([\s\S]*?\S)~~/, // 10: struck out
    /\\([!-/:-@[-`{-~])/, // 11: an escaped character
  ]
    .map((part) => part.source)
    .join('|'),
  'g',
);

/** The inline content of a block: text, code, links, strong, emphasis. */
export function inline(text) {
  const out = [];
  let last = 0;
  const push = (node) => {
    if (typeof node === 'string' && typeof out.at(-1) === 'string') out[out.length - 1] += node;
    else if (node !== '') out.push(node);
  };
  for (const match of text.matchAll(INLINE)) {
    push(text.slice(last, match.index));
    last = match.index + match[0].length;
    const [, , code, label, href, autolink, strong1, strong2, em1, em2, del, escaped] = match;
    if (code !== undefined) push(['code', {}, code.length > 2 && code.startsWith(' ') && code.endsWith(' ') ? code.slice(1, -1) : code]);
    else if (label !== undefined) push(['a', { href }, ...inline(label)]);
    else if (autolink !== undefined) push(['a', { href: autolink }, autolink]);
    else if (strong1 !== undefined || strong2 !== undefined) push(['strong', {}, ...inline(strong1 ?? strong2)]);
    else if (em1 !== undefined || em2 !== undefined) push(['em', {}, ...inline(em1 ?? em2)]);
    else if (del !== undefined) push(['del', {}, ...inline(del)]);
    else push(escaped);
  }
  push(text.slice(last));
  return out;
}
