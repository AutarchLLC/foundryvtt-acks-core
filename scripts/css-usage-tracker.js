/**
 * Record which selectors of the ACKS stylesheets match the live DOM.
 *
 * Self-contained browser script: injected by the Playwright coverage tour
 * (e2e/tests/css-coverage.spec.mjs), or pasted into the console of a running game.
 *
 *   acksCssUsage.start();     // start recording (done automatically when pasted)
 *   // ...open sheets, dialogs, chat cards...
 *   acksCssUsage.download();  // save acks-css-usage.json
 *
 * Pass the saved file to `node scripts/css-usage.mjs <file>` to list rules that never matched.
 *
 * A selector counts as matched when its element exists, so pseudo-elements and user-action
 * pseudo-classes (`:hover`, `:focus`, ...) are ignored when testing it.
 */
(() => {
  /* global document, MutationObserver, CSSImportRule, CSSStyleRule, CSSKeyframesRule */
  const SHEET_PATH = "/systems/acks/";
  const PSEUDO_ELEMENT = /::[\w-]+(\([^)]*\))?|:(before|after|first-line|first-letter)\b/g;
  const USER_ACTION = /:(hover|focus-within|focus-visible|focus|active|visited)\b/g;

  /**
   * Find the system stylesheets. Foundry v14 loads each with `@import ... layer(system)` from an
   * inline style element.
   * @returns {CSSStyleSheet[]}
   */
  function findSheets() {
    const found = [];
    const visit = (sheet) => {
      if (new URL(sheet.href ?? "about:blank").pathname.startsWith(SHEET_PATH)) found.push(sheet);
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        return;
      }
      for (const rule of rules) {
        if (rule instanceof CSSImportRule && rule.styleSheet) visit(rule.styleSheet);
      }
    };
    for (const sheet of document.styleSheets) visit(sheet);
    return found;
  }

  /**
   * Split a selector list on top-level commas (not those inside `:is()`, `:not()`, ...).
   * @param {string} text
   * @returns {string[]}
   */
  function splitSelectorList(text) {
    const parts = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === "(" || c === "[") depth++;
      else if (c === ")" || c === "]") depth--;
      else if (c === "," && depth === 0) {
        parts.push(text.slice(start, i).trim());
        start = i + 1;
      }
    }
    parts.push(text.slice(start).trim());
    return parts.filter(Boolean);
  }

  /**
   * Resolve nested selectors against their parent rule's selectors. Same as `nestSelectors()` in
   * scripts/css-usage.mjs, so runtime and source selectors compare equal.
   * @param {string[]} selectors  A nested rule's selectors; Chrome serializes them with `&`.
   * @param {string[]} parents    The parent rule's resolved selectors.
   * @returns {string[]}
   */
  function nestSelectors(selectors, parents) {
    return parents.flatMap((p) => selectors.map((s) => (s.includes("&") ? s : `& ${s}`).replaceAll("&", p)));
  }

  /**
   * Collect the selectors of every style rule, including nested rules and rules inside grouping
   * rules (`@layer`, `@media`, `@supports`, ...).
   * @param {CSSRuleList} rules
   * @param {string[]} out
   * @param {string[]|null} parents  Resolved selectors of the enclosing style rule.
   * @returns {string[]}
   */
  function collectSelectors(rules, out = [], parents = null) {
    for (const rule of rules) {
      let inner = parents;
      if (rule instanceof CSSStyleRule) {
        const own = splitSelectorList(rule.selectorText);
        inner = parents ? nestSelectors(own, parents) : own;
        out.push(...inner);
      }
      if (rule.cssRules?.length && !(rule instanceof CSSKeyframesRule)) collectSelectors(rule.cssRules, out, inner);
    }
    return out;
  }

  /**
   * The selector to test against the DOM: without pseudo-elements and user-action states.
   * @param {string} selector
   * @returns {string}
   */
  function matchableSelector(selector) {
    const stripped = selector.replace(PSEUDO_ELEMENT, "").replace(USER_ACTION, "").trim();
    return stripped || "*";
  }

  /**
   * Whether any element matches the selector.
   * @param {string} selector
   * @returns {boolean}
   */
  function matches(selector) {
    for (const candidate of [matchableSelector(selector), selector]) {
      try {
        return !!document.querySelector(candidate);
      } catch {
        // Stripping can leave an invalid selector, e.g. `:not()`; try the original next.
      }
    }
    return false;
  }

  const state = { selectors: null, hits: new Set(), observer: null, timer: null };

  const api = {
    /**
     * Start recording: check now and whenever the DOM changes.
     * @returns {number} Number of selectors tracked.
     */
    start() {
      const sheets = findSheets();
      if (!sheets.length) throw new Error(`No stylesheets under ${SHEET_PATH} found`);
      state.selectors = [...new Set(sheets.flatMap((sheet) => collectSelectors(sheet.cssRules)))];
      api.check();
      state.observer?.disconnect();
      state.observer = new MutationObserver(() => {
        clearTimeout(state.timer);
        state.timer = setTimeout(api.check, 250);
      });
      state.observer.observe(document.body, { childList: true, subtree: true, attributes: true });
      return state.selectors.length;
    },

    /**
     * Test every selector that has not matched yet.
     * @returns {{hit: number, total: number}}
     */
    check() {
      if (!state.selectors) throw new Error("Call acksCssUsage.start() first");
      for (const selector of state.selectors) {
        if (!state.hits.has(selector) && matches(selector)) state.hits.add(selector);
      }
      return { hit: state.hits.size, total: state.selectors.length };
    },

    /** Stop observing DOM changes. */
    stop() {
      state.observer?.disconnect();
      clearTimeout(state.timer);
    },

    /**
     * The recorded hits, in the format scripts/css-usage.mjs reads.
     * @returns {{selectors: {selector: string, hit: boolean}[]}}
     */
    report() {
      api.check();
      return { selectors: state.selectors.map((selector) => ({ selector, hit: state.hits.has(selector) })) };
    },

    /** Save the report as acks-css-usage.json. */
    download() {
      const blob = new Blob([JSON.stringify(api.report(), null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "acks-css-usage.json";
      a.click();
      URL.revokeObjectURL(a.href);
    },
  };

  globalThis.acksCssUsage = api;
  if (!globalThis.acksCssUsageNoAutoStart) api.start();
})();
