// spec/web.md: the SKILL.md body as a tree the page builds element by element; never HTML.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { markdown } from '../src/markdown.js';

test('headings, paragraphs and a rule; a paragraph joins its lines', () => {
  assert.deepEqual(markdown('# Title\n\nOne line\nand the next.\n\n## Steps ##\n\n---\n'), [
    ['h1', {}, 'Title'],
    ['p', {}, 'One line and the next.'],
    ['h2', {}, 'Steps'],
    ['hr', {}],
  ]);
});

test('inline: code, strong, emphasis, struck out, links, an image as its link, escapes', () => {
  assert.deepEqual(markdown('Run `npm ci`, **now** *please* ~~later~~ [guide](docs/a.md) ![logo](l.png) \\*literal\\* snake_case_name'), [
    [
      'p',
      {},
      'Run ',
      ['code', {}, 'npm ci'],
      ', ',
      ['strong', {}, 'now'],
      ' ',
      ['em', {}, 'please'],
      ' ',
      ['del', {}, 'later'],
      ' ',
      ['a', { href: 'docs/a.md' }, 'guide'],
      ' ',
      ['a', { href: 'l.png' }, 'logo'],
      ' *literal* snake_case_name',
    ],
  ]);
});

test('lists: tight, nested, ordered; loose items keep their paragraphs', () => {
  assert.deepEqual(markdown('- one\n- two\n  - nested\n\n1. a\n\n2. b\n'), [
    ['ul', {}, ['li', {}, 'one'], ['li', {}, 'two', ['ul', {}, ['li', {}, 'nested']]]],
    ['ol', {}, ['li', {}, ['p', {}, 'a']], ['li', {}, ['p', {}, 'b']]],
  ]);
});

test('fenced code as it is, a quote, a table', () => {
  assert.deepEqual(markdown('```sh\n# not a heading\n  **kept**\n```\n\n> quoted *text*\n\n| a | b |\n|---|:-:|\n| 1 | `2` |\n'), [
    ['pre', {}, ['code', {}, '# not a heading\n  **kept**']],
    ['blockquote', {}, ['p', {}, 'quoted ', ['em', {}, 'text']]],
    ['table', {}, ['thead', {}, ['tr', {}, ['th', {}, 'a'], ['th', {}, 'b']]], ['tbody', {}, ['tr', {}, ['td', {}, '1'], ['td', {}, ['code', {}, '2']]]]],
  ]);
});

test('indented code as it is, line by line; an indented line inside a paragraph is still the paragraph', () => {
  assert.deepEqual(markdown('Run this:\n\n    git checkout -b fix\n    git commit -m "x"\n\n    git push\n\nAfter.\n'), [
    ['p', {}, 'Run this:'],
    ['pre', {}, ['code', {}, 'git checkout -b fix\ngit commit -m "x"\n\ngit push']],
    ['p', {}, 'After.'],
  ]);
  assert.deepEqual(markdown('text\n    more text\n'), [['p', {}, 'text more text']]);
  assert.deepEqual(markdown('- item\n\n      code in the item\n'), [['ul', {}, ['li', {}, ['p', {}, 'item'], ['pre', {}, ['code', {}, 'code in the item']]]]]);
});

test('a table right after a line of text, as on GitHub; only with as many columns as the delimiter row', () => {
  assert.deepEqual(markdown('Severity levels:\n| Level | Meaning |\n|---|---|\n| 1 | low |\n'), [
    ['p', {}, 'Severity levels:'],
    ['table', {}, ['thead', {}, ['tr', {}, ['th', {}, 'Level'], ['th', {}, 'Meaning']]], ['tbody', {}, ['tr', {}, ['td', {}, '1'], ['td', {}, 'low']]]],
  ]);
  assert.deepEqual(markdown('a | b\n|---|\n'), [['p', {}, 'a | b |---|']]);
});

test('HTML in a SKILL.md is text, never an element', () => {
  assert.deepEqual(markdown('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>'), [
    ['p', {}, '<script>alert(1)</script>'],
    ['p', {}, '<img src=x onerror=alert(1)>'],
  ]);
});

test('every node is one of the tags the page builds', () => {
  const tags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'pre', 'code', 'blockquote', 'ul', 'ol', 'li', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'strong', 'em', 'del', 'a']);
  const walk = (node: unknown): void => {
    if (typeof node === 'string') return;
    const [tag, attributes, ...children] = node as [string, Record<string, string>, ...unknown[]];
    assert.ok(tags.has(tag), tag);
    assert.deepEqual(Object.keys(attributes), tag === 'a' ? ['href'] : []);
    children.forEach(walk);
  };
  markdown('# a\n\n- **b** [c](d)\n\n> e\n\n```\nf\n```\n\n| g |\n|---|\n| h |\n\n***\n').forEach(walk);
});
