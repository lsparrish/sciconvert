/*
 * SciText Digitizer
 * Architecture:
 * 1. CONFIG & SHARED CONSTANTS
 * 2. SciTextUI (View Schema, Styles, & Builder)
 * 3. Utils (Geometry & SVG Helpers)
 * 4. SciTextModel (State Management)
 * 5. ImageProcessor (Computer Vision Logic)
 * 6. RegionEditor (Canvas Interaction)
 * 7. SciTextController (Orchestration)
 * 8. UIManager (View Bridge)
 * 9. Bootstrap
 */

// ============================================================================
// 1. CONFIG & SHARED CONSTANTS
// ============================================================================

const CONFIG = {
  defaultImgUrl: "https://lsparrish.github.io/sciconvert/sample.png",
  localImgPath: "./sample.png",
  aiScale: 2.0,
};

const apiKey = ""; // Injected by environment

// ============================================================================
// 2. SciTextUI (SCHEMA, STYLES, BUILDER)
// ============================================================================

class SciTextUI {
  // ==========================================================================
  // 1. ENGINE (PARSERS & LOGIC)
  // ==========================================================================

  static parseConfigList(keys, dsl) {
    return dsl
      .trim()
      .split("\n")
      .reduce((acc, line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("//")) return acc;
        if (trimmed === "---") return [...acc, { type: "divider" }];

        const vals = trimmed.split(/\s*\|\s*/);
        const obj = keys.reduce((o, k, i) => {
          if (vals[i] && vals[i] !== "-") o[k] = vals[i].trim();
          return o;
        }, {});
        return [...acc, obj];
      }, []);
  }

  static parseComponentDefinitions(dsl) {
    return dsl
      .trim()
      .split("\n")
      .reduce((acc, line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("//")) return acc;

        const [name, selector, style, attrs] = trimmed
          .split(/\s*\|\s*/)
          .map((s) => s || "");

        const parts = selector.split(/(?=[#.])/);
        let tagName = parts[0];
        if (!tagName || tagName.startsWith(".") || tagName.startsWith("#")) {
          tagName = "div";
        }

        const def = { tag: tagName };
        parts.forEach((p) => {
          if (p.startsWith("#")) def.id = p.slice(1);
          if (p.startsWith("."))
            def.class = (def.class ? def.class + "." : "") + p.slice(1);
        });

        if (style) def.style = style;

        if (attrs) {
          attrs.split(/\s+/).forEach((pair) => {
            const eqIdx = pair.indexOf("=");
            if (eqIdx > -1) {
              def[pair.slice(0, eqIdx)] = pair.slice(eqIdx + 1);
            } else {
              // FIX: Treat 'hidden' as a class, not a boolean attribute
              if (pair === "hidden")
                def.class = (def.class ? def.class + "." : "") + "hidden";
              else def[pair] = true;
            }
          });
        }

        acc[name] = def;
        return acc;
      }, {});
  }

  static parseCSSRules(schema) {
    const PROP_MAP = {
      bg: "background-color",
      c: "color",
      d: "display",
      f: "flex",
      a: "align-items",
      j: "justify-content",
      p: "padding",
      m: "margin",
      w: "width",
      h: "height",
      min_h: "min-height",
      max_w: "max-width",
      rad: "border-radius",
      shadow: "box-shadow",
      border: "border",
      z: "z-index",
      trans: "transition",
      font: "font-family",
      select: "user-select",
      // Mixins
      abs: "position:absolute",
      rel: "position:relative",
      col: "flex-direction:column",
      hidden: "display:none !important",
      pointer: "cursor:pointer",
      "inset-0": "top:0;left:0;right:0;bottom:0",
      b_bot: "border-bottom",
      b_right: "border-right",
      b_top: "border-top",
      m_right: "margin-right",
      m_top: "margin-top",
      m_bottom: "margin-bottom",
      text_transform: "text-transform",
      font_size: "font-size",
      font_weight: "font-weight",
      line_height: "line-height",
      resize: "resize",
      grid_cols: "grid-template-columns",
      grid_col: "grid-column",
      gap: "gap",
      transform: "transform",
      transform_origin: "transform-origin",
    };

    const VAL_MAP = {
      f: "flex",
      between: "space-between",
      center: "center",
      start: "flex-start",
      end: "flex-end",
      rel: "relative",
      abs: "absolute",
      none: "none",
      block: "block",
      grid: "grid",
    };

    return schema
      .trim()
      .split("\n")
      .map((line) => {
        if (!line.trim() || line.trim().startsWith("//")) return "";

        const [sel, ...rules] = line.trim().split(/\s*\|\s*/);

        if (sel.startsWith("@keyframes"))
          return `${sel} { ${rules.join(" ")} }`;

        const body = rules
          .map((r) => {
            const parts = r.trim().split(/\s+/);
            const k = parts[0];
            let v = parts.slice(1).join(" ");

            const mappedProp = PROP_MAP[k] || k;
            if (mappedProp.includes(":")) return `${mappedProp};`;
            if (!v) return "";
            if (VAL_MAP[v]) v = VAL_MAP[v];

            return `${mappedProp}: ${v};`;
          })
          .join(" ");

        return `${sel} { ${body} }`;
      })
      .join("\n");
  }

  static parseDOMTree(dsl) {
    const lines = dsl
      .split("\n")
      .filter((l) => l.trim() && !l.trim().startsWith("//"));
    const root = { children: [] };
    const stack = [{ node: root, indent: -1 }];

    lines.forEach((line) => {
      const indent = line.search(/\S/);
      const content = line.trim();

      let [def, id, text, attrs] = content
        .split(/\s*\|\s*/)
        .map((s) => (s ? s.trim() : null));

      if (!attrs && text && (text.includes("=") || text.includes("hidden"))) {
        attrs = text;
        text = null;
      }

      const node = { def };
      if (id) node.id = id;

      if (text) {
        if (text.startsWith("html=")) node.html = text.slice(5);
        else if (text.includes("<")) node.html = text;
        else node.text = text;
      }

      if (attrs) {
        attrs.split(/\s+/).forEach((pair) => {
          const eqIdx = pair.indexOf("=");
          if (eqIdx > -1) {
            node[pair.slice(0, eqIdx)] = pair.slice(eqIdx + 1);
          } else {
            // FIX: Treat 'hidden' or 'relative' as classes in short-hand
            if (["hidden", "relative", "absolute"].includes(pair)) {
              node.class = (node.class ? node.class + "." : "") + pair;
            } else {
              node[pair] = true;
            }
          }
        });
      }

      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      const parent = stack[stack.length - 1].node;
      parent.children = parent.children || [];
      parent.children.push(node);

      stack.push({ node, indent });
    });

    return root.children[0];
  }

  // ==========================================================================
  // 2. CONFIGURATION (DSLs)
  // ==========================================================================

  static generateCSS() {
    return this.parseCSSRules(`
      // --- Base ---
      *, *::before, *::after   | box-sizing border-box | m 0 | p 0
      body                     | font "Segoe UI", sans-serif | bg #111827 | c #1f2937 | min_h 100vh | d f | col | font_size 14px
      .hidden                  | hidden
      .relative                | rel
      .absolute                | abs
      .inset-0                 | top 0 | left 0 | right 0 | bottom 0
      .transition              | trans all 0.15s ease-in-out
      .uppercase               | text_transform uppercase
      .select-none             | select none
      .disabled-bar            | opacity 0.5 | pointer-events none
      
      // --- Layout ---
      .app-header              | bg #1f2937 | p 0.75rem | d f | j between | a center | b_bot 1px solid #111827 | z 30
      .header-title            | font_size 1.25rem | font_weight 700 | c #f3f4f6 | m_right 1rem
      .main-content-wrapper    | f 1 | d f | col | overflow hidden | rel | bg white
      .tab-button-group        | bg #f9fafb | b_bot 1px solid #e5e7eb | flex-shrink 0 | p 0
      .workspace-container     | f 1 | d f | overflow hidden | rel
      .sidebar-panel           | w 20rem | d f | col | b_right 1px solid #e5e7eb | bg white | z 10
      .sidebar-footer          | p 0.75rem | b_top 1px solid #e5e7eb | bg #f9fafb | d f | flex-wrap wrap | gap 0.5rem | j between

      // --- Components ---
      .flex-row-gap-1          | d f | a center | gap 1rem
      .flex-gap-quarter        | d f | gap 0.25rem
      .flex-item-end           | d f | a center | gap 1rem
      .zoom-group-style        | d f | border 1px solid #4b5563 | rad 0.375rem
      .zoom-label-style        | font_size 0.75rem | w 3.5rem | text-align center | c #e5e7eb | align-self center

      // --- Buttons ---
      .btn                     | p 0.375rem 0.75rem | rad 0.25rem | font_weight 600 | d f | a center | gap 0.5rem | pointer | border 1px solid transparent | trans all 0.15s
      .btn-primary             | bg #2563eb | c white
      .btn-secondary           | bg #374151 | c #e5e7eb | border-color #4b5563 | font_size 0.75rem
      .btn-danger              | bg #dc2626 | c white
      .btn-success             | bg #047857 | c white
      .btn-ghost               | bg transparent | border 1px solid transparent
      .header-btn              | c #d1d5db | p 0.25rem 0.5rem | bg transparent | border none | pointer
      .action-bar-btn          | p 0.25rem 0.75rem | rad 0.25rem | font_weight 700 | font_size 0.75rem | c white | border 1px solid transparent | pointer
      .text-danger             | c #ef4444
      .bg-primary              | bg #2563eb
      .bg-warn                 | bg #d97706
      .bg-success              | bg #059669
      .bg-gray                 | bg #4b5563
      .bg-danger               | bg #ef4444

      // --- Properties ---
      .prop-header             | bg #f3f4f6 | p 0.75rem 1rem | b_bot 1px solid #e5e7eb | d f | col | gap 0.5rem
      .geometry-inputs         | p 1rem | bg #f9fafb | b_bot 1px solid #e5e7eb | d grid | grid_cols 1fr 1fr | gap 0.75rem | font_size 0.75rem | rel
      .input-label             | d block | c #9ca3af | font_weight 700 | m_bottom 0.25rem | font_size 10px | text_transform uppercase
      .input-field             | w 100% | border 1px solid #d1d5db | rad 0.25rem | p 0.375rem | text-align center
      .input-wrapper-header    | grid_col 1 / span 2 | m_top 0.5rem | rel
      .input-wrapper-tiny-label| abs | top 0.15rem | right 0 | font_size 9px | font_weight 700 | c #60a5fa
      
      // --- Editors ---
      .svg-editor-panel        | p 1rem | bg white | b_bot 1px solid #e5e7eb | d f | col | gap 0.5rem
      .svg-textarea            | w 100% | min_h 150px | border 1px solid #d1d5db | rad 0.25rem | p 0.5rem | font-family monospace | font_size 11px | line_height 1.2 | resize vertical
      .layer-list-container    | d f | col | bg #e5e7eb | overflow hidden | rel
      .layer-list-header       | p 0.5rem 1rem | bg #f3f4f6 | b_bot 1px solid #e5e7eb | font_size 0.75rem | font_weight 700 | c #4b5563 | text_transform uppercase
      .layer-items-container   | f 1 | overflow-y auto | p 0.25rem 0
      .layer-item              | p 0.5rem 0.75rem | d f | a center | gap 0.5rem | font_size 0.75rem | pointer | b_bot 1px solid #e5e7eb | bg white | trans all 0.15s
      .layer-item:hover        | bg #f3f4f6
      .layer-item.active       | bg #dbeafe | font_weight 600
      .layer-item .visibility-toggle | font_size 1rem | opacity 0.6 | pointer
      .layer-item .delete-btn  | c #ef4444 | opacity 0 | font_size 0.9rem
      .layer-item:hover .delete-btn | opacity 1

      // --- Canvas ---
      .canvas-view-style       | f 1 | d f | col | bg #e5e7eb | rel
      .canvas-scroller-style   | f 1 | overflow auto | d f | j center | p 1rem | rel
      .canvas-wrapper-style    | shadow 0 20px 25px -5px rgba(0,0,0,0.5) | bg white | rel | transform_origin top

      // --- Interaction ---
      .region-highlight        | bg rgba(59,130,246,0.1) | border 1px solid #3b82f6 | opacity 0.6 | pointer-events all
      .region-highlight:hover  | opacity 0.9 | border-width 2px | cursor move
      .region-selected         | border 2px solid #2563eb | bg rgba(37,99,235,0.2) | opacity 1.0
      #selection-box           | border 2px dashed #2563eb | bg rgba(37,99,235,0.1) | abs | pointer-events none | d none | z 50
      .selection-frame         | abs | border 1px solid #3b82f6 | shadow 0 0 0 1px rgba(59,130,246,0.3) | pointer-events none | z 40
      .region-actions-bar      | abs | z 100 | bg rgba(255,255,255,0.95) | p 0.5rem | rad 0.5rem | shadow 0 4px 6px rgba(0,0,0,0.1) | border 1px solid #d1d5db | d f | gap 0.5rem
      .tab-button              | p 0.5rem 1rem | font_size 0.75rem | font_weight 600 | c #6b7280 | b_bot 2px solid transparent | pointer
      .tab-button-active       | c #2563eb | border-bottom-color #2563eb
      #split-bar               | abs | z 50 | bg #ef4444 | opacity 0.8 | pointer-events none | shadow 0 0 0 1px #dc2626
      #split-bar-label         | abs | bg #ef4444 | c white | font_size 10px | font_weight 700 | p 2px 4px | rad 3px | pointer-events none | white-space nowrap

      // --- Handles ---
      .resize-handle           | abs | w 8px | h 8px | bg white | border 1px solid #2563eb | z 50 | pointer-events all
      .resize-handle:hover     | bg #2563eb
      .handle-nw               | top -4px | left -4px | cursor nwse-resize
      .handle-n                | top -4px | left 50% | transform translateX(-50%) | cursor ns-resize
      .handle-ne               | top -4px | right -4px | cursor nesw-resize
      .handle-e                | top 50% | right -4px | transform translateY(-50%) | cursor ew-resize
      .handle-se               | bottom -4px | right -4px | cursor nwse-resize
      .handle-s                | bottom -4px | left 50% | transform translateX(-50%) | cursor ns-resize
      .handle-sw               | bottom -4px | left -4px | cursor nesw-resize
      .handle-w                | top 50% | left -4px | transform translateY(-50%) | cursor ew-resize

      // --- Utils ---
      .debug-container         | f 1 | bg #111827 | p 1.5rem | overflow auto
      .empty-state-style       | abs | inset-0 | d f | col | a center | j center | bg #f3f4f6
      .loader-style            | abs | inset-0 | bg rgba(17,24,39,0.8) | d f | col | a center | j center | z 50
      .loader-spinner          | w 3rem | h 3rem | border 4px solid #4b5563 | border-top-color #3b82f6 | rad 9999px | animation spin 1s linear infinite
      .debug-image-container   | f 1 | bg #000 | border 1px solid #374151 | h 200px | d f | j center | a center
      .debug-render-view       | f 1 | bg #fff | border 1px solid #374151 | h 200px
      .empty-state-card        | bg white | p 2rem | rad 1rem | shadow 0 10px 15px rgba(0,0,0,0.1) | text-align center
      @keyframes spin          | from { transform: rotate(0deg) } to { transform: rotate(360deg) }
      @keyframes pulse         | from { opacity: 0.5 } to { opacity: 1 }
      #ai-status               | animation pulse 1s infinite alternate
    `);
  }

  static get layout() {
    return {
      header: this.parseConfigList(
        ["id", "text", "fn", "type"],
        `
        zoom-out          | -             | zoomOut
        zoom-level        | 100%          |               | display
        zoom-in           | +             | zoomIn
        ---
        btn-undo          | Undo          | undo
        btn-redo          | Redo          | redo
        fullscreen-toggle | Full Screen   | toggleFullscreen
      `,
      ),
      properties: this.parseConfigList(
        ["label", "id", "map", "group", "step"],
        `
        Pos X    | prop-x        | rect.x   | geometry
        Pos Y    | prop-y        | rect.y   | geometry
        Width    | prop-w        | rect.w   | geometry
        Height   | prop-h        | rect.h   | geometry
        Offset X | prop-offset-x | offset.x | transform | 0.1
        Offset Y | prop-offset-y | offset.y | transform | 0.1
        Scale X  | prop-scale-x  | scale.x  | transform | 0.05
        Scale Y  | prop-scale-y  | scale.y  | transform | 0.05
      `,
      ),
      footer: this.parseConfigList(
        ["id", "text", "fn", "class"],
        `
        btn-auto-segment | Auto Segment | autoSegment | btn-danger
        btn-export       | Export       | exportSVG   | btn-success
        btn-clear-all    | Reset        | resetAll    | btn-ghost text-danger
      `,
      ),
      floating: this.parseConfigList(
        ["label", "type", "class", "fn"],
        `
        Digitize  | text      | bg-primary
        Image     | image     | bg-warn
        Scan      | blueprint | bg-success
        Empty     | empty     | bg-gray
        ---
        Fit Area  | btn       | bg-gray   | fitArea
        Fill      | btn       | bg-gray   | fitContent
        ---
        Split     | btn       | bg-gray   | enterSplitMode
        Group     | btn       | bg-gray   | groupSelectedRegions
        Del       | btn       | bg-danger | deleteSelected
      `,
      ).map((i) =>
        i.type === "btn"
          ? { id: "btn-" + i.label.toLowerCase().replace(" ", "-"), ...i }
          : i,
      ),
    };
  }

  static get components() {
    return this.parseComponentDefinitions(`
      root       | div#template-structure.flex-col
      header     | header.app-header
      flexRow    | .flex-row-gap-1
      flexGap    | .flex-gap-quarter
      headerDiv  | | width:1px; height:0.5rem; background:#4b5563
      zoomLabel  | span.zoom-label-style
      
      main       | main.main-content-wrapper
      sidebar    | .sidebar-panel
      propHead   | .prop-header
      geoInputs  | .geometry-inputs
      geoGroup   | div
      rawEditor  | #svg-raw-editor-panel.svg-editor-panel.hidden
      
      layerList  | #layer-list.layer-list-container
      layerHead  | .layer-list-header | | text=Layers
      layerItems | #layer-items.layer-items-container
      panelFoot  | .sidebar-footer
      
      canvasArea | .canvas-view-style
      scroller   | .canvas-scroller-style
      wrapper    | .canvas-wrapper-style
      processing | canvas#processing-canvas.hidden
      
      title      | h1.header-title
      labelTiny  | span.input-label
      inputNum   | input.input-field  | | type=number
      headerBtn  | button.header-btn
      btnAction  | button.action-bar-btn
      btnFooter  | button.btn
      hiddenIn   | input.hidden       | | type=file
      
      debugCon   | #debug-container.debug-container.hidden
      emptyState | #empty-state.empty-state-style
      loader     | #pdf-loader.loader-style.hidden
      actionBar  | #region-actions-bar.region-actions-bar.hidden
      barDivider | | width:1px; height:1.5rem; background:#d1d5db
    `);
  }

  static get handles() {
    if (this._cachedHandles) return this._cachedHandles;

    // ATOMS
    const P = "-4px";
    const C = "50%";
    const TF = "transform";
    const TR = "translate";

    // MACROS
    const M = {
      // Position
      T: `top:${P}`,
      B: `bottom:${P}`,
      L: `left:${P}`,
      R: `right:${P}`,

      // Center & Transform (Now with keys!)
      CY: `top:${C}`,
      CX: `left:${C}`,
      TX: `${TF}:${TR}X(-${C})`,
      TY: `${TF}:${TR}Y(-${C})`,

      // Cursor Stems
      NS: "ns",
      EW: "ew",
      D1: "nwse",
      D2: "nesw",
    };

    const raw = this.parseConfigList(
      ["id", "y", "x", "cursor", "tx"],
      `
      nw | T  | L  | D1 | -
      n  | T  | CX | NS | TX
      ne | T  | R  | D2 | -
      e  | CY | R  | EW | TY
      se | B  | R  | D1 | -
      s  | B  | CX | NS | TX
      sw | B  | L  | D2 | -
      w  | CY | L  | EW | TY
    `,
    );

    this._cachedHandles = raw.reduce((acc, item) => {
      const h = {
        // 1. Cursor: Expand macro or use raw, append suffix
        cursor: (M[item.cursor] || item.cursor) + "-resize",
      };

      // 2. Geometry: Unified loop for y, x, AND tx
      ["y", "x", "tx"].forEach((col) => {
        let val = item[col];
        if (val === "-" || !val) return; // Skip empty
        if (M[val]) val = M[val]; // Expand macro

        const [k, v] = val.split(":"); // Split "key:value"
        if (k && v) h[k] = v;
      });

      acc[item.id] = h;
      return acc;
    }, {});

    return this._cachedHandles;
  }
  // ==========================================================================
  // 3. BUILDER & DOM STRUCTURE
  // ==========================================================================

  static buildElement(config, parent, bindTarget) {
    const compDef = SciTextUI.components[config.def] || {
      tag: config.def || "div",
    };

    const tag = compDef.tag || "div";
    let el;
    try {
      el = document.createElement(tag);
    } catch (e) {
      console.warn(`Invalid tag "${tag}", falling back to div.`);
      el = document.createElement("div");
    }

    const elementId = config.id || compDef.id;
    if (elementId) {
      el.id = elementId;
      if (bindTarget) {
        bindTarget[elementId] = el;
        const camelId = elementId.replace(/-([a-z])/g, (g) =>
          g[1].toUpperCase(),
        );
        bindTarget[camelId] = el;
      }
    }

    const allKeys = new Set([...Object.keys(compDef), ...Object.keys(config)]);

    allKeys.forEach((key) => {
      if (
        ["tag", "id", "text", "html", "children", "def", "data-type"].includes(
          key,
        )
      )
        return;

      let val = config[key] !== undefined ? config[key] : compDef[key];

      if (key === "class") {
        const defClass = compDef.class || "";
        const confClass = config.class || "";
        // FIX: Ensure dots are replaced by spaces
        el.className = `${defClass} ${confClass}`.replace(/\./g, " ").trim();
        return;
      }

      if (key === "style") {
        const defStyle = compDef.style || "";
        const confStyle = config.style || "";
        el.style.cssText = `${defStyle};${confStyle}`;
        return;
      }

      if (val === true) val = "";

      try {
        if (
          [
            "value",
            "checked",
            "disabled",
            "readonly",
            "selected",
            "type",
            "placeholder",
            "accept",
          ].includes(key)
        ) {
          el[key] = val === "" ? true : val;
        }

        if (/[a-zA-Z_][\w-]*$/.test(key)) {
          if (val !== false && val !== null && val !== undefined) {
            el.setAttribute(key, val);
          }
        }
      } catch (err) {}
    });

    if (config["data-type"]) el.dataset.type = config["data-type"];
    if (config.html) el.innerHTML = config.html;
    else if (config.text) el.textContent = config.text;
    else if (compDef.text && !config.children) el.textContent = compDef.text;

    if (parent) parent.appendChild(el);

    if (config.children && Array.isArray(config.children)) {
      config.children.forEach((child) =>
        SciTextUI.buildElement(child, el, bindTarget),
      );
    }

    return el;
  }

  static getDOMStructure() {
    const L = SciTextUI.layout;

    // Zoom Buttons
    const ZoomBtns = L.header
      .slice(0, 3)
      .map((b) =>
        b.type === "display"
          ? `zoomLabel | ${b.id} | ${b.text}`
          : `headerBtn | ${b.id} | ${b.text || ""}`,
      )
      .join("\n              ");

    // Header Right Buttons
    const HeaderRightBtns = L.header
      .slice(4)
      .map((b) => `btnFooter | ${b.id} | ${b.text} | class=btn.btn-secondary`)
      .join("\n            ");

    // Footer Buttons
    const FooterBtns = L.footer
      .map(
        (b) => `btnFooter | ${b.id} | ${b.text} | class=btn.${b.class || ""}`,
      )
      .join("\n                  ");

    // Floating Action Bar
    const FloatingBtns = L.floating
      .map((b) =>
        b.type === "divider"
          ? `barDivider`
          : `btnAction | ${b.id} | ${b.label} | class=action-bar-btn.${b.class || ""} data-type=${b.type || ""}`,
      )
      .join("\n          ");

    // Properties
    const GeoProps = L.properties
      .filter((p) => p.group === "geometry")
      .map(
        (p) =>
          `geoGroup
                  labelTiny | | ${p.label}
                  inputNum | ${p.id} | | step=${p.step || 1}`,
      )
      .join("\n                ");

    const TransProps = L.properties
      .filter((p) => p.group === "transform")
      .map(
        (p) =>
          `geoGroup
                  labelTiny | | ${p.label}
                  inputNum | ${p.id} | | step=${p.step || 1}`,
      )
      .join("\n                ");

    return this.parseDOMTree(`
      root
        header
          flexRow
            title | | html=SciText <span>Digitizer</span>
            div | | class=relative
              hiddenIn | pdf-upload | | accept=application/pdf,image/*
              label | | Load | for=pdf-upload class=btn.btn-primary
          headerDiv
          div | | class=zoom-group-style
            ${ZoomBtns}
          flexGap
            ${HeaderRightBtns}
          flexGap
            div | | class=flex-item-end
              span | ai-status | Processing... | class=hidden style=color:#60a5fa;font-size:0.75rem;font-family:monospace;
              btnFooter | fullscreen-toggle | Full Screen | class=btn.btn-secondary
        
        main
          div | | class=tab-button-group
            button | tab-overlay | Compositor | class=tab-button.tab-button-active
            button | tab-debug | Debug View | class=tab-button
          
          div | workspace-container | | class=workspace-container.hidden
            sidebar
              propHead
                flexRow | | style=justify-content:space-between;
                  span | | Properties | class=uppercase style=font-size:0.75rem;font-weight:700;color:#4b5563;
                  span | region-count | 0 | class=region-count-badge
              
              geoInputs
                div | | COORDS (Normalized Pixels) | style=position:absolute;top:0.25rem;right:0.5rem;font-size:9px;font-weight:700;color:#60a5fa;
                ${GeoProps}
                
                div | | class=input-wrapper-header
                  span | | SVG Content Adjustment | class=input-label style=text-align:center;display:block;
                  div | | OFFSET/SCALE | class=input-wrapper-tiny-label
                
                ${TransProps}

              rawEditor
                span | | SVG Content (Edit Raw) | class=input-label style=margin-bottom:0;
                textarea | svg-raw-content | | class=svg-textarea
                btnAction | btn-save-raw-svg | Apply Changes | style=background:#4f46e5;font-size:0.75rem;
              
              layerList
                layerHead
                  button | btn-toggle-visibility-all | 👁 | style=float:right;background:none;border:none;cursor:pointer;color:#6b7280;font-size:1rem;
                layerItems
              
              panelFoot
                div | | class=flex-gap-quarter style=width:100%;
                  ${FooterBtns}
                  div | | class=relative
                    hiddenIn | svg-import | | accept=.svg
                    label | | Import | for=svg-import class=btn.btn-primary

            canvasArea | canvas-view-area
              scroller | canvas-scroller
                wrapper | canvas-wrapper
                  // FIX: DOTS used here for multi-class strings
                  div | pdf-layer | | class=transition.absolute.inset-0
                  div | svg-layer | | class=absolute.inset-0.z-10 style=pointer-events:none;
                  div | interaction-layer | | class=absolute.inset-0.z-20
                  div | selection-box
                  div | split-bar | | class=hidden

          debugCon
            div | | class=flex-row-gap-1 style=margin-bottom:1rem;
              div | | class=debug-image-container
                img | debug-source-img | | style=max-width:100%;max-height:100%;
              div | debug-render-view | | class=debug-render-view
            pre | debug-log | | style=color:#4ade80;font-size:10px;font-family:monospace;

          emptyState
            div | | class=empty-state-card
              h2 | | No Document Loaded | style=font-size:1.25rem;font-weight:700;color:#374151;
              p | | Upload PDF or Image to start. | style=color:#6b7280;margin-top:0.5rem;
          
          loader
            div | | | class=loader-spinner
            span | | Loading... | style=color:white;font-weight:700;margin-top:1rem;
          
          processing

        actionBar
          ${FloatingBtns}
    `);
  }

  static init(bindTarget) {
    const styleEl = document.createElement("style");
    styleEl.textContent = SciTextUI.generateCSS();
    document.head.appendChild(styleEl);
    SciTextUI.buildElement(
      SciTextUI.getDOMStructure(),
      document.body,
      bindTarget,
    );
    if (bindTarget) bindTarget.splitBar = document.getElementById("split-bar");
  }
}

// ============================================================================
// 3. UTILS (HELPERS)
// ============================================================================

class Utils {
  // Geometry Helpers
  static Geo = {
    rect: (x, y, w, h) => ({ x, y, w, h }),
    // Convert normalized coords (0-1) to physical pixels
    toPixels: (r, cw, ch) => ({
      x: r.x * cw,
      y: r.y * ch,
      w: r.w * cw,
      h: r.h * ch,
    }),
    // Hit test a point against a rect (physical pixels)
    hitTest: (pos, r) =>
      pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h,
    // Hit test handle (8x8 pixel box)
    hitHandle: (pos, hx, hy) =>
      pos.x >= hx && pos.x <= hx + 8 && pos.y >= hy && pos.y <= hy + 8,
    // Calculate handle position
    getHandlePos: (h, rx, ry, rw, rh) => {
      let hx = h.left
        ? h.left.includes("%")
          ? rx + rw / 2 - 4
          : rx - 4
        : rx + rw - 4;
      let hy = h.top
        ? h.top.includes("%")
          ? ry + rh / 2 - 4
          : ry - 4
        : ry + rh - 4;
      return { x: hx, y: hy };
    },
  };

  // SVG Generation Helpers
  static SVG = {
    viewBox: (r, canvasW, canvasH) => {
      const offX = -(r.offset?.x ?? 0) / (r.scale?.x ?? 1);
      const offY = -(r.offset?.y ?? 0) / (r.scale?.y ?? 1);
      const w = (r.bpDims?.w ?? r.rect.w * canvasW * 2) / (r.scale?.x ?? 1);
      const h = (r.bpDims?.h ?? r.rect.h * canvasH * 2) / (r.scale?.y ?? 1);
      return `${offX} ${offY} ${w} ${h}`;
    },
    // Wrap content in SVG tag
    wrap: (content, x, y, w, h, viewBox) =>
      `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${viewBox}" preserveAspectRatio="none">${content}</svg>`,
    // Create base SVG for export
    createRoot: (w, h, content) =>
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="white"/>\n${content}</svg>`,
  };
}

// ============================================================================
// 4. MODEL
// ============================================================================

class SciTextModel {
  constructor() {
    this.state = {
      pdfDoc: null,
      scaleMultiplier: 1.0,
      baseWidth: 0,
      regions: [],
      activeRegionId: null,
      selectedIds: new Set(),
      history: [],
      historyIndex: -1,
      canvasWidth: 0,
      canvasHeight: 0,
      canvas: null,
    };
    this.subscribers = [];
  }

  subscribe(fn) {
    this.subscribers.push(fn);
  }
  notify(context) {
    this.subscribers.forEach((fn) => fn(this.state, context));
  }

  setState(updates) {
    Object.assign(this.state, updates);
    this.notify();
  }

  addRegion(region) {
    const newRegion = {
      ...region,
      visible: true,
      offset: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
    };
    this.state.regions.push(newRegion);
    this.selectRegion(newRegion.id);
    this.saveHistory();
    this.notify();
  }

  updateRegion(id, updates, context) {
    const region = this.getRegion(id);
    if (region) Object.assign(region, updates);
    this.notify(context);
  }

  deleteRegion(id) {
    this.state.regions = this.state.regions.filter((r) => r.id !== id);
    if (this.state.activeRegionId === id) this.deselect();
    this.saveHistory();
    this.notify();
  }

  getRegion(id) {
    return this.state.regions.find((r) => r.id === id);
  }

  selectRegion(id) {
    this.state.selectedIds.clear();
    this.state.selectedIds.add(id);
    this.state.activeRegionId = id;
    this.notify();
  }

  deselect() {
    this.state.activeRegionId = null;
    this.state.selectedIds.clear();
    this.notify();
  }

  setCanvasDimensions(w, h, baseW) {
    this.state.canvasWidth = w;
    this.state.canvasHeight = h;
    this.state.baseWidth = baseW;
    this.notify();
  }

  saveHistory() {
    if (this.state.historyIndex < this.state.history.length - 1) {
      this.state.history = this.state.history.slice(
        0,
        this.state.historyIndex + 1,
      );
    }
    this.state.history.push(JSON.parse(JSON.stringify(this.state.regions)));
    this.state.historyIndex++;
    if (this.state.history.length > 50) {
      this.state.history.shift();
      this.state.historyIndex--;
    }
  }

  undo() {
    if (this.state.historyIndex > 0) {
      this.state.historyIndex--;
      this.restore();
    }
  }

  redo() {
    if (this.state.historyIndex < this.state.history.length - 1) {
      this.state.historyIndex++;
      this.restore();
    }
  }

  restore() {
    this.state.regions = JSON.parse(
      JSON.stringify(this.state.history[this.state.historyIndex]),
    );
    this.deselect();
    this.notify();
  }
}

// ============================================================================
// 5. LOGIC & CONTROLLER
// ============================================================================

class ImageProcessor {
  constructor(model) {
    this.model = model;
    this.scaleFactor = 2;
  }
  isDark(data, i) {
    return (
      data[i * 4 + 3] > 128 &&
      data[i * 4] < 200 &&
      data[i * 4 + 1] < 200 &&
      data[i * 4 + 2] < 200
    );
  }

  processRegion(normRect, pad = 4) {
    const state = this.model.state;
    const sourceCanvas = state.canvas;
    if (!sourceCanvas) return null;

    // Use Utils.Geo to convert normalized to pixels?
    // Keeping logic here for now as it deals with image data specifically
    const pixelW = Math.floor(normRect.w * state.canvasWidth);
    const pixelH = Math.floor(normRect.h * state.canvasHeight);
    if (pixelW < 1 || pixelH < 1) return null;

    const tmp = document.createElement("canvas");
    tmp.width = pixelW * this.scaleFactor;
    tmp.height = pixelH * this.scaleFactor;
    const ctx = tmp.getContext("2d");

    ctx.drawImage(
      sourceCanvas,
      normRect.x * state.canvasWidth,
      normRect.y * state.canvasHeight,
      pixelW,
      pixelH,
      0,
      0,
      tmp.width,
      tmp.height,
    );

    const data = ctx.getImageData(0, 0, tmp.width, tmp.height).data;
    const width = tmp.width;
    const height = tmp.height;

    let minX = width,
      minY = height,
      maxX = 0,
      maxY = 0,
      found = false;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (this.isDark(data, y * width + x)) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
          found = true;
        }
      }
    }
    if (!found) return null;

    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(width, maxX + pad);
    maxY = Math.min(height, maxY + pad);

    let rle = "";
    for (let y = minY; y < maxY; y += this.scaleFactor) {
      let startX = -1;
      for (let x = minX; x < maxX; x++) {
        if (this.isDark(data, y * width + x)) {
          if (startX === -1) startX = x;
        } else if (startX !== -1) {
          rle += `M${startX} ${y}h${x - startX}v${this.scaleFactor}h-${x - startX}z`;
          startX = -1;
        }
      }
      if (startX !== -1)
        rle += `M${startX} ${y}h${maxX - startX}v${this.scaleFactor}h-${maxX - startX}z`;
    }

    return {
      rle,
      bpDims: { w: maxX - minX, h: maxY - minY },
      newRect: {
        x: normRect.x + minX / this.scaleFactor / state.canvasWidth,
        y: normRect.y + minY / this.scaleFactor / state.canvasHeight,
        w: (maxX - minX) / this.scaleFactor / state.canvasWidth,
        h: (maxY - minY) / this.scaleFactor / state.canvasHeight,
      },
      imageData: tmp.toDataURL("image/png").split(",")[1],
    };
  }
}

class RegionEditor {
  constructor(controller) {
    this.controller = controller;
    this.mode = "IDLE";
    this.dragStart = null;
    this.initialRect = null;
    this.activeHandle = null;
  }
  init() {
    this.controller.view.els.interactionLayer.addEventListener(
      "mousedown",
      (e) => this.handleMouseDown(e),
    );
    document.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    document.addEventListener("mouseup", (e) => this.handleMouseUp(e));
    document.addEventListener("keydown", (e) => this.handleKeyDown(e));
  }
  getPhysicalDims() {
    const state = this.controller.model.state;
    const cw = state.baseWidth * state.scaleMultiplier;
    return { cw, ch: cw * (state.canvasHeight / state.canvasWidth) };
  }
  getLocalPos(e) {
    const rect = this.controller.view.els.canvasWrapper.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  hitDetection(pos) {
    const state = this.controller.model.state;
    const { cw, ch } = this.getPhysicalDims();
    const active = state.activeRegionId
      ? this.controller.model.getRegion(state.activeRegionId)
      : null;

    // Check handles first
    if (active) {
      const r = Utils.Geo.toPixels(active.rect, cw, ch);
      for (const [dir, h] of Object.entries(SciTextUI.handles)) {
        const hPos = Utils.Geo.getHandlePos(h, r.x, r.y, r.w, r.h);
        if (Utils.Geo.hitHandle(pos, hPos.x, hPos.y))
          return { type: "HANDLE", handle: dir };
      }
    }
    // Check bodies
    for (const region of state.regions.slice().reverse()) {
      const r = Utils.Geo.toPixels(region.rect, cw, ch);
      if (Utils.Geo.hitTest(pos, r)) return { type: "BODY", id: region.id };
    }
    return { type: "NONE" };
  }

  handleMouseDown(e) {
    if (e.button !== 0) return;
    const pos = this.getLocalPos(e);
    if (this.controller.splitMode) {
      this.dragStart = pos;
      return;
    }

    const state = this.controller.model.state;
    const hit = this.hitDetection(pos);

    if (hit.type === "BODY") {
      if (hit.id !== state.activeRegionId)
        this.controller.model.selectRegion(hit.id);
      this.mode = "MOVE";
    } else if (hit.type === "HANDLE") {
      this.mode = "RESIZE";
      this.activeHandle = hit.handle;
    } else {
      this.controller.model.deselect();
      this.mode = "CREATE";
    }
    this.dragStart = pos;
    const active = this.controller.model.getRegion(state.activeRegionId);
    this.initialRect = active ? { ...active.rect } : null;
  }

  handleMouseMove(e) {
    const pos = this.getLocalPos(e);
    const state = this.controller.model.state;
    const { cw, ch } = this.getPhysicalDims();
    const layer = this.controller.view.els.interactionLayer;
    const active = state.activeRegionId
      ? this.controller.model.getRegion(state.activeRegionId)
      : null;

    if (this.controller.splitMode && active) {
      const r = Utils.Geo.toPixels(active.rect, cw, ch);
      if (this.controller.splitType === "horizontal") {
        layer.style.cursor = "ns-resize";
        this.controller.splitPosition = Math.min(
          0.9,
          Math.max(0.1, (pos.y - r.y) / r.h),
        );
      } else {
        layer.style.cursor = "ew-resize";
        this.controller.splitPosition = Math.min(
          0.9,
          Math.max(0.1, (pos.x - r.x) / r.w),
        );
      }
      this.controller.model.notify({ noHistory: true });
      return;
    }

    if (this.mode === "IDLE") {
      const hit = this.hitDetection(pos);
      layer.style.cursor =
        hit.type === "HANDLE"
          ? `${SciTextUI.handles[hit.handle].cursor}`
          : hit.type === "BODY"
            ? "move"
            : "default";
      return;
    }

    if (this.mode === "CREATE") {
      const w = Math.abs(pos.x - this.dragStart.x),
        h = Math.abs(pos.y - this.dragStart.y);
      Object.assign(this.controller.view.els.selectionBox.style, {
        display: "block",
        left: Math.min(pos.x, this.dragStart.x) + "px",
        top: Math.min(pos.y, this.dragStart.y) + "px",
        width: w + "px",
        height: h + "px",
      });
    } else if (this.mode === "MOVE" && this.initialRect) {
      const dx = (pos.x - this.dragStart.x) / cw,
        dy = (pos.y - this.dragStart.y) / ch;
      this.controller.model.updateRegion(
        state.activeRegionId,
        {
          rect: {
            x: this.initialRect.x + dx,
            y: this.initialRect.y + dy,
            w: this.initialRect.w,
            h: this.initialRect.h,
          },
        },
        { noHistory: true },
      );
    } else if (
      this.mode === "RESIZE" &&
      this.initialRect &&
      this.activeHandle
    ) {
      const r = Utils.Geo.toPixels(this.initialRect, cw, ch);
      let nx = r.x,
        ny = r.y,
        nw = r.w,
        nh = r.h;
      const h = this.activeHandle;

      if (h.includes("e")) nw = pos.x - r.x;
      if (h.includes("s")) nh = pos.y - r.y;
      if (h.includes("w")) {
        nw = r.x + r.w - pos.x;
        nx = pos.x;
      }
      if (h.includes("n")) {
        nh = r.y + r.h - pos.y;
        ny = pos.y;
      }

      if (nw > 5 && nh > 5) {
        this.controller.model.updateRegion(
          state.activeRegionId,
          {
            rect: {
              x: nx / cw,
              y: ny / ch,
              w: nw / cw,
              h: nh / ch,
            },
          },
          { noHistory: true },
        );
      }
    }
  }

  handleMouseUp(e) {
    if (this.controller.splitMode) {
      this.dragStart = null;
      return;
    }
    if (this.mode === "CREATE") {
      const pos = this.getLocalPos(e);
      const w = Math.abs(pos.x - this.dragStart.x),
        h = Math.abs(pos.y - this.dragStart.y);
      if (w > 5 && h > 5) {
        const { cw, ch } = this.getPhysicalDims();
        this.controller.model.addRegion({
          id: `r${Date.now()}`,
          rect: {
            x: Math.min(pos.x, this.dragStart.x) / cw,
            y: Math.min(pos.y, this.dragStart.y) / ch,
            w: w / cw,
            h: h / ch,
          },
          status: "pending",
          svgContent: "",
        });
      }
      this.controller.view.els.selectionBox.style.display = "none";
    } else if (this.initialRect) {
      this.controller.model.saveHistory();
    }
    this.mode = "IDLE";
  }
  handleKeyDown(e) {
    if (e.key === "Escape")
      this.controller.splitMode
        ? this.controller.exitSplitMode()
        : (this.mode = "IDLE");
    if (this.controller.splitMode) {
      if (e.key === "Tab") {
        e.preventDefault();
        this.controller.toggleSplitType();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        this.controller.confirmSplit();
      }
    }
  }
}

class SciTextController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.draw = new RegionEditor(this);
    this.splitMode = false;
    this.splitType = "horizontal";
    this.splitPosition = 0.5;
  }
  async init() {
    this.view.init();
    this.model.state.canvas = this.view.els.processingCanvas;
    this.imageProcessor = new ImageProcessor(this.model);
    this.draw.init();

    const layout = SciTextUI.layout;
    ["header", "footer", "floating"].forEach((section) => {
      layout[section].forEach((item) => {
        if (item.id && item.fn) {
          const viewId = item.id.replace(/-./g, (x) => x[1].toUpperCase());
          if (this.view.els[viewId]) {
            const handler = this[item.fn]
              ? this[item.fn].bind(this)
              : this.model[item.fn]
                ? this.model[item.fn].bind(this.model)
                : null;
            if (handler) this.view.els[viewId].onclick = handler;
          }
        }
      });
    });

    this.view.els.pdfUpload.onchange = (e) => this.handleFileUpload(e);
    this.view.els.svgImport.onchange = (e) =>
      this.handleSvgImport(e.target.files[0]);
    this.view.els.tabOverlay.onclick = () => this.view.switchTab("overlay");
    this.view.els.tabDebug.onclick = () => this.view.switchTab("debug");
    this.view.els.btnSaveRawSvg.onclick = () => this.saveRawSvgChanges();
    this.view.els.btnToggleVisibilityAll.onclick = () => {
      const anyHidden = this.model.state.regions.some((r) => !r.visible);
      this.model.state.regions.forEach((r) =>
        this.model.updateRegion(r.id, { visible: !anyHidden }),
      );
    };

    this.view.els.regionActionsBar.onclick = (e) => {
      const btn = e.target.closest("[data-type]");
      if (!btn) return;
      const type = btn.dataset.type;
      if (type) this.generateContent(type);
    };

    layout.properties.forEach((p) => {
      const viewId = p.id.replace(/-./g, (x) => x[1].toUpperCase());
      if (this.view.els[viewId])
        this.view.els[viewId].onchange = () =>
          this.updateRegionFromProps(p.group);
    });

    this.view.els.layerItems?.addEventListener("click", (e) => {
      const item = e.target.closest(".layer-item");
      if (!item) return;
      const id = item.dataset.id;
      if (e.target.classList.contains("visibility-toggle")) {
        const r = this.model.getRegion(id);
        this.model.updateRegion(id, { visible: !r.visible });
      } else if (e.target.classList.contains("delete-btn"))
        this.model.deleteRegion(id);
      else this.model.selectRegion(id);
    });
    window.addEventListener("resize", () => {
      this.updateBaseWidth();
      this.model.notify();
    });
    this.loadDefaultImage();
  }

  enterSplitMode() {
    if (this.model.state.activeRegionId) {
      this.splitMode = true;
      const r = this.model.getRegion(this.model.state.activeRegionId);
      this.splitType =
        r.rect.w * this.model.state.canvasWidth >
        r.rect.h * this.model.state.canvasHeight
          ? "vertical"
          : "horizontal";
      this.model.notify();
    }
  }
  exitSplitMode() {
    this.splitMode = false;
    this.model.notify();
  }
  toggleSplitType() {
    this.splitType =
      this.splitType === "horizontal" ? "vertical" : "horizontal";
    this.model.notify();
  }
  confirmSplit() {
    const id = this.model.state.activeRegionId;
    if (!id) return this.exitSplitMode();
    const r = this.model.getRegion(id);
    let r1 = { ...r.rect },
      r2 = { ...r.rect };
    if (this.splitType === "horizontal") {
      r1.h *= this.splitPosition;
      r2.h *= 1 - this.splitPosition;
      r2.y += r1.h;
    } else {
      r1.w *= this.splitPosition;
      r2.w *= 1 - this.splitPosition;
      r2.x += r1.w;
    }

    this.view.els.aiStatus.classList.remove("hidden");
    const s1 = this.imageProcessor.processRegion(r1),
      s2 = this.imageProcessor.processRegion(r2);
    const mk = (s) => ({
      id: `r${Date.now()}_${Math.random()}`,
      rect: s.newRect,
      svgContent: `<path d="${s.rle}" fill="black" />`,
      status: "scanned",
      contentType: "scan",
      bpDims: s.bpDims,
      scale: { x: 1, y: 1 },
      offset: { x: 0, y: 0 },
    });

    if (s1 && s2) {
      this.model.deleteRegion(id);
      this.model.addRegion(mk(s1));
      this.model.addRegion(mk(s2));
    }
    this.view.els.aiStatus.classList.add("hidden");
    this.exitSplitMode();
  }

  updateBaseWidth() {
    const w = Math.min(
      this.model.state.canvasWidth,
      this.view.els.canvasScroller.clientWidth - 32,
    );
    if (w > 0 && Math.abs(w - this.model.state.baseWidth) > 1)
      this.model.setState({ baseWidth: w });
  }
  async loadPDFJS() {
    if (!window.pdfjsLib) {
      await import("https://unpkg.com/pdfjs-dist@5.4.449/build/pdf.min.mjs");
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://unpkg.com/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs";
    }
  }
  setZoom(s) {
    this.model.setState({ scaleMultiplier: Math.max(0.25, Math.min(5.0, s)) });
  }
  zoomIn() {
    this.setZoom(this.model.state.scaleMultiplier + 0.25);
  }
  zoomOut() {
    this.setZoom(this.model.state.scaleMultiplier - 0.25);
  }
  toggleFullscreen() {
    document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();
  }
  resetAll() {
    this.model.setState({ regions: [] });
    this.model.deselect();
    this.model.saveHistory();
  }
  deleteSelected() {
    Array.from(this.model.state.selectedIds).forEach((id) =>
      this.model.deleteRegion(id),
    );
  }

  async handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    this.view.toggleLoader(true);
    const canvas = this.model.state.canvas,
      ctx = canvas.getContext("2d");

    if (file.type === "application/pdf" && window.pdfjsLib) {
      const doc = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
      const page = await doc.getPage(1),
        vp = page.getViewport({ scale: 2.0 });
      canvas.width = vp.width;
      canvas.height = vp.height;
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
    } else {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise((r) => (img.onload = r));
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    }

    this.view.els.pdfLayer.style.backgroundImage = `url(${canvas.toDataURL()})`;
    this.view.els.pdfLayer.style.backgroundSize = "100% 100%";
    this.view.toggleLoader(false);
    this.view.toggleWorkspace(true);
    this.model.setState({ regions: [], history: [] });
    this.model.setCanvasDimensions(canvas.width, canvas.height, canvas.width);
    this.updateBaseWidth();
  }

  loadDefaultImage() {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = window.embeddedDefaultImage;
    img.onload = () => {
      const c = this.model.state.canvas;
      c.width = img.width;
      c.height = img.height;
      c.getContext("2d").drawImage(img, 0, 0);
      this.view.els.pdfLayer.style.backgroundImage = `url(${c.toDataURL()})`;
      this.view.els.pdfLayer.style.backgroundSize = "100% 100%";
      this.model.setCanvasDimensions(img.width, img.height, img.width);
      this.updateBaseWidth();
      this.view.toggleWorkspace(true);
    };
  }

  updateRegionFromProps(type) {
    const id = this.model.state.activeRegionId;
    if (!id) return;
    const cw = this.model.state.canvasWidth,
      ch = this.model.state.canvasHeight;
    let u = {};
    if (type === "geometry")
      u.rect = {
        x: parseFloat(this.view.els["propX"].value) / cw,
        y: parseFloat(this.view.els["propY"].value) / ch,
        w: parseFloat(this.view.els["propW"].value) / cw,
        h: parseFloat(this.view.els["propH"].value) / ch,
      };
    else {
      u.offset = {
        x: parseFloat(this.view.els["propOffsetX"].value),
        y: parseFloat(this.view.els["propOffsetY"].value),
      };
      u.scale = {
        x: parseFloat(this.view.els["propScaleX"].value),
        y: parseFloat(this.view.els["propScaleY"].value),
      };
    }
    this.model.updateRegion(id, u);
    this.model.saveHistory();
  }

  saveRawSvgChanges() {
    const id = this.model.state.activeRegionId;
    if (!id) return;
    this.model.updateRegion(id, {
      svgContent: this.view.els.svgRawContent.value
        .replace(/<svg[^>]*?>|<\/svg>/g, "")
        .trim(),
      status: "edited",
    });
    this.model.saveHistory();
  }

  fitArea() {
    const id = this.model.state.activeRegionId,
      r = this.model.getRegion(id);
    if (!r) return;
    r.type = "blueprint";
    const s = this.imageProcessor.processRegion(r.rect); // Returns null if invalid
    if (s) {
      this.model.updateRegion(id, {
        rect: s.newRect,
        svgContent: `<path d="${s.rle}" fill="black" />`,
        bpDims: s.bpDims,
        scale: { x: 1, y: 1 },
        offset: { x: 0, y: 0 },
      });
      this.model.saveHistory();
    }
  }

  fitContent() {
    const id = this.model.state.activeRegionId;
    if (id) {
      this.model.updateRegion(id, {
        scale: { x: 1, y: 1 },
        offset: { x: 0, y: 0 },
      });
      this.model.saveHistory();
    }
  }

  groupSelectedRegions() {
    const sel = this.model.state.regions.filter((r) =>
      this.model.state.selectedIds.has(r.id),
    );
    if (sel.length < 2) return;
    const cw = this.model.state.canvasWidth,
      ch = this.model.state.canvasHeight;
    let minX = Infinity,
      minY = Infinity,
      maxX = 0,
      maxY = 0;
    sel.forEach((r) => {
      minX = Math.min(minX, r.rect.x);
      minY = Math.min(minY, r.rect.y);
      maxX = Math.max(maxX, r.rect.x + r.rect.w);
      maxY = Math.max(maxY, r.rect.y + r.rect.h);
    });

    const grpW = maxX - minX;
    const grpH = maxY - minY;

    const svgContent = sel
      .map((r) => {
        const x = (r.rect.x - minX) * cw * CONFIG.aiScale;
        const y = (r.rect.y - minY) * ch * CONFIG.aiScale;
        const viewBox = Utils.SVG.viewBox(r, cw, ch);
        const w = r.rect.w * cw * CONFIG.aiScale;
        const h = r.rect.h * ch * CONFIG.aiScale;

        // Use Utils.SVG.wrap to create inner SVG content
        return Utils.SVG.wrap(r.svgContent, x, y, w, h, viewBox);
      })
      .join("");

    const grp = {
      id: `r${Date.now()}`,
      rect: { x: minX, y: minY, w: grpW, h: grpH },
      svgContent: svgContent,
      bpDims: { w: grpW * cw * CONFIG.aiScale, h: grpH * ch * CONFIG.aiScale },
      scale: { x: 1, y: 1 },
      offset: { x: 0, y: 0 },
      contentType: "group",
    };
    this.model.state.regions = this.model.state.regions.filter(
      (r) => !this.model.state.selectedIds.has(r.id),
    );
    this.model.addRegion(grp);
  }

  exportSVG() {
    const cw = this.model.state.canvasWidth,
      ch = this.model.state.canvasHeight;
    let content = "";
    this.model.state.regions.forEach((r) => {
      const { x, y, w, h } = Utils.Geo.toPixels(r.rect, cw, ch);
      const viewBox = Utils.SVG.viewBox(r, cw, ch);
      content +=
        Utils.SVG.wrap(
          r.svgContent,
          x.toFixed(2),
          y.toFixed(2),
          w.toFixed(2),
          h.toFixed(2),
          viewBox,
        ) + "\n";
    });
    const out = Utils.SVG.createRoot(cw, ch, content);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([out], { type: "image/svg+xml" }));
    a.download = "export.svg";
    a.click();
  }

  async generateContent(type) {
    const r = this.model.getRegion(this.model.state.activeRegionId);
    if (!r) return;
    if (type === "empty") {
      this.model.updateRegion(r.id, { svgContent: "", status: "done" });
      return;
    }

    this.view.els.aiStatus.classList.remove("hidden");
    const s = this.imageProcessor.processRegion(r.rect, 0);
    if (!s) {
      this.view.els.aiStatus.classList.add("hidden");
      return;
    }

    if (type === "blueprint") {
      this.model.updateRegion(r.id, {
        svgContent: `<path d="${s.rle}" fill="black" />`,
        status: "scanned",
        bpDims: s.bpDims,
      });
      this.view.els.aiStatus.classList.add("hidden");
      return;
    }

    try {
      const prompt = `You are a precision SVG Typesetter.\nINPUT: 2x scale scan.\nTASK: Generate ${type === "image" ? "SVG Graphic" : "SVG Text"}.\nViewBox: 0 0 ${s.bpDims.w} ${s.bpDims.h}. Output raw SVG only.`;
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: prompt },
                  { inlineData: { mimeType: "image/png", data: s.imageData } },
                ],
              },
            ],
          }),
        },
      );
      const json = await resp.json();
      const cleanSVG = json.candidates?.[0]?.content?.parts?.[0]?.text
        ?.replace(/```svg/g, "")
        .replace(/```/g, "")
        .replace(/<svg[^>]*>/g, "")
        .replace(/<\/svg>/g, "")
        .trim();
      if (!cleanSVG || cleanSVG.length < 10) throw new Error("Invalid output");
      this.model.updateRegion(r.id, {
        svgContent: cleanSVG,
        status: "generated",
        bpDims: s.bpDims,
      });
    } catch (e) {
      console.error(e);
    }
    this.view.els.aiStatus.classList.add("hidden");
  }

  async handleSvgImport(file) {
    if (!file) return;
    this.view.toggleLoader(true);
    try {
      const text = await file.text();
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");
      const root = doc.documentElement;
      const viewBox = root
        .getAttribute("viewBox")
        ?.split(/\s+/)
        .map(parseFloat) || [
        0,
        0,
        parseFloat(root.getAttribute("width") || "0"),
        parseFloat(root.getAttribute("height") || "0"),
      ];
      const cw = viewBox[2],
        ch = viewBox[3];

      if (this.model.state.canvasWidth === 0) {
        this.model.setCanvasDimensions(cw, ch, cw);
        this.view.els.pdfLayer.style.background = "white";
        this.updateBaseWidth();
        this.view.toggleWorkspace(true);
      }
      this.model.setState({ regions: [] });

      Array.from(root.children)
        .filter((el) => el.tagName.toLowerCase() === "svg")
        .forEach((el) => {
          const x = parseFloat(el.getAttribute("x")),
            y = parseFloat(el.getAttribute("y")),
            w = parseFloat(el.getAttribute("width")),
            h = parseFloat(el.getAttribute("height"));
          const [vx, vy, vw, vh] = el
            .getAttribute("viewBox")
            ?.split(/\s+/)
            .map(parseFloat) || [0, 0, w, h];
          const bpW = w * CONFIG.aiScale,
            bpH = h * CONFIG.aiScale,
            sx = vw > 0 ? bpW / vw : 1,
            sy = vh > 0 ? bpH / vh : 1;
          this.model.addRegion({
            id: `r${Date.now()}`,
            rect: { x: x / cw, y: y / ch, w: w / cw, h: h / ch },
            svgContent: el.innerHTML.trim(),
            bpDims: { w: bpW, h: bpH },
            offset: { x: -vx * sx, y: -vy * sy },
            scale: { x: sx, y: sy },
            contentType: "imported",
          });
        });
    } catch (e) {
      alert(e.message);
    }
    this.view.toggleLoader(false);
  }

  async autoSegment() {
    const s = this.model.state;
    if (s.canvasWidth === 0) return;
    this.view.els.aiStatus.classList.remove("hidden");
    this.model.setState({ regions: [] });

    const w = s.canvas.width,
      h = s.canvas.height;
    const d = s.canvas.getContext("2d").getImageData(0, 0, w, h).data;
    const visited = new Uint8Array(w * h);

    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!visited[i] && this.imageProcessor.isDark(d, i)) {
          let q = [{ x, y }],
            minX = x,
            maxX = x,
            minY = y,
            maxY = y,
            count = 0;
          visited[i] = 1;
          while (q.length) {
            const p = q.shift();
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
            count++;

            for (let dy = -10; dy <= 10; dy++)
              for (let dx = -10; dx <= 10; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = p.x + dx,
                  ny = p.y + dy;
                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                  const ni = ny * w + nx;
                  if (!visited[ni] && this.imageProcessor.isDark(d, ni)) {
                    visited[ni] = 1;
                    q.push({ x: nx, y: ny });
                  }
                }
              }
          }
          if (count > 250) {
            const scan = this.imageProcessor.processRegion({
              x: Math.max(0, minX - 2) / w,
              y: Math.max(0, minY - 2) / h,
              w: (Math.min(w - 1, maxX + 2) - Math.max(0, minX - 2)) / w,
              h: (Math.min(h - 1, maxY + 2) - Math.max(0, minY - 2)) / h,
            });
            if (scan)
              this.model.addRegion({
                id: `r${Date.now()}_${x}`,
                rect: scan.newRect,
                svgContent: `<path d="${scan.rle}" fill="black" />`,
                bpDims: scan.bpDims,
              });
          }
        }
      }
    this.view.els.aiStatus.classList.add("hidden");
  }
}

// ============================================================================
// 7. VIEW (BRIDGE)
// ============================================================================

class UIManager {
  constructor() {
    this.els = {};
    this.model = null;
  }

  init() {
    SciTextUI.init(this.els);
  }

  toggleLoader(show) {
    this.els.pdfLoader.classList.toggle("hidden", !show);
  }
  toggleWorkspace(show) {
    this.els.emptyState.classList.toggle("hidden", show);
    this.els.workspaceContainer.classList.toggle("hidden", !show);
  }
  hideRegionActionsBar() {
    this.els.regionActionsBar.classList.add("hidden");
  }

  showRegionActionsBar(region, state) {
    this.els.regionActionsBar.classList.remove("hidden");
    const scale = state.scaleMultiplier;
    const physW = state.baseWidth * scale;
    const physH = physW * (state.canvasHeight / state.canvasWidth);
    const rect = this.els.canvasWrapper.getBoundingClientRect();
    this.els.regionActionsBar.style.left = `${rect.left + region.rect.x * physW + (region.rect.w * physW) / 2 - this.els.regionActionsBar.offsetWidth / 2 - this.els.canvasScroller.scrollLeft}px`;
    this.els.regionActionsBar.style.top = `${rect.top + region.rect.y * physH - this.els.regionActionsBar.offsetHeight - 10 - this.els.canvasScroller.scrollTop}px`;
  }

  updatePropertiesInputs(region, state) {
    if (!region) {
      SciTextUI.layout.properties.forEach((p) => {
        const id = p.id.replace(/-./g, (x) => x[1].toUpperCase());
        if (this.els[id]) this.els[id].value = "";
      });
      return;
    }
    const cw = state.canvasWidth;
    const ch = state.canvasHeight;
    this.els["propX"].value = Math.round(region.rect.x * cw);
    this.els["propY"].value = Math.round(region.rect.y * ch);
    this.els["propW"].value = Math.round(region.rect.w * cw);
    this.els["propH"].value = Math.round(region.rect.h * ch);
    this.els["propOffsetX"].value = (region.offset?.x ?? 0).toFixed(1);
    this.els["propOffsetY"].value = (region.offset?.y ?? 0).toFixed(1);
    this.els["propScaleX"].value = (region.scale?.x ?? 1).toFixed(2);
    this.els["propScaleY"].value = (region.scale?.y ?? 1).toFixed(2);
  }

  renderActiveControls(region, state) {
    let frame = document.getElementById("active-selection-frame");
    if (!frame) {
      frame = document.createElement("div");
      frame.id = "active-selection-frame";
      frame.className = "selection-frame";
      this.els.interactionLayer.appendChild(frame);
      Object.keys(SciTextUI.handles).forEach((dir) => {
        const h = document.createElement("div");
        h.className = `resize-handle handle-${dir}`;
        frame.appendChild(h);
      });
    }
    const { cw, ch } = this.model.controller.draw.getPhysicalDims();
    const r = Utils.Geo.toPixels(region.rect, cw, ch);
    Object.assign(frame.style, {
      left: r.x + "px",
      top: r.y + "px",
      width: r.w + "px",
      height: r.h + "px",
    });
  }

  renderSplitLabel(bar, text) {
    let label = document.getElementById("split-bar-label");
    if (!label) {
      label = document.createElement("div");
      label.id = "split-bar-label";
      this.els.canvasWrapper.appendChild(label);
    }
    const barRect = bar.getBoundingClientRect(),
      wrapperRect = this.els.canvasWrapper.getBoundingClientRect(),
      scroller = this.els.canvasScroller;
    label.textContent = text;
    Object.assign(label.style, {
      left: `${barRect.left - wrapperRect.left + 5 + scroller.scrollLeft}px`,
      top: `${barRect.top - wrapperRect.top - label.offsetHeight - 5 + scroller.scrollTop}px`,
      transform: "none",
    });
  }

  renderSplitBar(region, state, splitType, splitPosition) {
    const { cw, ch } = this.model.controller.draw.getPhysicalDims();
    const bar = this.els.splitBar;
    bar.classList.remove("hidden");
    const r = Utils.Geo.toPixels(region.rect, cw, ch);

    if (splitType === "horizontal") {
      Object.assign(bar.style, {
        left: r.x + "px",
        top: r.y + r.h * splitPosition - 1 + "px",
        width: r.w + "px",
        height: "2px",
        cursor: "ns-resize",
      });
      this.renderSplitLabel(bar, "Horizontal (TAB to switch)");
    } else {
      Object.assign(bar.style, {
        left: r.x + r.w * splitPosition - 1 + "px",
        top: r.y + "px",
        width: "2px",
        height: r.h + "px",
        cursor: "ew-resize",
      });
      this.renderSplitLabel(bar, "Vertical (TAB to switch)");
    }
  }

  hideSplitBar() {
    this.els.splitBar.classList.add("hidden");
    const label = document.getElementById("split-bar-label");
    if (label) label.remove();
  }

  switchTab(tab) {
    const activeClass = "tab-button-active",
      inactiveClass = "tab-button";
    if (tab === "overlay") {
      this.els.tabOverlay.className = `${inactiveClass} ${activeClass}`;
      this.els.tabDebug.className = inactiveClass;
      this.els.workspaceContainer.classList.remove("hidden");
      this.els.debugContainer.classList.add("hidden");
    } else if (tab === "debug") {
      this.els.tabOverlay.className = inactiveClass;
      this.els.tabDebug.className = `${inactiveClass} ${activeClass}`;
      this.els.workspaceContainer.classList.add("hidden");
      this.els.debugContainer.classList.remove("hidden");
    }
  }

  renderLayerList(activeRegion) {
    const container = this.els.layerItems;
    if (!container) return;
    const regions = this.model.state.regions.slice().reverse();
    if (regions.length === 0) {
      container.innerHTML =
        '<div style="text-align:center;color:#9ca3af;font-size:0.75rem;padding:1rem;">No regions yet</div>';
      return;
    }
    container.innerHTML = regions
      .map((r) => {
        const isActive =
          r.id === (activeRegion?.id || this.model.state.activeRegionId);
        const eye = r.visible !== false ? "◉" : "◯";
        const label =
          r.status === "pending"
            ? "Pending"
            : r.contentType
              ? r.contentType.charAt(0).toUpperCase() + r.contentType.slice(1)
              : "Region";
        return `<div class="layer-item ${isActive ? "active" : ""}" data-id="${r.id}"><span class="drag-handle">⋮⋮</span><span class="visibility-toggle ${r.visible !== false ? "" : "hidden"}">${eye}</span><span class="layer-name">${label}</span><span class="delete-btn">×</span></div>`;
      })
      .join("");
  }

  render(state) {
    this.els.regionCount.textContent = state.regions.length;
    this.els.zoomLevel.textContent =
      Math.round(state.scaleMultiplier * 100) + "%";

    const physW =
      state.baseWidth > 0
        ? state.baseWidth * state.scaleMultiplier
        : state.canvasWidth * state.scaleMultiplier;
    const physH = physW * (state.canvasHeight / state.canvasWidth);

    if (state.canvasWidth > 0) {
      this.els.canvasWrapper.style.width = physW + "px";
      this.els.canvasWrapper.style.height = physH + "px";
    }

    this.els.svgLayer.innerHTML = "";
    this.els.interactionLayer.innerHTML = "";
    this.els.selectionBox.style.display = "none";
    this.hideSplitBar();
    const oldFrame = document.getElementById("active-selection-frame");
    if (oldFrame) oldFrame.remove();

    state.regions.forEach((r) => {
      const { x, y, w, h } = Utils.Geo.toPixels(r.rect, physW, physH);
      const div = document.createElement("div");
      div.className = "absolute region-highlight";
      if (state.selectedIds.has(r.id)) div.classList.add("region-selected");
      if (r.visible === false) div.style.opacity = "0.3";
      Object.assign(div.style, {
        left: x + "px",
        top: y + "px",
        width: w + "px",
        height: h + "px",
      });
      div.dataset.id = r.id;
      this.els.interactionLayer.appendChild(div);

      if (r.visible !== false && r.svgContent) {
        const viewBox = Utils.SVG.viewBox(
          r,
          state.canvasWidth,
          state.canvasHeight,
        );
        const svg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg",
        );
        svg.setAttribute("viewBox", viewBox);
        svg.setAttribute("preserveAspectRatio", "none");
        Object.assign(svg.style, {
          position: "absolute",
          left: x + "px",
          top: y + "px",
          width: w + "px",
          height: h + "px",
          pointerEvents: "none",
        });
        svg.innerHTML = r.svgContent;
        this.els.svgLayer.appendChild(svg);
      }
    });

    const active = state.activeRegionId
      ? state.regions.find((r) => r.id === state.activeRegionId)
      : null;
    this.updatePropertiesInputs(active, state);

    if (active && active.svgContent !== undefined) {
      this.els.svgRawEditorPanel.classList.remove("hidden");
      if (this.els.svgRawContent.value !== active.svgContent)
        this.els.svgRawContent.value = active.svgContent;
    } else {
      this.els.svgRawEditorPanel.classList.add("hidden");
    }

    if (active) {
      if (this.model.controller.splitMode) {
        this.renderSplitBar(
          active,
          state,
          this.model.controller.splitType,
          this.model.controller.splitPosition,
        );
        this.hideRegionActionsBar();
      } else {
        this.renderActiveControls(active, state);
        this.showRegionActionsBar(active, state);
      }
    } else {
      this.hideRegionActionsBar();
    }
    this.renderLayerList(active);

    if (!this.els.debugContainer.classList.contains("hidden")) {
      this.els.debugLog.textContent = JSON.stringify(state, null, 2);
      if (active && state.canvas) {
        const { x, y, w, h } = Utils.Geo.toPixels(
          active.rect,
          state.canvasWidth,
          state.canvasHeight,
        );
        if (w > 0 && h > 0) {
          const t = document.createElement("canvas");
          t.width = w;
          t.height = h;
          t.getContext("2d").drawImage(state.canvas, x, y, w, h, 0, 0, w, h);
          this.els.debugSourceImg.src = t.toDataURL();
        }
        const offX = active.offset?.x ?? 0,
          offY = active.offset?.y ?? 0;
        const bpW = active.bpDims?.w ?? w,
          bpH = active.bpDims?.h ?? h;
        this.els.debugRenderView.innerHTML = `<svg viewBox="${-offX} ${-offY} ${bpW} ${bpH}" style="width:100%;height:100%">${active.svgContent || ""}</svg>`;
      }
    }
  }
}

// ============================================================================
// 8. BOOTSTRAP
// ============================================================================

const appObject = (function () {
  const model = new SciTextModel();
  const view = new UIManager();
  const controller = new SciTextController(model, view);
  view.model = model;
  view.model.controller = controller;
  model.subscribe((state) => view.render(state));
  return {
    bootstrap: async () => {
      const mod = await import(`./sampleImage.js?v=${Date.now()}`);
      window.embeddedDefaultImage = mod.default;
      controller.init();
    },
    model,
    view,
    controller,
  };
})();
export default appObject;
