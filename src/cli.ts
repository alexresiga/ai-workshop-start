#!/usr/bin/env node
// The Node client: a GitHub repository through the GitHub API, or a local directory; stdout and
// stderr, or the web view. Nothing is stored.
import { askClaude } from './claude.ts';
import { run } from './commands.ts';
import { openGitHub, parseGitHubUrl } from './core/github.ts';
import { scanOrganization, type Progress } from './core/organization.ts';
import { openDirectory } from './local.ts';
import { createWebServer, listen } from './web.ts';

const token = process.env.GITHUB_TOKEN || undefined;
const open = (url: string) => openGitHub(url, { fetch, token });
const organization = (url: string, progress?: Progress) => scanOrganization(url, { fetch, token }, progress);

process.exitCode = await run(process.argv.slice(2), {
  open: (input) => (parseGitHubUrl(input) ? open(input) : openDirectory(input)),
  organization,
  print: (text) => console.log(text),
  error: (text) => console.error(text),
  serve: (port) =>
    listen(createWebServer({ open, organization, ask: (prompt, signal) => askClaude(prompt, { signal }) }), port, (url) => console.log(`Skill Atlas on ${url}`)),
});
