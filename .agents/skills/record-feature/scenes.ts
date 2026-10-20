// spec/record-feature.md: the clauses a spec change makes, which scenes cover them, and the captions and chapters.

/** One promise of the spec: where it starts, and its text. */
export type Clause = { file: string; line: number; text: string };

/** The added lines of each file in a unified diff, numbered as in the new file. */
export function changedLines(diff: string): Map<string, Set<number>> {
  const changed = new Map<string, Set<number>>();
  let lines: Set<number> | undefined;
  let line = 0;
  for (const text of diff.split('\n')) {
    const file = /^\+\+\+ (?:b\/(.*)|\/dev\/null)$/.exec(text);
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(text);
    if (file) {
      lines = file[1] ? new Set() : undefined;
      if (file[1]) changed.set(file[1], lines!);
    } else if (hunk) line = Number(hunk[1]);
    else if (!lines || text.startsWith('---') || text.startsWith('\\')) continue;
    else if (text.startsWith('+')) lines.add(line++);
    else if (text.startsWith(' ')) line++;
  }
  for (const [file, lines] of changed) if (!lines.size) changed.delete(file);
  return changed;
}

/**
 * The clauses of a Markdown spec on the changed lines: a bullet, its continuation lines joined, split at `;` outside
 * `code`, keeps the parts that touch a changed line; any other changed line is one clause. Not headings, not blank lines.
 */
export function clauses(file: string, text: string, changed: Set<number>): Clause[] {
  const lines = text.split('\n');
  const result: Clause[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim() || /^#|^```/.test(lines[i])) continue;
    const parts = [{ line: i + 1, text: lines[i].replace(/^\s*[-*] /, '') }];
    if (/^\s*[-*] /.test(lines[i])) {
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1]) && !/^\s*[-*] /.test(lines[i + 1])) {
        parts.push({ line: i + 2, text: lines[++i].trim() });
      }
    }
    // The joined text, with where each line starts in it.
    let joined = '';
    const starts = parts.map((part) => {
      if (joined) joined += ' ';
      const start = joined.length;
      joined += part.text;
      return start;
    });
    const lineAt = (offset: number) => parts[starts.findLastIndex((start) => start <= offset)].line;
    let start = 0;
    let code = false;
    for (let at = 0; at <= joined.length; at++) {
      if (joined[at] === '`') code = !code;
      if (at < joined.length && (joined[at] !== ';' || code)) continue;
      const piece = joined.slice(start, at);
      const from = start + piece.length - piece.trimStart().length;
      const to = start + piece.trimEnd().length - 1;
      start = at + 1;
      if (from > to) continue;
      const first = lineAt(from);
      const last = lineAt(to);
      if (parts.some(({ line }) => line >= first && line <= last && changed.has(line))) {
        result.push({ file, line: first, text: joined.slice(from, to + 1) });
      }
    }
  }
  return result;
}

/** Each clause with the scenes that cover it, or why it is not shown; and what is wrong with the scenes. */
export type Coverage = {
  clauses: { clause: Clause; scenes: number[]; notShown?: string }[];
  problems: string[];
};

/** Which scenes cover which clauses: each piece of text must be in exactly one clause, each clause covered or not shown. */
export function coverage(clauses: Clause[], scenes: { covers: string[] }[], notShown: Record<string, string>): Coverage {
  const result: Coverage = { clauses: clauses.map((clause) => ({ clause, scenes: [] })), problems: [] };
  const find = (piece: string, who: string) => {
    const found = result.clauses.filter(({ clause }) => clause.text.includes(piece));
    if (found.length === 1) return found[0];
    result.problems.push(`${who} "${piece}": ${found.length ? `in ${found.length} clauses, give more of the text` : 'in no changed clause'}`);
  };
  scenes.forEach((scene, index) => {
    for (const piece of scene.covers) {
      const entry = find(piece, `scene ${index + 1} covers`);
      if (entry && !entry.scenes.includes(index)) entry.scenes.push(index);
    }
  });
  for (const [piece, why] of Object.entries(notShown)) {
    const entry = find(piece, 'notShown');
    if (entry) entry.notShown = why;
  }
  for (const { clause, scenes, notShown } of result.clauses) {
    if (!scenes.length && notShown === undefined) result.problems.push(`not covered: ${clause.file}:${clause.line} ${clause.text}`);
  }
  return result;
}

/** When a scene's caption shows, in seconds from the start of the video. */
export type Timing = { caption: string; start: number; end: number };

const ms = (seconds: number) => Math.round(seconds * 1000);

/** `00:01:02.345` */
function clock(seconds: number): string {
  const total = ms(seconds);
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  return `${pad(Math.floor(total / 3_600_000))}:${pad(Math.floor(total / 60_000) % 60)}:${pad(Math.floor(total / 1000) % 60)}.${pad(total % 1000, 3)}`;
}

/** The captions, as WebVTT. */
export function webvtt(timings: Timing[]): string {
  return ['WEBVTT', ...timings.map((t, i) => `${i + 1}\n${clock(t.start)} --> ${clock(t.end)}\n${t.caption}`)].join('\n\n') + '\n';
}

/** The chapters, as ffmpeg metadata. */
export function ffmetadata(title: string, timings: Timing[]): string {
  const escape = (text: string) => text.replace(/[=;#\\\n]/g, (c) => `\\${c}`);
  const chapters = timings.map((t) => `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${ms(t.start)}\nEND=${ms(t.end)}\ntitle=${escape(t.caption)}\n`);
  return [`;FFMETADATA1\ntitle=${escape(title)}\n`, ...chapters].join('\n');
}
