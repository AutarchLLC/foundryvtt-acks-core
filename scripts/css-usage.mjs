/**
 * Report which rules in the system stylesheets (`styles` in src/system.json) are still used.
 *
 * Static scan: every class and id a selector requires is looked up in the system sources
 * (templates, modules, compendium HTML) and in Foundry core (`foundry/`, when present). A selector
 * that requires a token found nowhere can never match and is reported as dead.
 *
 * Runtime coverage: hit lists written by scripts/css-usage-tracker.js (the Playwright coverage
 * tour writes css-usage/runtime.json) are merged in, so referenced rules that never matched the
 * live DOM can be reviewed.
 *
 * Usage: node scripts/css-usage.mjs [runtime.json ...]
 * Output: css-usage/report.json and css-usage/report.md
 */
import postcss from "postcss";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { MODULE_PATH, SRC_NAME, styleSources } from "./common.mjs";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "css-usage");
const DEFAULT_RUNTIME = path.join(OUT_DIR, "runtime.json");

const TOKEN_RE = /[A-Za-z_][\w-]*/g;
const STRING_RE = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g;
const CLASS_ATTR_RE = /class=\\?"([^"\\]*)\\?"/g;

/**
 * Where a node is declared: stylesheet path relative to src/, and line.
 * @param {postcss.Node} node
 * @returns {string}
 */
function location(node) {
  const file = path.relative(path.join(ROOT, SRC_NAME), node.source.input.file).replaceAll("\\", "/");
  return `${file}:${node.source.start.line}`;
}

/**
 * Recursively list files under a directory whose names match a filter.
 * @param {string} dir
 * @param {(name: string) => boolean} filter
 * @returns {Promise<string[]>}
 */
async function listFiles(dir, filter) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    // foundry/* are directory junctions, which a recursive readdir does not follow.
    const isDirectory = entry.isDirectory() || (entry.isSymbolicLink() && (await fs.stat(full)).isDirectory());
    if (isDirectory) files.push(...(await listFiles(full, filter)));
    else if (entry.isFile() && filter(entry.name)) files.push(full);
  }
  return files;
}

/**
 * Add every identifier-like token in a text to a set.
 * @param {Set<string>} set
 * @param {string} text
 */
function addTokens(set, text) {
  for (const [token] of text.matchAll(TOKEN_RE)) set.add(token);
}

/**
 * Collect the tokens that may name a class or id, and the prefixes of dynamically built class
 * names (`foo-{{bar}}`, `` `foo-${bar}` ``, `"foo-" + bar`).
 * @returns {Promise<{tokens: Set<string>, prefixes: Set<string>}>}
 */
async function buildCorpus() {
  const tokens = new Set();
  const prefixes = new Set();
  const src = path.join(ROOT, SRC_NAME);

  // System templates: everything, since class lists mix markup and Handlebars.
  for (const file of await listFiles(path.join(src, "templates"), (n) => n.endsWith(".hbs"))) {
    const text = await fs.readFile(file, "utf8");
    addTokens(tokens, text);
    for (const [, prefix] of text.matchAll(/([A-Za-z_][\w-]*[-_])\{\{/g)) prefixes.add(prefix);
  }

  // System modules: string literals only, so identifiers such as `item` or `roll` don't count.
  const modules = await listFiles(src, (n) => n.endsWith(".mjs"));
  for (const file of modules) {
    const text = await fs.readFile(file, "utf8");
    for (const [literal] of text.matchAll(STRING_RE)) addTokens(tokens, literal);
    for (const [, prefix] of text.matchAll(/([A-Za-z_][\w-]*[-_])\$\{/g)) prefixes.add(prefix);
    for (const [, prefix] of text.matchAll(/["'`]([A-Za-z_][\w-]*[-_])["'`]\s*\+/g)) prefixes.add(prefix);
  }

  // Compendium entries: class attributes in stored HTML.
  for (const file of await listFiles(path.join(src, "packs", "_source"), (n) => n.endsWith(".json"))) {
    const text = await fs.readFile(file, "utf8");
    for (const [, classes] of text.matchAll(CLASS_ATTR_RE)) addTokens(tokens, classes);
  }

  // Foundry core, when the reference junctions exist: templates, CSS selectors, JS strings.
  const foundry = path.join(ROOT, "foundry");
  for (const file of await listFiles(foundry, (n) => /\.(hbs|html|css)$/.test(n))) {
    addTokens(tokens, await fs.readFile(file, "utf8"));
  }
  for (const file of await listFiles(foundry, (n) => /\.m?js$/.test(n) && !n.endsWith(".min.js"))) {
    const text = await fs.readFile(file, "utf8");
    for (const [literal] of text.matchAll(STRING_RE)) addTokens(tokens, literal);
  }

  return { tokens, prefixes };
}

/**
 * Normalise selector text so source selectors and CSSOM `selectorText` compare equal.
 * @param {string} selector
 * @returns {string}
 */
export function normalizeSelector(selector) {
  return selector
    .replace(/\s+/g, " ")
    .replace(/\s*([>+~,])\s*/g, "$1")
    .replace(/'/g, '"')
    .replace(/(^|[^:]):(before|after|first-line|first-letter)\b/g, "$1::$2")
    .trim();
}

/**
 * The classes and ids a selector requires to match. Tokens inside attribute selectors and
 * functional pseudo-classes (`:not()`, `:is()`, …) are ignored, as they are not all required.
 * @param {string} selector
 * @returns {{classes: string[], ids: string[]}}
 */
function requiredTokens(selector) {
  let text = selector.replace(/\[[^\]]*\]/g, "");
  // Remove functional pseudo-classes, innermost first.
  while (/:[\w-]+\([^()]*\)/.test(text)) text = text.replace(/:[\w-]+\([^()]*\)/g, "");
  const classes = [...text.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)].map((m) => m[1]);
  const ids = [...text.matchAll(/#(-?[A-Za-z_][\w-]*)/g)].map((m) => m[1]);
  return { classes, ids };
}

/**
 * Load runtime hit lists written by css-usage-tracker.js and union their hits.
 * @param {string[]} files
 * @returns {Promise<Set<string>|null>}  Normalised selectors that matched, or null without data.
 */
async function loadRuntimeHits(files) {
  if (!files.length) return null;
  const hits = new Set();
  for (const file of files) {
    const data = JSON.parse(await fs.readFile(file, "utf8"));
    for (const { selector, hit } of data.selectors ?? []) {
      if (hit) hits.add(normalizeSelector(selector));
    }
  }
  return hits;
}

/**
 * Analyse the stylesheets.
 * @param {postcss.Root} root  All system stylesheets, in load order.
 * @param {{tokens: Set<string>, prefixes: Set<string>}} corpus
 * @param {Set<string>|null} runtimeHits
 */
function analyse(root, corpus, runtimeHits) {
  const prefixes = [...corpus.prefixes];
  const tokenStatus = (token) => {
    if (corpus.tokens.has(token)) return "referenced";
    if (prefixes.some((p) => token.startsWith(p))) return "dynamic";
    return "dead";
  };

  const rules = [];
  const bySelector = new Map();
  const cssText = root.toString();

  root.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && rule.parent.name === "keyframes") return;
    const selectors = rule.selectors.map((selector) => {
      const { classes, ids } = requiredTokens(selector);
      const missing = [...classes, ...ids.map((id) => `#${id}`)].filter(
        (t) => tokenStatus(t.replace(/^#/, "")) === "dead",
      );
      const dynamic = classes.filter((c) => tokenStatus(c) === "dynamic");
      const normalized = normalizeSelector(selector);
      let status = missing.length ? "dead" : dynamic.length ? "dynamic" : "referenced";
      const hit = runtimeHits ? runtimeHits.has(normalized) : null;
      if (hit) status = "used";
      if (!bySelector.has(normalized)) bySelector.set(normalized, []);
      bySelector.get(normalized).push(location(rule));
      return { selector, status, missing, hit };
    });

    const dead = selectors.filter((s) => s.status === "dead").length;
    let status;
    if (dead === selectors.length) status = "dead";
    else if (dead) status = "partial";
    else if (runtimeHits && !selectors.some((s) => s.hit)) status = "unmatched";
    else status = "keep";

    rules.push({
      location: location(rule),
      endLine: rule.source.end.line,
      status,
      selectors,
    });
  });

  // At-rules and custom properties that nothing refers to.
  const unusedAtRules = [];
  root.walkAtRules("keyframes", (at) => {
    // Keyframe names are common words, so only an `animation` declaration counts as a use.
    const used = new RegExp(`animation(-name)?\\s*:[^;]*\\b${at.params}\\b`).test(cssText);
    if (!used) unusedAtRules.push({ location: location(at), name: `@keyframes ${at.params}` });
  });
  root.walkAtRules("font-face", (at) => {
    let family = "";
    at.walkDecls("font-family", (d) => (family = d.value.replace(/["']/g, "")));
    const usedInCss = new RegExp(`font-family\\s*:[^;]*["']?${family}["']?`, "i");
    const declarations = cssText.replace(/@font-face\s*\{[^}]*\}/g, "");
    if (!usedInCss.test(declarations) && !corpus.tokens.has(family)) {
      unusedAtRules.push({ location: location(at), name: `@font-face ${family}` });
    }
  });

  const unusedVariables = [];
  root.walkDecls(/^--/, (decl) => {
    if (!cssText.includes(`var(${decl.prop}`) && !corpus.tokens.has(decl.prop.slice(2))) {
      unusedVariables.push({ location: location(decl), name: decl.prop });
    }
  });

  const duplicates = [...bySelector.entries()]
    .filter(([, lines]) => lines.length > 1)
    .map(([selector, locations]) => ({ selector, locations }));

  return { rules, unusedAtRules, unusedVariables, duplicates };
}

/**
 * Render the analysis as Markdown.
 * @param {ReturnType<typeof analyse>} result
 * @param {boolean} hasRuntime
 * @returns {string}
 */
function renderMarkdown(result, hasRuntime) {
  const { rules, unusedAtRules, unusedVariables, duplicates } = result;
  const count = (status) => rules.filter((r) => r.status === status).length;
  const lines = [
    "# Stylesheet usage report",
    "",
    `Rules: ${rules.length} total, ${count("dead")} dead, ${count("partial")} with dead selectors, ` +
      (hasRuntime ? `${count("unmatched")} referenced but never matched at runtime, ` : "") +
      `${count("keep")} kept.`,
    hasRuntime ? "" : "No runtime data: run the coverage tour to fill in css-usage/runtime.json.",
    "",
  ];

  const section = (title, list, render) => {
    lines.push(`## ${title} (${list.length})`, "");
    for (const item of list) lines.push(render(item));
    lines.push("");
  };
  const ruleLine = (r) => `- ${r.location}–${r.endLine}: \`${r.selectors.map((s) => s.selector).join(", ")}\``;

  section(
    "Dead rules",
    rules.filter((r) => r.status === "dead"),
    (r) =>
      `${ruleLine(r)} — missing ${[...new Set(r.selectors.flatMap((s) => s.missing))].map((t) => `\`${t}\``).join(", ")}`,
  );
  section(
    "Rules with dead selectors",
    rules.filter((r) => r.status === "partial"),
    (r) =>
      [
        `- ${r.location}:`,
        ...r.selectors
          .filter((s) => s.status === "dead")
          .map((s) => `  - \`${s.selector}\` — missing ${s.missing.map((t) => `\`${t}\``).join(", ")}`),
      ].join("\n"),
  );
  if (hasRuntime)
    section(
      "Referenced but never matched",
      rules.filter((r) => r.status === "unmatched"),
      ruleLine,
    );
  section("Unused at-rules", unusedAtRules, (a) => `- ${a.location}: \`${a.name}\``);
  section("Unused custom properties", unusedVariables, (v) => `- ${v.location}: \`${v.name}\``);
  section("Selectors declared more than once", duplicates, (d) => `- \`${d.selector}\` — ${d.locations.join(", ")}`);
  return lines.join("\n");
}

const runtimeFiles = process.argv.slice(2).map((f) => path.resolve(f));
if (!runtimeFiles.length && existsSync(DEFAULT_RUNTIME)) runtimeFiles.push(DEFAULT_RUNTIME);

const manifest = JSON.parse(await fs.readFile(path.join(ROOT, MODULE_PATH), "utf8"));
const root = postcss.root();
for (const src of styleSources(manifest)) {
  const file = path.join(ROOT, SRC_NAME, src);
  root.append(postcss.parse(await fs.readFile(file, "utf8"), { from: file }).nodes);
}
const corpus = await buildCorpus();
if (!existsSync(path.join(ROOT, "foundry"))) {
  console.warn("foundry/ not found: core Foundry classes will be reported as dead. See AGENTS.md.");
}
const runtimeHits = await loadRuntimeHits(runtimeFiles);
const result = analyse(root, corpus, runtimeHits);

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.writeFile(path.join(OUT_DIR, "report.json"), JSON.stringify(result, null, 2));
await fs.writeFile(path.join(OUT_DIR, "report.md"), renderMarkdown(result, !!runtimeHits));

const summary = Object.groupBy(result.rules, (r) => r.status);
console.log(
  `${result.rules.length} rules: ` +
    Object.entries(summary)
      .map(([status, list]) => `${list.length} ${status}`)
      .join(", "),
);
console.log(`Report written to ${path.relative(ROOT, path.join(OUT_DIR, "report.md"))}`);
