# Operator Sales Pitch

Use this for publishers, creator platforms, newsletter tools, course platforms, and paid communities.

## One-Line Offer

I can check whether your paid/member-only content is accidentally shipped to non-paying clients.

## Why They Care

Many gates look protected because the page is blurred, hidden, or covered by a subscribe prompt. That is not enough if the full body is already in:

- hidden DOM;
- hydration JSON;
- app state;
- client-side entitlement flags;
- blurred/overlayed HTML.

## What You Deliver

Starter audit:

- 3 to 10 authorized page exports;
- Article-Ops risk report;
- visible vs hidden word counts;
- leak-vector classification;
- remediation checklist;
- no copying of paid/private body text.

## Price Ladder

- Free teaser: run Article-Ops on one local fixture and show the risk shape.
- $25 quick audit: review one authorized HTML export.
- $75 starter audit: review up to five authorized exports and write a remediation checklist.
- $250 fix pass: inspect the gate implementation and provide a patch plan.

## DM Template

Hi,

I built a small tool that checks whether paid/member-only pages accidentally ship the full body to the browser before access is authorized.

It does not need your user data or payment details. You can export one authorized test page as HTML and I return a report with:

- leak vector;
- visible word count;
- hidden word count;
- risk level;
- fix direction.

If nothing leaks, I’ll say that. If something leaks, the fix is usually server-side authorization: send the preview first, return the full body only after access is verified.

## What Not To Promise

- Do not claim access to third-party subscriber-only content.
- Do not offer bypasses.
- Do not request account passwords, cookies, payment details, or private customer data.
- Do not paste paid body text into public reports.
