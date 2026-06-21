---
name: gateleak-shield
description: Audit and cure local HTML files that accidentally ship hidden gated/member/paywalled content in DOM or embedded JSON. Use when Codex needs to detect hidden-content leak signals, produce a sanitized local output file, and explain the before/after risk without printing private or hidden body text.
---

# GateLeak Shield

Find and remove the leak pattern from local HTML. This is the "cure" side of the demo.

## Workflow

1. Audit the source HTML:

   ```bash
   node bin/article-ops.mjs audit <file.html>
   ```

2. Generate a cured copy:

   ```bash
   node bin/article-ops.mjs cure <file.html> --force
   ```

3. Re-audit the cured copy:

   ```bash
   node bin/article-ops.mjs audit <file.cured.html>
   ```

4. Report:

   - before risk;
   - after risk;
   - stripped hidden blocks;
   - stripped hidden word count;
   - cured output path.

## Boundary

Work on local files only. Do not fetch, unlock, print, redistribute, or preserve hidden paid/private body text. The shield reports counts and produces a sanitized copy.

## Positioning

Use this wording for public demos:

> GateLeak Shield catches paywall/member-gate pages that accidentally ship the full body to unauthorized clients, then produces a sanitized file that keeps paid content server-side.
