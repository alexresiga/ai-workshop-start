// spec/record-feature.md: the clauses a spec change makes, the scenes that cover them, and the recording itself.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { serve } from '../.agents/skills/record-feature/record.ts';
import type { ClustersAnswer, OrganizationAnswer } from '../src/web.ts';
import { changedLines, clauses, coverage, ffmetadata, webvtt } from '../.agents/skills/record-feature/scenes.ts';

const RECORD = fileURLToPath(new URL('../.agents/skills/record-feature/record.ts', import.meta.url));
const REPOSITORY = fileURLToPath(new URL('..', import.meta.url));

const DIFF = `diff --git a/spec/web.md b/spec/web.md
index 7e7f833..0959e5d 100644
--- a/spec/web.md
+++ b/spec/web.md
@@ -8,0 +9,3 @@ A port already in use
+- After a scan, a **filter**: it keeps the skills
+  whose name has every word; the pill shows \`N of M\`
+  while it hides some; Esc clears it
diff --git a/spec/cli.md b/spec/cli.md
index 1111111..2222222 100644
--- a/spec/cli.md
+++ b/spec/cli.md
@@ -3 +3 @@
-Prints the result.
+Prints the result **at once**.
@@ -7,2 +6,0 @@
-- gone
-- also gone
`;

test('changed lines: the added lines of each file, as numbered in the new file', () => {
  assert.deepEqual(changedLines(DIFF), new Map([['spec/web.md', new Set([9, 10, 11])], ['spec/cli.md', new Set([3])]]));
});

test('changed lines: a file with only removed lines has none', () => {
  assert.deepEqual(changedLines(DIFF.slice(DIFF.indexOf('diff --git a/spec/cli.md')).replace('+Prints the result **at once**.\n', '')), new Map());
});

const WEB = [
  '# Web view', // 1
  '## The page', // 2
  '- A header: **Skill Atlas**; a `Scan; button` and a pill', // 3
  '- On the left, the skills; ↑ and ↓ move', // 4
  '- After a scan, a filter: it keeps the skills', // 5
  '  whose name has every word; the pill shows `N of M`', // 6
  '  while it hides some; Esc clears it', // 7
  '', // 8
  'Light and dark, as the system is.', // 9
  '## Details', // 10
].join('\n');

test('clauses: a bullet with its continuation lines, split at ; outside code; only the parts on a changed line', () => {
  assert.deepEqual(clauses('spec/web.md', WEB, new Set([7])), [
    { file: 'spec/web.md', line: 6, text: 'the pill shows `N of M` while it hides some' },
    { file: 'spec/web.md', line: 7, text: 'Esc clears it' },
  ]);
  assert.deepEqual(clauses('spec/web.md', WEB, new Set([3])), [
    { file: 'spec/web.md', line: 3, text: 'A header: **Skill Atlas**' },
    { file: 'spec/web.md', line: 3, text: 'a `Scan; button` and a pill' },
  ]);
});

test('clauses: a changed line outside a bullet; not headings, not blank lines', () => {
  assert.deepEqual(clauses('spec/web.md', WEB, new Set([1, 2, 8, 9, 10])), [
    { file: 'spec/web.md', line: 9, text: 'Light and dark, as the system is.' },
  ]);
});

const CLAUSES = clauses('spec/web.md', WEB, new Set([5, 6, 7]));

test('coverage: each clause, the scenes that cover it, or why it is not shown', () => {
  const result = coverage(CLAUSES, [{ covers: ['Esc', 'clears'] }, { covers: ['the pill shows'] }], {
    'every word': 'the filter tests show it',
  });
  assert.deepEqual(result.problems, []);
  assert.deepEqual(
    result.clauses.map(({ clause, scenes, notShown }) => [clause.text, scenes, notShown]),
    [
      ['After a scan, a filter: it keeps the skills whose name has every word', [], 'the filter tests show it'],
      ['the pill shows `N of M` while it hides some', [1], undefined],
      ['Esc clears it', [0], undefined],
    ],
  );
});

test('coverage: a clause neither covered nor not shown is a problem', () => {
  assert.deepEqual(coverage(CLAUSES, [{ covers: ['Esc'] }], {}).problems, [
    'not covered: spec/web.md:5 After a scan, a filter: it keeps the skills whose name has every word',
    'not covered: spec/web.md:6 the pill shows `N of M` while it hides some',
  ]);
});

test('coverage: a piece in no clause, or in more than one, is a problem', () => {
  const { problems } = coverage(CLAUSES, [{ covers: ['Esc', 'kotlin', 'the'] }], { 'every word': 'why', it: 'why' });
  assert.deepEqual(problems, [
    'scene 1 covers "kotlin": in no changed clause',
    'scene 1 covers "the": in 2 clauses, give more of the text',
    'notShown "it": in 3 clauses, give more of the text',
    'not covered: spec/web.md:6 the pill shows `N of M` while it hides some',
  ]);
});

test('captions and chapters: one for each scene, at its start and end', () => {
  const timings = [
    { caption: 'Type a word', start: 0.5, end: 4.25 },
    { caption: 'Esc clears it', start: 4.25, end: 61.004 },
  ];
  assert.equal(webvtt(timings), 'WEBVTT\n\n1\n00:00:00.500 --> 00:00:04.250\nType a word\n\n2\n00:00:04.250 --> 00:01:01.004\nEsc clears it\n');
  assert.equal(
    ffmetadata('Filter', timings),
    ';FFMETADATA1\ntitle=Filter\n\n[CHAPTER]\nTIMEBASE=1/1000\nSTART=500\nEND=4250\ntitle=Type a word\n\n' +
      '[CHAPTER]\nTIMEBASE=1/1000\nSTART=4250\nEND=61004\ntitle=Esc clears it\n',
  );
});

test('the web view recorded: example an organization with only example/fixture; the model, the scenes file’s ask', async (t) => {
  const prompts: string[] = [];
  const server = await serve(REPOSITORY, async (prompt) => (prompts.push(prompt), '{"clusters": [{"theme": "All", "skills": [1, 2, 3]}]}'));
  t.after(() => server.close());
  const organization = (await (await fetch(`${server.url}/api/organization?name=example`)).json()) as OrganizationAnswer;
  assert.deepEqual(organization.repositories, [{ id: 'example/fixture', url: 'https://github.com/example/fixture', skills: 3 }]);
  const answer = (await (await fetch(`${server.url}/api/clusters?name=example`)).json()) as ClustersAnswer;
  assert.deepEqual(answer.clusters.map((cluster) => [cluster.theme, cluster.skills.length]), [['All', 3]]);
  assert.match(prompts[0], /^1\. code-style — /m);
});

test('the web view recorded: no ask → the question fails', async (t) => {
  const server = await serve(REPOSITORY, undefined);
  t.after(() => server.close());
  const response = await fetch(`${server.url}/api/clusters?name=example`);
  assert.equal(response.status, 500);
  assert.match(((await response.json()) as { error: string }).error, /the scenes file has no ask: what the model answers/);
});

// The recording: the filter, from 8ca5a10, against its parent, with Chromium and ffmpeg.
const FILTER = '8ca5a109c0525a80bc113c818586eb5d38f791c7';
const tools = spawnSync('ffprobe', ['-version']).status === 0 && existsSync(join(REPOSITORY, 'node_modules/@playwright/test'));
const recordTest = tools ? test : test.skip;

/** The other filter clauses, for a scenes file that shows one of them. */
const NOT_SHOWN = `{
  'every word': 'the filter tests', 'none left': 'the filter tests', 'the selected skill stays': 'the filter tests',
  '↑ and ↓': 'the filter tests', 'Esc clears it': 'the filter tests', 'a new scan empties it': 'the filter tests',
}`;

/** A scenes file in a new directory, recorded with `args`. */
function recordScenes(t: { after(fn: () => void): void }, scenes: string, ...args: string[]) {
  mkdirSync(join(REPOSITORY, 'test-results'), { recursive: true });
  const dir = mkdtempSync(join(REPOSITORY, 'test-results', 'record-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, 'scenes.ts'), `import { expect } from '@playwright/test';\nexport const notShown = ${NOT_SHOWN};\n${scenes}`);
  const run = spawnSync('node', [RECORD, join(dir, 'scenes.ts'), '--base', `${FILTER}^`, '--head', FILTER, ...args], {
    cwd: REPOSITORY,
    encoding: 'utf8',
    env: { ...process.env, GITHUB_TOKEN: '' },
    timeout: 240_000,
  });
  return { ...run, dir, out: join(dir, 'out') };
}

const PILL = `export const scenes = [{
  caption: 'Type "messages": the pill shows 1 of 3 skills',
  covers: ['the pill shows'],
  async run(page, act) {
    await act.type(page.getByLabel('Filter skills'), 'messages');
    await expect(page.locator('#count')).toHaveText('1 of 3 skills');
  },
}];`;

recordTest('recording: the videos, the preview, the captions, the traces and the report; every check passes', (t) => {
  const run = recordScenes(t, PILL);
  assert.equal(run.status, 0, run.stderr);
  for (const name of ['after-light.mp4', 'after-dark.mp4', 'before-light.mp4', 'preview.gif', 'captions.vtt', 'report.md']) {
    assert.ok(existsSync(join(run.out, name)), name);
  }
  for (const name of ['after-light', 'after-dark', 'before-light']) assert.ok(existsSync(join(run.out, `trace-${name}.zip`)), name);
  assert.ok(existsSync(join(run.dir, 'baseline/1-light.png')));
  assert.ok(existsSync(join(run.dir, 'baseline/1-dark.png')));

  const probe = JSON.parse(
    spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_chapters', '-of', 'json', join(run.out, 'after-light.mp4')], { encoding: 'utf8' }).stdout,
  );
  const video = probe.streams.find((stream: { codec_type: string }) => stream.codec_type === 'video');
  assert.deepEqual([video.codec_name, video.pix_fmt, video.width, video.height], ['h264', 'yuv420p', 1280, 720]);
  assert.ok(probe.streams.some((stream: { codec_type: string }) => stream.codec_type === 'subtitle'));
  assert.deepEqual(probe.chapters.map((chapter: { tags: { title: string } }) => chapter.tags.title), ['Type "messages": the pill shows 1 of 3 skills']);

  const result = JSON.parse(readFileSync(join(run.out, 'scenes.json'), 'utf8'));
  assert.equal(result.clauses.length, 7);
  const pill = result.clauses.find((entry: { clause: { text: string } }) => entry.clause.text.startsWith('the pill shows'));
  assert.equal(pill.clause.file, 'spec/web.md');
  assert.equal(pill.scenes[0].caption, 'Type "messages": the pill shows 1 of 3 skills');
  assert.equal(typeof pill.scenes[0].start, 'number');
  assert.deepEqual(result.checks.filter((check: { ok: boolean }) => !check.ok), []);
  // The parent has no filter: the before stops at the first scene.
  assert.match(result.before.failed, /Type "messages"/);
  assert.match(readFileSync(join(run.out, 'report.md'), 'utf8'), /\{\{media\}\}\/after-light\.mp4/);
});

recordTest('recording: a scene that fails at the head → its caption and the error, exit 1, no video', (t) => {
  const run = recordScenes(t, PILL.replace("toHaveText('1 of 3 skills')", "toHaveText('9 of 9 skills', { timeout: 1000 })"));
  assert.equal(run.status, 1);
  assert.match(run.stderr, /Type "messages": the pill shows 1 of 3 skills/);
  assert.match(run.stderr, /9 of 9 skills/);
  assert.ok(!existsSync(join(run.out, 'after-light.mp4')));
});

test('--clauses: each changed clause of the spec, with its file and line', () => {
  const run = spawnSync('node', [RECORD, '--clauses', '--base', `${FILTER}^`, '--head', FILTER], { cwd: REPOSITORY, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const lines = run.stdout.trim().split('\n');
  assert.equal(lines.length, 7);
  assert.equal(lines[1], 'spec/web.md:10 the pill shows `N of M skills` while it hides some');
  assert.equal(lines[6], 'spec/web.md:11 a new scan empties it');
});

test('an unknown commit → a clear message, exit 1', () => {
  const run = spawnSync('node', [RECORD, '--clauses', '--base', 'no-such-commit'], { cwd: REPOSITORY, encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.equal(run.stderr, 'unknown commit: no-such-commit; in a shallow clone, git fetch --unshallow\n');
});

recordTest('recording: a clause not covered → listed, exit 1, before anything is recorded', (t) => {
  const run = recordScenes(t, PILL.replace("covers: ['the pill shows']", "covers: ['Skill Atlas']"));
  assert.equal(run.status, 1);
  assert.match(run.stderr, /scene 1 covers "Skill Atlas": in no changed clause/);
  assert.match(run.stderr, /not covered: spec\/web\.md:10 the pill shows `N of M skills` while it hides some/);
  assert.ok(!existsSync(run.out));
});

recordTest('recording: a before where every scene passes → a warning, the video shows nothing new', (t) => {
  const run = recordScenes(
    t,
    PILL.replace(/async run[\s\S]*?\n  \},/, "async run(page) {\n    await expect(page.getByRole('heading', { name: 'Skill Atlas' })).toBeVisible();\n  },"),
  );
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout + run.stderr, /warning: every scene passes at the base: the video shows nothing new/);
});

const PUBLISH = fileURLToPath(new URL('../.agents/skills/record-feature/publish.sh', import.meta.url));

/** A recording's out/ with these checks, beside a scenes file that is not committed. */
function recorded(t: { after(fn: () => void): void }, checks: { name: string; ok: boolean; detail: string }[]) {
  mkdirSync(join(REPOSITORY, 'test-results'), { recursive: true });
  const dir = mkdtempSync(join(REPOSITORY, 'test-results', 'publish-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'out'));
  writeFileSync(join(dir, 'scenes.ts'), 'export const scenes = [];\n');
  writeFileSync(join(dir, 'out/scenes.json'), JSON.stringify({ head: FILTER, checks }));
  writeFileSync(join(dir, 'out/report.md'), '![preview]({{media}}/preview.gif)\n');
  return dir;
}

const publish = (dir: string) => spawnSync('bash', [PUBLISH, '--dry-run', dir, '10'], { cwd: REPOSITORY, encoding: 'utf8' });

test('publishing: a check that failed → listed, exit 1, nothing published', (t) => {
  const run = publish(recorded(t, [{ name: 'a second run is the same', ok: false, detail: 'starts ±0.90 s' }]));
  assert.equal(run.status, 1);
  assert.match(run.stderr, /✗ a second run is the same: starts ±0\.90 s/);
  assert.doesNotMatch(run.stdout, /would push/);
});

test('publishing: scenes.ts not committed → listed, exit 1, nothing published', (t) => {
  const run = publish(recorded(t, [{ name: 'ffprobe', ok: true, detail: '1280×720' }]));
  assert.equal(run.status, 1);
  assert.match(run.stderr, /commit scenes\.ts and baseline\/ first/);
  assert.match(run.stderr, /scenes\.ts/);
  assert.doesNotMatch(run.stdout, /would push/);
});
