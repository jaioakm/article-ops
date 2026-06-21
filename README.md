# Article-Ops

Turn public pages, feeds, and sitemaps into an agent-ready Markdown research vault.

## The Hook

**Check whether your paid posts can be read without a subscription.**

Article-Ops ships a local "disease and cure" demo for weak client-side gates:

```bash
node bin/article-ops.mjs disease --all --force
node bin/article-ops.mjs audit examples/diseases/hidden-dom.html
node bin/article-ops.mjs cure examples/diseases/hidden-dom.html --force
```

The disease fixtures simulate the mistakes that make paid/member content leak:

- hidden DOM bodies;
- embedded app JSON;
- client-side entitlement flags;
- blurred/overlayed premium text.

The shield side reports the risk and writes a sanitized copy that removes leaked bodies from the client payload.

I kept losing useful posts inside browser tabs, newsletters, product blogs, docs pages, X threads, and random launch pages. So this is the boring weapon: point it at public URLs, and it builds a clean local archive that an AI coding agent can actually use.

```bash
npx @jaioakm/article-ops add https://example.com/post
npx @jaioakm/article-ops crawl https://example.com/blog --max 25
npx @jaioakm/article-ops feed https://example.com/rss.xml --max 50
npx @jaioakm/article-ops gate https://example.com/paywalled-post
npx @jaioakm/article-ops import saved-page.html --source-url https://example.com/post
npx @jaioakm/article-ops audit saved-page.html
npx @jaioakm/article-ops disease --all
npx @jaioakm/article-ops cure saved-page.html
```

It saves:

- clean Markdown;
- metadata JSON;
- a searchable `index.json`;
- dedupe fingerprints;
- source URL, title, description, and capture time;
- an agent handoff file with the next reading queue.

## Why It Gets Attention

This is not another bookmark manager. It is a local content intake pipeline for agents.

- Found a site with useful posts? Archive the public pages.
- Need market research? Turn competitor blogs into a Markdown vault.
- Tracking a niche? Pull RSS feeds into a searchable local dataset.
- Feeding Codex/Claude/Gemini? Hand it stable Markdown instead of fragile tabs.
- Building a content product? Extract examples, topics, titles, and angles into local files.
- Already have legitimate access to a page? Export the visible HTML/text and import it locally.
- Run a defensive gate audit on your own HTML to catch content accidentally shipped inside hidden DOM or embedded JSON.

## Safety Boundary

Article-Ops is for public pages you are allowed to access. It also detects gated pages and records why they were skipped, without bypassing the gate.

It does not:

- bypass paywalls;
- use cookies or private sessions;
- evade login, CAPTCHA, or account limits;
- scrape hidden/private communities;
- copy paid member-only content.

By default it checks `robots.txt`, stays same-origin during crawls, and refuses obvious login/paywall/private URLs.

For pages you are already authorized to view, use `import` with a local HTML/text export. That mode does not unlock hidden text, call private APIs, or reuse session cookies. It only converts the visible file you provide into a local Markdown vault.

## Install

```bash
npm install -g @jaioakm/article-ops
article-ops add https://example.com
```

Or run from source:

```bash
git clone https://github.com/jaioakm/article-ops.git
cd article-ops
npm run demo
```

## Commands

```text
article-ops add <url>             Save one public page.
article-ops crawl <url> --max 25  Crawl same-origin public links from a page.
article-ops feed <url> --max 50   Save URLs from RSS/Atom/XML sitemaps.
article-ops gate <url>            Explain whether a page looks public, gated, login-only, or paywalled.
article-ops import <file>          Convert a local visible HTML/text export into the vault.
article-ops audit <file>           Defensive audit for hidden-content leak signals in local HTML.
article-ops disease                Generate local vulnerable gate fixtures.
article-ops cure <file>            Remove local hidden-content leak patterns from a copy.
article-ops demo                  Generate a local demo vault.
```

Options:

```text
--out <dir>        Output directory. Default: article-vault
--max <n>          Maximum pages for crawl/feed. Default: 20
--source-url <url> Original URL for local imports.
--title <title>    Title override for local imports.
--redact           Redact common emails, phone numbers, and token-looking strings.
--all              Generate every disease fixture.
--force            Overwrite disease/cure output files.
--no-robots        Skip robots.txt check. Use only when you have permission.
--check            Validate CLI smoke path.
```

## Agent Skills

This repo ships installable agent skills:

- `.codex/skills/article-ops/SKILL.md`
- `.claude/skills/article-ops/SKILL.md`

Prompt:

```text
Use $article-ops. Archive this public research list into Markdown and summarize the useful angles.
```

## Example Output

```text
article-vault/
├── index.json
├── queue.md
└── pages/
    ├── example-com-hello-world-a1b2c3.md
    └── example-com-hello-world-a1b2c3.json
```

## Design

Article-Ops is dependency-free Node.js on purpose. The first version is simple:

1. fetch page/feed/sitemap;
2. reject risky URLs;
3. extract readable text with conservative HTML cleanup;
4. save stable Markdown and metadata;
5. keep a deduped index.

For pages that require JavaScript rendering, pair it with Playwright or an agent browser and pass the final public URL to `article-ops add`.

## Gated Page Intelligence

`article-ops gate` does not unlock hidden text. It gives you a clean decision:

- `public`: safe to archive;
- `login`: requires account access;
- `paywall`: paid/member-only language detected;
- `private`: private/account URL pattern detected;
- `blocked`: robots.txt or request failure.

This is useful for research pipelines because agents stop wasting time on pages that will never convert into a legal local dataset.

## BYOA Visible Capture

`article-ops import` is the practical mode:

```bash
article-ops import saved-page.html --source-url https://site.example/post --redact
article-ops import notes.txt --title "Competitor launch notes"
```

It is designed for:

- your own notes;
- public pages saved from a browser;
- pages your account is authorized to view and store for personal research;
- local-only agent context.

It is not designed for redistributing paid/private content or unlocking content that was not visible to you.

## Defensive Gate Audit

`article-ops audit` is for site owners and builders. It checks a local HTML file for common content leak patterns:

- long text inside `display:none` / `hidden` / `aria-hidden` blocks;
- large article-shaped JSON embedded in scripts;
- paywall language while high word-count content still ships in the page;
- suspicious hidden-to-visible text ratio.

It reports counts and risk signals, not the hidden body text.

Run the safe leak demo:

```bash
node bin/article-ops.mjs audit examples/leaky-gate.html
```

See [`docs/leak-demo.md`](docs/leak-demo.md) for the problem-to-proof-to-fix walkthrough.
