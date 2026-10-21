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

test('an emphasis never closed fails fast: backslashes, Windows paths, bold runs and code spans after a lone *; bare URLs and runs of spaces too', () => {
  for (const text of [
    `*Note: paths look like C:${'\\dir'.repeat(30)} on Windows`,
    `*${'\\'.repeat(44)}`,
    `*a${' **x**'.repeat(25)}`,
    `*a${' `x`'.repeat(5000)}`,
    `*a${' `'.repeat(5000)}`,
    `(www.a_b${'(www.a_b'.repeat(20000)}`,
    `[${'(www.a.com'.repeat(20000)}](u)`,
    `https://a.com/${')'.repeat(40000)}`,
    `https://a.com/${'.)'.repeat(40000)}`,
    `https://a.com/${'&a;'.repeat(40000)}`,
    `a${' '.repeat(50000)}b`,
    `a${' \t'.repeat(25000)}b`,
    `a${' '.repeat(50000)}\nb`,
  ]) {
    const start = performance.now();
    markdown(text);
    assert.ok(performance.now() - start < 1000, `${Math.round(performance.now() - start)} ms`);
  }
});

test("a link's text may hold balanced brackets, as on GitHub; an unbalanced [ is text, and a link holds no other link", () => {
  const inline = (text: string) => markdown(text)[0].slice(2);
  assert.deepEqual(inline('Read [the [beta] guide](https://kotlinlang.org/docs).'), ['Read ', ['a', { href: 'https://kotlinlang.org/docs' }, 'the [beta] guide'], '.']);
  assert.deepEqual(inline('[a [b] c [d] e](u)'), [['a', { href: 'u' }, 'a [b] c [d] e']]);
  assert.deepEqual(inline('[a [b [c] b] a](u)'), [['a', { href: 'u' }, 'a [b [c] b] a']]);
  assert.deepEqual(inline('[the [*beta*] guide](u)'), [['a', { href: 'u' }, 'the [', ['em', {}, 'beta'], '] guide']]);
  // Escaped brackets are text, balanced or not.
  assert.deepEqual(inline('[a \\[b](u)'), [['a', { href: 'u' }, 'a [b']]);
  assert.deepEqual(inline('[a \\] b](u)'), [['a', { href: 'u' }, 'a ] b']]);
  // An unbalanced [ before a link is text.
  assert.deepEqual(inline('[a [b](u)'), ['[a ', ['a', { href: 'u' }, 'b']]);
  // A link in a link's text: only the inner one is a link; an image in one is still fine.
  assert.deepEqual(inline('[a [b](u) c](v)'), ['[a ', ['a', { href: 'u' }, 'b'], ' c](v)']);
  assert.deepEqual(inline('[![logo](l.png)](u)'), [['a', { href: 'u' }, ['a', { href: 'l.png' }, 'logo']]]);
  // An escaped backslash or ! before the inner link escapes neither its [ nor makes it an image.
  assert.deepEqual(inline('[a \\\\[b](u) c](v)'), ['[a \\', ['a', { href: 'u' }, 'b'], ' c](v)']);
  assert.deepEqual(inline('[a \\![b](u) c](v)'), ['[a !', ['a', { href: 'u' }, 'b'], ' c](v)']);
  assert.deepEqual(inline('[a \\[b](u) c](v)'), [['a', { href: 'u' }, 'a [b'], ' c](v)']);
  assert.deepEqual(inline('[a \\\\![b](u) c](v)'), [['a', { href: 'v' }, 'a \\', ['a', { href: 'u' }, 'b'], ' c']]);
  // A backtick in the destination or title of a link with brackets in its text is still the link's.
  assert.deepEqual(inline('[the [beta] guide](u "it`s") and `x`'), [['a', { href: 'u' }, 'the [beta] guide'], ' and ', ['code', {}, 'x']]);
  // A bracket in a code span in the text needs no partner.
  assert.deepEqual(inline('[a `[` b](u)'), [['a', { href: 'u' }, 'a ', ['code', {}, '['], ' b']]);
});

test("a link's destination in <…> may hold spaces and parentheses, as on GitHub; a < with no > is text", () => {
  const inline = (text: string) => markdown(text)[0].slice(2);
  assert.deepEqual(inline('Read [the guide](<docs/my guide.md>).'), ['Read ', ['a', { href: 'docs/my guide.md' }, 'the guide'], '.']);
  assert.deepEqual(inline('[a](<b (c)> "t")'), [['a', { href: 'b (c)' }, 'a']]);
  assert.deepEqual(inline('[a](<b &amp; c>)'), [['a', { href: 'b & c' }, 'a']]);
  assert.deepEqual(inline('[a](<b c>) `x`'), [['a', { href: 'b c' }, 'a'], ' ', ['code', {}, 'x']]);
  assert.deepEqual(inline('[a](<b c)'), ['[a](<b c)']);
  assert.deepEqual(inline('[a](<b>c>)'), ['[a](<b>c>)']);
});

test('a bare http, https or www. URL is a link, without its trailing punctuation, as on GitHub', () => {
  const inline = (text: string) => markdown(text)[0].slice(2);
  const link = (href: string, text = href) => ['a', { href }, text];
  assert.deepEqual(inline('See https://kotlinlang.org/docs.'), ['See ', link('https://kotlinlang.org/docs'), '.']);
  assert.deepEqual(inline('Run http://localhost:3000/x!'), ['Run ', link('http://localhost:3000/x'), '!']);
  // www. links to http://, as on GitHub.
  assert.deepEqual(inline('Visit www.commonmark.org/help, now'), ['Visit ', link('http://www.commonmark.org/help', 'www.commonmark.org/help'), ', now']);
  // Trailing ?!.,:*_~'" are not the link's; nor an unmatched ), nor an entity-like &amp;.
  assert.deepEqual(inline('(https://en.wikipedia.org/wiki/Markdown_(a)).'), ['(', link('https://en.wikipedia.org/wiki/Markdown_(a)'), ').']);
  assert.deepEqual(inline('"Is it https://a.com/x?", she asked:'), ['"Is it ', link('https://a.com/x'), '?", she asked:']);
  assert.deepEqual(inline('https://a.com/?q=1&amp; end'), [link('https://a.com/?q=1'), '& end']);
  // Inside strong, emphasis or struck out; a _ in its path is the link's.
  assert.deepEqual(inline('**https://a.com** *www.b.com* ~~https://c.com~~ https://d.com/a_b_c'), [
    ['strong', {}, link('https://a.com')],
    ' ',
    ['em', {}, link('http://www.b.com', 'www.b.com')],
    ' ',
    ['del', {}, link('https://c.com')],
    ' ',
    link('https://d.com/a_b_c'),
  ]);
  // Not after a letter, not with a _ in the last two parts of its domain, not in a link's text, not in code.
  assert.deepEqual(inline('nohttps://a.com https://www.a_b.c_d'), ['nohttps://a.com https://www.a_b.c_d']);
  assert.deepEqual(inline('www.a_b.com https://a_b.com www.a.b_c.com'), ['www.a_b.com https://a_b.com www.a.b_c.com']);
  // A _ before the last two parts is fine.
  assert.deepEqual(inline('https://a_b.x.com/p www.com'), [link('https://a_b.x.com/p'), ' ', link('http://www.com', 'www.com')]);
  assert.deepEqual(inline('[see https://a.com](u)'), [link('u', 'see https://a.com')]);
  assert.deepEqual(inline('`https://a.com` https://b.com/`x`'), [['code', {}, 'https://a.com'], ' ', link('https://b.com/'), ['code', {}, 'x']]);
  // A list item too.
  assert.deepEqual(markdown('- www.a.com\n'), [['ul', {}, ['li', {}, link('http://www.a.com', 'www.a.com')]]]);
});

test('lists: tight, nested, ordered; loose items keep their paragraphs', () => {
  assert.deepEqual(markdown('- one\n- two\n  - nested\n\n1. a\n\n2. b\n'), [
    ['ul', {}, ['li', {}, 'one'], ['li', {}, 'two', ['ul', {}, ['li', {}, 'nested']]]],
    ['ol', {}, ['li', {}, ['p', {}, 'a']], ['li', {}, ['p', {}, 'b']]],
  ]);
});

test('task list items: "[ ]" and "[x]", then text, are a checkbox before the text alone, as on GitHub', () => {
  const box = (checked: boolean) => ['input', { checked }];
  assert.deepEqual(markdown('- [ ] Tag the release\n- [x] Write the notes\n- [X] **Ship** it\n'), [
    ['ul', {}, ['li', {}, box(false), 'Tag the release'], ['li', {}, box(true), 'Write the notes'], ['li', {}, box(true), ['strong', {}, 'Ship'], ' it']],
  ]);
  // An ordered item too; in a loose list, the box is in the first paragraph; a tab after the marker; the text may look like a heading.
  assert.deepEqual(markdown('1. [ ] one\n   more\n'), [['ol', {}, ['li', {}, box(false), 'one more']]]);
  assert.deepEqual(markdown('- [ ] a\n\n- [x]\tb\n'), [['ul', {}, ['li', {}, ['p', {}, box(false), 'a']], ['li', {}, ['p', {}, box(true), 'b']]]]);
  assert.deepEqual(markdown('- [ ] # h\n'), [['ul', {}, ['li', {}, box(false), '# h']]]);
  // No text after it, another letter, no space, an escaped bracket, or outside a list: text.
  assert.deepEqual(markdown('- [ ]\n- [x]  \n- [y] z\n- [x]a\n- \\[ ] e\n\n[ ] not in a list\n'), [
    ['ul', {}, ['li', {}, '[ ]'], ['li', {}, '[x]'], ['li', {}, '[y] z'], ['li', {}, '[x]a'], ['li', {}, '[ ] e']],
    ['p', {}, '[ ] not in a list'],
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

test('an entity reference is its character, as on GitHub: named, decimal or hex; still text, never HTML', () => {
  const inline = (text: string) => markdown(text)[0].slice(2);
  assert.deepEqual(markdown('Replace &lt;version&gt; &amp; tag it.'), [['p', {}, 'Replace <version> & tag it.']]);
  assert.deepEqual(inline('&copy; &mdash; &nbsp; &ngE; &#35; &#x1F600; &#X22;'), ['\u00a9 \u2014 \u00a0 \u2267\u0338 # \u{1F600} "']);
  // Code point 0, past U+10FFFF or a surrogate → U+FFFD.
  assert.deepEqual(inline('&#0; &#x110000; &#xD800;'), ['\uFFFD \uFFFD \uFFFD']);
  // An unknown name, no ;, too many digits, a space, or a name in the wrong case: as typed.
  assert.deepEqual(inline('&nosuch; &amp &#12345678; &#x1234567; & amp; &AMp; AT&T'), ['&nosuch; &amp &#12345678; &#x1234567; & amp; &AMp; AT&T']);
  // An entity that is a Markdown character is text, never Markdown; nor HTML.
  assert.deepEqual(inline('&ast;not emphasis&ast; &lt;script&gt;alert(1)&lt;/script&gt;'), ['*not emphasis* <script>alert(1)</script>']);
  // Not in code; not after a backslash.
  assert.deepEqual(inline('`&amp;` \\&amp;'), [['code', {}, '&amp;'], ' &amp;']);
  assert.deepEqual(markdown('```\n&lt;x&gt;\n```\n\n    &amp;\n'), [['pre', {}, ['code', {}, '&lt;x&gt;']], ['pre', {}, ['code', {}, '&amp;']]]);
  // In a heading, a list, a table, strong, emphasis, struck out, a link's text and its destination; an autolink and a bare URL too.
  assert.deepEqual(markdown('# a &amp; b\n\n- &lt;x&gt;\n\n| &amp; |\n|---|\n| &gt; |\n'), [
    ['h1', {}, 'a & b'],
    ['ul', {}, ['li', {}, '<x>']],
    ['table', {}, ['thead', {}, ['tr', {}, ['th', {}, '&']]], ['tbody', {}, ['tr', {}, ['td', {}, '>']]]],
  ]);
  assert.deepEqual(inline('**&lt;** *&gt;* ~~&amp;~~ [&lt;v&gt;](a?b=1&amp;c=2)'), [
    ['strong', {}, '<'],
    ' ',
    ['em', {}, '>'],
    ' ',
    ['del', {}, '&'],
    ' ',
    ['a', { href: 'a?b=1&c=2' }, '<v>'],
  ]);
  assert.deepEqual(inline('https://a.com/?b=1&amp;c=2'), [['a', { href: 'https://a.com/?b=1&c=2' }, 'https://a.com/?b=1&c=2']]);
  assert.deepEqual(inline('<https://a.com/?b=1&amp;c=2>'), [['a', { href: 'https://a.com/?b=1&c=2' }, 'https://a.com/?b=1&c=2']]);
});

test('a hard line break, as on GitHub: a \\ or two spaces at the end of a line; any other end of a line is a space', () => {
  assert.deepEqual(markdown('Tag the release.\\\nPush the tag.'), [['p', {}, 'Tag the release.', ['br', {}], 'Push the tag.']]);
  assert.deepEqual(markdown('Tag the release.  \nPush the tag.'), [['p', {}, 'Tag the release.', ['br', {}], 'Push the tag.']]);
  assert.deepEqual(markdown('Tag the release. \nPush the tag.'), [['p', {}, 'Tag the release. Push the tag.']]);
  // In emphasis, a list, a quote and a link's text too.
  assert.deepEqual(markdown('*a\\\nb*'), [['p', {}, ['em', {}, 'a', ['br', {}], 'b']]]);
  assert.deepEqual(markdown('- a\\\n  b'), [['ul', {}, ['li', {}, 'a', ['br', {}], 'b']]]);
  assert.deepEqual(markdown('> a\\\n> b'), [['blockquote', {}, ['p', {}, 'a', ['br', {}], 'b']]]);
  assert.deepEqual(markdown('[a\\\nb](u)'), [['p', {}, ['a', { href: 'u' }, 'a', ['br', {}], 'b']]]);
  // At the end of a paragraph or a heading, an escaped one, or in code, the \\ is text.
  assert.deepEqual(markdown('a\\\n\nb  '), [['p', {}, 'a\\'], ['p', {}, 'b']]);
  assert.deepEqual(markdown('# Steps\\'), [['h1', {}, 'Steps\\']]);
  assert.deepEqual(markdown('a\\\\\nb'), [['p', {}, 'a\\ b']]);
  assert.deepEqual(markdown('`a\\\nb`'), [['p', {}, ['code', {}, 'a\\ b']]]);
});

test('HTML in a SKILL.md is text, never an element', () => {
  assert.deepEqual(markdown('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>'), [
    ['p', {}, '<script>alert(1)</script>'],
    ['p', {}, '<img src=x onerror=alert(1)>'],
  ]);
});

test('every node is one of the tags the page builds', () => {
  const tags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'pre', 'code', 'blockquote', 'ul', 'ol', 'li', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'strong', 'em', 'del', 'a', 'input', 'br']);
  const walk = (node: unknown): void => {
    if (typeof node === 'string') return;
    const [tag, attributes, ...children] = node as [string, Record<string, string>, ...unknown[]];
    assert.ok(tags.has(tag), tag);
    assert.deepEqual(Object.keys(attributes), tag === 'a' ? ['href'] : tag === 'input' ? ['checked'] : []);
    children.forEach(walk);
  };
  markdown('# a\n\n- **b** [c](d)\\\n  i\n- [x] j\n\n> e\n\n```\nf\n```\n\n| g |\n|---|\n| h |\n\n***\n').forEach(walk);
});

test('an email autolink is a mailto link, its text the address; one that is not an address is text', () => {
  const inline = (text: string) => markdown(text)[0].slice(2);
  assert.deepEqual(inline('Ask <kotlin-team@example.com>.'), ['Ask ', ['a', { href: 'mailto:kotlin-team@example.com' }, 'kotlin-team@example.com'], '.']);
  assert.deepEqual(inline('**<a_b@c.d>**'), [['strong', {}, ['a', { href: 'mailto:a_b@c.d' }, 'a_b@c.d']]]);
  // Read before a code span, as a URL autolink is; in code it is code.
  assert.deepEqual(inline('<a`b@c.d> `x`'), [['a', { href: 'mailto:a`b@c.d' }, 'a`b@c.d'], ' ', ['code', {}, 'x']]);
  assert.deepEqual(inline('`<a@c.d>`'), [['code', {}, '<a@c.d>']]);
  assert.deepEqual(inline('<a b@c.d> <a@-c.d> <foo\\+@c.d>'), ['<a b@c.d> <a@-c.d> <foo+@c.d>']);
});
