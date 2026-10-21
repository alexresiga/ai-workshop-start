### Recording: An entity reference is its character: Replace <version> & tag it., at `2613716`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `03fdcd3`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:49` | An entity reference in the body is its character, as on GitHub (CommonMark's entity and numeric character references): `Replace &lt;version&gt; &amp; tag it.` reads "Replace <version> & tag it." | code-style's SKILL.md says "Replace &lt;version&gt; &amp; tag it.": it reads "Replace <version> & tag it." (0:01.0) |
| `spec/web.md:50` | any HTML5 name, `&#35;` or `&#x23;`, then `;` | Any HTML5 name, a decimal or a hex reference: "&copy; 2026 &mdash; issue &#35;88 &#x2713;" is "© 2026 — issue #88 ✓" (0:03.0) |
| `spec/web.md:51` | code point 0, past U+10FFFF or a surrogate → U+FFFD | Code point 0, one past U+10FFFF and a surrogate are each the replacement character, � (0:05.0) |
| `spec/web.md:51` | an unknown name, or no `;`, as typed | An unknown name, or one with no ;, reads as typed: "AT&T &nosuch; &amp more" (0:06.9) |
| `spec/web.md:51` | in text, a link's text and its destination, and a bare URL | In a link's text and its destination, and in a bare URL: "<docs>" links to ?a=1&b=2, the bare URL is ?x=1&y=2 (0:08.9) |
| `spec/web.md:52` | not in code, nor after a backslash | In code, and after a backslash, &amp; stays as typed (0:10.9) |
| `spec/web.md:52` | the character is text, never Markdown nor HTML | The character is text: "&ast;not italic&ast; &lt;b&gt;bold?&lt;/b&gt;" has no italics and no bold, only text (0:12.9) |
| `spec/web.md:108` | `GET /markdown.js` and `GET /entities.js`, the parser the page runs and the HTML5 entity names it reads, as JavaScript | *not shown*: what the server sends the page has nothing on screen of its own |
| `spec/web.md:109` | `src/entities.js` generated from the WHATWG's `entities.json` by `node scripts/entities.ts` | *not shown*: how a source file is generated has nothing on screen |

**Before**, at `03fdcd3`: fails at scene 1, "code-style's SKILL.md says "Replace &lt;version&gt; &amp; tag it.": it reads "Replace <version> & tag it."": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (7 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 15.1 s, 378 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 15.0 s, 375 frames) · ✓ ffprobe before-light.mp4 (1280×720, 8.3 s, 208 frames) · ✓ light frames are the page (SSIM ≥ 0.989) · ✓ light screenshots match baseline/ (written: 1, 2, 3, 4, 5, 6, 7) · ✓ dark frames are the page (SSIM ≥ 0.987) · ✓ dark screenshots match baseline/ (written: 1, 2, 3, 4, 5, 6, 7) · ✓ a second run is the same (starts ±0.13 s, SSIM ≥ 0.996)
