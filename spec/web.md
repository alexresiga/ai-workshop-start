# Web view
`./skill-atlas serve [port]`: the web view on `http://127.0.0.1:<port>`, 3000 by default.
`GITHUB_TOKEN`, optional, as for the CLI. The look: [mockups/list-web-view.png](../mockups/list-web-view.png).
## The page
- A header: **Skill Atlas**, an input for `owner/repo` or a **GitHub link**, a **Scan** button; then `<owner>/<repo>` and an `N skills` pill
- The warnings, under the header
- On the left, the skills sorted by **name**: the name, and the description on one line; the first is selected; ↑ and ↓ move
- On the right, the selected skill's **SKILL.md**: its path, *Open on GitHub* at the scanned commit, `also in <paths>` for copies;
  a card with the front matter, **name** and **description**, every other key as a tag (`key`, for a flag that is true; else `key: value`);
  then the body, **rendered Markdown**: headings, paragraphs, lists, code, fenced or indented, as it is, quotes, tables, links, emphasis;
  a table may follow a line of text with no blank line, as on GitHub
- Links in the body resolve next to the SKILL.md on GitHub; only http, https and mailto links
- Repository text is *text*, never HTML: the Markdown is parsed into a tree, and the page builds each element
- `?repo=<owner/repo>` in the address scans at once
- Unreachable repository or not a GitHub URL → the clear message, in the list
- Light and dark, as the system is
## Details
- The same core as the CLI: the same skills, copies, warnings and links
- **GitHub repositories only**: the page never reads the server's own directories; `./dir` is not `owner/repo`
- `GET /api/scan?url=<owner/repo | GitHub URL>` → JSON `{ repository, skills, warnings }`; a skill also has its `text`, the
  other front matter keys as `properties`, and the `body`; a failure → status 400, `{ error }`
- Nothing is stored
