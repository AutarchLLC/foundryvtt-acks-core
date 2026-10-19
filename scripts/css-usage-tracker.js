/**
 * Record which selectors of the ACKS stylesheet match the live DOM.
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
  const SHEET_PATH = "systems/acks/acks.css";
  const PSEUDO_ELEMENT = /::[\w-]+(\([^)]*\))?|:(before|after|first-line|first-letter)\b/g;
  const USER_ACTION = /:(hover|focus-within|focus-visible|focus|active|visited)\b/g;

  /**
   * Find the system stylesheet. Foundry v14 loads it with `@import ... layer(system)` from an
   * inline style element, older versions with a link element.
   * @returns {CSSStyleSheet|null}
   */
  function findSheet() {
    const visit = (sheet) => {
      if (sheet.href?.endsWith(SHEET_PATH)) return sheet;
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        return null;
      }
      for (const rule of rules) {
        if (rule instanceof CSSImportRule && rule.styleSheet) {
          const found = visit(rule.styleSheet);
          if (found) return found;
        }
      }
      return null;
    };
    for (const sheet of document.styleSheets) {
      const found = visit(sheet);
      if (found) return found;
    }
    return null;
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
   * Collect the selectors of every style rule, including rules inside grouping rules
   * (`@layer`, `@media`, `@supports`, ...).
   * @param {CSSRuleList} rules
   * @param {string[]} out
   * @returns {string[]}
   */
  function collectSelectors(rules, out = []) {
    for (const rule of rules) {
      if (rule instanceof CSSStyleRule) out.push(...splitSelectorList(rule.selectorText));
      if (rule.cssRules?.length && !(rule instanceof CSSKeyframesRule)) collectSelectors(rule.cssRules, out);
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
      const sheet = findSheet();
      if (!sheet) throw new Error(`Stylesheet ${SHEET_PATH} not found`);
      state.selectors = [...new Set(collectSelectors(sheet.cssRules))];
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
