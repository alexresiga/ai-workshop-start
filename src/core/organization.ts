import { AtlasError, GitHubError } from './errors.ts';
import type { Organization } from './model.ts';
import { scan, type ScanResult, type Source } from './scan.ts';

/** An organization to scan: its repositories, each opened when its turn comes. */
export type OrganizationSource = {
  organization: Organization;
  repositories: {
    /** `owner/name`. */
    id: string;
    /** The repository to scan; undefined when a search has already shown it has no SKILL.md. */
    open(): Promise<Source | undefined>;
  }[];
};

export type OrganizationResult = {
  organization: Organization;
  /** The repositories with skills: the most skills first, then by id. */
  repositories: ScanResult[];
  /** How many repositories the organization has, scanned or skipped. */
  scanned: number;
  /** Each one led by its repository's id. */
  warnings: string[];
};

/** Repositories at a time: each asks the API one request after another; 16 stay well under GitHub's 100 at once. */
const AT_ONCE = 16;

/**
 * Each repository through the same scan as one on its own, so it counts the same skills. A
 * repository that cannot be scanned, an empty one, say, is a warning and the scan goes on;
 * what stops every repository, a GitHubError, stops the scan.
 */
export async function scanOrganization(source: OrganizationSource): Promise<OrganizationResult> {
  const results: (ScanResult | undefined)[] = [];
  const failures: (string | undefined)[] = [];
  let next = 0;
  const worker = async () => {
    while (next < source.repositories.length) {
      const index = next++;
      const { id, open } = source.repositories[index];
      try {
        const opened = await open();
        results[index] = opened && (await scan(opened));
      } catch (error) {
        if (!(error instanceof AtlasError) || error instanceof GitHubError) {
          next = source.repositories.length; // the other workers stop, too
          throw error;
        }
        failures[index] = `${id}: ${error.message}; skipped`;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(AT_ONCE, source.repositories.length) }, worker));
  const scanned = results.filter((result): result is ScanResult => result !== undefined);
  const warnings = source.repositories.flatMap((_, index) => [
    ...(results[index]?.warnings.map((warning) => `${results[index]!.repository.id}: ${warning}`) ?? []),
    ...(failures[index] ? [failures[index]] : []),
  ]);
  const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  return {
    organization: source.organization,
    repositories: scanned
      .filter((result) => result.skills.length > 0)
      .sort((a, b) => b.skills.length - a.skills.length || compare(a.repository.id, b.repository.id)),
    scanned: source.repositories.length,
    warnings,
  };
}
