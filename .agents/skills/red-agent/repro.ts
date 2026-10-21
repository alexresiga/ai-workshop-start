// spec/red-agent.md: records a bug's steps against the web view of this checkout, twice, and keeps the video only when
// both runs fail at the last step, on its `expect` of what the spec promises; then writes the issue body beside it.
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { encode, ffmpeg, probe, record, type Ask, type Check, type Run, type Scene } from '../record-feature/record.ts';
import { webvtt } from '../record-feature/scenes.ts';

/** One step of a bug: its caption, and what it does. The last one ends on an `expect` that fails: the bug. */
export type Step = Pick<Scene, 'caption' | 'run'>;

/** A steps file; `ask`, what the model answers, for steps that cluster, as in a scenes file. */
export type Steps = { title: string; expected: string; steps: Step[]; ask?: Ask };

const RUNS = 2;

/** The error, as a reader of the issue needs it: no colours, no call log, at most 12 lines. */
export function actual(failed: string): string {
  const text = failed.replace(/\x1b\[[0-9;]*m/g, '').replace(/^step \d+, "[^\n]*?": /, '');
  const lines = text.split('\n');
  const log = lines.findIndex((line) => /^\s*Call log:/.test(line));
  return (log === -1 ? lines : lines.slice(0, log)).filter((line, i, all) => line.trim() || (i > 0 && all[i - 1].trim())).slice(0, 12).join('\n').trim();
}

/** The step a run failed at, from 1, or none. */
const failedAt = (run: Run) => (run.failed ? run.timings.length : 0);

export function issue(module: Steps, slug: string, head: string, failed: string): string {
  return [
    `Found by the red agent at \`${head.slice(0, 7)}\`, on \`example/fixture\` (\`fixture/\`: code-style, commits, release-checklist), as \`record-feature\` serves it.`,
    '',
    `![preview]({{media}}/preview.gif)`,
    '',
    `[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · ` +
      `trace: \`npx playwright show-trace\` on {{media}}/trace.zip`,
    '',
    '## Steps',
    '',
    '1. `./skill-atlas serve`, open `?repo=example/fixture`',
    ...module.steps.map((step, i) => `${i + 2}. ${step.caption}`),
    '',
    '## Expected',
    '',
    module.expected,
    '',
    '## Actual',
    '',
    '```',
    actual(failed),
    '```',
    '',
    `It fails at step ${module.steps.length + 1} in ${RUNS} of ${RUNS} runs: \`node .agents/skills/red-agent/repro.ts recordings/bugs/${slug}/steps.ts\`, with the steps file above.`,
    '',
  ].join('\n');
}

export async function main(argv: string[]): Promise<number> {
  if (argv.length !== 1) {
    console.error('usage: repro.ts <steps.ts>');
    return 2;
  }
  const file = resolve(argv[0]);
  if (!existsSync(file)) {
    console.error(`no steps file: ${argv[0]}`);
    return 2;
  }
  // A run that ends with no video leaves none: not even an earlier run's, which file.sh would take for this one.
  const out = join(dirname(file), 'out');
  rmSync(out, { recursive: true, force: true });
  const module: Partial<Steps> = await import(pathToFileURL(file).href);
  const missing: string[] = (['title', 'expected'] as const).filter((key) => typeof module[key] !== 'string' || !module[key]!.trim());
  if (!Array.isArray(module.steps) || !module.steps.length) missing.push('steps');
  if (missing.length) {
    console.error(`${relative(process.cwd(), file)} exports no ${missing.join(', no ')}`);
    return 1;
  }
  const steps = module as Steps;
  const repository = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: dirname(file), encoding: 'utf8' }).trim();
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim();
  const work = mkdtempSync(join(tmpdir(), 'red-agent-'));
  const scenes = steps.steps.map((step) => ({ ...step, covers: [] }));
  try {
    const runs: Run[] = [];
    for (let i = 0; i < RUNS; i++) {
      mkdirSync(out, { recursive: true });
      try {
        runs.push(await record(repository, scenes, 'light', join(work, `run-${i + 1}`), join(out, i ? `trace-${i + 1}.zip` : 'trace.zip'), steps.ask));
      } catch (error) {
        // Before the first step: the fixture never showed. That is a bug too, the worst, but not one these steps can show.
        console.error(`✗ the page never loaded example/fixture, before the first step: file it by hand, with no video\n${actual(error instanceof Error ? error.message : String(error))}`);
        rmSync(out, { recursive: true, force: true });
        return 1;
      }
    }
    rmSync(join(out, `trace-${RUNS}.zip`), { force: true });
    const last = steps.steps.length;
    const at = runs.map(failedAt);
    const problem =
      at.every((n) => n === 0) ? 'every step passes: no bug to report'
      : at.some((n) => n !== 0 && n !== last) ? `step ${at.find((n) => n !== 0 && n !== last)} fails, not the last: fix the steps\n${runs.find((run) => failedAt(run) !== last && run.failed)!.failed}`
      : at.some((n) => n === 0) ? `it fails in only ${at.filter((n) => n === last).length} of ${RUNS} runs: make the steps wait for what they need`
      : '';
    if (problem) {
      console.error(`✗ ${problem}`);
      rmSync(out, { recursive: true, force: true });
      return 1;
    }

    const video = join(out, 'repro.mp4');
    encode(runs[0].video, video, steps.title, runs[0].timings);
    const checks: Check[] = [
      { name: 'the last step fails, the others pass', ok: true, detail: `step ${last} of ${last}, in ${RUNS} of ${RUNS} runs` },
      probe(video),
    ];
    ffmpeg('-i', video, '-vf', 'fps=8,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse', '-loop', '0', join(out, 'preview.gif'));
    writeFileSync(join(out, 'captions.vtt'), webvtt(runs[0].timings));
    copyFileSync(file, join(out, 'steps.ts'));
    const failed = runs[0].failed!.replace(/^scene /, 'step ');
    writeFileSync(join(out, 'repro.json'), JSON.stringify({
      title: steps.title,
      expected: steps.expected,
      head,
      failed: { step: last, caption: steps.steps[last - 1].caption, error: actual(failed) },
      checks,
    }, null, 2) + '\n');
    writeFileSync(join(out, 'issue.md'), issue(steps, basename(dirname(file)), head, failed));
    for (const check of checks) console.log(`${check.ok ? '✓' : '✗'} ${check.name}: ${check.detail}`);
    console.log(`out: ${relative(process.cwd(), out)} (${basename(dirname(file))})`);
    return checks.every((check) => check.ok) ? 0 : 1;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
