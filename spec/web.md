# Web view
`./skill-atlas serve [port]`: the web view on `http://127.0.0.1:<port>`, 3000 by default.
`GITHUB_TOKEN`, optional, as for the CLI. The look: [mockups/list-web-view.png](../mockups/list-web-view.png).
A port already in use, or not a port (above 65535) → a clear message, exit code 1.
## The page
- A header: **Skill Atlas**, an input for `owner/repo` or a **GitHub link**, a **Scan** button; then `<owner>/<repo>` and an `N skills` pill
- The warnings, under the header
- On the left, the skills sorted by **name**: the name, and the description on one line; the first is selected; ↑ and ↓ move
- Above them, a **Filter skills** input: a skill stays if every word of the filter is in its name or its description,
  in any case and any order, a part of a word too (`gradle bump` keeps *build-bump-gradle-version*); an empty filter keeps all;
  the first one left is selected, ↑ and ↓ move among those left; none left → `No skill matches <filter>`, in the list;
  a new scan empties the filter
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
- On `127.0.0.1` only, and only for a loopback `Host` (`127.0.0.1`, `localhost`, `[::1]`); any other → status 403:
  a page that rebinds its own name to 127.0.0.1 cannot read the scans, nor what `GITHUB_TOKEN` can see
- The filter is `GET /filter.js`, as the Markdown parser is `GET /markdown.js`: the page and the tests run the same code
- `GET /api/scan?url=<owner/repo | GitHub URL>` → JSON `{ repository, skills, warnings }`; a skill also has its `text`, the
  other front matter keys as `properties`, and the `body`; a failure → status 400, `{ error }`
- Nothing is stored
