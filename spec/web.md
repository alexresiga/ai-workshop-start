# Web view
`./skill-atlas serve [port]`: the web view on `http://127.0.0.1:<port>`, 3000 by default.
`GITHUB_TOKEN`, optional, as for the CLI. The look: [mockups/list-web-view.png](../mockups/list-web-view.png).
A port already in use, or not a port (above 65535) → a clear message, exit code 1.
## The page
- A header: **Skill Atlas**, an input for `owner/repo`, an **organization** or a **GitHub link**, a **Scan** button; then `<owner>/<repo>` and an `N skills` pill
- The warnings, under the header
- On the left, the skills sorted by **name**: the name, and the description on one line; the first is selected; ↑ and ↓ move
- After a scan, above the skills, a **filter**: it keeps the skills whose name or description has *every word* typed, in any case,
  anywhere in a word; the pill shows `N of M skills` while it hides some; none left → `No skill matches <text>.`, and nothing on the right;
  the selected skill stays if it is shown, else the first shown is selected; ↑ and ↓ move through the shown ones; Esc clears it; a new scan empties it
- On the right, the selected skill's **SKILL.md**: its path, *Open on GitHub* at the scanned commit, `also in <paths>` for copies;
  a card with the front matter, **name** and **description**, every other key as a tag (`key`, for a flag that is true; else `key: value`);
  then the body, **rendered Markdown**: headings, paragraphs, lists, code, fenced or indented, as it is, quotes, tables, links, emphasis;
  a table may follow a line of text with no blank line, as on GitHub
- Links in the body resolve next to the SKILL.md on GitHub; only http, https and mailto links
- Repository text is *text*, never HTML: the Markdown is parsed into a tree, and the page builds each element
- `?repo=<owner/repo>` in the address scans at once
## An organization
- `<org>`, `<org>/` or `github.com/<org>` in the input scans the organization: `?org=<org>` in the address, and it scans at once
- The header: the organization, an `N skills` pill and an `M of N repositories` pill
- On the left, the repositories with skills, *most first*: the name and an `N skills` pill; ↑ and ↓ move; no filter.
  None → `No SKILL.md in any of <org>’s N repositories.`
- On the right, the totals, and `Pick a repository to see its skills.`
- Clicking a repository scans it, `?repo=` in the address; **Back** returns to the organization, Forward to the repository
- Only the latest scan's answer is shown, whichever comes back last
- Unreachable repository or not a GitHub URL → the clear message, in the list
- Light and dark, as the system is
## Details
- The same core as the CLI: the same skills, copies, warnings and links
- **GitHub repositories only**: the page never reads the server's own directories; `./dir` is not `owner/repo`
- On `127.0.0.1` only, and only for a loopback `Host` (`127.0.0.1`, `localhost`, `[::1]`); any other → status 403:
  a page that rebinds its own name to 127.0.0.1 cannot read the scans, nor what `GITHUB_TOKEN` can see
- `GET /api/scan?url=<owner/repo | GitHub URL>` → JSON `{ repository, skills, warnings }`; a skill also has its `text`, the
  other front matter keys as `properties`, and the `body`; a failure → status 400, `{ error }`
- `GET /api/organization?name=<org | org/ | GitHub URL>` → JSON `{ organization: { id, url }, repositories: [{ id, url, skills }], scanned, warnings }`;
  not an organization, or a failure → status 400, `{ error }`
- Nothing is stored
