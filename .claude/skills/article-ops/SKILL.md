---
name: article-ops
description: Archive public pages, feeds, and sitemaps into a local Markdown research vault for AI agents. Never bypass paywalls, login walls, CAPTCHA, private communities, or platform restrictions.
---

# Article-Ops

Run the local CLI to save public pages into Markdown:

```bash
node bin/article-ops.mjs add <url>
node bin/article-ops.mjs crawl <url> --max 25
node bin/article-ops.mjs feed <url> --max 50
node bin/article-ops.mjs gate <url>
node bin/article-ops.mjs import <file> --source-url <url> --redact
node bin/article-ops.mjs audit <file>
```

Use only public sources. Refuse private, paid, login-only, CAPTCHA-gated, or account-restricted pages.
