---
name: article-ops
description: Archive public pages, feeds, and sitemaps into a local Markdown research vault for AI agents. Use when the user wants to save public articles/posts/docs, build a research dataset, summarize captured pages, or turn web reading into stable local files. Never bypass paywalls, login walls, CAPTCHA, private communities, or platform restrictions.
---

# Article-Ops

Use this skill to convert public web material into a local agent-readable vault.

## Core Workflow

1. Clarify the source list only if no URLs are available.
2. Reject private, paid, login-only, CAPTCHA-gated, or access-restricted sources.
3. Run `article-ops add`, `article-ops crawl`, or `article-ops feed`.
4. Read the generated `index.json` and `queue.md`.
5. Summarize useful angles, missing pages, and next capture targets.

## Commands

```bash
article-ops add <url> --out article-vault
article-ops crawl <url> --max 25 --out article-vault
article-ops feed <url> --max 50 --out article-vault
article-ops gate <url>
article-ops import <file> --source-url <url> --redact
article-ops audit <file>
```

From the repo:

```bash
node bin/article-ops.mjs add <url>
```

## Boundaries

Allowed:

- public blog posts, docs pages, public RSS/Atom feeds, public sitemaps;
- public pages the user can access without login or payment;
- user-provided URL lists;
- local summarization of captured Markdown.
- gate detection for pages that appear paywalled, login-only, private, or partially hidden.
- local visible-page imports from user-provided HTML/text files.
- defensive local HTML audits for accidental gated-content leak signals.

Rejected:

- paywall bypass;
- login/session/cookie scraping;
- private DMs, private communities, paid member-only posts;
- CAPTCHA bypass;
- hidden APIs or rate-limit evasion;
- copying content for republication without rights.

## Gated Pages

Do not bypass gates. Use `article-ops gate <url>` to classify the blocker, record visible metadata, and move to public alternatives.

## Visible Imports

Use `article-ops import` when the user provides a local HTML/text export they are authorized to store. This does not fetch private pages or unlock hidden content. Prefer `--redact` when the page may contain personal details.

## Defensive Audits

Use `article-ops audit <file>` only on local HTML files the user owns or is authorized to test. Report risk signals and counts, not hidden body text.

## Output

Report:

```text
Captured: ...
Skipped: ...
Vault: ...
Useful angles: ...
Next capture target: ...
```
