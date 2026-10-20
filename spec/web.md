# Web view
`./skill-atlas serve [port]`: the web view on `http://127.0.0.1:<port>`, 3000 by default.
`GITHUB_TOKEN`, optional, as for the CLI.
## Details
- The same core as the CLI: the same skills, copies, warnings and links
- **GitHub repositories only**: the page never reads the server's own directories; `./dir` is not `owner/repo`
- `GET /api/scan?url=<owner/repo | GitHub URL>` → JSON `{ repository, skills, warnings }`; a skill also has its `text`, the
  other front matter keys as `properties`, and the `body`; a failure → status 400, `{ error }`
- Nothing is stored
