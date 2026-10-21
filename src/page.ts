// The web view's page: one file, no build. Every text from a repository goes in as textContent,
// never as HTML: the Markdown, too, comes from markdown.js as a tree and is built element by element.
/** What the list says before a scan. */
const START = 'Paste a repository or an organization and press Scan.';

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
    --code: #f2f2ef; --error: #c0392b; --warning: #8a5a00; --warning-bg: #fff6e0; --mark: #ffe58a; --mark-text: #1d1f21;
    --sans: Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
    --mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --page: #1b1c1e; --panel: #232427; --line: #36383c; --text: #e6e6e3; --muted: #9a9ca0;
      --accent: #6873e0; --selected: #2f3150; --pill: #34363a; --tag: #2f3150; --tag-text: #b9bff5;
      --code: #2b2c30; --error: #ff7b6b; --warning: #f0c060; --warning-bg: #3a3220; --mark: #6b5310; --mark-text: #fff3cc;
    }
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body { display: flex; flex-direction: column; background: var(--page); color: var(--text); font: 16px/1.5 var(--sans); }

  header { display: flex; align-items: center; gap: 1.5rem; padding: .85rem 2rem; background: var(--panel); border-bottom: 1px solid var(--line); }
  header h1 { margin: 0; font-size: 1.45rem; font-weight: 700; letter-spacing: -.01em; white-space: nowrap; }
  header h1 a { color: inherit; text-decoration: none; }
  form { display: flex; gap: .5rem; flex: 1; max-width: 42rem; }
  input { flex: 1; min-width: 0; padding: .55rem .9rem; font: 1rem var(--mono); color: var(--text); background: var(--panel);
    border: 1px solid var(--line); border-radius: .5rem; }
  input::placeholder { color: var(--muted); }
  input:focus { outline: 2px solid var(--accent); outline-offset: -1px; }
  button.scan { padding: .55rem 1.6rem; font: 500 1rem var(--sans); color: var(--accent-text); background: var(--accent);
    border: 0; border-radius: .5rem; cursor: pointer; }
  button.scan:disabled { opacity: .6; cursor: progress; }
  button.dice { flex: none; width: 2.6rem; height: 2.6rem; padding: 0; font-size: 1.5rem; line-height: 1; color: var(--text);
    background: var(--panel); border: 1px solid var(--line); border-radius: .5rem; cursor: pointer; }
  button.dice:hover { background: var(--pill); }
  button.dice:disabled { opacity: .6; cursor: progress; }
  #repository { display: flex; align-items: center; gap: .6rem; white-space: nowrap; }
  #repository a { font-family: var(--mono); color: var(--text); text-decoration: none; }
  #repository a:hover { text-decoration: underline; }
  .pill { padding: .1rem .7rem; font-size: .9rem; color: var(--muted); background: var(--pill); border-radius: 1rem; }

  #notices { padding: .35rem 2rem; font-size: .85rem; color: var(--warning); background: var(--warning-bg); border-bottom: 1px solid var(--line); }
  #notices[hidden] { display: none; }
  #notices > button { padding: .15rem 0; font: inherit; font-weight: 600; color: inherit; background: none; border: 0; cursor: pointer; }
  #notices > button::after { content: " ▸"; }
  #notices > button[aria-expanded="true"]::after { content: " ▾"; }
  #notices > button:hover { text-decoration: underline; }
  #warnings { margin: 0; padding: .15rem 0 .2rem; list-style: none; }
  #warnings[hidden] { display: none; }

  main { display: grid; grid-template-columns: minmax(16rem, 36%) 1fr; flex: 1; min-height: 0; }
  aside { display: flex; flex-direction: column; min-height: 0; border-right: 1px solid var(--line); }
  #filter { flex: none; margin: .9rem .9rem 0; font-family: var(--sans); }
  #filter[hidden] { display: none; }
  nav { flex: 1; overflow-y: auto; padding: .9rem; }
  nav button { display: block; width: 100%; margin-bottom: .2rem; padding: .55rem 1rem; text-align: left; font: inherit; color: inherit;
    background: none; border: 0; border-left: 3px solid transparent; border-radius: .5rem; cursor: pointer; }
  nav button[hidden] { display: none; }
  nav button:hover { background: var(--pill); }
  nav button[aria-current="true"] { background: var(--selected); border-left-color: var(--accent); border-radius: .25rem .5rem .5rem .25rem; }
  nav .name, nav .description { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  nav .name { font: 1.05rem var(--mono); }
  nav .description { color: var(--muted); }
  nav .description.none { font-style: italic; opacity: .75; }
  nav .head { display: flex; align-items: center; gap: .5rem; }
  nav .head .name { flex: 1; min-width: 0; }
  nav .source, nav .more { flex: none; padding: 0 .55rem; font: .75rem/1.6 var(--mono); border-radius: 1rem; }
  nav .source { color: var(--tag-text); background: var(--tag); }
  nav .more { color: var(--muted); background: var(--pill); }
  nav button[aria-current="true"] .source { background: var(--panel); }
  nav mark { color: var(--mark-text); background: var(--mark); border-radius: .2rem; }
  nav .cluster { margin-bottom: .9rem; }
  nav .cluster[hidden] { display: none; }
  nav .cluster h2 { margin: 0 0 .3rem; padding: 0 1rem; font: 600 .8rem var(--sans); color: var(--muted); }
  nav.repositories button { display: flex; align-items: center; gap: 1rem; }
  nav.repositories .name { flex: 1; min-width: 0; }
  nav.repositories .pill { flex: none; }
  .summary h2 { margin: 0 0 .5rem; font: 1.45rem var(--mono); }
  .summary p { margin: 0 0 .5rem; color: var(--muted); }
  .summary button.scan { margin-top: .5rem; }
  #clusters { margin-top: 1.6rem; }
  #clusters > p { margin: 0 0 1rem; color: var(--muted); }
  #clusters .message { padding: 0; }
  #clusters .message.error { color: var(--error); }
  #clusters .theme { margin-bottom: 1.6rem; }
  .theme h3 { display: flex; align-items: center; gap: .6rem; margin: 0 0 .5rem; font-size: 1.15rem; }
  .theme h3 .pill { font-weight: 400; }
  .theme ul { margin: 0; padding: 0; list-style: none; }
  .theme li { display: flex; align-items: baseline; gap: .75rem; padding: .2rem 0; white-space: nowrap; }
  .theme li a { font-family: var(--mono); color: var(--accent); text-decoration: none; }
  .theme li a:hover { text-decoration: underline; }
  .theme li .in { font-family: var(--mono); font-size: .85rem; color: var(--muted); }
  .theme li .description { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; color: var(--muted); }
  .message { padding: 1rem; color: var(--muted); }
  .message.error { color: var(--error); }
  .loading { display: flex; flex-direction: column; gap: .6rem; }
  .loading .what { display: flex; align-items: center; gap: .6rem; }
  .spinner { flex: none; width: 1rem; height: 1rem; border: 2px solid var(--line); border-top-color: var(--accent); border-radius: 50%;
    animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 2.4s; } }
  .loading progress { width: 100%; height: .4rem; appearance: none; border: 0; border-radius: .2rem; background: var(--pill); overflow: hidden; }
  .loading progress::-webkit-progress-bar { background: var(--pill); }
  .loading progress::-webkit-progress-value { background: var(--accent); transition: width .2s; }
  .loading progress::-moz-progress-bar { background: var(--accent); }

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
    aside { border-right: 0; border-bottom: 1px solid var(--line); }
    #detail { padding: 1.2rem 1rem 2rem; }
  }
</style>
</head>
<body>
<header>
  <h1><a id="home" href="/" title="Back to the start">Skill Atlas</a></h1>
  <form id="scan">
    <input id="url" name="url" type="text" placeholder="owner/repo, an organization or a GitHub link" aria-label="Repository or organization link"
      autocomplete="off" spellcheck="false" required>
    <button id="button" class="scan" type="submit">Scan</button>
  </form>
  <button id="dice" class="dice" type="button" title="A random skill from JetBrains/kotlin"
    aria-label="A random skill from JetBrains/kotlin">🎲</button>
  <div id="repository" role="status"></div>
</header>
<div id="notices" hidden>
  <button id="warnings-toggle" type="button" aria-expanded="false" aria-controls="warnings"></button>
  <ul id="warnings" hidden></ul>
</div>
<main>
  <aside>
    <input id="filter" type="search" placeholder="Filter by name or description" aria-label="Filter skills"
      autocomplete="off" spellcheck="false" hidden>
    <nav id="skills" aria-label="Skills"><p class="message">${START}</p></nav>
  </aside>
  <section id="detail" aria-live="polite"></section>
</main>
<script type="module">
  import { markdown } from '/markdown.js';
  import { matches } from '/filter.js';
  import { DICE_REPOSITORY, pick } from '/random.js';
  import { marks, source } from '/list.js';
  import { clusters } from '/cluster.js';

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
  /** The latest scan: only its answer is shown, whichever comes back last. */
  let latest = 0;
  /** An organization or a user, alone or as a GitHub link; \`owner/repo\` is a repository. */
  const ORGANIZATION = /^(?:(?:https?:\\/\\/)?(?:www\\.)?github\\.com\\/)?([a-z\\d][a-z\\d-]*)\\/?$/i;
  /** The repository on the page, as \`owner/repo\`, after a scan. */
  let onPage = '';

  /**
   * The warnings under the header, hidden behind an \`N warnings\` toggle; \`collapse\`, for a new scan or home, hides them again;
   * none → nothing under the header.
   */
  function warn(warnings, collapse = false) {
    $('warnings').replaceChildren(...warnings.map((warning) => element('li', 'warning: ' + warning)));
    $('warnings-toggle').textContent = '⚠ ' + plural(warnings.length, 'warning');
    $('notices').hidden = !warnings.length;
    if (collapse) expand(false);
  }

  function expand(open) {
    $('warnings-toggle').setAttribute('aria-expanded', String(open));
    $('warnings').hidden = !open;
  }

  $('warnings-toggle').addEventListener('click', () => expand($('warnings').hidden));

  /** Home: the page as it first opens, with no scan; one still running is dropped. */
  function home() {
    latest++;
    onPage = '';
    skills = [];
    $('url').value = '';
    $('button').disabled = false;
    $('dice').disabled = false;
    $('button').textContent = 'Scan';
    $('repository').replaceChildren();
    warn([], true);
    $('detail').replaceChildren();
    $('filter').value = '';
    $('filter').hidden = true;
    $('skills').classList.remove('repositories');
    $('skills').setAttribute('aria-label', 'Skills');
    $('skills').replaceChildren(element('p.message', ${JSON.stringify(START)}));
  }

  $('home').addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; // a new tab or window: the browser's
    event.preventDefault();
    if (location.search) history.pushState(null, '', '/');
    home();
  });

  $('scan').addEventListener('submit', (event) => {
    event.preventDefault();
    scan($('url').value.trim(), 'replace');
  });

  /** Scans an organization or a repository; \`how\` says what becomes of the address: push, replace, or none. */
  function scan(text, how, organization = ORGANIZATION.test(text)) {
    const name = organization ? ORGANIZATION.exec(text)[1] : text;
    const address = (organization ? '?org=' : '?repo=') + encodeURIComponent(name);
    if (how === 'push') history.pushState(null, '', address);
    else if (how === 'replace') history.replaceState(null, '', address);
    return organization
      ? load('/api/organization/progress?name=' + encodeURIComponent(name), 'Listing ' + name + '’s repositories…', showOrganization)
      : load('/api/scan?url=' + encodeURIComponent(text), 'Scanning ' + text + '…', show);
  }

  /** What the list shows while a scan runs, or the clusters while they come: a spinner and what it does. */
  function loading(text, id = 'loading') {
    const spinner = element('span.spinner');
    spinner.setAttribute('aria-hidden', 'true');
    const status = element('div.message.loading', element('span.what', spinner, element('span.text', text)));
    status.id = id;
    status.setAttribute('role', 'status');
    return status;
  }

  /**
   * How far an organization's scan is, as text and a bar, in the list's \`#loading\`: updated, not rebuilt, so the spinner
   * keeps turning, the bar eases, and a screen reader hears only the text that changed.
   */
  function progressed({ scanned, of }, status = $('loading')) {
    status.querySelector('.text').textContent = 'Scanned ' + scanned + ' of ' + plural(of, 'repository');
    bar(status, 'Repositories scanned', scanned, of);
  }

  /** The status's progress bar, made the first time, or when it measured something else: \`value\` of \`max\`. */
  function bar(status, label, value, max) {
    let progress = status.querySelector('progress');
    if (progress?.getAttribute('aria-label') !== label) {
      progress?.remove();
      progress = element('progress');
      progress.setAttribute('aria-label', label);
      status.append(progress);
    }
    progress.max = max;
    progress.value = value;
  }

  /**
   * The answer of a streamed scan, one JSON a line: each \`{ progress }\` shown while this scan is the latest, the last line
   * the answer.
   */
  async function streamed(response, mine, show = (line) => progressed(line.progress)) {
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffered = '';
    for (;;) {
      const { value, done } = await reader.read();
      buffered += value ?? '';
      const lines = buffered.split('\\n');
      buffered = lines.pop();
      for (const line of lines.filter(Boolean)) {
        const answer = JSON.parse(line);
        if (!answer.progress && answer.clustering === undefined && !answer.clustered) return answer;
        if (mine !== latest) continue; // a later scan replaced this one
        show(answer);
      }
      if (done) throw new Error('The scan stopped before its answer; try again.');
    }
  }

  async function load(api, message, render) {
    const mine = ++latest;
    onPage = '';
    $('button').disabled = true;
    $('dice').disabled = true;
    $('button').textContent = 'Scanning…';
    $('repository').replaceChildren();
    warn([], true);
    $('detail').replaceChildren();
    $('filter').value = '';
    $('filter').hidden = true;
    $('skills').classList.remove('repositories');
    $('skills').setAttribute('aria-label', 'Skills');
    $('skills').replaceChildren(loading(message));
    try {
      const response = await fetch(api);
      const answer = response.ok && response.headers.get('content-type')?.startsWith('application/x-ndjson')
        ? await streamed(response, mine)
        : await response.json();
      if (mine !== latest) return; // a later scan replaced this one
      if (!response.ok || answer.error) throw new Error(answer.error);
      render(answer);
    } catch (error) {
      if (mine === latest) $('skills').replaceChildren(element('p.message.error', error.message));
    } finally {
      if (mine === latest) {
        $('button').disabled = false;
        $('dice').disabled = false;
        $('button').textContent = 'Scan';
      }
    }
  }

  const plural = (n, noun) => n + ' ' + (n === 1 ? noun : noun.endsWith('y') ? noun.slice(0, -1) + 'ies' : noun + 's');

  /** The organization's repositories with skills, most first; picking one scans it, and Back returns here. */
  function showOrganization(answer) {
    skills = [];
    const total = answer.repositories.reduce((sum, repository) => sum + repository.skills, 0);
    const link = element('a', answer.organization.id);
    link.href = answer.organization.url;
    link.target = '_blank';
    link.rel = 'noopener';
    const count = element('span.pill', plural(total, 'skill'));
    count.id = 'count';
    const repositories = element('span.pill', answer.repositories.length + ' of ' + plural(answer.scanned, 'repository'));
    repositories.id = 'repositories';
    $('repository').replaceChildren(link, count, repositories);
    warn(answer.warnings);
    $('skills').classList.add('repositories');
    $('skills').setAttribute('aria-label', 'Repositories');
    $('skills').replaceChildren(
      ...(answer.repositories.length
        ? []
        : [element('p.message', 'No SKILL.md in any of ' + answer.organization.id + '’s ' + plural(answer.scanned, 'repository') + '.')]),
      ...answer.repositories.map((repository) => {
        const item = element('button', element('span.name', repository.id), element('span.pill', plural(repository.skills, 'skill')));
        item.type = 'button';
        item.title = repository.id;
        item.addEventListener('click', () => {
          $('url').value = repository.id;
          scan(repository.id, 'push', false);
        });
        return item;
      }),
    );
    const parts = [
      element('h2', answer.organization.id),
      element('p', plural(total, 'skill') + ' in ' + answer.repositories.length + ' of ' + plural(answer.scanned, 'repository') + '.'),
    ];
    if (answer.repositories.length) {
      const button = element('button.scan', 'Cluster skills');
      button.id = 'cluster';
      button.type = 'button';
      button.addEventListener('click', () => cluster(answer.organization.id, answer.warnings));
      const clusters = element('div');
      clusters.id = 'clusters';
      parts.push(element('p', 'Pick a repository to see its skills.'), button, clusters);
    }
    $('detail').replaceChildren(element('div.summary', ...parts));
  }

  /** The organization's skills by theme, from a small model; a new scan, or home, drops the answer. */
  async function cluster(organization, warnings) {
    const mine = latest;
    // The scan's warnings, without the last answer's.
    warn(warnings);
    $('cluster').disabled = true;
    $('cluster').textContent = 'Clustering…';
    $('clusters').replaceChildren(loading('Listing ' + organization + '’s repositories…', 'clustering'));
    // The organization scanned again, its progress as the list shows it; then the model asked, a bar of its own
    // moving on as its answer puts the skills in clusters.
    const show = (line) => {
      const status = $('clustering');
      if (line.progress) progressed(line.progress, status);
      else if (line.clustered) {
        status.querySelector('.text').textContent =
          'Clustered ' + line.clustered.skills + ' of ' + plural(line.clustered.of, 'skill') + ' with haiku…';
        bar(status, 'Skills clustered', line.clustered.skills, line.clustered.of);
      } else {
        status.querySelector('.text').textContent = 'Clustering ' + plural(line.clustering, 'skill') + ' with haiku…';
        bar(status, 'Skills clustered', 0, line.clustering);
      }
    };
    try {
      const response = await fetch('/api/clusters/progress?name=' + encodeURIComponent(organization));
      const answer = response.ok ? await streamed(response, mine, show) : await response.json();
      if (mine !== latest) return;
      if (!response.ok || answer.error) throw new Error(answer.error);
      showClusters(answer);
    } catch (error) {
      if (mine === latest) $('clusters').replaceChildren(element('p.message.error', error.message));
    } finally {
      if (mine === latest) {
        $('cluster').disabled = false;
        $('cluster').textContent = 'Cluster skills';
      }
    }
  }

  /** Each cluster: its theme and an \`N skills\` pill, then its skills, each with its repository and first sentence. */
  function showClusters(answer) {
    warn(answer.warnings);
    $('clusters').replaceChildren(
      element('p', plural(answer.skills, 'skill') + ' in ' + plural(answer.clusters.length, 'cluster') + '.'),
      ...answer.clusters.map((cluster) =>
        element('section.theme',
          element('h3', element('span', cluster.theme), element('span.pill', plural(cluster.skills.length, 'skill'))),
          element('ul', ...cluster.skills.map((skill) => {
            const link = element('a', skill.name);
            link.href = skill.link;
            link.target = '_blank';
            link.rel = 'noopener';
            const description = element('span.description', firstSentence(skill.description));
            description.title = skill.description;
            return element('li', link, element('span.in', skill.repository), description);
          })),
        ),
      ),
    );
  }

  const firstSentence = (text) => {
    const line = text.replace(/\\s+/g, ' ').trim();
    return /^.*?[.!?](?=\\s|$)/.exec(line)?.[0] ?? line;
  };

  function show(answer) {
    // By the words their names share, each cluster under its heading; the list is in their order.
    const groups = clusters(answer.skills);
    skills = groups.length ? groups.flatMap((group) => group.skills) : answer.skills;
    onPage = answer.repository.id;
    const repository = element('a', answer.repository.id);
    repository.href = answer.repository.url;
    repository.target = '_blank';
    repository.rel = 'noopener';
    const count = element('span.pill', skills.length + (skills.length === 1 ? ' skill' : ' skills'));
    count.id = 'count';
    $('repository').replaceChildren(repository, count);
    const unmatched = element('p.message');
    unmatched.id = 'unmatched';
    unmatched.hidden = true;
    warn(answer.warnings);
    const items = skills.map((skill, index) => {
      const head = element('span.head', element('span.name', skill.name));
      const folder = source(skill.path);
      if (folder) {
        const tag = element('span.source', folder);
        tag.title = skill.path;
        head.append(tag);
      }
      if (skill.copies.length) {
        const more = element('span.more', '+' + plural(skill.copies.length, 'copy'));
        more.title = 'also in ' + skill.copies.join(', ');
        head.append(more);
      }
      const item = element('button', head, skill.description ? element('span.description', skill.description) : element('span.description.none', 'No description'));
      item.type = 'button';
      item.title = skill.name;
      item.addEventListener('click', () => select(index));
      return item;
    });
    let next = 0;
    const list = groups.length
      ? groups.map((group) => {
          const label = group.word ?? 'Other';
          const cluster = element('div.cluster', element('h2', label + ' · ' + group.skills.length),
            ...items.slice(next, (next += group.skills.length)));
          cluster.setAttribute('role', 'group');
          cluster.setAttribute('aria-label', label);
          return cluster;
        })
      : items;
    $('skills').replaceChildren(
      ...(skills.length ? [] : [element('p.message', 'No SKILL.md in this repository.')]),
      unmatched,
      ...list,
    );
    $('filter').hidden = !skills.length;
    if (skills.length) filter();
  }

  /** Only the skills whose name or description has every word of the filter; the selection stays if it can. */
  function filter() {
    if ($('filter').hidden) return; // before a scan, or while one runs
    const text = $('filter').value;
    const items = [...$('skills').querySelectorAll('button')];
    items.forEach((item, i) => {
      item.hidden = !matches(skills[i], text);
      item.querySelector('.name').replaceChildren(...marked(skills[i].name, text));
      if (skills[i].description) item.querySelector('.description').replaceChildren(...marked(skills[i].description, text));
    });
    $('skills').querySelectorAll('.cluster').forEach((cluster) => (cluster.hidden = !cluster.querySelector('button:not([hidden])')));
    const shown = items.filter((item) => !item.hidden).length;
    const count = shown === skills.length ? String(skills.length) : shown + ' of ' + skills.length;
    $('count').textContent = count + (skills.length === 1 ? ' skill' : ' skills');
    $('unmatched').hidden = shown > 0 || !skills.length;
    $('unmatched').textContent = 'No skill matches ' + text.trim() + '.';
    const current = items.findIndex((item) => item.getAttribute('aria-current') === 'true');
    if (current >= 0 && !items[current].hidden) return;
    const first = items.findIndex((item) => !item.hidden);
    if (first >= 0) select(first);
    else {
      items.forEach((item) => item.setAttribute('aria-current', 'false'));
      $('detail').replaceChildren();
    }
  }

  /** The text, with what the filter matched in \`<mark>\`. */
  function marked(text, typed) {
    const parts = [];
    let at = 0;
    for (const [start, end] of marks(text, typed)) {
      if (start > at) parts.push(text.slice(at, start));
      parts.push(element('mark', text.slice(start, end)));
      at = end;
    }
    if (at < text.length) parts.push(text.slice(at));
    return parts;
  }

  $('filter').addEventListener('input', filter);
  $('filter').addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && $('filter').value) {
      $('filter').value = '';
      filter();
    }
  });

  // The dice: a random skill from JetBrains/kotlin, scanned first unless it is on the page.
  $('dice').addEventListener('click', async () => {
    if (onPage.toLowerCase() !== DICE_REPOSITORY.toLowerCase()) {
      $('url').value = DICE_REPOSITORY;
      await scan(DICE_REPOSITORY, 'replace', false);
      if (onPage.toLowerCase() !== DICE_REPOSITORY.toLowerCase()) return; // the scan failed: its message is in the list
    }
    $('filter').value = '';
    filter();
    const items = [...$('skills').querySelectorAll('button')];
    const index = pick(skills.length, items.findIndex((item) => item.getAttribute('aria-current') === 'true'));
    if (index >= 0) select(index);
  });

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

  // Up and down move through the skills the filter shows, or through an organization's repositories.
  $('skills').addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const items = [...$('skills').querySelectorAll('button')];
    if ($('skills').classList.contains('repositories')) {
      const current = items.indexOf(document.activeElement);
      const next = items[Math.max(0, Math.min(items.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)))];
      if (!next) return;
      event.preventDefault();
      next.focus();
      return;
    }
    const shown = items.filter((item) => !item.hidden);
    const current = shown.findIndex((item) => item.getAttribute('aria-current') === 'true');
    const next = Math.max(0, Math.min(shown.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)));
    if (next === current || !shown[next]) return;
    event.preventDefault();
    select(items.indexOf(shown[next]));
    shown[next].focus();
  });

  // ?repo=owner/repo, or ?org=organization, scans at once, so a scan can be reloaded and shared; Back and Forward too.
  function scanAddress() {
    const address = new URLSearchParams(location.search);
    const text = address.get('org') ?? address.get('repo');
    if (!text) return home();
    $('url').value = text;
    scan(text, 'none', address.has('org'));
  }
  addEventListener('popstate', scanAddress);
  scanAddress();
</script>
</body>
</html>
`;
