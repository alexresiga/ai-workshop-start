# Command line
`./skill-atlas scan <GitHub URL | directory>`; `./skill-atlas scan https://github.com/<org>` for an organization
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
- The repositories with skills, the **most skills** first; each with its count and its link
- `github.com/<owner>/<repo>` is still one repository; warnings go to *stderr*, each led by its repository
