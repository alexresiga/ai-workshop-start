// spec/web.md: the web view, served on a free port, with GitHub answering from tests/helpers.ts.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { request } from 'node:http';
import { createServer, type AddressInfo } from 'node:net';
import { test } from 'node:test';
import { openGitHub } from '../src/core/github.ts';
import { replay } from '../src/core/replay.ts';
import { AtlasError } from '../src/core/errors.ts';
import { createWebServer, listen, type ScanAnswer } from '../src/web.ts';
import { atlas, CLI, EXAMPLE_COMMIT, github, searchAnswers } from './helpers.ts';

const missing = replay({ 'https://api.github.com/repos/JetBrains/missing': { status: 404, body: { message: 'Not Found' } } }, github);
const server = createWebServer({ open: (url) => openGitHub(url, { fetch: missing, token: 'test' }) });
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
test.after(() => server.close());

const scanFor = (url: string) => fetch(`${base}/api/scan?url=${encodeURIComponent(url)}`);

test('the page: an owner/repo or GitHub link input, a Scan button, the list and the SKILL.md', async () => {
  const response = await fetch(`${base}/`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/);
  const page = await response.text();
  assert.match(page, /<input id="url"[^>]*placeholder="owner\/repo or a GitHub link"[^>]*aria-label="Repository link"/);
  assert.match(page, /<button id="button" class="scan" type="submit">Scan<\/button>/);
  assert.match(page, /<nav id="skills"/);
  assert.match(page, /<section id="detail"/);
  assert.match(page, /Open on GitHub ↗/);
  assert.match(page, /import \{ markdown \} from '\/markdown.js'/);
  // A SKILL.md is text: the page never puts repository content in as HTML.
  assert.doesNotMatch(page, /innerHTML/);
});

test('scan: the repository, each skill with its link and its SKILL.md text', async () => {
  const response = await scanFor('https://github.com/JetBrains/example');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    repository: { id: 'JetBrains/example', url: 'https://github.com/JetBrains/example', commit: EXAMPLE_COMMIT },
    skills: [
      {
        name: 'commits',
        description: 'Write commit messages the way this repository does. Use for every commit.',
        path: '.claude/skills/commits/SKILL.md',
        link: `https://github.com/JetBrains/example/blob/${EXAMPLE_COMMIT}/.claude/skills/commits/SKILL.md`,
        copies: [],
        text: '---\nname: commits\ndescription: Write commit messages the way this repository does. Use for every commit.\n---\n# Commits\n',
        properties: {},
        body: '# Commits',
      },
    ],
    warnings: [],
  });
});

test('scan: owner/repo is short for the GitHub link', async () => {
  const response = await scanFor('JetBrains/example');
  assert.equal(response.status, 200);
  const answer = (await response.json()) as ScanAnswer;
  assert.equal(answer.repository.id, 'JetBrains/example');
  assert.deepEqual(answer.skills.map((skill) => skill.name), ['commits']);
});

test('scan: the other front matter keys and the body, apart', async (t) => {
  const text = '---\nname: pick\ndescription: Pick a fix.\ndisable-model-invocation: true\nallowed-tools: [Bash]\n---\n\n# Pick\n\nRun it.\n';
  const server = createWebServer({
    open: (url) => openGitHub(url, { fetch: replay(searchAnswers('example/repo', { '.claude/skills/pick/SKILL.md': text })), token: 't' }),
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/scan?url=example/repo`);
  const [skill] = ((await response.json()) as ScanAnswer).skills;
  assert.deepEqual(skill.properties, { 'disable-model-invocation': true, 'allowed-tools': ['Bash'] });
  assert.equal(skill.body, '# Pick\n\nRun it.');
  assert.equal(skill.text, text);
});

test('the page gets the Markdown parser, as JavaScript', async () => {
  const response = await fetch(`${base}/markdown.js`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/javascript/);
  assert.match(await response.text(), /export function markdown\(text\)/);
});

test('scan: an unreachable repository → status 400 and the clear message', async () => {
  const response = await scanFor('https://github.com/JetBrains/missing');
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Repository not found: https://github.com/JetBrains/missing' });
});

test('scan: GitHub repositories only, never the server’s own directories', async () => {
  for (const url of ['./fixture', '../repo', '/etc', '']) {
    const response = await scanFor(url);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: `Not a GitHub repository URL: ${url}` });
  }
});

test('anything else → 404', async () => {
  assert.equal((await fetch(`${base}/nothing`)).status, 404);
});

test('serve: a port or nothing; not available without a server', async () => {
  assert.deepEqual(await atlas(['serve', 'abc']), { code: 1, stdout: '', stderr: 'Usage: skill-atlas serve [port]' });
  assert.deepEqual(await atlas(['serve']), { code: 1, stdout: '', stderr: 'serve: not available here' });
});

/** The status for a request with this Host header, or none; fetch cannot set one. */
function statusFor(host: string | undefined): Promise<number> {
  return new Promise((resolve, reject) => {
    const { port } = new URL(base);
    const headers = host === undefined ? {} : { host };
    request({ host: '127.0.0.1', port, path: '/api/scan?url=JetBrains/example', headers, setHost: false }, (response) => {
      response.resume();
      resolve(response.statusCode ?? 0);
    })
      .on('error', reject)
      .end();
  });
}

test('only a loopback Host: a page that rebinds its name to 127.0.0.1 gets 403', async () => {
  const { port } = new URL(base);
  for (const host of [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`, 'localhost']) assert.equal(await statusFor(host), 200, host);
  for (const host of [`evil.example.com:${port}`, 'evil.example.com', `127.0.0.1.evil.example.com:${port}`]) {
    assert.equal(await statusFor(host), 403, host);
  }
  // No Host at all: Node refuses it before the server sees it, as HTTP/1.1 requires one.
  assert.equal(await statusFor(undefined), 400);
});

test('serve: not a port → a clear message, exit code 1', async () => {
  assert.deepEqual(await atlas(['serve', '99999']), { code: 1, stdout: '', stderr: 'Not a port: 99999; a port is 0 to 65535' });
});

test('serve: a port already in use → a clear message, not a stack trace', async (t) => {
  const taken = createServer();
  await new Promise<void>((resolve) => taken.listen(0, '127.0.0.1', resolve));
  t.after(() => taken.close());
  const port = (taken.address() as AddressInfo).port;
  await assert.rejects(
    listen(createWebServer({ open: () => Promise.reject(new Error('not scanned')) }), port, () => {}),
    new AtlasError(`Port ${port} is already in use; try skill-atlas serve <another port>`),
  );
  // The real command, as a user runs it.
  const served = spawnSync(process.execPath, [CLI, 'serve', String(port)], { encoding: 'utf8', timeout: 10_000 });
  assert.equal(served.status, 1);
  assert.equal(served.stderr.trim(), `Port ${port} is already in use; try skill-atlas serve <another port>`);
});

/** The page's filter, as the server sends it to the browser. */
async function pageFilter(): Promise<(skills: { name: string; description: string }[], filter: string) => { name: string }[]> {
  const response = await fetch(`${base}/filter.js`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/javascript/);
  const module = await import(`data:text/javascript,${encodeURIComponent(await response.text())}`);
  return module.filter;
}

const SKILLS = [
  { name: 'analysis-api-create-cherry-pick-issue', description: 'Create a KTIJ cherry-pick tracking issue for a KT fix.' },
  { name: 'build-bump-gradle-version', description: 'Bumps the Gradle wrapper/distribution version.' },
  { name: 'build-tools-bump-gradle-api', description: 'Bumps the Gradle API version that Kotlin Gradle plugins are compiled against.' },
  { name: 'minimize-repro-for-diagnostic-test', description: 'Makes a minimal reproduction of a Frontend-related issue.' },
];
const names = (skills: { name: string }[]) => skills.map((skill) => skill.name);

test('the page: a Filter skills input above the list, with the filter from /filter.js', async () => {
  const page = await (await fetch(`${base}/`)).text();
  assert.match(page, /<input id="filter"[^>]*type="search"[^>]*placeholder="Filter skills"[^>]*aria-label="Filter skills"/);
  assert.match(page, /<input id="filter"[\s\S]*<nav id="skills"/);
  assert.match(page, /import \{ filter \} from '\/filter.js'/);
  assert.match(page, /'No skill matches ' \+/);
});

test('filter: empty keeps every skill, in order', async () => {
  const filter = await pageFilter();
  assert.deepEqual(names(filter(SKILLS, '')), names(SKILLS));
  assert.deepEqual(names(filter(SKILLS, '   ')), names(SKILLS));
});

test('filter: a word in the name', async () => {
  const filter = await pageFilter();
  assert.deepEqual(names(filter(SKILLS, 'cherry')), ['analysis-api-create-cherry-pick-issue']);
});

test('filter: a word in the description only', async () => {
  const filter = await pageFilter();
  assert.deepEqual(names(filter(SKILLS, 'kotlin')), ['build-tools-bump-gradle-api']);
});

test('filter: in any case', async () => {
  const filter = await pageFilter();
  assert.deepEqual(names(filter(SKILLS, 'FRONTEND')), ['minimize-repro-for-diagnostic-test']);
});

test('filter: every word, in any order, a part of a word too, in the name or the description', async () => {
  const filter = await pageFilter();
  assert.deepEqual(names(filter(SKILLS, 'gradle bump')), ['build-bump-gradle-version', 'build-tools-bump-gradle-api']);
  assert.deepEqual(names(filter(SKILLS, 'wrap bump')), ['build-bump-gradle-version']);
  assert.deepEqual(names(filter(SKILLS, 'issue ktij')), ['analysis-api-create-cherry-pick-issue']);
});

test('filter: a word in neither → no skill', async () => {
  const filter = await pageFilter();
  assert.deepEqual(names(filter(SKILLS, 'gradle maven')), []);
  assert.deepEqual(names(filter(SKILLS, 'nothing')), []);
});

// The page's own script, run against the server with a small stand-in for the DOM: what a user
// sees in the list and the detail as they type in the filter, press ↑ and ↓, and scan again.

/** An element, as much of one as the page uses. */
class Element {
  children: (Element | Text)[] = [];
  attributes: Record<string, string> = {};
  listeners: Record<string, ((event: object) => void)[]> = {};
  value = '';
  readonly tagName: string;
  constructor(tagName: string) {
    this.tagName = tagName;
  }
  append(...children: (Element | Text | string)[]) {
    this.children.push(...children.map((child) => (typeof child === 'string' ? new Text(child) : child)));
  }
  replaceChildren(...children: (Element | Text | string)[]) {
    this.children = [];
    this.append(...children);
  }
  get textContent(): string {
    return this.children.map((child) => child.textContent).join('');
  }
  set textContent(text: string) {
    this.replaceChildren(text);
  }
  setAttribute(key: string, value: string) {
    this.attributes[key] = String(value);
  }
  getAttribute(key: string) {
    return this.attributes[key] ?? null;
  }
  addEventListener(type: string, listener: (event: object) => void) {
    (this.listeners[type] ??= []).push(listener);
  }
  dispatch(type: string, event: object = {}) {
    for (const listener of this.listeners[type] ?? []) listener({ preventDefault() {}, ...event });
  }
  querySelectorAll(tag: string): Element[] {
    return this.children.flatMap((child) =>
      child instanceof Element ? [...(child.tagName === tag ? [child] : []), ...child.querySelectorAll(tag)] : [],
    );
  }
  scrollIntoView() {}
  focus() {}
}
class Text {
  readonly textContent: string;
  constructor(textContent: string) {
    this.textContent = textContent;
  }
}

let pages = 0;

/** The page, opened at `?repo=example/repo` on a server with these skills, once its scan is shown. */
async function openPage(t: { after(fn: () => void): void }, skills: { name: string; description: string }[]) {
  const files = Object.fromEntries(
    skills.map(({ name, description }) => [`.claude/skills/${name}/SKILL.md`, `---\nname: ${name}\ndescription: ${description}\n---\n# ${name}\n`]),
  );
  const server = createWebServer({ open: (url) => openGitHub(url, { fetch: replay(searchAnswers('example/repo', files)), token: 't' }) });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const live = globalThis.fetch;
  const elements: Record<string, Element> = {};
  for (const id of ['scan', 'url', 'button', 'repository', 'warnings', 'filter', 'skills', 'detail']) elements[id] = new Element(id);
  const globals = {
    document: {
      getElementById: (id: string) => elements[id],
      createElement: (tag: string) => new Element(tag),
      createTextNode: (text: string) => new Text(text),
    },
    history: { replaceState() {} },
    location: { search: '?repo=example/repo' },
    fetch: (url: string) => live(origin + url),
  };
  const saved = Object.fromEntries(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  t.after(() => {
    for (const [key, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete (globalThis as Record<string, unknown>)[key];
    }
  });

  const module = async (path: string) => `data:text/javascript,${encodeURIComponent(await (await live(origin + path)).text())}`;
  const page = await (await live(`${origin}/`)).text();
  const script = page
    .match(/<script type="module">([\s\S]*)<\/script>/)![1]
    .replace("'/filter.js'", JSON.stringify(await module('/filter.js')))
    .replace("'/markdown.js'", JSON.stringify(await module('/markdown.js')));
  await import(`data:text/javascript,${encodeURIComponent(`${script}\n// page ${++pages}`)}`);

  const scanned = async () => {
    for (let i = 0; i < 200 && (elements.button.textContent !== 'Scan' || !elements.skills.querySelectorAll('button').length); i++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };
  await scanned();
  return {
    /** Types this in the filter. */
    type(text: string) {
      elements.filter.value = text;
      elements.filter.dispatch('input');
    },
    key(key: string) {
      elements.skills.dispatch('keydown', { key });
    },
    async scanAgain() {
      elements.scan.dispatch('submit');
      await scanned();
    },
    filter: () => elements.filter.value,
    /** The names in the list, the selected one as `> name`; or the message in the list. */
    list: () =>
      elements.skills.querySelectorAll('button').length
        ? elements.skills
            .querySelectorAll('button')
            .map((item) => (item.getAttribute('aria-current') === 'true' ? '> ' : '') + item.querySelectorAll('span')[0].textContent)
        : elements.skills.textContent,
    /** The name in the selected skill's card, or nothing. */
    detail: () => elements.detail.querySelectorAll('dd')[0]?.textContent ?? '',
  };
}

test('the page: the filter leaves the skills with every word, the first one selected', async (t) => {
  const page = await openPage(t, SKILLS);
  assert.deepEqual(page.list(), ['> ' + SKILLS[0].name, SKILLS[1].name, SKILLS[2].name, SKILLS[3].name]);
  page.type('gradle bump');
  assert.deepEqual(page.list(), ['> build-bump-gradle-version', 'build-tools-bump-gradle-api']);
  assert.equal(page.detail(), 'build-bump-gradle-version');
  page.type('KOTLIN');
  assert.deepEqual(page.list(), ['> build-tools-bump-gradle-api']);
  assert.equal(page.detail(), 'build-tools-bump-gradle-api');
  page.type('');
  assert.deepEqual(page.list(), ['> ' + SKILLS[0].name, SKILLS[1].name, SKILLS[2].name, SKILLS[3].name]);
});

test('the page: ↑ and ↓ move among the skills the filter leaves', async (t) => {
  const page = await openPage(t, SKILLS);
  page.type('gradle');
  page.key('ArrowDown');
  assert.deepEqual(page.list(), ['build-bump-gradle-version', '> build-tools-bump-gradle-api']);
  assert.equal(page.detail(), 'build-tools-bump-gradle-api');
  page.key('ArrowDown');
  assert.deepEqual(page.list(), ['build-bump-gradle-version', '> build-tools-bump-gradle-api']);
  page.key('ArrowUp');
  assert.deepEqual(page.list(), ['> build-bump-gradle-version', 'build-tools-bump-gradle-api']);
});

test('the page: none left → No skill matches <filter>, in the list, and no SKILL.md', async (t) => {
  const page = await openPage(t, SKILLS);
  page.type(' gradle maven ');
  assert.equal(page.list(), 'No skill matches gradle maven');
  assert.equal(page.detail(), '');
});

test('the page: a new scan empties the filter', async (t) => {
  const page = await openPage(t, SKILLS);
  page.type('cherry');
  assert.deepEqual(page.list(), ['> analysis-api-create-cherry-pick-issue']);
  await page.scanAgain();
  assert.equal(page.filter(), '');
  assert.deepEqual(page.list(), ['> ' + SKILLS[0].name, SKILLS[1].name, SKILLS[2].name, SKILLS[3].name]);
});
