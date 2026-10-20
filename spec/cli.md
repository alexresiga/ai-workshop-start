# Command line
`./skill-atlas scan <GitHub URL | directory>`; `https://github.com/<org>`, or `github.com/<org>`, scans the organization
Prints the result **at once**; *nothing is stored*.
`GITHUB_TOKEN`, optional: a higher GitHub rate limit.
## Output
```
JetBrains/kotlin · 6 skills
build-tools-bump-gradle-api — Bumps the Gradle API…
  https://github.com/JetBrains/kotlin/blob/<commit>/…
```
- Sorted by **name**; the description's *first sentence*
- `also in <paths>` for copies; warnings go to *stderr*
## An organization
```
JetBrains · 12 skills in 3 of 40 repositories
JetBrains/kotlin · 6 skills
  https://github.com/JetBrains/kotlin
```
- The repositories with skills, *most first*, then by name; `in M of N`: N scanned
- Warnings go to *stderr*, prefixed with the repository
