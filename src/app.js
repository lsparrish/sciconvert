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

const HANDLES = {
  nw: { top: "-4px", left: "-4px", cursor: "nwse-resize" },
  n: {
    top: "-4px",
    left: "50%",
    transform: "translateX(-50%)",
    cursor: "ns-resize",
  },
  ne: { top: "-4px", right: "-4px", cursor: "nesw-resize" },
  e: {
    top: "50%",
    right: "-4px",
    transform: "translateY(-50%)",
    cursor: "ew-resize",
  },
  se: { bottom: "-4px", right: "-4px", cursor: "nwse-resize" },
  s: {
    bottom: "-4px",
    left: "50%",
    transform: "translateX(-50%)",
    cursor: "ns-resize",
  },
  sw: { bottom: "-4px", left: "-4px", cursor: "nesw-resize" },
  w: {
    top: "50%",
    left: "-4px",
    transform: "translateY(-50%)",
    cursor: "ew-resize",
  },
};

const apiKey = ""; // Injected by environment

// ============================================================================
// 2. SciTextUI (SCHEMA, STYLES, BUILDER)
// ============================================================================

class SciTextUI {
  // --- UI Configuration (Schema) ---
  static get layout() {
    return {
      header: [
        { id: "zoom-out", text: "-", fn: "zoomOut" },
        { id: "zoom-level", type: "display", text: "100%" },
        { id: "zoom-in", text: "+", fn: "zoomIn" },
        { type: "divider" },
        { id: "btn-undo", text: "Undo", fn: "undo" },
        { id: "btn-redo", text: "Redo", fn: "redo" },
        {
          id: "fullscreen-toggle",
          text: "Full Screen",
          fn: "toggleFullscreen",
        },
      ],
      properties: [
        { label: "Pos X", id: "prop-x", group: "geometry", map: "rect.x" },
        { label: "Pos Y", id: "prop-y", group: "geometry", map: "rect.y" },
        { label: "Width", id: "prop-w", group: "geometry", map: "rect.w" },
        { label: "Height", id: "prop-h", group: "geometry", map: "rect.h" },
        {
          label: "Offset X",
          id: "prop-offset-x",
          group: "transform",
          step: "0.1",
          map: "offset.x",
        },
        {
          label: "Offset Y",
          id: "prop-offset-y",
          group: "transform",
          step: "0.1",
          map: "offset.y",
        },
        {
          label: "Scale X",
          id: "prop-scale-x",
          group: "transform",
          step: "0.05",
          map: "scale.x",
        },
        {
          label: "Scale Y",
          id: "prop-scale-y",
          group: "transform",
          step: "0.05",
          map: "scale.y",
        },
      ],
      footer: [
        {
          id: "btn-auto-segment",
          text: "Auto Segment",
          class: "btn-danger",
          fn: "autoSegment",
        },
        {
          id: "btn-export",
          text: "Export",
          class: "btn-success",
          fn: "exportSVG",
        },
        {
          id: "btn-clear-all",
          text: "Reset",
          class: "btn-ghost text-danger",
          fn: "resetAll",
        },
      ],
      floating: [
        { label: "Digitize", type: "text", class: "bg-primary" },
        { label: "Image", type: "image", class: "bg-warn" },
        { label: "Scan", type: "blueprint", class: "bg-success" },
        { label: "Empty", type: "empty", class: "bg-gray" },
        { type: "divider" },
        {
          id: "btn-fit-area",
          label: "Fit Area",
          class: "bg-gray",
          fn: "fitArea",
        },
        {
          id: "btn-fit-content",
          label: "Fill",
          class: "bg-gray",
          fn: "fitContent",
        },
        { type: "divider" },
        {
          id: "btn-split",
          label: "Split",
          class: "bg-gray",
          fn: "enterSplitMode",
        },
        {
          id: "btn-group",
          label: "Group",
          class: "bg-gray",
          fn: "groupSelectedRegions",
        },
        {
          id: "btn-delete",
          label: "Del",
          class: "bg-danger",
          fn: "deleteSelected",
        },
      ],
    };
  }

  // --- Component Templates ---
  static get components() {
    return {
      root: { tag: "div", id: "template-structure", class: "flex-col" },
      header: { tag: "header", class: "app-header z-30 shrink-0" },
      flexRow: { class: "flex-row-gap-1" },
      flexGap: { class: "flex-gap-quarter" },
      headerDiv: {
        tag: "div",
        style: "width:1px; height:0.5rem; background:#4b5563;",
      },
      // Sidebar
      sidebar: { tag: "div", class: "sidebar-panel" },
      propHead: { tag: "div", class: "prop-header" },
      geoInputs: { tag: "div", class: "geometry-inputs" },
      geoGroup: { tag: "div" },
      rawEditor: {
        tag: "div",
        id: "svg-raw-editor-panel",
        class: "svg-editor-panel hidden",
      },
      layerList: {
        tag: "div",
        id: "layer-list",
        class: "layer-list-container",
      },
      layerHead: { tag: "div", class: "layer-list-header", text: "Layers" },
      layerItems: {
        tag: "div",
        id: "layer-items",
        class: "layer-items-container",
      },
      panelFoot: { tag: "div", class: "sidebar-footer" },

      // Canvas
      canvasArea: { tag: "div", class: "canvas-view-style" },
      scroller: { tag: "div", class: "canvas-scroller-style" },
      wrapper: { tag: "div", class: "canvas-wrapper-style" },

      // Base Elements
      title: { tag: "h1", class: "header-title" },
      labelTiny: { tag: "span", class: "input-label" },
      inputNum: { tag: "input", type: "number", class: "input-field" },
      btnAction: { tag: "button", class: "action-bar-btn" },
      hiddenIn: { tag: "input", type: "file", class: "hidden" },

      // Overlays
      debugCon: {
        tag: "div",
        id: "debug-container",
        class: "debug-container hidden",
      },
      emptyState: {
        tag: "div",
        id: "empty-state",
        class: "empty-state-style",
      },
      loader: {
        tag: "div",
        id: "pdf-loader",
        class: "loader-style hidden",
      },
      actionBar: {
        tag: "div",
        id: "region-actions-bar",
        class: "region-actions-bar hidden",
      },
      barDivider: {
        tag: "div",
        style: "width:1px;height:1.5rem;background:#d1d5db;",
      },
    };
  }

  // --- CSS Styles ---
  static get styles() {
    return {
      "*, *::before, *::after": {
        "box-sizing": "border-box",
        margin: "0",
        padding: "0",
      },
      body: {
        "font-family": '"Segoe UI", sans-serif',
        "background-color": "#111827",
        "min-height": "100vh",
        display: "flex",
        "flex-direction": "column",
        color: "#1f2937",
        "font-size": "14px",
      },
      ".hidden": { display: "none !important" },
      ".relative": { position: "relative" },
      ".absolute": { position: "absolute" },
      ".inset-0": { top: "0", left: "0", right: "0", bottom: "0" },
      ".transition": { transition: "all 0.15s ease-in-out" },
      ".uppercase": { "text-transform": "uppercase" },
      ".select-none": { "user-select": "none" },
      ".disabled-bar": { opacity: "0.5", "pointer-events": "none" },

      // Header
      ".app-header": {
        "background-color": "#1f2937",
        padding: "0.75rem",
        display: "flex",
        "justify-content": "space-between",
        "align-items": "center",
        "border-bottom": "1px solid #111827",
        "z-index": "30",
      },
      ".header-title": {
        "font-size": "1.25rem",
        "font-weight": "700",
        color: "#f3f4f6",
        "margin-right": "1rem",
      },
      ".flex-row-gap-1": {
        display: "flex",
        "align-items": "center",
        gap: "1rem",
      },
      ".flex-gap-quarter": { display: "flex", gap: "0.25rem" },
      ".flex-item-end": {
        display: "flex",
        "align-items": "center",
        gap: "1rem",
      }, // For AI Status / Full Screen button
      ".zoom-group-style": {
        display: "flex",
        border: "1px solid #4b5563",
        "border-radius": "0.375rem",
      },
      ".zoom-label-style": {
        "font-size": "0.75rem",
        width: "3.5rem",
        "text-align": "center",
        color: "#e5e7eb",
        "align-self": "center",
      },

      // Buttons
      ".btn": {
        padding: "0.375rem 0.75rem",
        "border-radius": "0.25rem",
        "font-weight": "600",
        display: "flex",
        "align-items": "center",
        gap: "0.5rem",
        cursor: "pointer",
        border: "1px solid transparent",
        transition: "all 0.15s",
      },
      ".btn-primary": { "background-color": "#2563eb", color: "white" },
      ".btn-secondary": {
        "background-color": "#374151",
        color: "#e5e7eb",
        "border-color": "#4b5563",
        "font-size": "0.75rem",
      },
      ".action-bar-btn": {
        padding: "0.25rem 0.75rem",
        "border-radius": "0.25rem",
        "font-weight": "700",
        "font-size": "0.75rem",
        color: "white",
        border: "1px solid transparent",
        cursor: "pointer",
      },
      ".btn-danger": { "background-color": "#dc2626", color: "white" },
      ".btn-success": { "background-color": "#047857", color: "white" },
      ".btn-ghost": {
        background: "transparent",
        border: "1px solid transparent",
      },
      ".text-danger": { color: "#ef4444" },

      // Color Utilities
      ".bg-primary": { "background-color": "#2563eb" },
      ".bg-warn": { "background-color": "#d97706" },
      ".bg-success": { "background-color": "#059669" },
      ".bg-gray": { "background-color": "#4b5563" },
      ".bg-danger": { "background-color": "#ef4444" },

      // Layout Panels
      ".main-content-wrapper": {
        flex: "1",
        display: "flex",
        "flex-direction": "column",
        overflow: "hidden",
        position: "relative",
        "background-color": "white",
      },
      ".tab-button-group": {
        background: "#f9fafb",
        "border-bottom": "1px solid #e5e7eb",
        "flex-shrink": "0",
        padding: "0",
      },
      ".workspace-container": {
        flex: "1",
        display: "flex",
        overflow: "hidden",
        position: "relative",
      },
      ".sidebar-panel": {
        width: "20rem",
        display: "flex",
        "flex-direction": "column",
        "border-right": "1px solid #e5e7eb",
        "background-color": "white",
        "z-index": "10",
      },

      // Sidebar Details
      ".prop-header": {
        "background-color": "#f3f4f6",
        padding: "0.75rem 1rem",
        "border-bottom": "1px solid #e5e7eb",
        display: "flex",
        "flex-direction": "column",
        gap: "0.5rem",
      },
      ".geometry-inputs": {
        padding: "1rem",
        "background-color": "#f9fafb",
        "border-bottom": "1px solid #e5e7eb",
        display: "grid",
        "grid-template-columns": "1fr 1fr",
        gap: "0.75rem",
        "font-size": "0.75rem",
        position: "relative",
      },
      ".input-label": {
        display: "block",
        color: "#9ca3af",
        "font-weight": "700",
        "margin-bottom": "0.25rem",
        "font-size": "10px",
        "text-transform": "uppercase",
      },
      ".input-field": {
        width: "100%",
        border: "1px solid #d1d5db",
        "border-radius": "0.25rem",
        padding: "0.375rem",
        "text-align": "center",
      },
      ".input-wrapper-header": {
        "grid-column": "1 / span 2",
        "margin-top": "0.5rem",
        position: "relative",
      },
      ".input-wrapper-tiny-label": {
        position: "absolute",
        top: "0.15rem",
        right: "0",
        "font-size": "9px",
        "font-weight": "700",
        color: "#60a5fa",
      },
      ".sidebar-footer": {
        padding: "0.75rem",
        "border-top": "1px solid #e5e7eb",
        "background-color": "#f9fafb",
        display: "flex",
        "flex-wrap": "wrap",
        gap: "0.5rem",
        "justify-content": "space-between",
      },
      ".svg-editor-panel": {
        padding: "1rem",
        "background-color": "#fff",
        "border-bottom": "1px solid #e5e7eb",
        display: "flex",
        "flex-direction": "column",
        gap: "0.5rem",
      },
      ".svg-textarea": {
        width: "100%",
        "min-height": "150px",
        border: "1px solid #d1d5db",
        "border-radius": "0.25rem",
        padding: "0.5rem",
        "font-family": "monospace",
        "font-size": "11px",
        "line-height": "1.2",
        resize: "vertical",
      },
      ".layer-items-container": {
        flex: "1",
        "overflow-y": "auto",
        padding: "0.25rem 0",
      },

      // Canvas Structure
      ".canvas-view-style": {
        flex: "1",
        display: "flex",
        "flex-direction": "column",
        "background-color": "#e5e7eb",
        position: "relative",
      },
      ".canvas-scroller-style": {
        flex: "1",
        overflow: "auto",
        display: "flex",
        "justify-content": "center",
        padding: "1rem",
        position: "relative",
      },
      ".canvas-wrapper-style": {
        "box-shadow": "0 20px 25px -5px rgba(0,0,0,0.5)",
        "background-color": "white",
        position: "relative",
        "transform-origin": "top",
      },

      // Layer List
      ".layer-list-container": {
        display: "flex",
        "flex-direction": "column",
        "background-color": "#e5e7eb",
        overflow: "hidden",
        position: "relative",
      },
      ".layer-list-header": {
        padding: "0.5rem 1rem",
        background: "#f3f4f6",
        "border-bottom": "1px solid #e5e7eb",
        "font-size": "0.75rem",
        "font-weight": "700",
        color: "#4b5563",
        "text-transform": "uppercase",
      },
      ".layer-item": {
        padding: "0.5rem 0.75rem",
        display: "flex",
        "align-items": "center",
        gap: "0.5rem",
        "font-size": "0.75rem",
        cursor: "pointer",
        "border-bottom": "1px solid #e5e7eb",
        background: "white",
        transition: "background 0.15s",
      },
      ".layer-item:hover": { background: "#f3f4f6" },
      ".layer-item.active": { background: "#dbeafe", "font-weight": "600" },
      ".layer-item .visibility-toggle": {
        "font-size": "1rem",
        opacity: "0.6",
        cursor: "pointer",
      },
      ".layer-item .delete-btn": {
        color: "#ef4444",
        opacity: "0",
        "font-size": "0.9rem",
      },
      ".layer-item:hover .delete-btn": { opacity: "1" },

      // Region & Interactions
      ".region-highlight": {
        "background-color": "rgba(59, 130, 246, 0.1)",
        border: "1px solid #3b82f6",
        opacity: "0.6",
        "pointer-events": "all",
      },
      ".region-highlight:hover": {
        opacity: "0.9",
        "border-width": "2px",
        cursor: "move",
      },
      ".region-selected": {
        border: "2px solid #2563eb",
        "background-color": "rgba(37, 99, 235, 0.2)",
        opacity: "1.0",
      },
      "#selection-box": {
        border: "2px dashed #2563eb",
        background: "rgba(37, 99, 235, 0.1)",
        position: "absolute",
        "pointer-events": "none",
        display: "none",
        "z-index": "50",
      },
      ".selection-frame": {
        position: "absolute",
        border: "1px solid #3b82f6",
        "box-shadow": "0 0 0 1px rgba(59,130,246,0.3)",
        "pointer-events": "none",
        "z-index": "40",
      },
      ".resize-handle": {
        position: "absolute",
        width: "8px",
        height: "8px",
        background: "white",
        border: "1px solid #2563eb",
        "z-index": "50",
        "pointer-events": "all",
      },
      ".resize-handle:hover": { background: "#2563eb" },

      // Action Bar & Widgets
      ".region-actions-bar": {
        position: "fixed",
        "z-index": "100",
        background: "rgba(255,255,255,0.95)",
        padding: "0.5rem",
        "border-radius": "0.5rem",
        "box-shadow": "0 4px 6px rgba(0,0,0,0.1)",
        border: "1px solid #d1d5db",
        display: "flex",
        gap: "0.5rem",
      },
      ".tab-button": {
        padding: "0.5rem 1rem",
        "font-size": "0.75rem",
        "font-weight": "600",
        color: "#6b7280",
        "border-bottom": "2px solid transparent",
        cursor: "pointer",
      },
      ".tab-button-active": {
        color: "#2563eb",
        "border-bottom-color": "#2563eb",
      },
      "#split-bar": {
        position: "absolute",
        "z-index": "50",
        background: "#ef4444",
        opacity: "0.8",
        "pointer-events": "none",
        "box-shadow": "0 0 0 1px #dc2626",
      },
      "#split-bar-label": {
        position: "absolute",
        background: "#ef4444",
        color: "white",
        "font-size": "10px",
        "font-weight": "700",
        padding: "2px 4px",
        "border-radius": "3px",
        "pointer-events": "none",
        "white-space": "nowrap",
      },

      // Loaders & Animations
      ".debug-container": {
        flex: "1",
        background: "#111827",
        padding: "1.5rem",
        overflow: "auto",
      },
      ".empty-state-style": {
        position: "absolute",
        inset: "0",
        display: "flex",
        "flex-direction": "column",
        "align-items": "center",
        "justify-content": "center",
        background: "#f3f4f6",
      },
      ".loader-style": {
        position: "absolute",
        inset: "0",
        background: "rgba(17,24,39,0.8)",
        display: "flex",
        "flex-direction": "column",
        "align-items": "center",
        "justify-content": "center",
        "z-index": "50",
      },
      ".loader-spinner": {
        width: "3rem",
        height: "3rem",
        border: "4px solid #4b5563",
        "border-top-color": "#3b82f6",
        "border-radius": "9999px",
        animation: "spin 1s linear infinite",
      },
      "@keyframes spin": {
        from: { transform: "rotate(0deg)" },
        to: { transform: "rotate(360deg)" },
      },
      "#ai-status": { animation: "pulse 1s infinite alternate" },
      "@keyframes pulse": { from: { opacity: "0.5" }, to: { opacity: "1" } },
      ".debug-image-container": {
        flex: "1",
        background: "#000",
        border: "1px solid #374151",
        height: "200px",
        display: "flex",
        "justify-content": "center",
        "align-items": "center",
      },
      ".debug-render-view": {
        flex: "1",
        background: "#fff",
        border: "1px solid #374151",
        height: "200px",
      },
      ".empty-state-card": {
        background: "white",
        padding: "2rem",
        "border-radius": "1rem",
        "box-shadow": "0 10px 15px rgba(0,0,0,0.1)",
        "text-align": "center",
      },
    };
  }

  // --- Static Builders ---

  static generateCSS() {
    let css = "";
    Object.entries(SciTextUI.styles).forEach(([selector, rules]) => {
      css += `${selector} { `;
      Object.entries(rules).forEach(([prop, val]) => {
        if (typeof val === "object") {
          // Keyframes/Nested
          css += `${prop} { `;
          Object.entries(val).forEach(([p, v]) => (css += `${p}: ${v}; `));
          css += "} ";
        } else {
          css += `${prop}: ${val}; `;
        }
      });
      css += "} \n";
    });

    Object.entries(HANDLES).forEach(([dir, props]) => {
      let rule = `.handle-${dir} { position: absolute; width: 8px; height: 8px; background: white; border: 1px solid #2563eb; z-index: 50; pointer-events: all; `;
      Object.entries(props).forEach(([k, v]) => (rule += `${k}: ${v}; `));
      rule += "} ";
      css += rule + "\n";
    });
    return css;
  }

  static buildElement(schema, parent, bindTarget) {
    if (!schema) return;
    let config = schema;
    if (schema.def && SciTextUI.components[schema.def]) {
      config = { ...SciTextUI.components[schema.def], ...schema };
    }

    const el = document.createElement(config.tag || "div");
    if (config.id) {
      el.id = config.id;
      if (bindTarget)
        bindTarget[config.id.replace(/-./g, (x) => x[1].toUpperCase())] = el;
    }

    if (config.class) el.className = config.class;
    if (config.style) el.style.cssText = config.style;
    if (config.text) el.textContent = config.text;
    if (config.html) el.innerHTML = config.html;

    Object.keys(config).forEach((key) => {
      if (
        ![
          "tag",
          "id",
          "class",
          "style",
          "text",
          "html",
          "children",
          "def",
          "data-type",
        ].includes(key)
      ) {
        el.setAttribute(key, config[key]);
      }
    });

    if (config["data-type"]) el.dataset.type = config["data-type"];
    if (parent) parent.appendChild(el);
    if (config.children)
      config.children.forEach((child) =>
        SciTextUI.buildElement(child, el, bindTarget),
      );
    return el;
  }

  static getDOMStructure() {
    const layout = SciTextUI.layout;

    // --- Component Helpers ---

    const makePropInput = (p) => ({
      def: "geoGroup",
      children: [
        { def: "labelTiny", text: p.label },
        { def: "inputNum", id: p.id, step: p.step },
      ],
    });

    const makeButton = (b, type) => {
      if (b.type === "divider") return { def: "headerDiv" };
      if (b.type === "display")
        return {
          def: "zoomLabel",
          id: b.id,
          text: b.text,
          class: "zoom-label-style",
        };
      if (type === "floating")
        return {
          def: "btnAction",
          id: b.id,
          text: b.label,
          class: `action-bar-btn ${b.class}`,
          "data-type": b.type,
        };
      if (type === "footer")
        return {
          tag: "button",
          id: b.id,
          text: b.text,
          class: `btn ${b.class}`,
        };
      // Default: Zoom button
      return {
        tag: "button",
        id: b.id,
        style: "color:#d1d5db; padding:0.25rem 0.5rem;",
        text: b.text,
      };
    };

    const makeHiddenFileSelect = (id, text, accept) => ({
      tag: "div",
      class: "relative",
      children: [
        { def: "hiddenIn", id: id, accept: accept },
        { tag: "label", for: id, class: "btn btn-primary", text: text },
      ],
    });

    const makeZoomControls = () => ({
      tag: "div",
      class: "zoom-group-style",
      children: layout.header.slice(0, 3).map((b) => makeButton(b)),
    });

    const makeHeaderButtons = () => ({
      def: "flexGap",
      children: layout.header.slice(4).map((b) => ({
        tag: "button",
        id: b.id,
        class: "btn btn-secondary",
        text: b.text,
      })),
    });

    const makeFooterButtons = () => ({
      tag: "div",
      class: "flex-gap-quarter",
      style: "width:100%;",
      children: [
        ...layout.footer.map((b) => makeButton(b, "footer")),
        makeHiddenFileSelect("svg-import", "Import", ".svg"),
      ],
    });

    const makeFloatingButtons = () => ({
      def: "actionBar",
      children: [
        ...layout.floating.slice(0, 4).map((b) => makeButton(b, "floating")),
        { def: "barDivider" },
        ...layout.floating.slice(5, 7).map((b) => makeButton(b, "floating")),
        { def: "barDivider" },
        ...layout.floating.slice(8).map((b) => makeButton(b, "floating")),
      ],
    });

    // --- Main Structure Definition ---

    return {
      def: "root",
      children: [
        // Header
        {
          def: "header",
          children: [
            {
              def: "flexRow",
              children: [
                { def: "title", html: `SciText <span>Digitizer</span>` },
                makeHiddenFileSelect(
                  "pdf-upload",
                  "Load",
                  "application/pdf, image/*",
                ),
              ],
            },
            { def: "headerDiv" },
            makeZoomControls(),
            makeHeaderButtons(),
            {
              tag: "div",
              class: "flex-item-end",
              children: [
                {
                  tag: "span",
                  id: "ai-status",
                  class: "hidden",
                  style:
                    "color:#60a5fa; font-size:0.75rem; font-family:monospace;",
                  text: "Processing...",
                },
                {
                  tag: "button",
                  id: "fullscreen-toggle",
                  class: "btn btn-secondary",
                  text: "Full Screen",
                },
              ],
            },
          ],
        },
        // Main
        {
          tag: "main",
          class: "main-content-wrapper",
          children: [
            {
              tag: "div",
              class: "tab-button-group",
              children: [
                {
                  tag: "button",
                  id: "tab-overlay",
                  class: "tab-button tab-button-active",
                  text: "Compositor",
                },
                {
                  tag: "button",
                  id: "tab-debug",
                  class: "tab-button",
                  text: "Debug View",
                },
              ],
            },
            // Workspace
            {
              tag: "div",
              id: "workspace-container",
              class: "workspace-container hidden",
              children: [
                {
                  def: "sidebar",
                  children: [
                    {
                      def: "propHead",
                      children: [
                        {
                          def: "flexRow",
                          style: "justify-content:space-between;",
                          children: [
                            {
                              tag: "span",
                              class: "uppercase",
                              style:
                                "font-size:0.75rem; font-weight:700; color:#4b5563;",
                              text: "Properties",
                            },
                            {
                              tag: "span",
                              id: "region-count",
                              class: "region-count-badge",
                              text: "0",
                            },
                          ],
                        },
                      ],
                    },
                    {
                      def: "geoInputs",
                      children: [
                        {
                          tag: "div",
                          style:
                            "position:absolute; top:0.25rem; right:0.5rem; font-size:9px; font-weight:700; color:#60a5fa;",
                          text: "COORDS (Normalized Pixels)",
                        },
                        ...layout.properties
                          .filter((p) => p.group === "geometry")
                          .map(makePropInput),
                        {
                          tag: "div",
                          class: "input-wrapper-header",
                          children: [
                            {
                              tag: "span",
                              class: "input-label",
                              style: "text-align:center; display:block;",
                              text: "SVG Content Adjustment",
                            },
                            {
                              tag: "div",
                              class: "input-wrapper-tiny-label",
                              text: "OFFSET/SCALE",
                            },
                          ],
                        },
                        ...layout.properties
                          .filter((p) => p.group === "transform")
                          .map(makePropInput),
                      ],
                    },
                    {
                      def: "rawEditor",
                      children: [
                        {
                          tag: "span",
                          class: "input-label",
                          style: "margin-bottom:0;",
                          text: "SVG Content (Edit Raw)",
                        },
                        {
                          tag: "textarea",
                          id: "svg-raw-content",
                          class: "svg-textarea",
                        },
                        {
                          tag: "button",
                          id: "btn-save-raw-svg",
                          class: "action-bar-btn",
                          style: "background:#4f46e5; font-size:0.75rem;",
                          text: "Apply Changes",
                        },
                      ],
                    },
                    {
                      def: "layerList",
                      children: [
                        {
                          def: "layerHead",
                          children: [
                            {
                              tag: "button",
                              id: "btn-toggle-visibility-all",
                              style:
                                "float:right; background:none; border:none; cursor:pointer; color:#6b7280; font-size:1rem;",
                              text: "👁",
                            },
                          ],
                        },
                        { def: "layerItems" },
                      ],
                    },
                    {
                      def: "panelFoot",
                      children: [makeFooterButtons()],
                    },
                  ],
                },
                {
                  def: "canvasArea",
                  id: "canvas-view-area",
                  children: [
                    {
                      def: "scroller",
                      id: "canvas-scroller",
                      children: [
                        {
                          def: "wrapper",
                          id: "canvas-wrapper",
                          children: [
                            {
                              tag: "div",
                              id: "pdf-layer",
                              class: "transition absolute inset-0",
                            },
                            {
                              tag: "div",
                              id: "svg-layer",
                              class: "absolute inset-0 z-10",
                              style: "pointer-events:none;",
                            },
                            {
                              tag: "div",
                              id: "interaction-layer",
                              class: "absolute inset-0 z-20",
                            },
                            { tag: "div", id: "selection-box" },
                            { tag: "div", id: "split-bar", class: "hidden" },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              def: "debugCon",
              children: [
                {
                  tag: "div",
                  class: "flex-row-gap-1",
                  style: "margin-bottom:1rem;",
                  children: [
                    {
                      tag: "div",
                      class: "debug-image-container",
                      children: [
                        {
                          tag: "img",
                          id: "debug-source-img",
                          style: "max-width:100%; max-height:100%;",
                        },
                      ],
                    },
                    {
                      tag: "div",
                      id: "debug-render-view",
                      class: "debug-render-view",
                    },
                  ],
                },
                {
                  tag: "pre",
                  id: "debug-log",
                  style:
                    "color:#4ade80; font-size:10px; font-family:monospace;",
                },
              ],
            },
            {
              def: "emptyState",
              children: [
                {
                  tag: "div",
                  style:
                    "background:white; padding:2rem; border-radius:1rem; box-shadow:0 10px 15px rgba(0,0,0,0.1); text-align:center;",
                  children: [
                    {
                      tag: "h2",
                      style:
                        "font-size:1.25rem; font-weight:700; color:#374151;",
                      text: "No Document Loaded",
                    },
                    {
                      tag: "p",
                      style: "color:#6b7280; margin-top:0.5rem;",
                      text: "Upload PDF or Image to start.",
                    },
                  ],
                },
              ],
            },
            {
              def: "loader",
              children: [
                { tag: "div", class: "loader-spinner" },
                {
                  tag: "span",
                  style: "color:white; font-weight:700; margin-top:1rem;",
                  text: "Loading...",
                },
              ],
            },
            { tag: "canvas", id: "processing-canvas", style: "display:none;" },
          ],
        },
        // Action Bar
        makeFloatingButtons(),
      ],
    };
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
      for (const [dir, h] of Object.entries(HANDLES)) {
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
          ? `${HANDLES[hit.handle].cursor}`
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
      this.model.updateRegion(r.id, {
        svgContent: `<text x="10" y="30" fill="red" font-size="20">ERROR</text>`,
      });
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
      Object.keys(HANDLES).forEach((dir) => {
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
      const mod = await import(`./appTest.js?v=${Date.now()}`);
      window.embeddedDefaultImage = mod.default;
      controller.init();
    },
    model,
    view,
    controller,
  };
})();
export default appObject;
