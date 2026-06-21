# Leak Demo

Article-Ops sells the cure by shipping a safe, synthetic disease.

Do not create leaks on real sites. Use the local fixture:

```bash
node bin/article-ops.mjs audit examples/leaky-gate.html
```

Expected signal:

```text
HIGH .../examples/leaky-gate.html
     gate: paywall (paid/member-only language detected)
     visible words: 11
     total words: 97
     hidden words: 86
     hidden blocks: 1
     block kinds: hidden-dom
```

## What This Proves

The fixture simulates a common bad implementation:

1. The page says users must subscribe.
2. The preview is short.
3. The full article body is still shipped inside hidden HTML.
4. A client-side style hides it.

Article-Ops does not print the hidden text. It reports the leak shape:

- how much text is visible;
- how much text is hidden;
- whether gated/paywall language is present;
- whether hidden DOM or embedded JSON looks article-shaped.

## Fix Pattern

Bad:

```html
<section hidden>
  full paid article body here
</section>
```

Better:

```html
<section>
  short public preview only
</section>
```

Keep paid/member-only bodies server-side until access is authorized.

## Sales Angle

This is a clean public demo:

> "If your paywall ships the article body and hides it in the client, Article-Ops catches it before users or bots do."

That is a concrete pain, a concrete proof, and a concrete fix.
