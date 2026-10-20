# Repository analysis
## Input
A **GitHub repository** URL, or a local directory; or a **GitHub organization**, `https://github.com/<org>`, a user's account, too
## Output
Every `SKILL.md`: **name**, **description**, **link**; for an organization, the **count** of skills in each repository
## Architecture
Core: fetch → find → parse. CLI: a *thin client*.
Skill: id = `repo:path`, name, description, commit
## Details
- **GitHub API**, no clone; *under 5 s* for intellij-community
- The name: front matter, else the directory
- The link pins the *scanned commit*
- Malformed front matter → a *warning*, the scan goes on
- Unreachable repository → a clear message, exit code 1
- A fork: through its tree, with `GITHUB_TOKEN` too: code search leaves forks out
## An organization
- Each repository, scanned as on its own: the same skills, so the same count; copies are one skill, fixtures none
- Organization → repository → skill: the repositories with skills, the **most skills** first, then by `owner/repo`; how many repositories in all
- With `GITHUB_TOKEN`: one code search over the account (`org:` or `user:`) finds the repositories with a `SKILL.md`; only those, and the forks, are scanned.
  More than the 1000 results a search returns → each repository searched on its own. Without a token, each repository's tree
- Every page of repositories, 100 at a time: the pages the account's public count tells of at once, then the next while a page is full;
  the listing and the search at the same time; a search's pages one after another, GitHub answers 429 to searches at once;
  16 repositories scanned at a time
- A repository that cannot be scanned, an empty one → a warning, `<owner/repo>: … ; skipped`, the scan goes on; with
  `GITHUB_TOKEN`, one the search finds no `SKILL.md` in is not opened, so there is nothing to warn about
- What stops every repository, GitHub out of reach, the rate limit (any 429), a rejected token → the clear message, exit code 1
- Unknown organization → `Organization not found: https://github.com/<org>`, exit code 1
- Each warning led by its repository
## What is a project skill
- SKILL.md files with **identical text**, or of the **same name** in an agent's folder (`<.agents, .claude, … or agent>/skills/<name>`) → one skill; the others are its *copies* (`also in`)
- The one kept: the general one, in `.agents/skills`; else the first by path
- Elsewhere, any difference, a byte or a line ending → skills of their own
- A warning once, for the one kept
- the repository’s own workflow, outside .agents and .claude, example JetBrains/android: agent/skills/writing-lint-checks/SKILL.md; counted together with the ones of the same name
- skip A fixture for the project’s own tests, not a skill: a SKILL.md under `fixture`, `fixtures`, `__fixtures__`, `testData`, `testdata` or `test-data`; a skill in a `skills` folder may still be named so
- skip skills which are shipped as part of the product: a SKILL.md under `resources`; a skill in a `skills` folder may still be named so
