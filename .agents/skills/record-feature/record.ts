// spec/record-feature.md: records the scenes against the web view at the head and at the base, checks the videos,
// and writes them, with the preview, captions, traces, scenes.json and the PR comment, to out/ beside the scenes file.
import { chromium, type Locator, type Page } from '@playwright/test';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { changedLines, clauses, coverage, ffmetadata, webvtt, type Clause, type Coverage, type Timing } from './scenes.ts';

/** What a scene can do so a viewer can follow it: the cursor moves to what it clicks, typing is paced, keys show. */
export type Act = {
  click(target: Locator): Promise<void>;
  type(target: Locator, text: string): Promise<void>;
  press(key: string): Promise<void>;
  pause(ms?: number): Promise<void>;
};

/** One scene: its caption, the pieces of clause text it covers, and what it does, ending on an `expect`. */
export type Scene = { caption: string; covers: string[]; run(page: Page, act: Act): Promise<void> };

/** A scenes file. */
export type Scenes = { title?: string; scenes: Scene[]; notShown?: Record<string, string> };

const SIZE = { width: 1280, height: 720 };
/** The repository the page scans: fixture/, answered as GitHub would. */
const REPO = 'example/fixture';
/** How long each scene's end stays on screen, and when in it the screenshot is taken. */
const HOLD = 1200;
const SHOT = 500;
const LIMITS = { duration: 60, frame: 0.9, baseline: 0.98, rerun: 0.98, drift: 0.5 };

type Options = { scenes: string; base: string; head?: string; update: boolean; list: boolean };
type Run = { video: string; timings: Timing[]; shots: { path: string; at: number }[]; failed?: string };
type Check = { name: string; ok: boolean; detail: string };

const KEYS: Record<string, string> = { Escape: 'Esc', ArrowDown: '↓', ArrowUp: '↑', ArrowLeft: '←', ArrowRight: '→', Enter: '⏎', Tab: '⇥' };

function act(page: Page): Act {
  const pause = (ms = 600) => page.waitForTimeout(ms);
  const show = (id: string, text: string) => page.evaluate(`window.recordFeature?.show(${JSON.stringify(id)}, ${JSON.stringify(text)})`);
  const point = async (target: Locator) => {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) throw new Error(`not on screen: ${target}`);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
    await pause(200);
  };
  return {
    async click(target) {
      await point(target);
      await target.click();
      await pause(400);
    },
    async type(target, text) {
      await point(target);
      await target.click();
      await target.pressSequentially(text, { delay: 110 });
      await pause(500);
    },
    async press(key) {
      await show('rec-key', KEYS[key] ?? key);
      await page.keyboard.press(key);
      await pause(700);
      await show('rec-key', '');
    },
    pause,
  };
}

/** The web view of `root` (a checkout of this repository) on a free port, GitHub answering from fixture/. */
async function serve(root: string) {
  const here = (path: string) => pathToFileURL(join(root, path)).href;
  const { createWebServer } = await import(here('src/web.ts'));
  const { openGitHub } = await import(here('src/core/github.ts'));
  const { replay } = await import(here('src/core/replay.ts'));
  const { searchAnswers } = await import(pathToFileURL(resolve(import.meta.dirname, '../../../tests/helpers.ts')).href);
  const fixture = resolve(import.meta.dirname, '../../../fixture');
  const files: Record<string, string> = {};
  for (const path of readdirSync(fixture, { recursive: true, encoding: 'utf8' })) {
    if (basename(path) === 'SKILL.md') files[path] = readFileSync(join(fixture, path), 'utf8');
  }
  const server = createWebServer({ open: (url: string) => openGitHub(url, { fetch: replay(searchAnswers(REPO, files)), token: 'fixture' }) });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, close: () => server.close() };
}

/** Records the scenes against `root` into `dir`, up to the first that fails: the video, each scene's timing and end screenshot, and the trace. */
async function record(root: string, scenes: Scene[], scheme: 'light' | 'dark', dir: string, trace: string): Promise<Run> {
  mkdirSync(dir, { recursive: true });
  const server = await serve(root);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: SIZE, colorScheme: scheme, recordVideo: { dir, size: SIZE } });
  await context.addInitScript({ path: join(import.meta.dirname, 'overlay.js') });
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();
  const started = Date.now();
  const now = () => (Date.now() - started) / 1000;
  page.setDefaultTimeout(5000);
  await page.clock.setFixedTime(new Date('2026-01-01T12:00:00Z'));
  let caption = '';
  const showCaption = (text: string) => page.evaluate(`window.recordFeature?.show('rec-caption', ${JSON.stringify((caption = text))})`);
  page.on('domcontentloaded', () => showCaption(caption).catch(() => {}));
  const run: Run = { video: '', timings: [], shots: [] };
  try {
    await page.goto(`${server.url}/?repo=${REPO}`);
    await page.locator('#repository a').waitFor();
    await page.waitForTimeout(800);
    for (const [index, scene] of scenes.entries()) {
      const start = now();
      await showCaption(scene.caption);
      try {
        await scene.run(page, act(page));
      } catch (error) {
        run.failed = `scene ${index + 1}, "${scene.caption}": ${error instanceof Error ? error.message : String(error)}`;
        await showCaption(`✗ ${scene.caption}`);
        await page.waitForTimeout(HOLD);
        run.timings.push({ caption: `✗ ${scene.caption}`, start, end: now() });
        break;
      }
      await page.waitForTimeout(SHOT);
      const path = join(dir, `${index + 1}.png`);
      run.shots.push({ path, at: now() });
      await page.screenshot({ path });
      await page.waitForTimeout(HOLD - SHOT);
      run.timings.push({ caption: scene.caption, start, end: now() });
    }
  } finally {
    await context.tracing.stop({ path: trace });
    const video = page.video()!;
    await context.close();
    run.video = await video.path();
    await browser.close();
    server.close();
  }
  return run;
}

const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' });

/** A detached checkout of `ref`, with this one's node_modules. */
function checkout(repository: string, ref: string): { root: string; remove(): void } {
  const root = join(mkdtempSync(join(tmpdir(), 'record-feature-')), 'checkout');
  git(repository, 'worktree', 'add', '--quiet', '--detach', root, ref);
  symlinkSync(join(repository, 'node_modules'), join(root, 'node_modules'));
  return {
    root,
    remove: () => {
      git(repository, 'worktree', 'remove', '--force', root);
      rmSync(dirname(root), { recursive: true, force: true });
    },
  };
}

function ffmpeg(...args: string[]) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`ffmpeg ${args.join(' ')}: ${result.stderr}`);
}

/** The video as H.264 with the captions as a subtitle track and a chapter for each scene. */
function encode(webm: string, mp4: string, title: string, timings: Timing[]) {
  const vtt = `${mp4}.vtt`;
  const chapters = `${mp4}.chapters`;
  writeFileSync(vtt, webvtt(timings));
  writeFileSync(chapters, ffmetadata(title, timings));
  ffmpeg('-i', webm, '-i', vtt, '-f', 'ffmetadata', '-i', chapters, '-map', '0:v', '-map', '1:s', '-map_metadata', '2', '-map_chapters', '2',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-c:s', 'mov_text', '-movflags', '+faststart', mp4);
  rmSync(vtt);
  rmSync(chapters);
}

function frame(video: string, at: number, png: string) {
  ffmpeg('-ss', at.toFixed(3), '-i', video, '-frames:v', '1', png);
  return png;
}

/** SSIM between two images of the same size: 1 is the same picture. */
function ssim(a: string, b: string): number {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-i', a, '-i', b, '-lavfi', '[0:v][1:v]ssim', '-f', 'null', '-'], { encoding: 'utf8' });
  const all = / All:([\d.]+)/.exec(result.stderr);
  if (!all) throw new Error(`ssim ${a} ${b}: ${result.stderr}`);
  return Number(all[1]);
}

function probe(video: string): Check {
  const result = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries',
    'stream=width,height,nb_read_packets:format=duration', '-of', 'json', video], { encoding: 'utf8' });
  const { streams: [stream], format } = JSON.parse(result.stdout);
  const duration = Number(format.duration);
  return {
    name: `ffprobe ${basename(video)}`,
    ok: stream.width === SIZE.width && stream.height === SIZE.height && duration < LIMITS.duration && Number(stream.nb_read_packets) > 0,
    detail: `${stream.width}×${stream.height}, ${duration.toFixed(1)} s, ${stream.nb_read_packets} frames`,
  };
}

const lowest = (values: number[]) => Math.min(...values);
const at = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;
const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\n/g, ' ');

function report(title: string, head: string, base: string, result: Coverage, timings: Timing[], before: Run, checks: Check[]): string {
  const rows = result.clauses.map(({ clause, scenes, notShown }) =>
    `| \`${clause.file}:${clause.line}\` | ${cell(clause.text)} | ` +
    (scenes.length ? scenes.map((i) => `${cell(timings[i].caption)} (${at(timings[i].start)})`).join('<br>') : `*not shown*: ${cell(notShown!)}`) + ' |');
  return [
    `### Recording: ${title}, at \`${head.slice(0, 7)}\``,
    '',
    `![preview]({{media}}/preview.gif)`,
    '',
    `[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · ` +
      `[before, at \`${base.slice(0, 7)}\`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · ` +
      `traces: \`npx playwright show-trace <trace-…zip>\` from {{media}}`,
    '',
    '| Spec | Clause | Shown in |',
    '| --- | --- | --- |',
    ...rows,
    '',
    before.failed ? `**Before**, at \`${base.slice(0, 7)}\`: fails at ${cell(before.failed.split('\n')[0])}` : `**Before**: every scene passes: the video shows nothing new`,
    '',
    `**Checks**: ${checks.map((check) => `${check.ok ? '✓' : '✗'} ${check.name} (${check.detail})`).join(' · ')}`,
    '',
  ].join('\n');
}

export async function main(argv: string[]): Promise<number> {
  const options: Options = { scenes: '', base: 'origin/main', update: false, list: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') options.base = argv[++i];
    else if (argv[i] === '--head') options.head = argv[++i];
    else if (argv[i] === '--update') options.update = true;
    else if (argv[i] === '--clauses') options.list = true;
    else options.scenes = resolve(argv[i]);
  }
  if (!options.scenes && !options.list) {
    console.error('usage: record.ts <scenes.ts> [--base <ref>] [--head <ref>] [--update] | --clauses [--base <ref>] [--head <ref>]');
    return 2;
  }
  const repository = git(process.cwd(), 'rev-parse', '--show-toplevel').trim();
  const commit = (ref: string) => {
    const found = spawnSync('git', ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], { cwd: repository, encoding: 'utf8' });
    if (found.status === 0) return found.stdout.trim();
    console.error(`unknown commit: ${ref}; in a shallow clone, git fetch --unshallow`);
  };
  const base = commit(options.base);
  const head = commit(options.head ?? 'HEAD');
  if (!base || !head) return 1;
  const diff = git(repository, 'diff', '-U0', base, ...(options.head ? [head] : []), '--', 'spec/');
  const changed: Clause[] = [];
  for (const [file, lines] of changedLines(diff)) {
    const text = options.head ? git(repository, 'show', `${head}:${file}`) : readFileSync(join(repository, file), 'utf8');
    changed.push(...clauses(file, text, lines));
  }
  if (options.list) {
    for (const clause of changed) console.log(`${clause.file}:${clause.line} ${clause.text}`);
    return 0;
  }

  const module: Scenes = await import(pathToFileURL(options.scenes).href);
  const title = module.title ?? basename(dirname(options.scenes));
  const result = coverage(changed, module.scenes, module.notShown ?? {});
  if (result.problems.length) {
    for (const problem of result.problems) console.error(problem);
    return 1;
  }

  const here = dirname(options.scenes);
  const out = join(here, 'out');
  const work = mkdtempSync(join(tmpdir(), 'record-feature-runs-'));
  const after = options.head ? checkout(repository, head) : { root: repository, remove() {} };
  const before = checkout(repository, base);
  try {
    rmSync(out, { recursive: true, force: true });
    mkdirSync(out, { recursive: true });
    const runs: Record<string, Run> = {};
    for (const [name, scheme] of [['after-light', 'light'], ['after-dark', 'dark'], ['rerun-light', 'light']] as const) {
      runs[name] = await record(after.root, module.scenes, scheme, join(work, name), join(out, `trace-${name}.zip`));
      if (runs[name].failed) {
        console.error(`✗ at ${head.slice(0, 7)}, ${scheme}: ${runs[name].failed}`);
        rmSync(out, { recursive: true, force: true });
        return 1;
      }
    }
    rmSync(join(out, 'trace-rerun-light.zip'));
    runs['before-light'] = await record(before.root, module.scenes, 'light', join(work, 'before-light'), join(out, 'trace-before-light.zip'));

    const checks: Check[] = [{ name: "every scene's expect, light and dark", ok: true, detail: `${module.scenes.length} scenes` }];
    for (const name of ['after-light', 'after-dark', 'before-light']) {
      encode(runs[name].video, join(out, `${name}.mp4`), title, runs[name].timings);
      checks.push(probe(join(out, `${name}.mp4`)));
    }
    mkdirSync(join(here, 'baseline'), { recursive: true });
    for (const scheme of ['light', 'dark'] as const) {
      const run = runs[`after-${scheme}`];
      const frames = run.shots.map((shot, i) => ssim(frame(join(out, `after-${scheme}.mp4`), shot.at, join(work, `frame-${scheme}-${i + 1}.png`)), shot.path));
      checks.push({ name: `${scheme} frames are the page`, ok: lowest(frames) >= LIMITS.frame, detail: `SSIM ≥ ${lowest(frames).toFixed(3)}` });
      const written: number[] = [];
      const baselines = run.shots.flatMap((shot, i) => {
        const baseline = join(here, 'baseline', `${i + 1}-${scheme}.png`);
        if (options.update || !existsSync(baseline)) {
          copyFileSync(shot.path, baseline);
          written.push(i + 1);
          return [];
        }
        return [ssim(shot.path, baseline)];
      });
      checks.push({
        name: `${scheme} screenshots match baseline/`,
        ok: !baselines.length || lowest(baselines) >= LIMITS.baseline,
        detail: [baselines.length ? `SSIM ≥ ${lowest(baselines).toFixed(3)}` : '', written.length ? `written: ${written.join(', ')}` : ''].filter(Boolean).join(', '),
      });
    }
    const first = runs['after-light'];
    const again = runs['rerun-light'];
    const drift = Math.max(...first.timings.map((t, i) => Math.abs(t.start - again.timings[i].start)));
    const same = first.shots.map((shot, i) => ssim(frame(join(out, 'after-light.mp4'), shot.at, join(work, `a${i}.png`)), frame(again.video, again.shots[i].at, join(work, `b${i}.png`))));
    checks.push({ name: 'a second run is the same', ok: drift <= LIMITS.drift && lowest(same) >= LIMITS.rerun, detail: `starts ±${drift.toFixed(2)} s, SSIM ≥ ${lowest(same).toFixed(3)}` });

    const gif = join(out, 'preview.gif');
    ffmpeg('-i', join(out, 'after-light.mp4'), '-vf', 'fps=8,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse', '-loop', '0', gif);
    writeFileSync(join(out, 'captions.vtt'), webvtt(first.timings));
    const beforeRun = runs['before-light'];
    writeFileSync(join(out, 'scenes.json'), JSON.stringify({
      title,
      head,
      base,
      clauses: result.clauses.map(({ clause, scenes, notShown }) => ({
        clause,
        scenes: scenes.map((i) => ({ index: i + 1, caption: first.timings[i].caption, start: first.timings[i].start })),
        notShown,
      })),
      before: { failed: beforeRun.failed ?? null },
      checks,
    }, null, 2) + '\n');
    writeFileSync(join(out, 'report.md'), report(title, head, base, result, first.timings, beforeRun, checks));

    if (!beforeRun.failed) console.warn('warning: every scene passes at the base: the video shows nothing new');
    for (const check of checks) console.log(`${check.ok ? '✓' : '✗'} ${check.name}: ${check.detail}`);
    console.log(`out: ${relative(process.cwd(), out)}`);
    const failed = checks.filter((check) => !check.ok);
    for (const check of failed) console.error(`✗ ${check.name}: ${check.detail}`);
    return failed.length ? 1 : 0;
  } finally {
    after.remove();
    before.remove();
    rmSync(work, { recursive: true, force: true });
  }
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
