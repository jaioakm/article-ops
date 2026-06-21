# Spear Now, Shield Later

Article-Ops uses a two-step wedge.

## Spear

Show the failure mode first.

```bash
node bin/article-ops.mjs disease --all --force
node bin/article-ops.mjs audit examples/diseases/hidden-dom.html
node bin/article-ops.mjs audit examples/diseases/app-json.html
node bin/article-ops.mjs audit examples/diseases/client-flag.html
node bin/article-ops.mjs audit examples/diseases/blur-overlay.html
```

The spear proves four weak gate patterns in local fixtures:

- hidden DOM body;
- embedded app JSON body;
- client-side entitlement flag;
- blur or overlay gate.

Public claim:

> Check whether your paid content is already sitting in the client.

## Shield

Sell remediation after the risk is obvious.

The public repo keeps the first release focused on spear/audit. The shield path is a follow-up private pass:

- audit the client's authorized HTML/build output;
- identify hidden paid bodies and app-state leaks;
- recommend server-side authorization boundaries;
- produce a sanitized local copy or patch plan.

## Rule

Use fixtures, owned sites, or explicitly authorized files. Do not target third-party gated sites or bypass access controls.
