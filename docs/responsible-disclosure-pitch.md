# Responsible Disclosure Pitch

Use this when approaching a platform, publisher, SaaS product, or creator platform with an authorized finding.

## Claim

Your gated content may be shipped to unauthorized clients before the server verifies access.

## Evidence Package

Send only evidence that is safe to disclose:

- affected URL or owned test URL;
- timestamp;
- account state used for testing;
- whether the test was authorized;
- visible word count;
- hidden word count;
- leak vector: hidden DOM, embedded app JSON, client entitlement flag, or blur overlay;
- screenshots of the public preview and Article-Ops audit output;
- no copied paid/private body text.

## Reproduction

```bash
node bin/article-ops.mjs audit saved-authorized-page.html
```

Expected output shape:

```text
HIGH saved-authorized-page.html
     gate: paywall (paid/member-only language detected)
     visible words: 24
     hidden words: 180
     block kinds: embedded-json
```

## Impact

If paid/member-only body text is already inside the browser payload, CSS, overlays, client flags, or JavaScript checks are not sufficient protection. The server should withhold the paid body until access is authorized.

## Fix Direction

- Return only the public preview to unauthorized clients.
- Move full body retrieval behind server-side authorization.
- Avoid embedding paid bodies in `__NEXT_DATA__`, app JSON, hidden DOM, or hydration state.
- Treat blur/overlay gates as display controls, not access controls.

## Message Template

Subject: Possible gated-content exposure in client payload

Hi,

I found a gated-content exposure pattern in an authorized test/export. The page appears to require subscription or membership, but Article-Ops detects article-shaped hidden content in the client payload.

I did not copy, redistribute, or publish the protected body text. The attached evidence includes counts, block kinds, and reproduction steps only.

I can provide the sanitized audit output and help verify a fix that keeps paid/member-only bodies server-side until access is authorized.

Thanks.
