#!/usr/bin/env node
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const args = process.argv.slice(2);
const command = args[0] || "help";

function option(name, fallback = undefined) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  return value && !value.startsWith("--") ? value : true;
}

function numberOption(name, fallback) {
  const value = option(name);
  if (!value || value === true) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function positionalArgs(startIndex = 1) {
  const optionsWithValues = new Set(["--out", "--max", "--source-url", "--title"]);
  const values = [];
  for (let index = startIndex; index < args.length; index += 1) {
    const value = args[index];
    if (optionsWithValues.has(value)) {
      index += 1;
      continue;
    }
    if (value.startsWith("--")) continue;
    values.push(value);
  }
  return values;
}

const outDir = path.resolve(String(option("--out", "article-vault")));
const maxPages = numberOption("--max", 20);
const checkRobots = !args.includes("--no-robots");

const blockedUrlPatterns = [
  /\/login\b/i,
  /\/signin\b/i,
  /\/sign-in\b/i,
  /\/account\b/i,
  /\/checkout\b/i,
  /\/cart\b/i,
  /\/subscribe\b/i,
  /\/members?\b/i,
  /\/premium\b/i,
  /\/paywall\b/i
];

function usage() {
  console.log(`Article-Ops

Usage:
  article-ops add <url>             Save one public page
  article-ops crawl <url> --max 25  Crawl same-origin public links
  article-ops feed <url> --max 50   Save URLs from RSS/Atom/XML sitemap
  article-ops gate <url>            Classify a page as public/gated/login/paywalled
  article-ops import <file>          Convert a local visible HTML/text export
  article-ops audit <file>           Audit local HTML for gated-content leak signals
  article-ops disease                Generate a local vulnerable gate fixture
  article-ops report [files...]      Write a Markdown spear exposure report
  article-ops cure <file>            Remove local hidden-content leak patterns
  article-ops demo                  Generate a demo vault

Options:
  --out <dir>      Output directory, default article-vault
  --max <n>        Max pages, default 20
  --source-url     Original URL for local imports
  --title          Title override for local imports
  --redact         Redact emails, phone numbers, and token-looking strings
  --all            Generate all disease fixtures
  --force          Overwrite generated fixture/report files
  --out <file>     Report output path for article-ops report
  --no-robots      Skip robots.txt check only when you have permission
  --check          Smoke-check the CLI
`);
}

function normalizeUrl(input, base) {
  try {
    const url = new URL(input, base);
    url.hash = "";
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isBlockedUrl(urlString) {
  return blockedUrlPatterns.some((pattern) => pattern.test(urlString));
}

function isProbablyAsset(urlString) {
  return /\.(png|jpe?g|gif|webp|avif|svg|pdf|zip|mp4|mp3|css|js|ico|woff2?|ttf)(\?|$)/i.test(urlString);
}

function decodeHtml(value = "") {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function textFromHtml(html) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<\/(p|div|section|article|main|h1|h2|h3|li|blockquote)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function firstMatch(html, pattern) {
  const match = html.match(pattern);
  return match ? decodeHtml(match[1].trim()) : "";
}

function extractArticle(html, url) {
  const title =
    firstMatch(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ||
    url;
  const description =
    firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    firstMatch(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i);
  const articleHtml =
    firstMatch(html, /<article[^>]*>([\s\S]*?)<\/article>/i) ||
    firstMatch(html, /<main[^>]*>([\s\S]*?)<\/main>/i) ||
    html;
  const text = textFromHtml(articleHtml);
  return { title, description, text };
}

function redactText(text) {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\+?\d[\d\s().-]{8,}\d/g, "[redacted-phone]")
    .replace(/\b(?:sk|ghp|gho|glpat|xoxb|xoxp|AKIA)[A-Za-z0-9_\-]{16,}\b/g, "[redacted-token]")
    .replace(/\b(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"]?[A-Za-z0-9_\-./+=]{8,}/gi, "$1=[redacted]");
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function extractHiddenBlocks(html) {
  const blocks = [];
  const patterns = [
    /<([a-z0-9-]+)([^>]*(?:hidden|aria-hidden=["']true["']|display\s*:\s*none|visibility\s*:\s*hidden)[^>]*)>([\s\S]*?)<\/\1>/gi,
    /<([a-z0-9-]+)([^>]*(?:data-paid-body|data-premium-body|data-member-body|class=["'][^"']*(?:blurred|paywall-body|premium-body|member-body|locked-content)[^"']*["'])[^>]*)>([\s\S]*?)<\/\1>/gi,
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    /<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi,
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/gi,
    /<script[^>]*>\s*window\.[A-Za-z0-9_$]+(?:\.[A-Za-z0-9_$]+)?\s*=\s*({[\s\S]*?});?\s*<\/script>/gi
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const raw = match[3] || match[1] || "";
      const text = textFromHtml(raw);
      const words = countWords(text);
      if (words >= 30) {
        blocks.push({
          words,
          kind: pattern.source.includes("script") || pattern.source.includes("window")
            ? "embedded-json"
            : pattern.source.includes("blurred") || pattern.source.includes("data-paid")
              ? "client-gate-dom"
              : "hidden-dom"
        });
      }
    }
  }
  return blocks;
}

async function auditFile(filePath) {
  const raw = await readFile(path.resolve(filePath), "utf8");
  const visibleText = textFromHtml(
    raw
      .replace(/<([a-z0-9-]+)([^>]*(?:hidden|aria-hidden=["']true["']|display\s*:\s*none|visibility\s*:\s*hidden)[^>]*)>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
  );
  const fullText = textFromHtml(raw);
  const hiddenBlocks = extractHiddenBlocks(raw);
  const gate = classifyGate(`file://${path.resolve(filePath).replaceAll("\\", "/")}`, raw);
  const visibleWords = countWords(visibleText);
  const hiddenWords = hiddenBlocks.reduce((sum, block) => sum + block.words, 0);
  const totalWords = Math.max(countWords(fullText), visibleWords + hiddenWords);
  const hiddenRatio = totalWords ? hiddenWords / totalWords : 0;
  const hasGate = gate.status === "paywall" || gate.status === "gated" || gate.status === "login";
  const risk =
    hiddenWords >= 400 || (hiddenWords >= 80 && (hiddenRatio >= 0.25 || hasGate))
      ? "high"
      : hiddenWords >= 30 || (hasGate && hiddenWords > 0)
        ? "medium"
        : "low";

  return {
    file: path.resolve(filePath),
    gateStatus: gate.status,
    gateReason: gate.reason,
    risk,
    visibleWords,
    totalWords,
    hiddenWords,
    hiddenBlocks: hiddenBlocks.length,
    blockKinds: [...new Set(hiddenBlocks.map((block) => block.kind))]
  };
}

function stripLeakyHiddenContent(html) {
  let strippedBlocks = 0;
  let strippedWords = 0;

  const stripBlock = (match, tag, attrs, body) => {
    const text = textFromHtml(body || "");
    const words = countWords(text);
    strippedBlocks += 1;
    strippedWords += words;
    return `<!-- article-ops-cure: removed ${tag || "block"} hidden content leak (${words} words) -->`;
  };

  let cured = html.replace(
    /<([a-z0-9-]+)([^>]*(?:hidden|aria-hidden=["']true["']|display\s*:\s*none|visibility\s*:\s*hidden)[^>]*)>([\s\S]*?)<\/\1>/gi,
    stripBlock
  );

  cured = cured.replace(
    /<([a-z0-9-]+)([^>]*(?:data-paid-body|data-premium-body|data-member-body|class=["'][^"']*(?:blurred|paywall-body|premium-body|member-body|locked-content)[^"']*["'])[^>]*)>([\s\S]*?)<\/\1>/gi,
    stripBlock
  );

  cured = cured.replace(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi, (match, body) => {
    const words = countWords(textFromHtml(body));
    if (words < 30) return match;
    strippedBlocks += 1;
    strippedWords += words;
    return `<!-- article-ops-cure: removed article-shaped embedded JSON leak (${words} words) -->`;
  });

  cured = cured.replace(/<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi, (match, body) => {
    const words = countWords(textFromHtml(body));
    if (words < 30) return match;
    strippedBlocks += 1;
    strippedWords += words;
    return `<!-- article-ops-cure: removed article-shaped application JSON leak (${words} words) -->`;
  });

  cured = cured.replace(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/gi, (match, body) => {
    const words = countWords(textFromHtml(body));
    if (words < 30) return match;
    strippedBlocks += 1;
    strippedWords += words;
    return `<!-- article-ops-cure: removed article-shaped app-data leak (${words} words) -->`;
  });

  cured = cured.replace(/<script[^>]*>\s*window\.[A-Za-z0-9_$]+(?:\.[A-Za-z0-9_$]+)?\s*=\s*({[\s\S]*?});?\s*<\/script>/gi, (match, body) => {
    const words = countWords(textFromHtml(body));
    if (words < 30) return match;
    strippedBlocks += 1;
    strippedWords += words;
    return `<!-- article-ops-cure: removed article-shaped client state leak (${words} words) -->`;
  });

  cured = cured.replace(/(<\/body\s*>)/i, [
    "",
    "<script>",
    "  window.articleOpsGate = {",
    "    mode: \"server-authorized-content-only\",",
    "    note: \"Paid/member bodies must not be shipped to unauthorized clients.\"",
    "  };",
    "</script>",
    "$1"
  ].join("\n"));

  return { cured, strippedBlocks, strippedWords };
}

async function makeDisease() {
  if (args.includes("--all")) {
    const targetDir = path.resolve(String(option("--out", path.join("examples", "diseases"))));
    const shouldForceAll = args.includes("--force");
    await mkdir(targetDir, { recursive: true });
    const fixtures = {
      "hidden-dom.html": diseaseHiddenDom(),
      "app-json.html": diseaseAppJson(),
      "client-flag.html": diseaseClientFlag(),
      "blur-overlay.html": diseaseBlurOverlay()
    };
    const files = [];
    for (const [name, html] of Object.entries(fixtures)) {
      const file = path.join(targetDir, name);
      try {
        if (!shouldForceAll) {
          await readFile(file, "utf8");
          throw new Error(`${file} already exists; pass --force to overwrite`);
        }
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      await writeFile(file, html);
      files.push(file);
    }
    return { files };
  }

  const target = path.resolve(String(option("--out", path.join("examples", "disease-gate.html"))));
  const shouldForce = args.includes("--force");
  try {
    if (!shouldForce) {
      await readFile(target, "utf8");
      throw new Error(`${target} already exists; pass --force to overwrite`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  await mkdir(path.dirname(target), { recursive: true });
  const html = diseaseHiddenDom();
  await writeFile(target, html);
  return { file: target };
}

function premiumBody() {
  return "This synthetic paid article body should never be shipped to an unauthorized browser. It exists only to demonstrate the disease locally. A weak implementation sends the full member-only article inside the client and trusts CSS, JavaScript, app state, or overlays to hide it. That is the bug. Automated agents, browser extensions, cached copies, search tools, and accidental exports can still see content that the server should have withheld. The correct fix is server-side authorization: send the public preview first, then return the full body only after the request is authorized.";
}

function diseaseBase(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta name="description" content="Local-only vulnerable gate fixture for defensive demos.">
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 48px auto; line-height: 1.55; }
    .preview { border-left: 4px solid #111; padding-left: 16px; }
    .paywall { margin-top: 24px; padding: 18px; border: 1px solid #aaa; background: #f7f7f7; }
    .locked-content { filter: blur(5px); user-select: none; }
    .overlay { position: absolute; inset: 0; background: rgba(255,255,255,.88); display: grid; place-items: center; }
    .locked-wrap { position: relative; }
  </style>
</head>
<body>
  <main>
    <h1>${title}</h1>
    <p class="preview">This public preview is intentionally short.</p>
    <aside class="paywall">Subscribe to continue. Members only. Unlock this article.</aside>
${body}
  </main>
</body>
</html>
`;
}

function diseaseHiddenDom() {
  return diseaseBase(
    "Disease 1: Hidden DOM Gate",
    `    <section hidden data-paid-body>
      ${premiumBody()}
    </section>`
  );
}

function diseaseAppJson() {
  return diseaseBase(
    "Disease 2: Embedded App JSON Gate",
    `    <script id="__NEXT_DATA__" type="application/json">
      {"props":{"pageProps":{"premiumArticle":{"title":"Embedded App JSON Gate","body":"${premiumBody()}"}}}}
    </script>`
  );
}

function diseaseClientFlag() {
  return diseaseBase(
    "Disease 3: Client Flag Gate",
    `    <script>
      window.__ARTICLE_STATE__ = {"viewer":{"paid":false},"premiumBody":"${premiumBody()}"};
    </script>`
  );
}

function diseaseBlurOverlay() {
  return diseaseBase(
    "Disease 4: Blur Overlay Gate",
    `    <div class="locked-wrap">
      <article class="locked-content" data-premium-body>
        ${premiumBody()}
      </article>
      <div class="overlay">Subscribe to read the full article.</div>
    </div>`
  );
}

async function cureFile(filePath) {
  const source = path.resolve(filePath);
  const target = path.resolve(String(option("--out", source.replace(/(\.[^.]+)?$/, ".cured$1"))));
  const shouldForce = args.includes("--force");
  if (source === target) {
    throw new Error("cure output must be a different file");
  }
  try {
    if (!shouldForce) {
      await readFile(target, "utf8");
      throw new Error(`${target} already exists; pass --force to overwrite`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const raw = await readFile(source, "utf8");
  const before = await auditFile(source);
  const { cured, strippedBlocks, strippedWords } = stripLeakyHiddenContent(raw);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, cured);
  const after = await auditFile(target);
  return { source, target, before, after, strippedBlocks, strippedWords };
}

async function defaultDiseaseFiles() {
  const diseaseDir = path.resolve(path.join("examples", "diseases"));
  try {
    const entries = await readdir(diseaseDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".html") && !entry.name.includes(".cured."))
      .map((entry) => path.join(diseaseDir, entry.name))
      .sort();
  } catch {
    const generated = await makeDisease();
    return generated.files || [generated.file];
  }
}

function riskRank(risk) {
  return { high: 3, medium: 2, low: 1 }[risk] || 0;
}

function markdownTableValue(value) {
  return String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|");
}

function reportMarkdown(results) {
  const sorted = [...results].sort((a, b) => {
    const riskDelta = riskRank(b.risk) - riskRank(a.risk);
    if (riskDelta) return riskDelta;
    return b.hiddenWords - a.hiddenWords;
  });
  const highCount = sorted.filter((result) => result.risk === "high").length;
  const mediumCount = sorted.filter((result) => result.risk === "medium").length;
  const lowCount = sorted.filter((result) => result.risk === "low").length;
  const totalHiddenWords = sorted.reduce((sum, result) => sum + result.hiddenWords, 0);
  const rows = sorted
    .map((result) => [
      path.basename(result.file),
      result.risk.toUpperCase(),
      result.gateStatus,
      result.visibleWords,
      result.hiddenWords,
      result.hiddenBlocks,
      result.blockKinds.join(", ") || "none"
    ].map(markdownTableValue).join(" | "))
    .map((row) => `| ${row} |`)
    .join("\n");

  return [
    "# GateLeak Spear Report",
    "",
    "This report is generated from local spear fixtures or authorized local HTML files. It shows exposure shape only and does not print hidden paid/private body text.",
    "",
    "## Summary",
    "",
    `- Files audited: ${sorted.length}`,
    `- High risk: ${highCount}`,
    `- Medium risk: ${mediumCount}`,
    `- Low risk: ${lowCount}`,
    `- Hidden words detected: ${totalHiddenWords}`,
    "",
    "## Exposure Table",
    "",
    "| File | Risk | Gate | Visible words | Hidden words | Hidden blocks | Block kinds |",
    "| --- | --- | --- | ---: | ---: | ---: | --- |",
    rows || "| none | LOW | public | 0 | 0 | 0 | none |",
    "",
    "## Reproduce",
    "",
    "```bash",
    "node bin/article-ops.mjs disease --all --force",
    "node bin/article-ops.mjs report --out docs/spear-report.md",
    "```",
    "",
    "## Boundary",
    "",
    "Use this on local fixtures, owned sites, or explicitly authorized HTML/build exports. Do not target third-party gated sites or bypass access controls.",
    ""
  ].join("\n");
}

async function writeReport(files) {
  const targets = files.length ? files.map((file) => path.resolve(file)) : await defaultDiseaseFiles();
  const output = path.resolve(String(option("--out", path.join("docs", "spear-report.md"))));
  const results = [];
  for (const file of targets) {
    results.push(await auditFile(file));
  }
  const markdown = reportMarkdown(results);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, markdown);
  return { output, results };
}

function extractLinks(html, baseUrl) {
  const links = new Set();
  for (const match of html.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const normalized = normalizeUrl(match[1], baseUrl);
    if (normalized && !isProbablyAsset(normalized) && !isBlockedUrl(normalized)) {
      links.add(normalized);
    }
  }
  return [...links];
}

function extractFeedUrls(xml, baseUrl) {
  const urls = new Set();
  for (const pattern of [
    /<loc>\s*([^<]+)\s*<\/loc>/gi,
    /<link>\s*([^<]+)\s*<\/link>/gi,
    /<link[^>]+href=["']([^"']+)["'][^>]*>/gi
  ]) {
    for (const match of xml.matchAll(pattern)) {
      const normalized = normalizeUrl(decodeHtml(match[1]), baseUrl);
      if (normalized && !isProbablyAsset(normalized) && !isBlockedUrl(normalized)) {
        urls.add(normalized);
      }
    }
  }
  return [...urls];
}

function classifyGate(url, html = "", fetchError = "") {
  if (fetchError) {
    return {
      status: "blocked",
      reason: fetchError
    };
  }
  if (isBlockedUrl(url)) {
    return {
      status: "private",
      reason: "URL matches account/login/checkout/member path patterns"
    };
  }
  const lower = textFromHtml(html).toLowerCase();
  const loginSignals = [
    "sign in to continue",
    "log in to continue",
    "create an account to continue",
    "please sign in",
    "login required"
  ];
  const paywallSignals = [
    "subscribe to continue",
    "subscribe to read",
    "members only",
    "paid subscribers",
    "become a member",
    "unlock this article",
    "this post is for paid",
    "start your free trial"
  ];
  const blurSignals = [
    "content is hidden",
    "continue reading with",
    "read the full article"
  ];
  if (loginSignals.some((signal) => lower.includes(signal))) {
    return { status: "login", reason: "login-required language detected" };
  }
  if (paywallSignals.some((signal) => lower.includes(signal))) {
    return { status: "paywall", reason: "paid/member-only language detected" };
  }
  if (blurSignals.some((signal) => lower.includes(signal))) {
    return { status: "gated", reason: "partial/hidden-content language detected" };
  }
  return { status: "public", reason: "no common gate language detected" };
}

function slugFor(url, title = "") {
  const parsed = new URL(url);
  const readable = `${parsed.hostname}${parsed.pathname}`
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 8);
  return `${readable || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 72) || "page"}-${hash}`;
}

async function loadIndex() {
  try {
    return JSON.parse(await readFile(path.join(outDir, "index.json"), "utf8"));
  } catch {
    return { generatedAt: new Date().toISOString(), pages: [] };
  }
}

async function saveIndex(index) {
  index.generatedAt = new Date().toISOString();
  index.pages.sort((a, b) => a.title.localeCompare(b.title));
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "index.json"), JSON.stringify(index, null, 2));
  const queue = index.pages
    .map((page) => `- [ ] [${page.title}](${page.markdownPath}) - ${page.url}`)
    .join("\n");
  await writeFile(path.join(outDir, "queue.md"), `# Article-Ops Queue\n\n${queue}\n`);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "article-ops/0.1 public-research-archiver"
    }
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return await response.text();
}

async function allowedByRobots(urlString) {
  if (!checkRobots) return true;
  const url = new URL(urlString);
  const robotsUrl = `${url.origin}/robots.txt`;
  try {
    const robots = await fetchText(robotsUrl);
    const lines = robots.split(/\r?\n/).map((line) => line.trim());
    let applies = false;
    for (const line of lines) {
      if (!line || line.startsWith("#")) continue;
      const [rawKey, ...rest] = line.split(":");
      const key = rawKey.toLowerCase();
      const value = rest.join(":").trim();
      if (key === "user-agent") {
        applies = value === "*" || /article-ops/i.test(value);
      }
      if (applies && key === "disallow" && value && url.pathname.startsWith(value)) {
        return false;
      }
    }
  } catch {
    return true;
  }
  return true;
}

async function savePage(url) {
  if (isBlockedUrl(url)) {
    return { url, skipped: true, reason: "blocked-url-pattern" };
  }
  if (!(await allowedByRobots(url))) {
    return { url, skipped: true, reason: "robots-disallow" };
  }

  const html = await fetchText(url);
  const article = extractArticle(html, url);
  const slug = slugFor(url, article.title);
  const pagesDir = path.join(outDir, "pages");
  await mkdir(pagesDir, { recursive: true });

  const markdownPath = path.join("pages", `${slug}.md`).replaceAll("\\", "/");
  const metadataPath = path.join("pages", `${slug}.json`).replaceAll("\\", "/");
  const markdown = [
    "---",
    `title: ${JSON.stringify(article.title)}`,
    `url: ${JSON.stringify(url)}`,
    `capturedAt: ${JSON.stringify(new Date().toISOString())}`,
    "---",
    "",
    `# ${article.title}`,
    "",
    article.description ? `> ${article.description}\n` : "",
    article.text || "_No readable text extracted._",
    ""
  ].join("\n");

  const metadata = {
    url,
    title: article.title,
    description: article.description,
    capturedAt: new Date().toISOString(),
    wordCount: article.text.split(/\s+/).filter(Boolean).length,
    markdownPath,
    metadataPath
  };

  await writeFile(path.join(outDir, markdownPath), markdown);
  await writeFile(path.join(outDir, metadataPath), JSON.stringify(metadata, null, 2));

  const index = await loadIndex();
  index.pages = index.pages.filter((page) => page.url !== url);
  index.pages.push(metadata);
  await saveIndex(index);

  return { url, saved: true, title: article.title, markdownPath };
}

async function saveImported(filePath) {
  const sourceUrl = option("--source-url", `file://${path.resolve(filePath).replaceAll("\\", "/")}`);
  const titleOverride = option("--title", "");
  const shouldRedact = args.includes("--redact");
  const raw = await readFile(path.resolve(filePath), "utf8");
  const looksHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
  const article = looksHtml
    ? extractArticle(raw, String(sourceUrl))
    : { title: path.basename(filePath), description: "", text: raw.trim() };
  if (titleOverride && titleOverride !== true) {
    article.title = String(titleOverride);
  }
  if (shouldRedact) {
    article.text = redactText(article.text);
    article.description = redactText(article.description);
  }

  const importUrl = String(sourceUrl);
  const slug = slugFor(importUrl, article.title);
  const pagesDir = path.join(outDir, "pages");
  await mkdir(pagesDir, { recursive: true });

  const markdownPath = path.join("pages", `${slug}.md`).replaceAll("\\", "/");
  const metadataPath = path.join("pages", `${slug}.json`).replaceAll("\\", "/");
  const markdown = [
    "---",
    `title: ${JSON.stringify(article.title)}`,
    `url: ${JSON.stringify(importUrl)}`,
    `capturedAt: ${JSON.stringify(new Date().toISOString())}`,
    "captureMode: \"local-import\"",
    `redacted: ${shouldRedact ? "true" : "false"}`,
    "---",
    "",
    `# ${article.title}`,
    "",
    article.description ? `> ${article.description}\n` : "",
    article.text || "_No readable text extracted._",
    ""
  ].join("\n");

  const metadata = {
    url: importUrl,
    sourceFile: path.resolve(filePath),
    title: article.title,
    description: article.description,
    capturedAt: new Date().toISOString(),
    captureMode: "local-import",
    redacted: shouldRedact,
    wordCount: article.text.split(/\s+/).filter(Boolean).length,
    markdownPath,
    metadataPath
  };

  await writeFile(path.join(outDir, markdownPath), markdown);
  await writeFile(path.join(outDir, metadataPath), JSON.stringify(metadata, null, 2));

  const index = await loadIndex();
  index.pages = index.pages.filter((page) => page.url !== importUrl);
  index.pages.push(metadata);
  await saveIndex(index);

  return { saved: true, title: article.title, markdownPath, url: importUrl };
}

async function crawl(startUrl) {
  const start = normalizeUrl(startUrl);
  if (!start) throw new Error("Invalid URL");
  const origin = new URL(start).origin;
  const seen = new Set();
  const queue = [start];
  const results = [];

  while (queue.length && results.length < maxPages) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);

    try {
      const html = await fetchText(current);
      const links = extractLinks(html, current).filter((url) => new URL(url).origin === origin);
      for (const link of links) {
        if (!seen.has(link) && queue.length < maxPages * 3) queue.push(link);
      }
      results.push(await savePage(current));
    } catch (error) {
      results.push({ url: current, skipped: true, reason: error.message });
    }
  }

  return results;
}

async function feed(feedUrl) {
  const normalized = normalizeUrl(feedUrl);
  if (!normalized) throw new Error("Invalid feed URL");
  const xml = await fetchText(normalized);
  const urls = extractFeedUrls(xml, normalized).slice(0, maxPages);
  const results = [];
  for (const url of urls) {
    try {
      results.push(await savePage(url));
    } catch (error) {
      results.push({ url, skipped: true, reason: error.message });
    }
  }
  return results;
}

async function gate(urlString) {
  const normalized = normalizeUrl(urlString);
  if (!normalized) throw new Error("Invalid URL");
  if (!(await allowedByRobots(normalized))) {
    return { url: normalized, status: "blocked", reason: "robots-disallow" };
  }
  try {
    const html = await fetchText(normalized);
    const article = extractArticle(html, normalized);
    return {
      url: normalized,
      ...classifyGate(normalized, html),
      title: article.title,
      description: article.description,
      wordCount: article.text.split(/\s+/).filter(Boolean).length
    };
  } catch (error) {
    return { url: normalized, ...classifyGate(normalized, "", error.message) };
  }
}

function printGate(result) {
  console.log(`${result.status.toUpperCase()} ${result.url}`);
  console.log(`       reason: ${result.reason}`);
  if (result.title) console.log(`       title: ${result.title}`);
  if (typeof result.wordCount === "number") console.log(`       words visible: ${result.wordCount}`);
}

function printAudit(result) {
  console.log(`${result.risk.toUpperCase()} ${result.file}`);
  console.log(`     gate: ${result.gateStatus} (${result.gateReason})`);
  console.log(`     visible words: ${result.visibleWords}`);
  console.log(`     total words: ${result.totalWords}`);
  console.log(`     hidden words: ${result.hiddenWords}`);
  console.log(`     hidden blocks: ${result.hiddenBlocks}`);
  console.log(`     block kinds: ${result.blockKinds.join(", ") || "none"}`);
}

function printDisease(result) {
  if (result.files) {
    console.log("DISEASE fixtures generated");
    for (const file of result.files) {
      console.log(`        ${file}`);
    }
    console.log("        run: article-ops audit <file>");
    return;
  }
  console.log(`DISEASE ${result.file}`);
  console.log("        synthetic leaky gate fixture generated");
  console.log("        run: article-ops audit <file>");
}

function printCure(result) {
  console.log(`CURE ${result.target}`);
  console.log(`     source: ${result.source}`);
  console.log(`     stripped blocks: ${result.strippedBlocks}`);
  console.log(`     stripped hidden words: ${result.strippedWords}`);
  console.log(`     before risk: ${result.before.risk}`);
  console.log(`     after risk: ${result.after.risk}`);
}

function printReport(result) {
  const highCount = result.results.filter((entry) => entry.risk === "high").length;
  console.log(`REPORT ${result.output}`);
  console.log(`       files audited: ${result.results.length}`);
  console.log(`       high risk: ${highCount}`);
}

async function demo() {
  await mkdir(outDir, { recursive: true });
  const sampleUrl = "https://example.com/article-ops-demo";
  const html = `<!doctype html><title>Article-Ops Demo</title><meta name="description" content="A tiny public-page capture demo."><main><h1>Article-Ops Demo</h1><p>This is a local demo page for the research vault.</p><p>It proves Markdown and metadata generation without touching any external site.</p></main>`;
  const article = extractArticle(html, sampleUrl);
  const slug = slugFor(sampleUrl, article.title);
  const pagesDir = path.join(outDir, "pages");
  await mkdir(pagesDir, { recursive: true });
  const markdownPath = path.join("pages", `${slug}.md`).replaceAll("\\", "/");
  const metadataPath = path.join("pages", `${slug}.json`).replaceAll("\\", "/");
  const metadata = {
    url: sampleUrl,
    title: article.title,
    description: article.description,
    capturedAt: new Date().toISOString(),
    wordCount: article.text.split(/\s+/).filter(Boolean).length,
    markdownPath,
    metadataPath
  };
  await writeFile(path.join(outDir, markdownPath), `# ${article.title}\n\n${article.text}\n`);
  await writeFile(path.join(outDir, metadataPath), JSON.stringify(metadata, null, 2));
  await saveIndex({ pages: [metadata] });
  return [{ saved: true, title: article.title, markdownPath }];
}

function printResults(results) {
  for (const result of results) {
    if (result.saved) {
      console.log(`SAVE ${result.title}`);
      console.log(`     ${result.markdownPath}`);
    } else {
      console.log(`SKIP ${result.url}`);
      console.log(`     ${result.reason}`);
    }
  }
}

try {
  if (command === "help" || args.includes("--help")) {
    usage();
  } else if (command === "add") {
    const url = normalizeUrl(args[1]);
    if (!url) throw new Error("Usage: article-ops add <url>");
    printResults([await savePage(url)]);
  } else if (command === "crawl") {
    if (!args[1]) throw new Error("Usage: article-ops crawl <url>");
    printResults(await crawl(args[1]));
  } else if (command === "feed") {
    if (!args[1]) throw new Error("Usage: article-ops feed <url>");
    printResults(await feed(args[1]));
  } else if (command === "gate") {
    if (!args[1]) throw new Error("Usage: article-ops gate <url>");
    printGate(await gate(args[1]));
  } else if (command === "import") {
    if (!args[1]) throw new Error("Usage: article-ops import <file>");
    printResults([await saveImported(args[1])]);
  } else if (command === "audit") {
    if (!args[1]) throw new Error("Usage: article-ops audit <file>");
    printAudit(await auditFile(args[1]));
  } else if (command === "disease") {
    printDisease(await makeDisease());
  } else if (command === "report") {
    printReport(await writeReport(positionalArgs()));
  } else if (command === "cure") {
    if (!args[1]) throw new Error("Usage: article-ops cure <file>");
    printCure(await cureFile(args[1]));
  } else if (command === "demo") {
    const results = await demo();
    if (args.includes("--check")) {
      const index = await loadIndex();
      if (!index.pages.length) throw new Error("demo index is empty");
      console.log(`ok: demo vault generated at ${outDir}`);
    } else {
      printResults(results);
    }
  } else {
    usage();
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`article-ops: ${error.message}`);
  process.exit(1);
}
