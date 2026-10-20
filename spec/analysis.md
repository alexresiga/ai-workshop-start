# Repository analysis
## Input
A **GitHub repository** URL, or a local directory; or a **GitHub organization** URL, `https://github.com/<org>`, a user's too
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
## What is a project skill
- SKILL.md files with **identical text**, or of the **same name** in an agent's folder (`<.agents, .claude, … or agent>/skills/<name>`) → one skill; the others are its *copies* (`also in`)
- The one kept: the general one, in `.agents/skills`; else the first by path
- Elsewhere, any difference, a byte or a line ending → skills of their own
- A warning once, for the one kept
- the repository’s own workflow, outside .agents and .claude, example JetBrains/android: agent/skills/writing-lint-checks/SKILL.md; counted together with the ones of the same name
- skip A fixture for the project’s own tests, not a skill: a SKILL.md under `fixture`, `fixtures`, `__fixtures__`, `testData`, `testdata` or `test-data`; a skill in a `skills` folder may still be named so
- skip skills which are shipped as part of the product: a SKILL.md under `resources`; a skill in a `skills` folder may still be named so
## An organization
- Every repository of the account, *forks left out*: a fork's skills are its upstream's; for an organization, with a token,
  the private ones it can see; for a user, the public ones: GitHub lists no other
- Each repository goes through the **same scan**: the same skills, copies counted once, fixtures and `resources` skipped
- The repositories with skills, *most first*, then by name; and how many were scanned
- Each repository is read at its **default branch**, from the listing: no request of its own
- A problem in one repository → a *warning*, prefixed with it, the scan goes on; an empty repository, nothing
- What every repository would hit → a clear message, exit code 1: the account not found, GitHub out of reach, the rate limit
  (any 429, or a 403 that says so; also reading a SKILL.md), a rejected token
### The rate limit
- The listing, 100 a page: the pages the public count implies *at once*, then the next while the last is full
- With `GITHUB_TOKEN`: **one code search** for the whole account (`org:` or `user:`) finds the SKILL.md files, one page after
  the other; only the repositories it found are read, no tree. Above GitHub's 1000 results, or a search it could not finish:
  after its first page, each repository's tree, never a search each (code search allows 30 a minute)
- Without: each repository's tree. **Before**, what is left of the limit (`/rate_limit`, free) is checked: not enough →
  `Scanning <org> needs N GitHub requests, and M are left until HH:MM UTC`, exit code 1, rather than half an answer;
  checked again when a tree is too large for one answer, before the skill roots' requests
- At most **16 requests** to GitHub at a time
- GitHub asks to wait a minute or less (`retry-after`, or a reset that close) → waits, *once*; a request with no answer → sent
  again a second later, once; still none → GitHub out of reach
