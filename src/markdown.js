// A SKILL.md's Markdown as a tree, for the web view: the page turns it into elements, so nothing
// from a repository is ever HTML. Plain JavaScript: the server sends this file to the browser as
// it is, and the tests import it.
//
// A node is `[tag, attributes, ...children]`, a child a node or a string. The tags are only these:
// h1–h6, p, pre, code, blockquote, ul, ol, li, hr, table, thead, tbody, tr, th, td, strong, em,
// del and a; the only attribute is a link's `href`, as the file has it: an inline link's, or a reference link's
// definition, `[label]: url`, wherever it is in the file.

const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const RULE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const QUOTE = /^ {0,3}> ?/;
const ITEM = /^( {0,3})([-*+]|\d{1,9}[.)])(?:[ \t]+|$)/;
const INDENTED = /^(?: {4}|\t)/;
const DELIMITER = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
const DEFINITION = /^ {0,3}\[((?:\\.|[^[\]\\])+)\]:[ \t]*(?:<([^<>]*)>|([^\s<>]+))(?:[ \t]+(?:"[^"]*"|'[^']*'|\([^()]*\)))?[ \t]*$/;

/** The blocks of a Markdown text. */
export function markdown(text) {
  // The inline text waits until every block is read: a reference link may come before its definition.
  const definitions = new Map();
  return blocks(text.replace(/\r\n?/g, '\n').split('\n'), definitions).flatMap((node) => resolve(node, definitions));
}

/** Inline text, read once the definitions are known. */
function later(text) {
  return { inline: text };
}

function resolve(node, definitions) {
  if (typeof node === 'string') return [node];
  if (!Array.isArray(node)) return inline(node.inline, definitions);
  const [tag, attributes, ...children] = node;
  return [[tag, attributes, ...children.flatMap((child) => resolve(child, definitions))]];
}

/** A link label as it matches: in any case, its spaces collapsed. */
function label(text) {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

function blocks(lines, definitions) {
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
      out.push([`h${match[1].length}`, {}, later(match[2] ?? '')]);
      i++;
    } else if (RULE.test(line)) {
      out.push(['hr', {}]);
      i++;
    } else if (QUOTE.test(line)) {
      const quoted = [];
      for (; i < lines.length && QUOTE.test(lines[i]); i++) quoted.push(lines[i].replace(QUOTE, ''));
      out.push(['blockquote', {}, ...blocks(quoted, definitions)]);
    } else if (ITEM.test(line)) {
      i = list(lines, i, out, definitions);
    } else if ((match = DEFINITION.exec(line)) && label(match[1])) {
      // A reference link's definition, not shown; the first of a label counts. It does not interrupt a paragraph.
      if (!definitions.has(label(match[1]))) definitions.set(label(match[1]), match[2] ?? match[3]);
      i++;
    } else if (isTable(lines, i)) {
      i = table(lines, i, out);
    } else {
      // A paragraph, up to a blank line or a block that interrupts it; a table does, as on GitHub.
      const paragraph = [lines[i++].trim()];
      for (; i < lines.length && lines[i].trim() && !startsBlock(lines[i]) && !isTable(lines, i); i++) paragraph.push(lines[i].trim());
      out.push(['p', {}, later(paragraph.join(' '))]);
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
function list(lines, start, out, definitions) {
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
  out.push([ordered ? 'ol' : 'ul', {}, ...items.map((item) => ['li', {}, ...itemContent(blocks(item, definitions), loose)])]);
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
  const row = (tag, values) => ['tr', {}, ...head.map((_, index) => [tag, {}, later(values[index] ?? '')])];
  out.push(['table', {}, ['thead', {}, row('th', head)], ['tbody', {}, ...rows.map((values) => row('td', values))]]);
  return i;
}

const INLINE = new RegExp(
  [
    /(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/, // 1, 2: code
    /!?\[((?:\\.|[^\]\\])*)\]\(\s*<?([^\s<>()]*(?:\([^\s()]*\)[^\s<>()]*)*)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/, // 3, 4: a link; an image as its link
    /!?\[((?:\\.|[^\]\\])*)\](?:\[((?:\\.|[^[\]\\])*)\])?/, // 5, 6: a reference link, [text][label], [text][] or [text]
    /<(https?:\/\/[^\s<>]+)>/, // 7: an autolink
    /\*\*(?=\S)([\s\S]*?\S)\*\*|__(?=\S)([\s\S]*?\S)__(?!\w)/, // 8, 9: strong
    /\*(?=[^\s*])([\s\S]*?[^\s*])\*|(?<!\w)_(?=[^\s_])([\s\S]*?[^\s_])_(?!\w)/, // 10, 11: emphasis
    /~~(?=\S)([\s\S]*?\S)~~/, // 12: struck out
    /\\([!-/:-@[-`{-~])/, // 13: an escaped character
  ]
    .map((part) => part.source)
    .join('|'),
  'g',
);

/** The inline content of a block: text, code, links, strong, emphasis; reference links by `definitions`, label → url. */
export function inline(text, definitions = new Map()) {
  const out = [];
  let last = 0;
  const push = (node) => {
    if (typeof node === 'string' && typeof out.at(-1) === 'string') out[out.length - 1] += node;
    else if (node !== '') out.push(node);
  };
  const within = (part) => inline(part, definitions);
  const pattern = new RegExp(INLINE); // its own lastIndex: a reference with no definition reads on from its first bracket
  let match;
  while ((match = pattern.exec(text))) {
    push(text.slice(last, match.index));
    last = match.index + match[0].length;
    const [, , code, text1, href, text2, reference, autolink, strong1, strong2, em1, em2, del, escaped] = match;
    if (code !== undefined) push(['code', {}, code.length > 2 && code.startsWith(' ') && code.endsWith(' ') ? code.slice(1, -1) : code]);
    else if (text1 !== undefined) push(['a', { href }, ...within(text1)]);
    else if (text2 !== undefined) {
      const key = label(reference || text2);
      if (key && definitions.has(key)) push(['a', { href: definitions.get(key) }, ...within(text2)]);
      else {
        // No definition: the brackets are text, and what is inside them is read as any text.
        last = match.index + match[0].indexOf('[') + 1;
        push(text.slice(match.index, last));
        pattern.lastIndex = last;
      }
    } else if (autolink !== undefined) push(['a', { href: autolink }, autolink]);
    else if (strong1 !== undefined || strong2 !== undefined) push(['strong', {}, ...within(strong1 ?? strong2)]);
    else if (em1 !== undefined || em2 !== undefined) push(['em', {}, ...within(em1 ?? em2)]);
    else if (del !== undefined) push(['del', {}, ...within(del)]);
    else push(escaped);
  }
  push(text.slice(last));
  return out;
}
