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

test('a code span binds tighter than strong, emphasis, struck out and a link, as on GitHub', () => {
  const inline = (text: string) => markdown(text)[0].slice(2);
  assert.deepEqual(inline('**Pass `**kwargs` through**'), [['strong', {}, 'Pass ', ['code', {}, '**kwargs'], ' through']]);
  assert.deepEqual(inline('*a `b* c` d*'), [['em', {}, 'a ', ['code', {}, 'b* c'], ' d']]);
  assert.deepEqual(inline('_a `b_ c` d_'), [['em', {}, 'a ', ['code', {}, 'b_ c'], ' d']]);
  assert.deepEqual(inline('~~a `~~` b~~'), [['del', {}, 'a ', ['code', {}, '~~'], ' b']]);
  assert.deepEqual(inline('[a `]` b](u)'), [['a', { href: 'u' }, 'a ', ['code', {}, ']'], ' b']]);
  // A code span opened inside emphasis, closed after it: the code wins, as on GitHub.
  assert.deepEqual(inline('**a `b** c`'), ['**a ', ['code', {}, 'b** c']]);
  // A backtick in a link's destination or title is the link's, as on GitHub; one before the `](` opens a code span.
  assert.deepEqual(inline('[a](u "it`s") and `x`'), [['a', { href: 'u' }, 'a'], ' and ', ['code', {}, 'x']]);
  assert.deepEqual(inline('[a](https://e.com/a`b) and `x`'), [['a', { href: 'https://e.com/a`b' }, 'a'], ' and ', ['code', {}, 'x']]);
  assert.deepEqual(inline('[not a `link](/foo`)'), ['[not a ', ['code', {}, 'link](/foo'], ')']);
  assert.deepEqual(inline('no link](u `x`)'), ['no link](u ', ['code', {}, 'x'], ')']);
  // An escaped backtick opens no code span; an autolink is read before one.
  assert.deepEqual(inline('**\\`a** b`'), [['strong', {}, '`a'], ' b`']);
  assert.deepEqual(inline('<https://a.example/`b> `c`'), [['a', { href: 'https://a.example/`b' }, 'https://a.example/`b'], ' ', ['code', {}, 'c']]);
});

test('strong inside emphasis: its closing ** does not end the emphasis, at the end of it either', () => {
  assert.deepEqual(markdown('*Always **run** the tests*'), [['p', {}, ['em', {}, 'Always ', ['strong', {}, 'run'], ' the tests']]]);
  assert.deepEqual(markdown('*Always **run***'), [['p', {}, ['em', {}, 'Always ', ['strong', {}, 'run']]]]);
  assert.deepEqual(markdown('*a \\* b* and *c*'), [['p', {}, ['em', {}, 'a * b'], ' and ', ['em', {}, 'c']]]);
});

test('stars with a space on each side are text inside an emphasis, as on GitHub', () => {
  assert.deepEqual(markdown('*5 * 60 seconds*'), [['p', {}, ['em', {}, '5 * 60 seconds']]]);
  assert.deepEqual(markdown('*a ** b*'), [['p', {}, ['em', {}, 'a ** b']]]);
});

test('a code span inside an emphasis keeps its stars, a strong next to it too', () => {
  assert.deepEqual(markdown('*Run `ls *.md` first*'), [['p', {}, ['em', {}, 'Run ', ['code', {}, 'ls *.md'], ' first']]]);
  assert.deepEqual(markdown('*Glob `**/*.ts` **all** files*'), [['p', {}, ['em', {}, 'Glob ', ['code', {}, '**/*.ts'], ' ', ['strong', {}, 'all'], ' files']]]);
});

test('an emphasis never closed fails fast: backslashes, Windows paths, bold runs and code spans after a lone *', () => {
  for (const text of [
    `*Note: paths look like C:${'\\dir'.repeat(30)} on Windows`,
    `*${'\\'.repeat(44)}`,
    `*a${' **x**'.repeat(25)}`,
    `*a${' `x`'.repeat(5000)}`,
    `*a${' `'.repeat(5000)}`,
  ]) {
    const start = performance.now();
    markdown(text);
    assert.ok(performance.now() - start < 1000, `${Math.round(performance.now() - start)} ms`);
  }
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
