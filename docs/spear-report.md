# GateLeak Spear Report

This report is generated from local spear fixtures or authorized local HTML files. It shows exposure shape only and does not print hidden paid/private body text.

## Summary

- Files audited: 4
- High risk: 4
- Medium risk: 0
- Low risk: 0
- Hidden words detected: 546

## Exposure Table

| File | Risk | Gate | Visible words | Hidden words | Hidden blocks | Block kinds |
| --- | --- | --- | ---: | ---: | ---: | --- |
| app-json.html | HIGH | paywall | 26 | 186 | 2 | embedded-json |
| hidden-dom.html | HIGH | paywall | 24 | 180 | 2 | hidden-dom, client-gate-dom |
| blur-overlay.html | HIGH | paywall | 120 | 90 | 1 | client-gate-dom |
| client-flag.html | HIGH | paywall | 24 | 90 | 1 | embedded-json |

## Reproduce

```bash
node bin/article-ops.mjs disease --all --force
node bin/article-ops.mjs report --out docs/spear-report.md
```

## Boundary

Use this on local fixtures, owned sites, or explicitly authorized HTML/build exports. Do not target third-party gated sites or bypass access controls.
