---
name: gateleak-spear
description: Generate and audit local-only spear fixtures that expose weak client-side paywall, membership, and gated-content implementations. Use when Codex needs a public-safe "spear first" demo showing how hidden DOM, embedded app JSON, client entitlement flags, or blur overlays can leak content in authorized local fixtures.
---

# GateLeak Spear

Use this as the public-facing "spear" side: prove the leak shape on local fixtures, not real targets.

## Workflow

1. Generate every spear fixture:

   ```bash
   node bin/article-ops.mjs disease --all --force
   ```

2. Audit each fixture:

   ```bash
   node bin/article-ops.mjs audit examples/diseases/hidden-dom.html
   node bin/article-ops.mjs audit examples/diseases/app-json.html
   node bin/article-ops.mjs audit examples/diseases/client-flag.html
   node bin/article-ops.mjs audit examples/diseases/blur-overlay.html
   ```

3. Write the shareable spear report:

   ```bash
   node bin/article-ops.mjs report --out docs/spear-report.md
   ```

4. Report only the exposure shape:

   - fixture name;
   - risk;
   - gate status;
   - hidden word count;
   - block kind.

## Positioning

Lead with:

> Spear first: check whether your paid content is already sitting in the client before you sell the shield.

## Boundary

Do not target real third-party sites, bypass payment, use cookies, open private sessions, defeat CAPTCHA, evade platform limits, or print paid/private body text.
