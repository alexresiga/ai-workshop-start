// The web view's page: one file, no build. Every text from a repository goes in as textContent,
// never as HTML: the Markdown, too, comes from markdown.js as a tree and is built element by element.
export const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Skill Atlas</title>
<style>
  :root {
    color-scheme: light dark;
    --page: #f8f8f6; --panel: #ffffff; --line: #e3e3df; --text: #1d1f21; --muted: #6e7073;
    --accent: #4451c8; --accent-text: #ffffff; --selected: #e9eafa; --pill: #eeeeeb; --tag: #e8eafb; --tag-text: #3a45a8;
    --code: #f2f2ef; --error: #c0392b; --warning: #8a5a00; --warning-bg: #fff6e0;
    --sans: Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
    --mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --page: #1b1c1e; --panel: #232427; --line: #36383c; --text: #e6e6e3; --muted: #9a9ca0;
      --accent: #6873e0; --selected: #2f3150; --pill: #34363a; --tag: #2f3150; --tag-text: #b9bff5;
      --code: #2b2c30; --error: #ff7b6b; --warning: #f0c060; --warning-bg: #3a3220;
    }
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body { display: flex; flex-direction: column; background: var(--page); color: var(--text); font: 16px/1.5 var(--sans); }

  header { display: flex; align-items: center; gap: 1.5rem; padding: .85rem 2rem; background: var(--panel); border-bottom: 1px solid var(--line); }
  header h1 { margin: 0; font-size: 1.45rem; font-weight: 700; letter-spacing: -.01em; white-space: nowrap; }
  form { display: flex; gap: .5rem; flex: 1; max-width: 42rem; }
  input { flex: 1; min-width: 0; padding: .55rem .9rem; font: 1rem var(--mono); color: var(--text); background: var(--panel);
    border: 1px solid var(--line); border-radius: .5rem; }
  input::placeholder { color: var(--muted); }
  input:focus { outline: 2px solid var(--accent); outline-offset: -1px; }
  button.scan { padding: .55rem 1.6rem; font: 500 1rem var(--sans); color: var(--accent-text); background: var(--accent);
    border: 0; border-radius: .5rem; cursor: pointer; }
  button.scan:disabled { opacity: .6; cursor: progress; }
  #repository { display: flex; align-items: center; gap: .6rem; white-space: nowrap; }
  #repository a { font-family: var(--mono); color: var(--text); text-decoration: none; }
  #repository a:hover { text-decoration: underline; }
  .pill { padding: .1rem .7rem; font-size: .9rem; color: var(--muted); background: var(--pill); border-radius: 1rem; }

  #warnings { margin: 0; padding: .5rem 2rem; list-style: none; font-size: .85rem; color: var(--warning); background: var(--warning-bg);
    border-bottom: 1px solid var(--line); }
  #warnings:empty { display: none; }

  main { display: grid; grid-template-columns: minmax(16rem, 36%) 1fr; flex: 1; min-height: 0; }
  nav { overflow-y: auto; padding: .9rem; border-right: 1px solid var(--line); }
  nav button { display: block; width: 100%; margin-bottom: .2rem; padding: .55rem 1rem; text-align: left; font: inherit; color: inherit;
    background: none; border: 0; border-left: 3px solid transparent; border-radius: .5rem; cursor: pointer; }
  nav button:hover { background: var(--pill); }
  nav button[aria-current="true"] { background: var(--selected); border-left-color: var(--accent); border-radius: .25rem .5rem .5rem .25rem; }
  nav .name, nav .description { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  nav .name { font: 1.05rem var(--mono); }
  nav .description { color: var(--muted); }
  .message { padding: 1rem; color: var(--muted); }
  .message.error { color: var(--error); }

  #detail { overflow-y: auto; padding: 1.6rem 2.2rem 3rem; }
  #detail:empty { display: none; }
  .file { display: flex; align-items: baseline; gap: 1rem; font-family: var(--mono); }
  .file .path { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted); }
  .file a { font-family: var(--sans); font-size: 1.1rem; color: var(--accent); text-decoration: none; white-space: nowrap; }
  .file a:hover { text-decoration: underline; }
  .copies { margin: .3rem 0 0; font-size: .85rem; color: var(--muted); }
  .copies code { font-family: var(--mono); }
  .front-matter { margin: 1rem 0 2rem; padding: 1.1rem 1.6rem; background: var(--panel); border: 1px solid var(--line); border-radius: .75rem; }
  .front-matter dl { display: grid; grid-template-columns: max-content 1fr; gap: .5rem 2.2rem; margin: 0; }
  .front-matter dt { font-family: var(--mono); color: var(--muted); }
  .front-matter dd { margin: 0; overflow-wrap: anywhere; }
  .tags { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: 1rem; }
  .tags span { padding: .15rem .8rem; font: .9rem var(--mono); color: var(--tag-text); background: var(--tag); border-radius: 1rem; overflow-wrap: anywhere; }

  .markdown { overflow-wrap: anywhere; }
  .markdown h1 { font-size: 2rem; line-height: 1.25; margin: 0 0 1rem; padding-bottom: .5rem; border-bottom: 1px solid var(--line); }
  .markdown h2 { font-size: 1.45rem; margin: 2rem 0 .75rem; }
  .markdown h3 { font-size: 1.15rem; margin: 1.5rem 0 .5rem; }
  .markdown h4, .markdown h5, .markdown h6 { font-size: 1rem; margin: 1.25rem 0 .5rem; }
  .markdown p, .markdown ul, .markdown ol, .markdown pre, .markdown blockquote, .markdown table { margin: 0 0 1rem; }
  .markdown p, .markdown li { font-size: 1.1rem; line-height: 1.7; }
  .markdown a { color: var(--accent); }
  .markdown code { font: .9em var(--mono); padding: .1em .35em; background: var(--code); border-radius: .25rem; }
  .markdown pre { overflow-x: auto; padding: .9rem 1.1rem; background: var(--code); border-radius: .5rem; }
  .markdown pre code { padding: 0; background: none; font-size: .9rem; }
  .markdown blockquote { padding-left: 1rem; color: var(--muted); border-left: 3px solid var(--line); }
  .markdown hr { border: 0; border-top: 1px solid var(--line); margin: 1.5rem 0; }
  .markdown table { border-collapse: collapse; }
  .markdown th, .markdown td { padding: .35rem .75rem; border: 1px solid var(--line); text-align: left; }
  .markdown .raw { white-space: pre-wrap; }

  @media (max-width: 50rem) {
    header { flex-wrap: wrap; padding: .75rem 1rem; }
    form { order: 3; flex-basis: 100%; max-width: none; }
    main { grid-template-columns: 1fr; grid-template-rows: minmax(8rem, 35%) 1fr; }
    nav { border-right: 0; border-bottom: 1px solid var(--line); }
    #detail { padding: 1.2rem 1rem 2rem; }
  }
</style>
</head>
<body>
<header>
  <h1>Skill Atlas</h1>
  <form id="scan">
    <input id="url" name="url" type="text" placeholder="owner/repo or a GitHub link" aria-label="Repository link"
      autocomplete="off" spellcheck="false" required>
    <button id="button" class="scan" type="submit">Scan</button>
  </form>
  <div id="repository" role="status"></div>
</header>
<ul id="warnings"></ul>
<main>
  <nav id="skills" aria-label="Skills"><p class="message">Paste a repository and press Scan.</p></nav>
  <section id="detail" aria-live="polite"></section>
</main>
<script type="module">
  import { markdown } from '/markdown.js';

  const $ = (id) => document.getElementById(id);
  /** An element with text, children and, for classes, \`.name\` in the tag: \`element('p.message.error', 'text')\`. */
  const element = (tag, ...children) => {
    const [name, ...classes] = tag.split('.');
    const node = document.createElement(name);
    if (classes.length) node.className = classes.join(' ');
    node.append(...children);
    return node;
  };
  let skills = [];

  $('scan').addEventListener('submit', (event) => {
    event.preventDefault();
    scan($('url').value.trim());
  });

  async function scan(url) {
    $('button').disabled = true;
    $('button').textContent = 'Scanning…';
    $('repository').replaceChildren();
    $('warnings').replaceChildren();
    $('detail').replaceChildren();
    $('skills').replaceChildren(element('p.message', 'Scanning ' + url + '…'));
    history.replaceState(null, '', '?repo=' + encodeURIComponent(url));
    try {
      const response = await fetch('/api/scan?url=' + encodeURIComponent(url));
      const answer = await response.json();
      if (!response.ok) throw new Error(answer.error);
      show(answer);
    } catch (error) {
      $('skills').replaceChildren(element('p.message.error', error.message));
    } finally {
      $('button').disabled = false;
      $('button').textContent = 'Scan';
    }
  }

  function show(answer) {
    skills = answer.skills;
    const repository = element('a', answer.repository.id);
    repository.href = answer.repository.url;
    repository.target = '_blank';
    repository.rel = 'noopener';
    $('repository').replaceChildren(repository, element('span.pill', skills.length + (skills.length === 1 ? ' skill' : ' skills')));
    $('warnings').replaceChildren(...answer.warnings.map((warning) => element('li', 'warning: ' + warning)));
    $('skills').replaceChildren(
      ...(skills.length ? [] : [element('p.message', 'No SKILL.md in this repository.')]),
      ...skills.map((skill, index) => {
        const item = element('button', element('span.name', skill.name), element('span.description', skill.description));
        item.type = 'button';
        item.title = skill.name;
        item.addEventListener('click', () => select(index));
        return item;
      }),
    );
    if (skills.length) select(0);
  }

  function select(index) {
    const items = [...$('skills').querySelectorAll('button')];
    items.forEach((item, i) => item.setAttribute('aria-current', String(i === index)));
    items[index].scrollIntoView({ block: 'nearest' });
    const skill = skills[index];

    const github = element('a', 'Open on GitHub ↗');
    github.href = skill.link;
    github.target = '_blank';
    github.rel = 'noopener';
    const path = element('span.path', skill.path);
    path.title = skill.path;
    const parts = [element('div.file', element('span', 'SKILL.md'), path, github)];
    if (skill.copies.length) {
      parts.push(element('p.copies', 'also in ', ...skill.copies.flatMap((copy, i) => [i ? ', ' : '', element('code', copy)])));
    }

    const fields = element('dl', element('dt', 'name'), element('dd', skill.name));
    if (skill.description) fields.append(element('dt', 'description'), element('dd', skill.description));
    const card = element('div.front-matter', fields);
    const tags = Object.entries(skill.properties).map(([key, value]) => element('span', tag(key, value)));
    if (tags.length) card.append(element('div.tags', ...tags));
    parts.push(card);

    const body = element('div.markdown');
    try {
      body.append(...markdown(skill.body).map((node) => build(node, skill.link)));
    } catch {
      body.append(element('pre.raw', skill.body)); // whatever the parser cannot read, as it is
    }
    parts.push(body);
    $('detail').replaceChildren(...parts);
    $('detail').scrollTop = 0;
  }

  /** A front matter key: a flag by its name, anything else as \`key: value\`. */
  function tag(key, value) {
    if (value === true) return key;
    return key + ': ' + (typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value));
  }

  const SAFE = new Set(['http:', 'https:', 'mailto:']);

  /** A Markdown node as elements; links relative to the SKILL.md resolve next to it on GitHub. */
  function build(node, base) {
    if (typeof node === 'string') return document.createTextNode(node);
    const [tag, attributes, ...children] = node;
    const result = document.createElement(tag);
    if (tag === 'a') {
      try {
        const url = new URL(attributes.href, base);
        if (SAFE.has(url.protocol)) {
          result.href = url.href;
          result.target = '_blank';
          result.rel = 'noopener';
        }
      } catch {}
    }
    result.append(...children.map((child) => build(child, base)));
    return result;
  }

  // Up and down move through the skills.
  $('skills').addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const items = [...$('skills').querySelectorAll('button')];
    const current = items.findIndex((item) => item.getAttribute('aria-current') === 'true');
    const next = Math.max(0, Math.min(items.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)));
    if (next === current || !items[next]) return;
    event.preventDefault();
    select(next);
    items[next].focus();
  });

  // ?repo=owner/repo scans at once, so a scan can be reloaded and shared.
  const repo = new URLSearchParams(location.search).get('repo');
  if (repo) {
    $('url').value = repo;
    scan(repo);
  }
</script>
</body>
</html>
`;
