### Recording: A spinner while a scan runs, and an organization’s progress, at `6f28e31`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `25a3d51`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:13` | While a scan runs, in the list: a **spinner** and `Scanning <owner/repo>…` | Scan example/fixture: a spinner and Scanning example/fixture… while it runs; the button says Scanning… (0:00.9) |
| `spec/web.md:13` | the button says `Scanning…` | Scan example/fixture: a spinner and Scanning example/fixture… while it runs; the button says Scanning… (0:00.9) |
| `spec/web.md:13` | a slower spinner when the system asks for reduced motion | Reduced motion: the spinner turns three times slower (0:06.1) |
| `spec/web.md:39` | While it scans, in the list: the spinner and `Listing <org>’s repositories…`, until they are listed | Scan the organization example: the spinner and Listing example’s repositories…, until they are listed (0:08.5) |
| `spec/web.md:39` | then `Scanned N of M repositories` and a **progress bar**, moving on as each repository is done, a skipped one too | Then Scanned N of 3 repositories and a bar, moving on as each is done; then the repositories (0:12.9) |
| `spec/web.md:41` | the same spinner and bar each step, not built again: the spinner keeps turning, however fast the steps come | Then Scanned N of 3 repositories and a bar, moving on as each is done; then the repositories (0:12.9) |
| `spec/web.md:59` | `GET /api/organization/progress?name=<org \| org/ \| GitHub URL>` → the same scan, as NDJSON, one JSON a line, as it goes: `{ progress: { scanned, of } }`, from `0` once the repositories are listed | *not shown*: the server’s API has nothing on screen; tests/web.test.ts checks it |
| `spec/web.md:60` | the last line, the answer of `/api/organization`, or `{ error }` | *not shown*: the server’s API has nothing on screen; tests/web.test.ts checks it |
| `spec/web.md:61` | not an organization → status 400, `{ error }` | *not shown*: the server’s API has nothing on screen; tests/web.test.ts checks it |
| `spec/web.md:61` | what the page reads | *not shown*: the server’s API has nothing on screen; tests/progress.test.ts checks the page reads it |

**Before**, at `25a3d51`: fails at scene 1, "Scan example/fixture: a spinner and Scanning example/fixture… while it runs; the button says Scanning…": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (4 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 20.5 s, 512 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 20.3 s, 508 frames) · ✓ ffprobe before-light.mp4 (1280×720, 12.8 s, 320 frames) · ✓ light frames are the page (SSIM ≥ 0.996) · ✓ light screenshots match baseline/ (SSIM ≥ 1.000) · ✓ dark frames are the page (SSIM ≥ 0.994) · ✓ dark screenshots match baseline/ (SSIM ≥ 1.000) · ✓ a second run is the same (starts ±0.14 s, SSIM ≥ 0.998)
