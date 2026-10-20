/** A failure explained to the user: the CLI prints the message and exits with code 1. */
export class AtlasError extends Error {}

/** A failure no other repository can avoid: GitHub out of reach, the rate limit, a rejected token. An organization scan stops on it. */
export class GitHubError extends AtlasError {}
