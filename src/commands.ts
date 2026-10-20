// The skill-atlas commands. The same code serves the Node CLI and the browser
// terminal: everything that differs between them comes in through the context.
import { AtlasError } from './core/errors.ts';
import { skillLink, type Repository, type Skill } from './core/model.ts';
import { parseOrganizationUrl, type OrganizationResult } from './core/organization.ts';
import { scan, type Source } from './core/scan.ts';

export type Context = {
  /** Opens what the user asked to scan. */
  open(input: string): Promise<Source>;
  /** Scans every repository of a GitHub organization or user. */
  organization(input: string): Promise<OrganizationResult>;
  print(text: string): void;
  /** Errors and warnings. */
  error(text: string): void;
  /** Serves the web view on the port until stopped; only where there is a server, the Node CLI. */
  serve?(port: number): Promise<void>;
};

const usage = `Usage: skill-atlas <command>

  scan <GitHub URL | directory>   find every SKILL.md in a repository and print it;
                                  for https://github.com/<organization>, count them by repository
  serve [port]                    the web view on http://127.0.0.1:<port>, 3000 by default
  help                            show this help`;

/** Runs one command; returns its exit code. */
export async function run(args: string[], context: Context): Promise<number> {
  const [command = 'help', ...rest] = args;
  try {
    if (command === 'scan') await scanCommand(rest, context);
    else if (command === 'serve') await serveCommand(rest, context);
    else if (command === 'help') context.print(usage);
    else throw new AtlasError(`Unknown command: ${command}\n\n${usage}`);
    return 0;
  } catch (error) {
    if (!(error instanceof AtlasError)) throw error;
    context.error(error.message);
    return 1;
  }
}

async function scanCommand(args: string[], context: Context) {
  if (args.length !== 1) throw new AtlasError('Usage: skill-atlas scan <GitHub URL | directory>');
  if (parseOrganizationUrl(args[0])) {
    const result = await context.organization(args[0]);
    printOrganization(result, context);
    for (const warning of result.warnings) context.error(`warning: ${warning}`);
    return;
  }
  const result = await scan(await context.open(args[0]));
  printRepository(result.repository, result.skills, context);
  for (const warning of result.warnings) context.error(`warning: ${warning}`);
}

async function serveCommand(args: string[], context: Context) {
  if (args.length > 1 || !/^\d*$/.test(args[0] ?? '')) throw new AtlasError('Usage: skill-atlas serve [port]');
  const port = args[0] ? Number(args[0]) : 3000;
  if (port > 65535) throw new AtlasError(`Not a port: ${args[0]}; a port is 0 to 65535`);
  if (!context.serve) throw new AtlasError('serve: not available here');
  await context.serve(port);
}

/** `<owner>/<repo> · N skills`, then each skill's name, first sentence and link. */
function printRepository(repository: Repository, skills: Skill[], { print }: Context) {
  print(`${repository.id} · ${count(skills.length, 'skill')}`);
  for (const skill of skills) {
    print(skill.description ? `${skill.name} — ${firstSentence(skill.description)}` : skill.name);
    print(`  ${skillLink(repository, skill)}`);
    if (skill.copies.length > 0) print(`  also in ${skill.copies.join(', ')}`);
  }
}

/** `<organization> · N skills in M of K repositories`, then each repository with skills, most first, and its link. */
function printOrganization({ organization, repositories, scanned }: OrganizationResult, { print }: Context) {
  const total = repositories.reduce((sum, repository) => sum + repository.skills, 0);
  print(`${organization.id} · ${count(total, 'skill')} in ${repositories.length} of ${count(scanned, 'repository')}`);
  for (const repository of repositories) {
    print(`${repository.id} · ${count(repository.skills, 'skill')}`);
    print(`  ${repository.url}`);
  }
}

function count(n: number, noun: string): string {
  return `${n} ${n === 1 ? noun : noun === 'repository' ? 'repositories' : `${noun}s`}`;
}

function firstSentence(text: string): string {
  const line = text.replace(/\s+/g, ' ').trim();
  return /^.*?[.!?](?=\s|$)/.exec(line)?.[0] ?? line;
}
