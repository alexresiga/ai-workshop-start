/** A failure explained to the user: the CLI prints the message and exits with code 1. */
export class AtlasError extends Error {}

/** A failure on GitHub's side that no other repository can avoid: out of reach, the rate limit, a rejected token. */
export class GitHubError extends AtlasError {}

/** A repository with no commits: nothing to scan. */
export class EmptyRepositoryError extends AtlasError {}
