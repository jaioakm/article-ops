---
name: gateleak-disease
description: Generate a local-only vulnerable paywall/member-gate fixture that intentionally ships hidden article content in the client for safe demos, audits, training, and before/after proof. Use when Codex needs to create a reproducible "disease" sample without touching real sites, private content, accounts, cookies, sessions, or access controls.
---

# GateLeak Disease

Create the synthetic problem first: a local HTML page that looks gated but still ships hidden member-only text in the DOM.

## Workflow

1. From the `article-ops` repo root, generate the fixture:

   ```bash
   node bin/article-ops.mjs disease --force
   ```

2. Prove the problem exists:

   ```bash
   node bin/article-ops.mjs audit examples/disease-gate.html
   ```

3. Report the generated file path and the audit signal: risk, visible words, hidden words, hidden blocks.

## Boundary

Only generate local synthetic fixtures. Do not use this skill to bypass real paywalls, login gates, private communities, account restrictions, CAPTCHA, API limits, or platform access controls.

## Positioning

Use this wording for public demos:

> GateLeak Disease generates a safe local broken gate so teams can see exactly how client-shipped paid content leaks before they fix it.
