// The web view: a page with a repository link and a Scan button, and the scan behind it as JSON.
// The same core as the CLI; nothing is stored. Only GitHub repositories: a page must not read the
// server's own directories.
import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { clusterSkills, type Ask, type Clustered } from './core/themes.ts';
import { AtlasError } from './core/errors.ts';
import { parseGitHubUrl } from './core/github.ts';
import { skillLink, type Repository, type Skill } from './core/model.ts';
import { parseOrganizationUrl, type OrganizationResult, type Progress } from './core/organization.ts';
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
/** The dice's random pick, sent to the browser as it is. */
const RANDOM = readFileSync(new URL('./random.js', import.meta.url), 'utf8');
/** The list's source tags and filter marks, sent to the browser as it is. */
const LIST = readFileSync(new URL('./list.js', import.meta.url), 'utf8');
/** The skills' clusters by shared words, sent to the browser as it is. */
const CLUSTER = readFileSync(new URL('./cluster.js', import.meta.url), 'utf8');

export type WebOptions = {
  /** Opens a GitHub repository URL. */
  open(url: string): Promise<Source>;
  /** Scans a GitHub organization URL; `progress` hears how far it is. */
  organization(url: string, progress?: Progress): Promise<OrganizationResult>;
  /** Asks the small model the skills are clustered with; without it, no clusters. */
  ask?: Ask;
};

/** What `GET /api/organization?name=<organization | GitHub URL>` answers: the result, or `{ error }` with status 400. */
export type OrganizationAnswer = Omit<OrganizationResult, 'skills'>;

/** What `GET /api/clusters?name=<organization | GitHub URL>` answers: the result, or `{ error }` with status 400. */
export type ClustersAnswer = {
  organization: { id: string; url: string };
  /** How many skills were clustered. */
  skills: number;
  clusters: {
    theme: string;
    skills: { name: string; description: string; repository: string; path: string; link: string }[];
  }[];
  warnings: string[];
};

/**
 * What `GET /api/organization/progress?name=…` streams, one JSON a line: `{ progress }` as the scan goes,
 * then the result, or `{ error }`, last.
 */
export type OrganizationProgressLine = { progress: { scanned: number; of: number } } | OrganizationAnswer | { error: string };

/**
 * What `GET /api/clusters/progress?name=…` streams, one JSON a line: `{ progress }` as the organization is scanned again,
 * `{ clustering }`, how many skills the model is asked about, `{ clustered }` as its answer puts them in clusters, then the
 * result, or `{ error }`, last.
 */
export type ClustersProgressLine =
  | { progress: { scanned: number; of: number } }
  | { clustering: number }
  | { clustered: { skills: number; of: number } }
  | ClustersAnswer
  | { error: string };

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
    if (url.pathname === '/random.js') return send(200, 'text/javascript', RANDOM);
    if (url.pathname === '/list.js') return send(200, 'text/javascript', LIST);
    if (url.pathname === '/cluster.js') return send(200, 'text/javascript', CLUSTER);
    try {
      if (url.pathname === '/api/scan') {
        const input = repositoryUrl(url.searchParams.get('url') ?? '');
        if (!parseGitHubUrl(input)) throw new AtlasError(`Not a GitHub repository URL: ${input}`);
        json(200, await scanAnswer(await options.open(input)));
      } else if (url.pathname === '/api/organization') {
        const input = organizationUrl(url.searchParams.get('name') ?? '');
        if (!parseOrganizationUrl(input)) throw new AtlasError(`Not a GitHub organization: ${input}`);
        json(200, withoutSkills(await options.organization(input)) satisfies OrganizationAnswer);
      } else if (url.pathname === '/api/organization/progress') {
        const input = organizationUrl(url.searchParams.get('name') ?? '');
        if (!parseOrganizationUrl(input)) throw new AtlasError(`Not a GitHub organization: ${input}`);
        response.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' });
        const line = (body: OrganizationProgressLine) => response.write(JSON.stringify(body) + '\n');
        try {
          line(withoutSkills(await options.organization(input, (scanned, of) => line({ progress: { scanned, of } }))));
        } catch (error) {
          line({ error: failure(error) });
        }
        response.end();
      } else if (url.pathname === '/api/clusters') {
        const input = organizationUrl(url.searchParams.get('name') ?? '');
        if (!parseOrganizationUrl(input)) throw new AtlasError(`Not a GitHub organization: ${input}`);
        if (!options.ask) throw new AtlasError('Clustering is not available here');
        // The page closed or reloaded: the model is stopped rather than left to run for no one.
        const waiting = new AbortController();
        response.on('close', () => response.writableFinished || waiting.abort());
        json(200, await clustersAnswer(await options.organization(input), options.ask, waiting.signal));
      } else if (url.pathname === '/api/clusters/progress') {
        const input = organizationUrl(url.searchParams.get('name') ?? '');
        if (!parseOrganizationUrl(input)) throw new AtlasError(`Not a GitHub organization: ${input}`);
        if (!options.ask) throw new AtlasError('Clustering is not available here');
        const waiting = new AbortController();
        response.on('close', () => response.writableFinished || waiting.abort());
        response.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' });
        const line = (body: ClustersProgressLine) => response.write(JSON.stringify(body) + '\n');
        try {
          const result = await options.organization(input, (scanned, of) => line({ progress: { scanned, of } }));
          if (result.skills.length) line({ clustering: result.skills.length });
          line(await clustersAnswer(result, options.ask, waiting.signal, (skills, of) => line({ clustered: { skills, of } })));
        } catch (error) {
          line({ error: failure(error) });
        }
        response.end();
      } else json(404, { error: `Not found: ${url.pathname}` });
    } catch (error) {
      json(error instanceof AtlasError ? 400 : 500, { error: failure(error) });
    }
  });
}

/** The organization's answer: the counts, not every skill. */
function withoutSkills({ skills, ...answer }: OrganizationResult): OrganizationAnswer {
  return answer;
}

/** An AtlasError's message; anything else, as unexpected. */
function failure(error: unknown): string {
  if (error instanceof AtlasError) return error.message;
  return `Unexpected error: ${error instanceof Error ? error.message : String(error)}`;
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

/** `org`, or `org/`, is short for `https://github.com/org`. */
function organizationUrl(input: string): string {
  const text = input.trim();
  return /^[a-z\d][a-z\d-]*\/?$/i.test(text) ? `https://github.com/${text}` : text;
}

/** The organization's skills by theme, each linked to its SKILL.md; the scan's warnings, then the model's. */
async function clustersAnswer(result: OrganizationResult, ask: Ask, signal: AbortSignal, clustered?: Clustered): Promise<ClustersAnswer> {
  const { clusters, warnings } = await clusterSkills(result.skills, ask, signal, clustered);
  // Each skill's link is at the commit its repository was scanned at, its default branch.
  const link = (skill: Skill) => {
    const [organization, name] = skill.repository.split('/');
    const repository: Repository = { id: skill.repository, organization, name, url: `https://github.com/${skill.repository}`, commit: skill.commit };
    return skillLink(repository, skill);
  };
  return {
    organization: result.organization,
    skills: result.skills.length,
    clusters: clusters.map((cluster) => ({
      theme: cluster.theme,
      skills: cluster.skills.map((skill) => ({
        name: skill.name,
        description: skill.description,
        repository: skill.repository,
        path: skill.path,
        link: link(skill),
      })),
    })),
    warnings: [...result.warnings, ...warnings],
  };
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
