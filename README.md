# Skill Atlas

Every agent skill in a repository: `./skill-atlas scan` finds each `SKILL.md` and prints its name,
description and link.

```console
$ npm ci
$ ./skill-atlas scan https://github.com/JetBrains/kotlin
JetBrains/kotlin · 6 skills
…
build-tools-bump-gradle-api — Bumps the Gradle API version that Kotlin Gradle plugins are compiled against in the Kotlin compiler repository.
  https://github.com/JetBrains/kotlin/blob/5ab6270ab772d113e8ad52ebfcaa0109c522ae00/.claude/skills/build-tools-bump-gradle-api/SKILL.md
…
```

`./skill-atlas scan https://github.com/<org>` counts the skills of every repository of an organization.

`./skill-atlas serve` opens the web view on http://127.0.0.1:3000: enter `owner/repo` or a GitHub link, press
**Scan**, and read each skill with its `SKILL.md`. For an organization, **Cluster skills** groups every skill by theme with a
small model, haiku through Claude Code (`claude -p`): `claude` on the server's PATH and logged in, or `CLAUDE` set to it.

Set `GITHUB_TOKEN` for a higher GitHub rate limit. `npm test` runs the tests.

- [spec/](spec/): what it does. [AGENTS.md](AGENTS.md): the definition of done.
- [fixture/](fixture/README.md): a small repository for the tests.
