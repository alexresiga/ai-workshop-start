# Repository analysis
## Input
A **GitHub repository** URL, or a local directory
## Output
Every `SKILL.md`: **name**, **description**, **link**
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
- SKILL.md files with **identical text** → one skill; the others are its *copies* (`also in`)
- The one kept: the general one, in `.agents/skills`; else the first by path
- Any difference, a byte or a line ending → skills of their own
- A warning once, for the one kept
- the repository’s own workflow, outside .agents and .claude
