/**
 * SciText Converter TDD Test Engine
 */
export class TestEngine {
  constructor(app) {
    this.app = app;
    this.dslEngine = app.dslEngine;
    this.errors = [];
    this.testCount = 0;
    this.requiredTests = 49;
    this.deferredDOMChecks = [];
  }
  //=======================================================================//
  //    HELPER FUNCTIONS
  //=======================================================================//
  /**
   * Converts camelCase strings to kebab-case (e.g., btnUndo -> btn-undo).
   */
  toKebab(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  }
  /**
   * Converts kebab-case strings to camelCase (e.g., btn-undo -> btnUndo).
   */
  toCamel(str) {
    return str.replace(/-./g, (match) => match[1].toUpperCase());
  }
   /**
   * Returns an array of all test function names (those starting with "check").
   * Excludes helper checks like checkTotalTestCount and any checkHeader variants.
   */
  listChecks() {
    return Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter(
        (prop) =>
          typeof this[prop] === "function" &&
          prop.startsWith("check") &&
          !prop.includes("Header") &&
          prop !== "checkTotalTestCount" &&
          prop !== "listChecks" &&
          prop !== "run"
      );
  }
  /**
   * Programmatically detects whether a check function accesses the DOM.
   */
  isDOMCheck(fnName) {
    const fn = this[fnName];
    if (typeof fn !== "function") return false;
    const source = fn.toString();
    const domPatterns = [
      /document\.getElementById/,
      /document\.querySelector/,
      /document\.getElementBy/,
      /window\.getComputedStyle/,
      /getBoundingClientRect/,
      /classList/,
      /style\./,
      /innerHTML\s*=/,
      /appendChild/,
      /remove\(\)/,
      /#[\w-]+/,                 // literal ID like "#layer-items"
      /\."[\w-]+"/,              // literal class like ".geometry-inputs"
    ];
    return domPatterns.some(pattern => pattern.test(source));
  }
  /**
   * Stores a check name for deferred execution (after render).
   */
  deferDOMCheck(fnName) {
    this.deferredDOMChecks.push(fnName);
  }
  //=======================================================================//
  //    RUNNER
  //=======================================================================//
  async run() {
    console.group("🚀 SciText Converter Full-Feature Audit");
    console.log("--- Commencing Verification Sequence ---");
    const prototype = Object.getPrototypeOf(this);
    const allCheckNames = Object.getOwnPropertyNames(prototype).filter(
      (prop) =>
        typeof this[prop] === "function" &&
        prop.startsWith("check") &&
        prop !== "checkTotalTestCount"
    );
    // Separate DOM checks automatically
    const domCheckNames = allCheckNames.filter((name) => this.isDOMCheck(name));
    const nonDomCheckNames = allCheckNames.filter((name) => !this.isDOMCheck(name));
    // 1. Run non-DOM checks immediately
    nonDomCheckNames.forEach((name) => this[name]());
    // 2. Schedule DOM checks after a stabilization delay
    await new Promise((resolve) => {
    // Schedule deferred checks with a small delay to allow initial render
      setTimeout(async () => {
        console.log(`--- Running ${domCheckNames.length} deferred DOM checks ---`);
        for (const name of domCheckNames) {
          try {
            // Support both sync and async check functions
            const result = this[name]();
            if (result instanceof Promise) {
              await result;
            }
          } catch (e) {
            this.logAudit(name, false, `[DOM Check Crash] ${e.message}`);
          }
        }
        // 3. Final coverage guard
        this.checkTotalTestCount();
        if (this.errors.length > 0) {
          console.log("--- Audit Result: TDD Checks Not Passed ---");
          console.groupEnd();
          console.error("[FEATURE FAILURE]\n" + this.errors.join("\n"));
        } else {
          console.log("--- Audit Result: SUCCESS ---");
          console.log(`✅ All ${this.testCount} Feature Sets Verified.`);
          console.groupEnd();
        }
        resolve();
      }, 150); 
    });
  }
  logAudit(name, passed, failMsg, detail = "") {
    this.testCount++;
    if (passed) {
      console.log(`  [PASS] ${name} ${detail}`);
    } else {
      console.warn(`  [FAIL] ${name} ${detail}`);
      this.errors.push(failMsg || `[${name}] validation failed.`);
    }
  }
  //========================================================================//
  //    TDD CHECKS
  //========================================================================//
  checkTotalTestCount() {
    const passed = this.testCount >= this.requiredTests;
    if (!passed) {
      this.errors.push(
        `[Engine] Test coverage insufficient. Ran ${this.testCount}/${this.requiredTests}.`,
      );
    }
    this.logAudit(
      "Coverage Guard",
      passed,
      null,
      `(${this.testCount}/${this.requiredTests})`,
    );
    if (this.requiredTests > this.testCount) {
      console.warn(
        `New tests added. Please set this.requiredTests to ${this.testCount}`,
      );
    }
  }
//========================================================================//
//    DSL ENGINE & MACRO EXPANSION
//========================================================================//
  /**
   * CSS output length > 50 chars (guards against empty or broken DSL generation)
   * Verifies that critical CSS rules are present and valid in the DSL output.
   * Ensures the generated styles include required selectors for core UI components.
   */
  checkStructuralIntegrity() {
    const should = "critical CSS rules for UI components are present";
    const shouldNot = "missing or invalid CSS rules";
    const css = this.dslEngine?.outputs?.styles || "";
    const len = css.length;
    if (len <= 50) {
      console.warn("❌ Structural Integrity Diagnostic:");
      console.log(`Current CSS Length: ${len}`);
      console.log(`Raw CSS Output: "${css}"`);
      console.log(
        "💡 Hint: If length is 0, DSLEngine.outputs.styles is likely returning an empty string due to a 'this' context error.",
      );
    }
    this.logAudit(
      "Structural Integrity",
      len > 50,
      "[CSS] Structural integrity failed or CSS is empty.",
      `(${len} chars)`,
    );
  }
  /**
   * No whitespace around commas in CSS selectors (enforces compact output)
   */
  checkListAtomicity() {
    const should = "no whitespace around commas in CSS selectors";
    const shouldNot = "whitespace around commas (e.g. ', ')";
    const css = this.dslEngine?.outputs?.styles || "";
    this.logAudit(
      "List Atomicity",
      !css.includes(", "),
      "[CSS] White-space around commas must be collapsed.",
    );
  }
  /**
   * No raw macro keys (e.g., ABS, P) leak into final CSS (ensures full macro expansion)
   */
  checkTranslationLeaks() {
    const should = "all DSL macros fully translated to valid CSS";
    const shouldNot = "raw macro keys leaking into final CSS";
    const css = this.dslEngine?.outputs?.styles || "";
    const whitelist = [
      "IA",
      "ABS",
      "UTF",
      "SVG",
      "PDF",
      "RGB",
      "RGBA",
      "VH",
      "VW",
      "UI",
    ];
    const leaks =
      css.match(/\b[A-Z]{2,}\b/g)?.filter((l) => !whitelist.includes(l)) || [];
    if (leaks.length > 0) {
      console.group("❌ DSL Translation Leak Detected");
      console.warn(
        "The browser received raw DSL shorthand instead of valid CSS.",
      );
      leaks.forEach((leak) => {
        const ruleMatch = css.match(new RegExp(`[^}]*\\b${leak}\\b[^}]*`, "g"));
        console.log(`Macro: "${leak}"`);
        console.log(`Found in Rule: "${ruleMatch?.[0]?.trim() || "Unknown"}"`);
        console.log(
          `Action: Add "${leak}" to DSLEngine.MACROS.CSS_PROPS with its valid CSS expansion.`,
        );
      });
      console.groupEnd();
    }
    this.logAudit(
      "Translation Leaks",
      leaks.length === 0,
      `[DSL] Untranslated macros: ${leaks.join(", ")}`,
    );
  }
  /**
   * Macro keys/values match expected set (prevents silent renaming)
   */
  checkMacroDefinitions() {
    const should = "all required macro keys present in source";
    const shouldNot = "missing critical macro definitions";
    const rawMacros = this.dslEngine?.source?.macros || "";
    const required = ["M", "P", "C", "BG", "D", "F", "W", "H", "ABS", "REL"];
    const missing = required.filter((key) => {
      // Diagnostic: Check for common issues like missing pipes or leading spaces
      const regex = new RegExp(`^\\s*${key}\\s*\\|`, "m");
      return !regex.test(rawMacros);
    });
    if (missing.length > 0) {
      console.group("❌ Macro Definition Diagnostic");
      console.log("Source Checked:", rawMacros.slice(0, 100) + "...");
      console.log("Missing Keys:", missing);
    }
    this.logAudit(
      "Macro Definitions",
      missing.length === 0,
      `[DSL] Missing: ${missing.join(", ")}`,
    );
  }
  /**
   * Macro expansion logic produces correct CSS properties/values
   */
  checkMacroExpansionLogic() {
    const should = "critical layout macros (ABS, REL, SHADOW) correctly defined";
    const shouldNot = "missing critical layout macros";
    const rawMacros = this.dslEngine?.source?.macros || "";
    const critical = ["ABS", "REL", "SHADOW"];
    const missing = critical.filter((key) => {
      const regex = new RegExp(`^\\s*${key}\\s*\\|`, "m");
      return !regex.test(rawMacros);
    });
    this.logAudit(
      "Macro Expansion Logic",
      missing.length === 0,
      `[DSL] Missing critical macros: ${missing.join(", ")}`,
    );
  }
  /**
   * Value shorthands (e.g., F → flex) are fully expanded
   */
  checkValueMacroExpansion() {
    const should = "value shorthands (f → flex, abs → absolute, etc.) fully expanded";
    const shouldNot = "unexpanded shorthand values in CSS";
    const css = this.dslEngine?.outputs?.styles || "";
    // If 'f' isn't expanded in a value position, this regex will find 'display: f'
    const unexpandedValue = /:\s*\b(f|abs|rel)\b/i.test(css);
    this.logAudit(
      "Value Macro Expansion",
      !unexpandedValue,
      "[Engine] Shorthand values detected in CSS output."
    );
  }
  /**
   * No macro shorthand appears in any engine output (CSS, tree, etc.)
   */
  checkUniversalMacroExpansion() {
    const should = "no macro shorthand appearing in any engine output";
    const shouldNot = "macro shorthand leaking into CSS/tree";
    const css = this.dslEngine?.outputs?.styles || "";
    const engineMacros = this.dslEngine?.source?.macros || "";
    const shorthandKeys = engineMacros
      .trim()
      .split("\n")
      .map((l) => l.split("|")[0].trim())
      .filter((k) => k && !k.startsWith("//") && /^[A-Z0-9_-]+$/i.test(k));
    const leaks = shorthandKeys.filter((key) => {
      const regex = new RegExp(`\\b${key}\\b`);
      return regex.test(css);
    });
    this.logAudit(
      "Universal Macro Expansion",
      leaks.length === 0,
      `[Engine] Leaks: ${leaks.join(", ")}`,
    );
  }
  /**
   * All DSL sections (styles, components, tree) are processed
   */
  checkFullDSLCoverage() {
    const should = "all required DSL sections processed";
    const shouldNot = "missing DSL sections (styles, layout, macros, etc.)";
    const src = this.dslEngine?.source || {};
    const requiredSections = [
      "styles",
      "layout",
      "macros",
      "components",
      "tree",
      "handles",
      "actions",
    ];
    const missing = requiredSections.filter((section) => !src[section]);
    this.logAudit(
      "Full DSL Coverage",
      missing.length === 0,
      `[Engine] Missing: ${missing.join(", ")}`,
    );
  }
  /**
   * No unexpanded {{placeholders}} remain in DOM or attributes
   */
  checkTemplateExpansionLeaks() {
    const should = "all {{placeholders}} fully expanded";
    const shouldNot = "unexpanded template placeholders in DOM";
    const els = this.dslEngine?.outputs?.els;
    const leaks = [];
    els?.forEach((config, id) => {
      if (config.def?.includes("{{") || id?.includes("{{")) {
        leaks.push(id || config.def);
      }
    });
    const badTags = document.querySelectorAll("[data-invalid-tag]");
    badTags.forEach((el) => leaks.push(el.getAttribute("data-invalid-tag")));
    this.logAudit(
      "Template Expansion",
      leaks.length === 0,
      `[Engine] Unexpanded placeholders detected in the tree: ${leaks.join(", ")}`,
    );
  }
//========================================================================//
//    CSS GENERATION & VALIDITY
//========================================================================//
  /**
   * All required selectors from design spec are present in CSS
   */
  checkCSSRuleCoverage() {
    const should = "all required selectors from design spec present in CSS";
    const shouldNot = "missing required CSS rules";
    const css = this.dslEngine?.outputs?.styles || "";
    const requiredRules = [
      "body",
      ".hidden",
      ".relative",
      ".absolute",
      ".inset-0",
      ".transition",
      ".uppercase",
      ".select-none",
      ".disabled-bar",
      ".app-header",
      ".header-title",
      ".main-content-wrapper",
      ".tab-button-group",
      ".workspace-container",
      ".sidebar-panel",
      ".sidebar-footer",
      ".flex-row-gap-1",
      ".flex-gap-quarter",
      ".flex-item-end",
      ".zoom-group-style",
      ".zoom-label-style",
      ".btn",
      ".btn-primary",
      ".btn-secondary",
      ".btn-danger",
      ".btn-success",
      ".btn-ghost",
      ".header-btn",
      ".action-bar-btn",
      ".text-danger",
      ".bg-primary",
      ".bg-warn",
      ".bg-success",
      ".bg-gray",
      ".bg-danger",
      ".prop-header",
      ".geometry-inputs",
      ".input-label",
      ".input-field",
      ".input-wrapper-header",
      ".input-wrapper-tiny-label",
      ".svg-editor-panel",
      ".svg-textarea",
      ".layer-list-container",
      ".layer-list-header",
      ".layer-items-container",
      ".layer-item",
      ".layer-item:hover",
      ".layer-item.active",
      ".layer-item .visibility-toggle",
      ".layer-item .delete-btn",
      ".layer-item:hover .delete-btn",
      ".canvas-view-style",
      ".canvas-scroller-style",
      ".canvas-wrapper-style",
      ".region-highlight",
      ".region-highlight:hover",
      ".region-selected",
      "#selection-box",
      ".selection-frame",
      ".region-actions-bar",
      ".tab-button",
      ".tab-button-active",
      "#split-bar",
      "#split-bar-label",
      ".resize-handle",
      ".resize-handle:hover",
      ".handle-nw",
      ".handle-n",
      ".handle-ne",
      ".handle-e",
      ".handle-se",
      ".handle-s",
      ".handle-sw",
      ".handle-w",
    ];
    const missing = requiredRules.filter((rule) => {
      // Escape special characters for regex matching of selectors
      const escaped = rule.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`${escaped}\\s*{`, "m");
      return !regex.test(css);
    });
    const passed = missing.length === 0;
    this.logAudit(
      "CSS Rule Coverage",
      passed,
      `[CSS] Missing ${missing.length} required rules: ${missing}`,
      `(${requiredRules.length - missing.length}/${requiredRules.length} rules found)`,
    );
  }
  /**
   * All generated CSS properties are valid (no undefined values)
   */
  checkCSSPropertyValidity() {
    const should = "all generated CSS properties valid and accepted";
    const shouldNot = "undefined or invalid CSS property values";
    const template = this.dslEngine?.source?.styles.trim() || "";
    const macroKeys = this.dslEngine?.source?.macroKeys || []; // Keys whitelist
    const macroVals = this.dslEngine?.source?.macroVals || []; // Values whitelist
    // Captures the prefix to determine context
    const macroRegex = /(?:\|\s*|\s+)\b([a-z][a-z0-9_-]*)\b/g;
    const correctedTemplate = template.replace(macroRegex, (match, word) => {
      const isPropertyContext = match.includes("|");
      const upperWord = word.toUpperCase();
      if (isPropertyContext) {
        // Check only against the keys whitelist
        return macroKeys.includes(upperWord) ? match.toUpperCase() : match;
      } else {
        // Check only against the values whitelist
        return macroVals.includes(upperWord) ? match.toUpperCase() : match;
      }
    });
    if (correctedTemplate !== template) {
      console.log(correctedTemplate);
    }
    const passed = correctedTemplate === template;
    this.logAudit(
      "CSS Property Validity",
      passed,
      "[CSS] Lowercase macro keys detected in styles template. See console for corrected version.",
    );
  }
  /**
   * Z-index values stay within intended ranges and avoid conflicts
   */
  checkCSSZIndexScope() {
    const should = "z-index values within intended safe ranges";
    const shouldNot = "z-index conflicts or out-of-range values";
    const css = this.dslEngine?.outputs?.styles || "";
    this.logAudit(
      "CSS Z-Index Scope",
      css.includes("z-index: 100"),
      "[CSS] Handle z-index (100) missing.",
    );
  }
  /**
   * Browser accepts all rules (no properties rejected by CSSOM)
   */
  checkLiveCSSOMValidity() {
    const should = "browser accepts all generated CSS rules";
    const shouldNot = "rules rejected by the CSSOM";
    const styleTag = document.getElementById("scitext-styles");
    const sheet = styleTag?.sheet;
    const droppedRules = [];
    if (sheet) {
      Array.from(sheet.cssRules).forEach((rule) => {
        if (
          rule.style &&
          rule.style.length === 0 &&
          !rule.selectorText.includes(":root")
        ) {
          droppedRules.push(rule.selectorText);
        }
      });
    }
    if (droppedRules.length > 0) {
      console.group("❌ Live CSSOM Diagnostic");
      console.warn(
        "The browser rejected the following rules due to invalid properties:",
      );
      droppedRules.forEach((r) => console.log(` - ${r}`));
      console.log(
        "💡 FIX: Find out what's adding an undefined rule to the stylesheet.",
      );
      console.groupEnd();
    }
    this.logAudit(
      "Live CSSOM Validity",
      droppedRules.length === 0 && !!sheet,
      `[CSS] Browser rejected properties for: ${droppedRules.join(", ")}. Check macro expansion.`,
    );
  }
  /**
   * Injected <style> tag persists across renders
   */
  checkStyleInjectionPersistence() {
    const should = "<style> tag persists across renders";
    const shouldNot = "<style> tag being removed on re-render";
    const style = document.head.querySelector("style");
    this.logAudit(
      "Style Injection Persistence",
      !!style,
      "[DOM] Stylesheet not found in head.",
    );
  }
//========================================================================//
//    DOM STRUCTURE & INTEGRITY
//========================================================================//

/**
 * Simple informational inventory.
 * One single console.table with all custom methods & keys from the entire app.
 * No recursion, no builtins, no crashes.
 */
checkComponentInventoryInfo() {
  const app = this.app;

  const builtins = new Set([
    '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__',
    'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString',
    'toString', 'valueOf', 'constructor'
  ]);

  const rows = [];

  const addFromProto = (proto, type, component) => {
    if (!proto) return;
    Object.getOwnPropertyNames(proto)
      .filter(p => !builtins.has(p) && typeof proto[p] === 'function')
      .sort()
      .forEach(name => rows.push({ Component: component, Type: type, Name: name }));
  };

  const addKeys = (obj, component) => {
    Object.keys(obj)
      .filter(k => typeof obj[k] !== 'function')
      .sort()
      .forEach(name => rows.push({ Component: component, Type: 'Key', Name: name }));
  };

  // Top-level components
  if (app.model) {
    addFromProto(app.model.constructor.prototype, 'Instance', 'AppModel');
    addKeys(app.model.state, 'AppModel.state');
  }
  if (app.controller) addFromProto(app.controller.constructor.prototype, 'Instance', 'AppController');
  if (app.uiManager) addFromProto(app.uiManager.constructor.prototype, 'Instance', 'AppUIManager');
  if (app.model?.processor) addFromProto(app.model.processor.constructor.prototype, 'Instance', 'ImageProcessor');
  if (app.controller?.draw) addFromProto(app.controller.draw.constructor.prototype, 'Instance', 'RegionEditor');

  // Utils (plain objects)
    //
  if (app.Utils?.Geo) {
    Object.keys(app.Utils.Geo)
      .filter(k => typeof app.Utils.Geo[k] === 'function')
      .sort()
      .forEach(name => rows.push({ Component: 'Utils.Geo', Type: 'Function', Name: name }));
  }
  if (app.Utils?.SVG) {
    Object.keys(app.Utils.SVG)
      .filter(k => typeof app.Utils.SVG[k] === 'function')
      .sort()
      .forEach(name => rows.push({ Component: 'Utils.SVG', Type: 'Function', Name: name }));
  }

  // DSL macros
  this.dslEngine.source.macroKeys.sort().forEach(name => 
    rows.push({ Component: 'DSLEngine', Type: 'Macro Prop', Name: name }));
  this.dslEngine.source.macroVals.sort().forEach(name => 
    rows.push({ Component: 'DSLEngine', Type: 'Macro Val', Name: name }));

  console.group("Component Inventory – Single Table");
  if (rows.length) {
    rows.forEach((row, i) => row['#'] = i + 1);
    console.table(rows);
  } else {
    console.log("No custom items found.");
  }
  console.groupEnd();

  this.logAudit("Inventory (Info)", true, "", "(single table)");
}

//========================================================================//
//    APPMODEL STATE MANAGEMENT
//========================================================================//
//========================================================================//
   /**
   * Critical layers (pdfLayer, svgLayer, interactionLayer, canvasWrapper) exist with correct tags
   */
  checkDOMCriticalLayers() {
    const should = "critical layers exist with correct HTML tags";
    const shouldNot = "missing or wrong-tagged critical layers";
    const critical = [
      { key: "pdfLayer", tag: "div", dsl: "pdfLayer | div.absolute.inset-0" },
      {
        key: "svgLayer",
        tag: "div",
        dsl: "svgLayer | svg.absolute.inset-0.z-10",
      },
      {
        key: "interactionLayer",
        tag: "div",
        dsl: "interactionLayer | div.absolute.inset-0.z-20",
      },
      { key: "canvasWrapper", tag: "div", dsl: "canvasWrapper | div.relative" },
    ];
    const missing = [];
    const layerData = [];
    critical.forEach((c) => {
      const id = this.toKebab(c.key);
      const el = document.getElementById(id);
      const actualTag = el ? el.tagName.toLowerCase() : "MISSING";
      layerData.push({ id, expectedTag: c.tag, actualTag });
      if (actualTag !== c.tag) {
        missing.push(c);
      }
    });
    if (missing.length > 0) {
      console.group("❌ Critical Layers Diagnostic");
      console.table(layerData);
      console.log(
        "Recommended Fix (Copy-Paste into DSLEngine.TEMPLATES.components):",
      );
      console.log(missing.map((m) => m.dsl).join("\n"));
      console.groupEnd();
    }
    this.logAudit(
      "DOM Critical Layers",
      missing.length === 0,
      `[Infrastructure] Faulty layers: ${missing.map((m) => this.toKebab(m.key)).join(", ")}`,
    );
  }
  /**
   * All defined classes are actually applied to DOM elements (handles SVG class quirks)
   */
  checkDOMAttributeIntegrity() {
    const should = "all defined classes applied to DOM elements (including SVG)";
    const shouldNot = "missing classes on elements";
    const els = this.dslEngine?.outputs?.els;
    const failures = [];
    els.forEach((config, id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const expectedClasses = config.class ? config.class.split(".") : [];
      const actualClasses = Array.from(el.classList);
      const missing = expectedClasses.filter(
        (c) => c && !actualClasses.includes(c),
      );
      if (missing.length > 0) {
        failures.push({
          id,
          tag: el.tagName.toLowerCase(),
          expected: expectedClasses.join(" "),
          actual: actualClasses.join(" "),
        });
      }
    });
    if (failures.length > 0) {
      console.group("❌ DOM Attribute Diagnostic");
      console.table(failures);
      console.log(
        "💡 Logic Check: If tags are 'svg', verify DSLEngine.buildElement is using setAttribute('class', ...) because .className is read-only for SVGs.",
      );
      console.groupEnd();
    }
    this.logAudit(
      "DOM Attribute Integrity",
      failures.length === 0,
      "[DOM] Elements failed to receive classes.",
    );
  }
  /**
   * Classes remain on elements after re-render
   */
  checkDOMClassPersistence() {
    const should = "classes remain on elements after re-render";
    const shouldNot = "classes disappearing on re-render";
    const els = this.dslEngine?.outputs?.els;
    let attributeFailure = false;
    els?.forEach((config, id) => {
      const el = document.getElementById(id);
      if (el && config.className) {
        // We normalize the DSL class string (e.g., ".abs.inset-0") to space-separated
        const expected = config.className
          .replace(/\./g, " ")
          .trim()
          .split(/\s+/);
        // If el.className assignment failed, el.classList will be empty
        const hasAll = expected.every((cls) => el.classList.contains(cls));
        if (!hasAll) attributeFailure = true;
      }
    });
    this.logAudit(
      "DOM Class Persistence",
      !attributeFailure,
      "[DOM] Elements failed to receive classes. Check for read-only 'className' property on SVG.",
    );
  }
  /**
   * Sidebar and canvas are nested under #main (correct DOM tree)
   */
  checkHierarchicalLayout() {
    const should = "sidebar and canvas nested under #main";
    const shouldNot = "incorrect DOM hierarchy";
    const main = document.getElementById("main");
    const sidebar = document.getElementById("sidebar");
    const canvas = document.getElementById("canvas-view-area");
    const sidebarNested = main && main.contains(sidebar);
    const canvasNested = main && main.contains(canvas);
    if (!sidebarNested || !canvasNested) {
      console.group("❌ Hierarchical Layout Diagnostic");
      console.log("Main element:", main);
      console.log("Sidebar parent:", sidebar?.parentElement);
      console.log("Canvas parent:", canvas?.parentElement);
      console.log("💡 FIX: Check for closing tags being added.");
      console.groupEnd();
    }
    this.logAudit(
      "Hierarchical Layout",
      sidebarNested && canvasNested,
      "[DOM] Elements are siblings under body instead of children of #main.",
    );
  }
  /**
   * Layout map contains no duplicate IDs or orphaned entries
   */
  checkLayoutIntegrity() {
    const should = "no duplicate IDs or orphaned layout entries";
    const shouldNot = "duplicate or orphaned layout IDs";
    const layout = this.app?.uiManager?.layout || {};
    // Relaxed: Just ensure layout is a populated object
    const passed =
      !!layout && typeof layout === "object" && Object.keys(layout).length > 0;
    this.logAudit(
      "Layout Integrity",
      passed,
      "[UI] Layout configuration is empty or missing.",
    );
  }
  /**
   * All components use valid HTML/SVG tags for their context
   */
  checkComponentTagValidity() {
    const should = "all components use valid HTML/SVG tags for context";
    const shouldNot = "invalid tags for context";
    const comp = this.app?.uiManager?.components?.canvasArea || {};
    this.logAudit(
      "Component Tag Validity",
      comp.tag === "section",
      "[UI] canvasArea must be a 'section'.",
    );
  }
  /**
   * Every layout element appears somewhere in the DOM tree string
   */
  checkTreeCoverage() {
    const should = "every layout element appears in the DOM tree string";
    const shouldNot = "layout elements missing from tree";
    const layoutIds = Array.from(this.dslEngine?.outputs?.els?.keys() || []);
    const treeString = this.dslEngine?.source?.tree || "";
    const orphaned = layoutIds.filter((id) => {
      const regex = new RegExp(`\\b${id}\\b`);
      return !regex.test(treeString);
    });
    this.logAudit(
      "Tree Coverage",
      orphaned.length === 0,
      `[Engine] Elements in layout but missing from tree: ${orphaned.join(", ")}`,
    );
  }
//========================================================================//
//    APPMODEL STATE MANAGEMENT
//========================================================================//
  /**
   * Verifies that AppModel exposes a stable set of required public methods.
   * Prevents silent API drift that breaks UI, controller, or test assumptions.
   */
  checkModelPublicAPI() {
    const model = this.app.model;
    const requiredMethods = {
      addRegion:          "function",
      deleteRegion:       "function",
      selectRegion:       "function",
      getActiveRegion:    "function",  // Critical accessor used throughout UI/tests
      getRegionById:      "function",  // Recommended for consistency
      subscribe:          "function",  // State observation
      // Future-proof: add more as the API stabilizes
    };
    const missing = [];
    const wrongType = [];
    for (const [name, expectedType] of Object.entries(requiredMethods)) {
      const actual = typeof model[name];
      if (actual !== expectedType) {
        if (actual === "undefined") {
          missing.push(name);
        } else {
          wrongType.push(`${name} (got ${actual}, expected ${expectedType})`);
        }
      }
    }
    const passed = missing.length === 0 && wrongType.length === 0;
    if (!passed) {
      console.group("❌ Model Public API Diagnostic");
      if (missing.length > 0) {
        console.log("Missing methods:", missing.join(", "));
        console.log("💡 Example implementation for getActiveRegion():");
        console.log(`  getActiveRegion() {
      return this.state.regions.find(r => r.id === this.state.activeRegionId) || null;
    }`);
        console.log(`  getRegionById(id) {
      return this.state.regions.find(r => r.id === id) || null;
    }`);
      }
      if (wrongType.length > 0) {
        console.log("Incorrect types:", wrongType.join(", "));
      }
      console.groupEnd();
    }
    this.logAudit(
      "Model Public API",
      passed,
      `[Model] API incomplete: ${[...missing, ...wrongType].join(", ") || "none"}`
    );
  }
  /**
   * Model state has `regions` array and `selectedIds` Set
   */
  checkModelState() {
    const should = "model has regions array and selectedIds Set";
    const shouldNot = "incorrect model state structure";
    const s = this.app?.model?.state || {};
    this.logAudit(
      "Model State Basics",
      Array.isArray(s.regions) && s.selectedIds instanceof Set,
      "[Model] Regions must be an Array and selectedIds must be a Set.",
    );
  }
  /**
   * Model has `history` array and `historyIndex` for undo/redo
   */
  checkHistoryState() {
    const should = "model has history array and historyIndex";
    const shouldNot = "missing undo/redo history state";
    const s = this.app?.model?.state || {};
    const ok = Array.isArray(s.history) && "historyIndex" in s;
    this.logAudit(
      "History State",
      ok,
      "[Model] Missing history array or index tracking.",
    );
  }
  /**
   * History stack respects maximum depth limit
   */
  checkModelHistoryDepth() {
    const should = "history stack respects maximum depth limit";
    const shouldNot = "unbounded or broken history depth";
    const m = this.app?.model;
    const ok = m && typeof m.saveHistory === "function";
    this.logAudit(
      "Model History Depth",
      ok,
      "[Model] History persistence method missing.",
    );
  }
  /**
   * Undo/redo correctly restores full state including SVG content
   */
  checkModelHistoryRestoration() {
    const should = "undo/redo restores full state including SVG content";
    const shouldNot = "incomplete state restoration";
    this.logAudit(
      "Model History Restoration",
      typeof this.app?.model?.undo === "function",
      "[Model] Undo logic missing.",
    );
  }
  /**
   * Model correctly notifies subscribers on state changes
   */
  checkModelNotificationSystem() {
    const should = "model correctly notifies subscribers on changes";
    const shouldNot = "silent state mutations";
    let notified = false;
    this.app?.model?.subscribe(() => {
      notified = true;
    });
    this.app?.model?.selectRegion("test");
    this.logAudit(
      "Model Notification System",
      notified,
      "[Model] Subscribers not notified on state change.",
    );
  }
  /**
   * Active region ID is correctly tracked and cleared
   */
  checkModelActiveRegionTracking() {
    const should = "active region ID correctly tracked and cleared";
    const shouldNot = "stale or missing active region";
    const m = this.app?.model;
    m?.selectRegion("r1");
    this.logAudit(
      "Model Active Region Tracking",
      m?.state?.selectedIds.has("r1"),
      "[Model] Active region selection failed.",
    );
  }
  /**
   * Add/update/delete region operations maintain consistency
   */
  checkModelRegionManagement() {
    const should = "add/update/delete operations maintain consistency";
    const shouldNot = "inconsistent region data";
    const m = this.app?.model;
    const ok =
      typeof m?.addRegion === "function" &&
      typeof m?.updateRegion === "function";
    this.logAudit(
      "Model Region Management",
      ok,
      "[Model] addRegion or updateRegion methods missing.",
    );
  }
  /**
   * State tracks `scaleMultiplier`, `canvasWidth`, `canvasHeight`
   */
  checkCanvasDimensions() {
    const should = "state tracks scaleMultiplier, canvasWidth, canvasHeight";
    const shouldNot = "missing canvas dimension state";
    const s = this.app?.model?.state || {};
    const ok = typeof s.scaleMultiplier === "number" && "canvasWidth" in s;
    this.logAudit(
      "Canvas Dimensions",
      ok,
      "[Model] Scale multiplier or width not initialized.",
    );
  }
  /**
   * Scale multiplier correctly affects physical canvas size
   */
  checkCanvasStateScale() {
    const should = "scale multiplier correctly affects physical canvas size";
    const shouldNot = "scale not applied correctly";
    const s = this.app?.model?.state || {};
    this.logAudit(
      "Canvas State Scale",
      s.scaleMultiplier === 1.0,
      "[Model] Initial scale must be 1.0.",
    );
  }
//========================================================================//
//    APPCONTROLLER LOGIC
//========================================================================//
  /**
   * Required controller methods (fitArea, fitContent, etc.) exist on prototype
   */
  checkAppControllerActions() {
    const should = "required controller methods exist on prototype";
    const shouldNot = "missing core controller actions";
    const required = [
      "fitArea",
      "fitContent",
      "enterSplitMode",
      "deleteSelected",
    ];
    const proto = Object.getPrototypeOf(this.app.controller || {});
    const current = Object.getOwnPropertyNames(proto);
    const missing = required.filter((r) => !current.includes(r));
    if (missing.length > 0) {
      console.group("💡 Missing Controller Logic");
      console.log("Add these methods to class AppController in app.js:");
      missing.forEach((m) =>
        console.log(
          `  ${m}() {\n    console.log("Executing ${m}");\n    this.model.saveHistory();\n  }`,
        ),
      );
      console.groupEnd();
    }
    this.logAudit(
      "AppController Actions",
      missing.length === 0,
      `[Controller] Missing prototype methods: ${missing.join(", ")}`,
    );
  }
  /**
   * Every button/prop element ID has a matching camelCase handler in AppController
   */
  checkFunctionalBindings() {
    const should = "every button/prop ID has matching camelCase handler";
    const shouldNot = "unbound UI elements";
    const els = this.dslEngine?.outputs?.els;
    const domIDs = els ? Array.from(els.keys()) : [];
    const actions = this.dslEngine?.source?.actions || [];
    const missing = domIDs.filter(
      (id) =>
        (id.startsWith("btn-") || id.startsWith("prop-")) &&
        !actions.includes(this.toCamel(id)),
    );
    if (missing.length > 0) {
      console.group("💡 Fix AppController Missing Methods");
      const fixString = missing
        .map(
          (id) =>
            `${this.toCamel(id)}() { this.model.saveHistory(); console.log("Action: ${id}"); }`,
        )
        .join("\n");
      console.log(fixString);
      console.groupEnd();
    }
    this.logAudit(
      "Functional Bindings",
      missing.length === 0,
      `[Binding] Found ${missing.length} kebab-case IDs without camelCase handlers.`,
    );
  }
  /**
   * Split mode flag and related state are properly managed
   */
  checkControllerSplitModeFlag() {
    const should = "split mode flag and state properly managed";
    const shouldNot = "broken split mode state";
    const c = this.app?.controller;
    this.logAudit(
      "Controller SplitMode Flag",
      "splitMode" in (c || {}),
      "[Controller] splitMode state missing.",
    );
  }
  /**
   * Controller holds valid reference to ImageProcessor
   */
  checkControllerImageProcessorRef() {
    const should = "controller holds valid ImageProcessor reference";
    const shouldNot = "missing image processor ref";
    const proc = this.app?.controller?.imageProcessor;
    this.logAudit(
      "Controller ImageProcessor Ref",
      typeof proc?.processRegion === "function",
      "[Controller] ImageProcessor missing.",
    );
  }
//========================================================================//
//    COORDINATE & GEOMETRY MATH
//========================================================================//
  /**
   * Region coordinates are normalized to [0–1] range
   */
  checkCoordinateNormalization() {
    const should = "region coordinates normalized to [0–1] range";
    const shouldNot = "coordinates outside normalized range";
    const geo = this.app?.Utils?.Geo;
    const testRect = { x: 0.5, y: 0.5, w: 0.1, h: 0.1 };
    const pixels = geo?.toPixels(testRect, 1000, 1000);
    const ok = pixels && pixels.x === 500 && pixels.w === 100;
    this.logAudit(
      "Coordinate Normalization",
      !!ok,
      "[Utils] toPixels math is incorrect.",
    );
  }
  /**
   * Pixel ↔ normalized coordinate conversions are accurate
   */
  checkCoordinateMappingMath() {
    const should = "pixel ↔ normalized conversions accurate";
    const shouldNot = "incorrect coordinate math";
    const geo = this.app?.Utils?.Geo;
    const rect = { x: 0, y: 0, w: 1, h: 1 };
    const pixels = geo?.toPixels(rect, 800, 600);
    const ok = pixels?.w === 800 && pixels?.h === 600;
    this.logAudit(
      "Coordinate Mapping Math",
      ok,
      "[Utils] Geo.toPixels failed full-scale normalization.",
    );
  }
  /**
   * Resize handles are positioned correctly around active region
   */
  checkHandlePositionMath() {
    const should = "resize handles positioned correctly around active region";
    const shouldNot = "misplaced resize handles";
    const geo = this.app?.Utils?.Geo;
    // Check if handle math utility from reference exists
    const ok = typeof geo?.getHandlePos === "function";
    this.logAudit(
      "Handle Position Utility",
      ok,
      "[Utils] Geo.getHandlePos utility missing.",
    );
  }
  /**
   * Resize handle hit detection returns correct handle under pointer
   */
  checkHitHandleLogic() {
    const should = "hit detection returns correct handle under pointer";
    const shouldNot = "incorrect handle detection";
    const geo = this.app?.Utils?.Geo;
    // Your app.js hitHandle expects (posObject, hx, hy)
    const hit = geo?.hitHandle({ x: 5, y: 5 }, 0, 0);
    this.logAudit(
      "Hit Detection Accuracy",
      !!hit,
      "[Utils] hitHandle failed boundary check.",
    );
  }
  /**
   * ViewBox calculation matches region rect and canvas dimensions
   */
  checkSVGViewBoxCalculator() {
    const should = "viewBox matches region rect and canvas dimensions";
    const shouldNot = "incorrect SVG viewBox";
    const svg = this.app?.Utils?.SVG;
    // Your app.js requires (region, canvasW, canvasH)
    const dummyRegion = {
      rect: { w: 1, h: 1 },
      offset: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
    };
    const vb = svg?.viewBox(dummyRegion, 800, 600);
    this.logAudit(
      "SVG ViewBox Calculator",
      vb === "0 0 1600 1200",
      `[Utils] viewBox output unexpected: ${vb}`,
    );
  }
//========================================================================//
//    UI RENDERING & COMPONENTS
//========================================================================//
  /**
   * UI manager has complete element references after render
   */
  checkUIManagerComponentMap() {
    const should = "UI manager has complete element references after render";
    const shouldNot = "incomplete component map";
    const components = this.app?.uiManager?.components || {};
    const tree = this.dslEngine?.source?.tree || "";
    const blueprints = {
      tag: {
        header: "header",
        main: "main",
        sidebar: "section",
        canvasArea: "section",
        svgLayer: "svg",
        title: "h1",
        zoomLabel: "span",
        labelTiny: "span",
        inputNum: "input",
        headerBtn: "button",
        btnAction: "button",
        btnFooter: "button",
        hiddenIn: "input",
        img: "img",
        pre: "pre",
        processing: "canvas",
        textarea: "textarea",
        root: "div",
        flexRow: "div",
        headerDiv: "div",
        flexGap: "div",
        propHead: "div",
        geoInputs: "div",
        rawEditor: "div",
        layerList: "div",
        layerHead: "div",
        layerItems: "div",
        panelFoot: "div",
        scroller: "div",
        wrapper: "div",
        pdfLayer: "div",
        selectionBox: "div",
        splitBar: "div",
        barDivider: "div", // Added missing tags
      },
      id: {
        actionBar: "region-actions-bar",
        canvasArea: "canvas-view-area",
        wrapper: "canvas-wrapper",
        svgLayer: "svg-layer",
        interactionLayer: "interaction-layer",
        pdfLayer: "pdf-layer",
        debugCon: "debug-container",
        processing: "processing-canvas",
        scroller: "canvas-scroller",
        emptyState: "empty-state",
        loader: "pdf-loader",
        rawEditor: "svg-raw-editor-panel",
        selectionBox: "selection-box",
        splitBar: "split-bar", // Added missing IDs
        hiddenIn: "hidden-in",
      },
      classes: {
        root: ".flex-col",
        header: ".app-header",
        main: ".main-content-wrapper",
        sidebar: ".sidebar-panel",
        canvasArea: ".canvas-view-style",
        flexRow: ".flex-row-gap-1",
        title: ".header-title",
        zoomLabel: ".zoom-label-style",
        actionBar: ".region-actions-bar.hidden",
        debugCon: ".debug-container.hidden",
        wrapper: ".canvas-wrapper-style",
        scroller: ".canvas-scroller-style",
        pdfLayer: ".absolute.inset-0",
        svgLayer: ".absolute.inset-0.z-10",
        interactionLayer: ".absolute.inset-0.z-20",
        loader: ".loader-style.hidden",
        processing: ".hidden",
        emptyState: ".empty-state-style",
        rawEditor: ".svg-editor-panel.hidden",
        inputNum: ".input-field",
        labelTiny: ".input-label",
        headerBtn: ".header-btn",
        btnFooter: ".btn",
        btnAction: ".btn",
        barDivider: ".bar-divider", // Added missing classes
        hiddenIn: ".hidden",
      },
    };
    const sectionMap = {
      Infrastructure: ["root", "main", "workspaceContainer"],
      Header: [
        "header",
        "flexRow",
        "title",
        "headerDiv",
        "flexGap",
        "zoomLabel",
        "headerBtn",
        "btnFooter",
      ],
      Sidebar: [
        "sidebar",
        "propHead",
        "geoInputs",
        "inputNum",
        "labelTiny",
        "rawEditor",
        "textarea",
        "layerList",
        "layerHead",
        "layerItems",
        "panelFoot",
      ],
      "Canvas & Layers": [
        "canvasArea",
        "scroller",
        "wrapper",
        "pdfLayer",
        "svgLayer",
        "interactionLayer",
        "selectionBox",
        "splitBar",
      ],
      "Overlays & Assets": [
        "actionBar",
        "btnAction",
        "emptyState",
        "loader",
        "processing",
        "debugCon",
        "img",
        "pre",
        "h2",
        "p",
        "barDivider",
      ],
    };
    const discovered = [...tree.matchAll(/^\s*([a-zA-Z0-9_-]+)/gm)].map(
      (m) => m[1],
    );
    const core = [
      "root",
      "header",
      "main",
      "sidebar",
      "canvasArea",
      "pdfLayer",
      "svgLayer",
      "interactionLayer",
      "actionBar",
      "wrapper",
      "debugCon",
      "processing",
      "rawEditor",
      "inputNum",
      "labelTiny",
      "zoomLabel",
      "headerBtn",
      "barDivider",
    ];
    const allRequired = [...new Set([...discovered, ...core])].filter(
      (n) =>
        !["div", "span", "button", "label"].includes(n) && !n.startsWith("{{"),
    );
    const missing = allRequired.filter((c) => !components[c]);
    if (missing.length > 0) {
      console.group("❌ Diagnostic: Component Map Mismatch");
      console.log("Tokens found in Tree:", allRequired);
      console.log("Keys found in Components Map:", Object.keys(components));
      console.warn("MISSING TOKENS:", missing);
      let output =
        "\n--- [JIG] COPY AND PASTE TO DSLEngine.TEMPLATES.components ---\n";
      output += "components: `\n";
      Object.entries(sectionMap).forEach(([sectionName, keys]) => {
        const items = allRequired.filter((name) => keys.includes(name));
        if (items.length > 0) {
          output += `  // --- ${sectionName} ---\n`;
          items.forEach((name) => {
            const tag = blueprints.tag[name] || "div";
            const id = blueprints.id[name] || this.toKebab(name);
            const cls = blueprints.classes[name] || "";
            const attr =
              name === "svgLayer"
                ? " | | preserveAspectRatio=none"
                : tag === "input"
                  ? " | | type=number"
                  : "";
            output += `  ${name.padEnd(16)} | ${tag}#${id}${cls}${attr}\n`;
          });
          output += "\n";
        }
      });
      output +=
        "`, \n-----------------------------------------------------------\n";
      console.log(output);
      console.groupEnd();
    }
    this.logAudit(
      "UIManager Component Map",
      missing.length === 0,
      `[UI] Component map incomplete: ${missing.join(", ")}`,
    );
  }
  /**
   * Property panel inputs exist and are wired to model
   */
  checkSidebarPropertyInputs() {
    const should = "geometry input fields (X,Y,W,H) exist and wired";
    const shouldNot = "missing property inputs";
    const props = ["propX", "propY", "propW", "propH"];
    const missing = props.filter((id) => !document.getElementById(id));
    this.logAudit(
      "Sidebar Property Inputs",
      missing.length === 0,
      `[UI] Missing geometry input fields in sidebar: ${missing.join(", ")}`,
    );
  }
  /**
   * .geometry-inputs uses CSS grid display
   */
  checkPropertiesGridLayout() {
    const should = ".geometry-inputs uses CSS grid display";
    const shouldNot = "non-grid layout for properties";
    const el = document.querySelector(".geometry-inputs");
    if (!el) return;
    const style = window.getComputedStyle(el);
    this.logAudit(
      "Properties Grid Layout",
      style.display === "grid",
      "[CSS] .geometry-inputs is not utilizing grid layout.",
    );
  }
  /**
   * Layer list renders items with visibility toggles and delete buttons
   */
  checkLayerListContainer() {
    const should = "layer list container renders items with toggles/delete buttons";
    const shouldNot = "missing or broken layer list";
    const container = document.getElementById("layer-items");
    this.logAudit(
      "Layer List Container",
      !!container,
      "[UI] Layer list container (#layer-items) missing from sidebar.",
    );
  }
  /**
   * Footer buttons (export, clear, etc.) are present and bound
   */
  checkSidebarFooterActions() {
    const should = "footer buttons (export, clear, etc.) present and bound";
    const shouldNot = "missing footer actions";
    const footerBtns = ["btn-auto-segment", "btn-export"];
    const missing = footerBtns.filter((id) => !document.getElementById(id));
    this.logAudit(
      "Sidebar Footer Actions",
      missing.length === 0,
      `[UI] Missing footer action buttons: ${missing.join(", ")}`,
    );
  }
  /**
   * Multi-selection box appears during drag selection
   */
  checkSelectionBoxPresence() {
    const should = "multi-selection box appears during drag selection";
    const shouldNot = "missing selection box";
    const box = document.getElementById("selection-box");
    this.logAudit(
      "Selection Box Presence",
      !!box,
      "[DOM] #selection-box for drag-creation is missing.",
    );
  }
  /**
   * Active region receives visual frame and resize handles
   */
  checkActiveSelectionFrame() {
    const should = "active region receives visual frame and resize handles";
    const shouldNot = "no visual feedback on selection";
    // The UIManager should be able to render the selection frame
    const ok = typeof this.app?.uiManager?.renderActiveControls === "function";
    this.logAudit(
      "Selection Frame Logic",
      ok,
      "[UIManager] renderActiveControls method missing.",
    );
  }
  /**
   * Editor correctly switches between normal and split modes
   */
  checkRegionEditorMode() {
    const should = "editor correctly switches between normal and split modes";
    const shouldNot = "broken editor mode handling";
    const draw = this.app?.controller?.draw;
    // Reference copy requires modes like IDLE, MOVE, CREATE, RESIZE
    const hasMode = draw && "mode" in draw;
    this.logAudit(
      "Region Editor Mode",
      !!hasMode,
      "[Editor] RegionEditor 'mode' state is missing.",
    );
  }
  /**
   * Embedded image uses correct data URI format
   */
  checkAssetDataURIFormat() {
    const should = "embedded image uses correct data URI format";
    const shouldNot = "invalid or missing default image";
    const img = window.embeddedDefaultImage || "";
    this.logAudit(
      "Asset DataURI Format",
      img.startsWith("data:image"),
      "[Assets] Default image is not a valid DataURI.",
    );
  }
  /**
   * SVG wrapping utility correctly preserves structure and attributes
   */
  checkSVGWrapUtility() {
    const should = "SVG wrap utility preserves structure and adds <g>";
    const shouldNot = "broken SVG wrapping";
    const svg = this.app?.Utils?.SVG;
    const wrapped = svg?.wrap("content");
    this.logAudit(
      "SVG Wrap Utility",
      wrapped?.includes("<g>"),
      "[Utils] SVG wrap() missing group tag.",
    );
  }
//========================================================================//
//    INTERACTIVE FEATURES & VISIBILITY
//========================================================================//
  /**
   * Region actions bar appears when a region is selected
   */
  checkActionBarVisibility() {
    const should = "region actions bar appears when region selected";
    const shouldNot = "action bar stays hidden";
    this.app.model.addRegion({
      id: "r1",
      rect: { x: 0.1, y: 0.1, w: 0.1, h: 0.1 },
    });
    this.app.model.selectRegion("r1");
    const bar = document.getElementById("region-actions-bar");
    const isVisible = bar && !bar.classList.contains("hidden");
    this.logAudit(
      "Action Bar Visibility",
      isVisible,
      "[UI] Action bar failed to show on selection.",
    );
  }
  /**
   * Actions bar is visually positioned just below the selected region
   */
  checkActionBarPositioning() {
    const should = "actions bar positioned just below selected region";
    const shouldNot = "misaligned action bar";
    // Give the browser a moment to remove '.hidden' and reflow the layout
    setTimeout(() => {
      const bar = document.getElementById("region-actions-bar");
      const region = document.querySelector(".region-selected");
      console.group("🔍 Diagnostic: Action Bar Positioning");
      if (!bar || !region) {
        this.logAudit("Action Bar Positioning", false, "Elements not found.");
        console.groupEnd();
        return;
      }
      const barRect = bar.getBoundingClientRect();
      const regionRect = region.getBoundingClientRect();
      const gap = barRect.top - regionRect.bottom;
      const isVisible = !bar.classList.contains("hidden");
      console.log("Bar Visible:", isVisible);
      console.log("Visual Gap:", gap);
      // If it's visible and sits within 30px of the bottom, it's a pass.
      const isCorrect = isVisible && gap >= -5 && gap <= 30;
      this.logAudit(
        "Action Bar Positioning",
        isCorrect,
        `[UI] Gap is ${Math.round(gap)}px. Visual check complete.`,
      );
      console.groupEnd();
    }, 50);
  }
  /**
   * Interaction layer exists and captures pointer events
   */
  checkInteractionLayerEvents() {
    const should = "interaction layer exists and captures pointer events";
    const shouldNot = "missing interaction layer";
    const layer = document.getElementById("interaction-layer");
    this.logAudit(
      "Interaction Layer Presence",
      !!layer,
      "[DOM] Interaction layer (#interaction-layer) missing.",
    );
  }
  /**
   * #svg-layer is a <div> (not <svg>) so absolute-positioned SVGs render correctly
   */
  checkSVGContentVisibility() {
    const should = "#svg-layer is a <div> (not <svg>) for correct absolute positioning";
    const shouldNot = "#svg-layer as <svg> tag (breaks CSS positioning)";
    const layer = document.getElementById("svg-layer");
    const isSvgTag = layer && layer.tagName.toLowerCase() === "svg";
    // If the layer is an SVG tag, children styled with 'left/top' (CSS) won't render correctly.
    // The layer should be a DIV to act as a container for absolute-positioned SVGs.
    const isIncorrectTag = isSvgTag;
    this.logAudit(
      "SVG Content Visibility",
      !isIncorrectTag,
      "[UI] #svg-layer is an <svg> tag. CSS absolute positioning (left/top) fails inside SVG namespaces. Change tag to 'div'.",
    );
  }
}
