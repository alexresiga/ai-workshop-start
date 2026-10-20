// The web view: a page with a repository link and a Scan button, and the scan behind it as JSON.
// The same core as the CLI; nothing is stored. Only GitHub repositories: a page must not read the
// server's own directories.
import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { AtlasError } from './core/errors.ts';
import { parseGitHubUrl } from './core/github.ts';
import { skillLink } from './core/model.ts';
import { parseSkill } from './core/parse.ts';
import { scan, type Source } from './core/scan.ts';
import { PAGE } from './page.ts';

/**
 * The names the server answers to. Any other Host is a page that rebound its own name to
 * 127.0.0.1 to read the scans, and with them what GITHUB_TOKEN can see.
 */
const LOOPBACK = /^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/i;

/** The Markdown parser, sent to the browser as it is. */
const MARKDOWN = readFileSync(new URL('./markdown.js', import.meta.url), 'utf8');
/** The skill filter, sent to the browser as it is. */
const FILTER = readFileSync(new URL('./filter.js', import.meta.url), 'utf8');

export type WebOptions = {
  /** Opens a GitHub repository URL. */
  open(url: string): Promise<Source>;
};

/** What `GET /api/scan?url=<GitHub URL>` answers: the result, or `{ error }` with status 400. */
export type ScanAnswer = {
  repository: { id: string; url: string; commit: string };
  skills: {
    name: string;
    description: string;
    path: string;
    link: string;
    copies: string[];
    text: string;
    /** The other front matter keys. */
    properties: Record<string, unknown>;
    /** The Markdown after the front matter. */
    body: string;
  }[];
  warnings: string[];
};

export function createWebServer(options: WebOptions): Server {
  return createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const send = (status: number, type: string, body: string) => {
      response.writeHead(status, { 'Content-Type': `${type}; charset=utf-8` });
      response.end(body);
    };
    const json = (status: number, body: unknown) => send(status, 'application/json', JSON.stringify(body));
    if (!LOOPBACK.test(request.headers.host ?? '')) return json(403, { error: 'Only http://127.0.0.1 or http://localhost' });
    if (request.method !== 'GET') return json(405, { error: 'Only GET' });
    if (url.pathname === '/') return send(200, 'text/html', PAGE);
    if (url.pathname === '/markdown.js') return send(200, 'text/javascript', MARKDOWN);
    if (url.pathname === '/filter.js') return send(200, 'text/javascript', FILTER);
    if (url.pathname !== '/api/scan') return json(404, { error: `Not found: ${url.pathname}` });
    const input = repositoryUrl(url.searchParams.get('url') ?? '');
    try {
      if (!parseGitHubUrl(input)) throw new AtlasError(`Not a GitHub repository URL: ${input}`);
      json(200, await scanAnswer(await options.open(input)));
    } catch (error) {
      if (error instanceof AtlasError) json(400, { error: error.message });
      else json(500, { error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}` });
    }
  });
}

/**
 * Serves on 127.0.0.1, so no other machine can reach it, until the server closes. A port it
 * cannot listen on, one already in use above all, is an AtlasError: a message, not a stack trace.
 */
export function listen(server: Server, port: number, listening: (url: string) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    server.on('error', (error: NodeJS.ErrnoException) =>
      reject(
        new AtlasError(
          error.code === 'EADDRINUSE'
            ? `Port ${port} is already in use; try skill-atlas serve <another port>`
            : `Cannot serve on port ${port}: ${error.message}`,
        ),
      ),
    );
    server.on('close', resolve);
    server.listen(port, '127.0.0.1', () => listening(`http://127.0.0.1:${(server.address() as AddressInfo).port}`));
  });
}

/** `owner/repo` is short for `https://github.com/owner/repo`; `./dir` is not: an owner starts with a letter or a digit. */
function repositoryUrl(input: string): string {
  const text = input.trim();
  return /^[a-z\d][a-z\d-]*\/[\w.-]+$/i.test(text) ? `https://github.com/${text}` : text;
}

async function scanAnswer(source: Source): Promise<ScanAnswer> {
  const { repository, skills, warnings } = await scan(source);
  return {
    repository: { id: repository.id, url: repository.url, commit: repository.commit },
    skills: skills.map((skill) => {
      const { properties, body } = parseSkill(skill.text);
      return {
        name: skill.name,
        description: skill.description,
        path: skill.path,
        link: skillLink(repository, skill),
        copies: skill.copies,
        text: skill.text,
        properties,
        body,
      };
    }),
    warnings,
  };
}
