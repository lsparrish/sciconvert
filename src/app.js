/*
 * SciText Digitizer
 * Architecture:
 * 1. CONFIG & SYSTEM (Environment)
 * 2. SciTextUI (The "Dedicated Object" for UI System)
 * 3. Model (State)
 * 4. Controller (Logic & Interaction - with restored algorithms)
 * 5. View (Bridge between UI System and Model)
 */

// ============================================================================
// 1. CONFIG
// ============================================================================

const CONFIG = {
    defaultImgUrl: "https://lsparrish.github.io/sciconvert/sample.png",
    localImgPath: "./sample.png",
    aiScale: 2.0
};

const apiKey = ""; // Injected by environment

// ============================================================================
// 2. SciTextUI (THE DEDICATED UI OBJECT)
// ============================================================================

const SciTextUI = {
    // --- Data: Theme ---
    Theme: {
        colors: {
            primary: "#2563eb",  primaryHover: "#3b82f6",
            danger:  "#ef4444",  success:      "#059669",
            warn:    "#d97706",  accent:       "#60a5fa",
            dark:    "#111827",  panel:        "#ffffff",
            surface: "#f9fafb",  surfaceHov:   "#f3f4f6",
            border:  "#e5e7eb",
            txtMain: "#1f2937",  txtMuted:     "#6b7280", 
            txtInv:  "#ffffff",  txtLight:     "#f3f4f6",
            
            // Specific colors for buttons/interactions that were previously hardcoded
            gray:    "#4b5563",
            fitArea: "#6b21a8",  
            fitContent: "#1e40af", 
            split:   "#4338ca",  
            group:   "#0d9488",
        },
        spacing: { 0: "0", 1: "0.25rem", 2: "0.5rem", 3: "0.75rem", 4: "1rem" },
        type: {
            family: { sans: '"Segoe UI", sans-serif', mono: 'Consolas, Monaco, monospace' },
            size:   { xs: "10px", sm: "12px", base: "14px", lg: "1.25rem" },
            weight: { reg: "400", bold: "700" }
        },
        composites: {
            "btn-base":   "padding: 0.375rem 0.75rem; border-radius: 0.25rem; font-weight: 600; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 0.5rem;",
            "row-spread": "display: flex; justify-content: space-between; align-items: center;",
            "col-stack":  "display: flex; flex-direction: column;",
            "abs-fill":   "position: absolute; top: 0; left: 0; right: 0; bottom: 0;",
            "input-base": "width: 100%; border: 1px solid #e5e7eb; border-radius: 0.25rem; padding: 0.375rem; text-align: center;"
        }
    },

    // --- Data: Definitions (The Blueprint Parts) ---
    Definitions: {
        root:       { tag: 'div', class: 'col-stack bg-dark text-txt-light', style: 'height:100vh' },
        header:     { tag: 'header', class: 'row-spread p-3 b-dark bg-dark shrink-0', style: 'border-bottom-width:1px' },
        workspace:  { tag: 'div', class: 'flex bg-panel relative', style: 'flex:1; overflow:hidden' },
        flexRow:    { tag: 'div', class: 'flex items-center gap-4' },
        flexGap:    { tag: 'div', class: 'flex items-center gap-2' },
        sidebar:    { tag: 'div', class: 'col-stack bg-panel b-border', style: 'width:20rem; border-right-width:1px; z-index:10' },
        panelHead:  { tag: 'div', class: 'row-spread bg-surface b-border p-3', style: 'border-bottom-width:1px' },
        panelBody:  { tag: 'div', class: 'bg-surface b-border p-4 relative', style: 'border-bottom-width:1px' },
        panelFoot:  { tag: 'div', class: 'flex gap-2 p-3 border-t-border bg-surface' },
        title:      { tag: 'h1', class: 'font-sans font-bold text-lg text-txt-light' },
        labelTiny:  { tag: 'span', class: 'font-sans font-bold text-xs text-txt-muted uppercase' },
        btnLoad:    { tag: 'label', class: 'btn-base bg-primary text-txt-inv' },
        btnAction:  { tag: 'button', class: 'btn-base text-txt-inv font-bold text-xs btn-action-base' }, // NEW class: btn-action-base
        btnGhost:   { tag: 'button', class: 'btn-base btn-ghost' }, // NEW class: btn-ghost
        btnIcon:    { tag: 'button', style: 'background:none; border:none; cursor:pointer; color:#9ca3af; font-size:1.25rem' },
        inputNum:   { tag: 'input', type: 'number', class: 'input-base font-mono text-xs' },
        hiddenIn:   { tag: 'input', type: 'file', class: 'hidden' },
        tabBtn:     { tag: 'button', class: 'font-bold text-xs text-txt-muted p-2', style: 'border-bottom:2px solid transparent; cursor:pointer' },
        activeTab:  { tag: 'button', class: 'font-bold text-xs text-primary p-2', style: 'border-bottom:2px solid #2563eb; cursor:pointer' },
        geoGrid:    { tag: 'div', style: 'display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;' },
        geoGroup:   { tag: 'div', class: 'col-stack gap-1' },
        canvasArea: { tag: 'div', class: 'col-stack bg-border relative', style: 'flex:1; overflow:hidden' },
        canvasWrap: { tag: 'div', class: 'relative bg-panel', style: 'box-shadow:0 20px 25px -5px rgba(0,0,0,0.5)' },
        actionBar:  { tag: 'div', class: 'fixed z-50 bg-panel b-border rounded p-2 flex gap-2 hidden', style: 'box-shadow:0 4px 6px rgba(0,0,0,0.1)' }
    },

    // --- Data: Layout (The Assembly) ---
    getLayout() {
        const C = this.Theme.colors;
        return {
            def: 'root', id: 'template-structure', children: [
                // --- Header ---
                { def: 'header', children: [
                    { def: 'flexRow', children: [
                        { def: 'title', html: `SciText <span style="color:${C.accent}">Digitizer</span>` },
                        { tag: 'div', class: 'relative', children: [
                            { def: 'hiddenIn', id: 'pdf-upload', accept: 'application/pdf, image/*' },
                            { def: 'btnLoad', for: 'pdf-upload', text: 'Load' }
                        ]}
                    ]},
                    { tag: 'div', class: 'header-divider' },
                    { def: 'flexGap', children: [
                        { def: 'btnGhost', id: 'zoom-out', text: '-' },
                        { tag: 'span', id: 'zoom-level', text: '100%', class: 'text-xs text-txt-light', style: 'width:3rem; text-align:center' },
                        { def: 'btnGhost', id: 'zoom-in', text: '+' }
                    ]},
                    { def: 'flexGap', children: [
                        { def: 'btnGhost', id: 'btn-undo', text: 'Undo' },
                        { def: 'btnGhost', id: 'btn-redo', text: 'Redo' },
                        { tag: 'span', id: 'ai-status', class: 'hidden font-mono text-xs text-accent', text: 'Processing...' },
                        { def: 'btnGhost', id: 'fullscreen-toggle', text: 'Full Screen' }
                    ]}
                ]},
                // --- Main ---
                { tag: 'main', class: 'flex-col bg-panel relative', style: 'flex:1; overflow:hidden', children: [
                    { tag: 'div', class: 'flex bg-surface b-border', style: 'border-bottom-width:1px', children: [
                        { def: 'activeTab', id: 'tab-overlay', text: 'Compositor' },
                        { def: 'tabBtn', id: 'tab-debug', text: 'Debug View' }
                    ]},
                    { def: 'workspace', id: 'workspace-container', class: 'hidden flex', children: [
                        { def: 'sidebar', children: [
                            // Properties
                            { def: 'panelHead', children: [
                                { def: 'labelTiny', text: 'Properties' },
                                { def: 'labelTiny', id: 'region-count', text: '0', class: 'region-count-badge' }
                            ]},
                            { def: 'panelBody', children: [
                                { def: 'labelTiny', text: 'Geometry (Norm)', class: 'absolute text-accent', style: 'top:0.25rem; right:0.5rem' },
                                { def: 'geoGrid', children: [
                                    { def: 'geoGroup', children: [{ def: 'labelTiny', text: 'X' }, { def: 'inputNum', id: 'prop-x' }] },
                                    { def: 'geoGroup', children: [{ def: 'labelTiny', text: 'Y' }, { def: 'inputNum', id: 'prop-y' }] },
                                    { def: 'geoGroup', children: [{ def: 'labelTiny', text: 'W' }, { def: 'inputNum', id: 'prop-w' }] },
                                    { def: 'geoGroup', children: [{ def: 'labelTiny', text: 'H' }, { def: 'inputNum', id: 'prop-h' }] }
                                ]},
                                { tag: 'div', style: 'margin-top:0.5rem; padding-top:0.5rem; border-top:1px solid #e5e7eb', children: [
                                     { def: 'labelTiny', text: 'SVG Transform', class: 'text-center block' },
                                     { def: 'geoGrid', style:'margin-top:0.5rem; grid-template-columns:1fr 1fr; gap:0.5rem', children: [
                                        { def: 'geoGroup', children: [{ def: 'labelTiny', text: 'Off X' }, { def: 'inputNum', id: 'prop-offset-x', step: '0.1' }] },
                                        { def: 'geoGroup', children: [{ def: 'labelTiny', text: 'Off Y' }, { def: 'inputNum', id: 'prop-offset-y', step: '0.1' }] },
                                        { def: 'geoGroup', children: [{ def: 'labelTiny', text: 'Scl X' }, { def: 'inputNum', id: 'prop-scale-x', step: '0.05' }] },
                                        { def: 'geoGroup', children: [{ def: 'labelTiny', text: 'Scl Y' }, { def: 'inputNum', id: 'prop-scale-y', step: '0.05' }] }
                                     ]}
                                ]}
                            ]},
                            // SVG Raw Editor
                            { def: 'panelBody', id: 'svg-raw-editor-panel', class: 'hidden col-stack gap-2', children: [
                                { def: 'labelTiny', text: 'Edit Raw SVG' },
                                { tag: 'textarea', id: 'svg-raw-content', class: 'font-mono text-xs b-border rounded p-2', style:'min-height:100px; resize:vertical' },
                                { def: 'btnAction', id: 'btn-save-raw-svg', text: 'Apply', class: 'btn-action-base btn-save-raw-svg' } 
                            ]},
                            // Layers
                            { tag: 'div', class: 'col-stack bg-surface', style: 'flex:1; overflow:hidden', children: [
                                { def: 'panelHead', children: [
                                     { def: 'labelTiny', text: 'Layers' },
                                     { def: 'btnIcon', id: 'btn-toggle-visibility-all', text: '👁', style:'font-size:1rem' }
                                ]},
                                { tag: 'div', id: 'layer-items', style: 'flex:1; overflow-y:auto' }
                            ]},
                            // Footer
                            { def: 'panelFoot', children: [
                                { def: 'btnAction', id: 'btn-auto-segment', text: 'Auto', class: 'btn-action-base bg-danger' },
                                { def: 'btnAction', id: 'btn-export', text: 'Export', class: 'btn-action-base bg-success' },
                                { def: 'hiddenIn', id: 'svg-import', accept: '.svg' },
                                { def: 'btnLoad', for: 'svg-import', text: 'Import', class: 'btn-base bg-primary text-txt-inv btn-import' }, // NEW class: btn-import
                                { def: 'btnAction', id: 'btn-clear-all', text: 'Reset', class: 'btn-action-base btn-reset' } // NEW class: btn-reset
                            ]}
                        ]},
                        // Canvas
                        { def: 'canvasArea', id: 'canvas-view-area', children: [
                            { tag: 'div', id: 'canvas-scroller', style: 'width:100%; height:100%; overflow:auto; display:flex; justify-content:center; padding:2rem', children: [
                                { def: 'canvasWrap', id: 'canvas-wrapper', children: [
                                     { tag: 'div', id: 'pdf-layer', class: 'abs-fill transition' },
                                     { tag: 'div', id: 'svg-layer', class: 'abs-fill', style: 'pointer-events:none; z-index:10' },
                                     { tag: 'div', id: 'interaction-layer', class: 'abs-fill', style: 'z-index:20' },
                                     { tag: 'div', id: 'selection-box' },
                                     { tag: 'div', id: 'split-bar', class: 'hidden' }
                                ]}
                            ]}
                        ]}
                    ]},
                    // Debug & Overlays
                    { tag: 'div', id: 'debug-container', class: 'hidden bg-dark p-4', style: 'flex:1; overflow:auto', children: [
                        { tag: 'pre', id: 'debug-log', class: 'font-mono text-xs text-success' }
                    ]},
                    { tag: 'div', id: 'empty-state', class: 'abs-fill flex-col justify-center items-center bg-surface', children: [
                        { tag: 'div', class: 'p-4 bg-panel rounded b-border text-center shadow', children: [
                             { tag: 'h2', class: 'font-bold text-lg text-txt-main', text: 'No Document' },
                             { tag: 'p', class: 'text-txt-muted mt-2', text: 'Upload PDF or Image to start.' }
                        ]}
                    ]},
                    { tag: 'div', id: 'pdf-loader', class: 'hidden abs-fill flex-col justify-center items-center', style: `background:rgba(17,24,39,0.8); z-index:50`, children: [
                         { tag: 'div', class: 'loader-spinner' },
                         { tag: 'span', class: 'font-bold text-txt-inv mt-4', text: 'Loading...' }
                    ]},
                    { tag: 'canvas', id: 'processing-canvas', class: 'hidden' }
                ]},
                // Floating Action Bar
                { def: 'actionBar', id: 'region-actions-bar', children: [
                    { def: 'btnAction', 'data-type':'text', text:'Digitize', class: 'btn-action-base bg-primary' },
                    { def: 'btnAction', 'data-type':'image', text:'Image', class: 'btn-action-base bg-warn' },
                    { def: 'btnAction', 'data-type':'blueprint', text:'Scan', class: 'btn-action-base bg-success' },
                    { def: 'btnAction', 'data-type':'empty', text:'Empty', class: 'btn-action-base bg-gray' },
                    { tag:'div', class: 'action-bar-divider' }, // NEW class: action-bar-divider
                    { def: 'btnAction', id:'btn-fit-area', text:'Fit', class: 'btn-action-base bg-fitArea' },
                    { def: 'btnAction', id:'btn-fit-content', text:'Fill', class: 'btn-action-base bg-fitContent' },
                    { tag:'div', class: 'action-bar-divider' }, // NEW class: action-bar-divider
                    { def: 'btnAction', id:'btn-split', text:'Split', class: 'btn-action-base bg-split' },
                    { def: 'btnAction', id:'btn-group', text:'Group', class: 'btn-action-base bg-group' },
                    { def: 'btnAction', id:'btn-delete', text:'Del', class: 'btn-action-base bg-danger' }
                ]}
            ]
        };
    },

    // --- Logic: Style Generator ---
    generateStyles() {
        const theme = this.Theme;
        const rules = {};
        // Colors
        Object.entries(theme.colors).forEach(([k, v]) => {
            const n = k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
            rules[`.text-${n}`] = { "color": v };
            rules[`.bg-${n}`]   = { "background-color": v };
            rules[`.b-${n}`]    = { "border": `1px solid ${v}` };
        });
        // Spacing
        Object.entries(theme.spacing).forEach(([k, v]) => {
            rules[`.p-${k}`]   = { "padding": v };
            rules[`.gap-${k}`] = { "gap": v };
        });
        // Typography
        Object.entries(theme.type.family).forEach(([k,v]) => rules[`.font-${k}`] = { "font-family": v });
        Object.entries(theme.type.size).forEach(([k,v]) => rules[`.text-${k}`] = { "font-size": v });
        Object.entries(theme.type.weight).forEach(([k,v]) => rules[`.font-${k}`] = { "font-weight": v });
        // Composites
        Object.entries(theme.composites).forEach(([k, cssStr]) => {
            rules[`.${k}`] = cssStr.split(';').reduce((acc, rule) => {
                const [p, v] = rule.split(':');
                if (p && v) acc[p.trim()] = v.trim();
                return acc;
            }, {});
        });

        // Base Styles
        const base = {
            "*, *::before, *::after": { "box-sizing": "border-box", "margin": "0", "padding": "0" },
            "body": { "font-family": '"Segoe UI", sans-serif', "background-color": theme.colors.dark, "color": theme.colors.txtMain, "min-height": "100vh", "display": "flex", "flex-direction": "column", "font-size": "14px" },
            ".hidden": { "display": "none !important" },
            ".flex": { "display": "flex" },
            ".flex-col": { "display": "flex", "flex-direction": "column" },
            ".items-center": { "align-items": "center" },
            ".justify-center": { "justify-content": "center" },
            ".relative": { "position": "relative" },
            ".absolute": { "position": "absolute" },
            ".inset-0": { "top": "0", "left": "0", "right": "0", "bottom": "0" },
            ".rounded": { "border-radius": "0.25rem" },
            ".uppercase": { "text-transform": "uppercase" },
            ".transition": { "transition": "all 0.15s ease-in-out" },
            ".btn-primary:hover": { "background-color": theme.colors.primaryHover },
            
            // --- NEW: Custom Component Classes (Theme Dependent) ---
            ".btn-ghost": { "background": "none", "border": `1px solid ${theme.colors.gray}`, "color": theme.colors.txtLight },
            ".btn-action-base": { "padding": "0.25rem 0.75rem", "border-radius": "0.25rem", "font-weight": "700", "font-size": "0.75rem", "color": "white", "border": "1px solid transparent", "cursor": "pointer" },
            ".header-divider": { "width": "1px", "height": "0.5rem", "background": theme.colors.gray },
            ".action-bar-divider": { "width": "1px", "height": "1.5rem", "background": theme.colors.border },
            ".region-count-badge": { "background": theme.colors.primaryHover, "color": theme.colors.primary, "padding": "2px 6px", "border-radius": "99px" },
            ".btn-save-raw-svg": { "background": theme.colors.primary }, // Re-using primary for consistency
            ".btn-import": { "font-size": "0.75rem", "padding": "0.25rem 0.75rem" },
            ".btn-reset": { "color": theme.colors.danger, "background": "transparent" },


            // --- Layer List Styles ---
            ".layer-item": { "display": "flex", "align-items": "center", "gap": "0.5rem", "font-size": "0.75rem", "cursor": "pointer", "padding": "0.5rem 0.75rem", "background": "white", "transition": "background 0.15s", "border-bottom": "1px solid #e5e7eb" },
            ".layer-item:hover": { "background-color": theme.colors.surfaceHov },
            ".layer-item.active": { "background-color": "#dbeafe", "font-weight": "600" },
            ".layer-item .drag-handle": { "cursor": "move", "color": "#9ca3af" },
            ".layer-item .layer-name": { "flex": "1", "overflow": "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" },
            ".layer-item .visibility-toggle": { "font-size": "1rem", "opacity": "0.6", "cursor": "pointer" },
            ".layer-item .delete-btn": { "color": theme.colors.danger, "opacity": "0", "font-size": "0.9rem" },
            ".layer-item:hover .delete-btn": { "opacity": "1" },
            
            // --- Component & Animation Styles ---
            ".loader-spinner": { "width":"3rem", "height":"3rem", "border":"4px solid #4b5563", "border-top-color":"#3b82f6", "border-radius":"9999px", "animation":"spin 1s linear infinite" },
            
            // --- Region/Canvas Styles ---
            ".region-highlight": { "background-color": `rgba(59, 130, 246, 0.1)`, "border": `1px solid ${theme.colors.primaryHover}`, "opacity": "0.6", "pointer-events": "all" },
            ".region-highlight:hover": { "opacity": "0.9", "border-width": "2px", "cursor": "move" },
            ".region-selected": { "border": `2px solid ${theme.colors.primary}`, "background-color": `rgba(37, 99, 235, 0.2)`, "opacity": "1.0" },
            "#selection-box": { "border": `2px dashed ${theme.colors.primary}`, "background": `rgba(37, 99, 235, 0.1)`, "position": "absolute", "pointer-events": "none", "display": "none", "z-index": "50" },
            
            // --- Selection Frame & Resize Handle Styles (FIXED hardcoded hex values) ---
            ".selection-frame": { "position": "absolute", "border": `1px solid ${theme.colors.primaryHover}`, "box-shadow": `0 0 0 1px rgba(59,130,246,0.3)`, "pointer-events": "none", "z-index": "40" },
            ".resize-handle": { "position": "absolute", "width": "8px", "height": "8px", "background": "white", "border": `1px solid ${theme.colors.primary}`, "z-index": "50", "pointer-events": "all" },
            ".resize-handle:hover": { "background": theme.colors.primary },
            ".handle-nw": { "top": "-4px", "left": "-4px", "cursor": "nwse-resize" },
            ".handle-n":  { "top": "-4px", "left": "50%", "transform": "translateX(-50%)", "cursor": "ns-resize" },
            ".handle-ne": { "top": "-4px", "right": "-4px", "cursor": "nesw-resize" },
            ".handle-e":  { "top": "50%", "right": "-4px", "transform": "translateY(-50%)", "cursor": "ew-resize" },
            ".handle-se": { "bottom": "-4px", "right": "-4px", "cursor": "nwse-resize" },
            ".handle-s":  { "bottom": "-4px", "left": "50%", "transform": "translateX(-50%)", "cursor": "ns-resize" },
            ".handle-sw": { "bottom": "-4px", "left": "-4px", "cursor": "nesw-resize" },
            ".handle-w":  { "top": "50%", "left": "-4px", "transform": "translateY(-50%)", "cursor": "ew-resize" },
            
            // --- Split Bar Styles (FIXED hardcoded hex values) ---
            "#split-bar": { "position": "absolute", "z-index": "50", "background": theme.colors.danger, "opacity": "0.8", "pointer-events": "none", "box-shadow": `0 0 0 1px ${theme.colors.danger}` }, 
            "#split-bar-label": { "position": "absolute", "background": theme.colors.danger, "color": "white", "font-size": "10px", "font-weight": "700", "padding": "2px 4px", "border-radius": "3px", "pointer-events": "none", "white-space": "nowrap" }
        };

        const allRules = { ...base, ...rules };
        let css = Object.entries(allRules).map(([selector, props]) => {
            const block = Object.entries(props).map(([k, v]) => `${k}: ${v};`).join(' ');
            return `${selector} { ${block} }`;
        }).join('\n');
        css += `\n@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
        css += `\n#ai-status { animation: pulse 1s infinite alternate; } @keyframes pulse { from { opacity: 0.5; } to { opacity: 1; } }`; 
        return css;
    },

    // --- Logic: DOM Builder ---
    build(schema, parent, bindTarget) {
        if (!schema) return;
        let config = schema;
        if (schema.def && this.Definitions[schema.def]) {
            config = { ...this.Definitions[schema.def], ...schema };
        }
        const el = document.createElement(config.tag || 'div');
        if (config.id) {
            el.id = config.id;
            const toCamel = (s) => s.replace(/-./g, x => x[1].toUpperCase());
            if (bindTarget) bindTarget[toCamel(config.id)] = el;
        }
        if (config.class) el.className = config.class;
        if (config.style) el.style.cssText = config.style;
        if (config.text) el.textContent = config.text;
        if (config.html) el.innerHTML = config.html;
        
        Object.keys(config).forEach(key => {
            if (!['tag','id','class','style','text','html','children','def'].includes(key)) {
                el.setAttribute(key, config[key]);
            }
        });
        if (parent) parent.appendChild(el);
        if (config.children) config.children.forEach(child => this.build(child, el, bindTarget));
        return el;
    },

    // --- Init ---
    init(bindTarget) {
        const styleEl = document.createElement("style");
        styleEl.textContent = this.generateStyles();
        document.head.appendChild(styleEl);
        this.build(this.getLayout(), document.body, bindTarget);
        if (bindTarget) bindTarget.splitBar = document.getElementById('split-bar'); 
    }
};

// ============================================================================
// 3. MODEL
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
            canvas: null
        };
        this.subscribers = [];
    }
    subscribe(fn) { this.subscribers.push(fn); }
    notify(context) { this.subscribers.forEach(fn => fn(this.state, context)); }

    setState(updates) {
        Object.assign(this.state, updates);
        this.notify();
    }

    addRegion(region) {
        const newRegion = { ...region, visible: true, offset: {x: 0, y: 0}, scale: {x: 1, y: 1} };
        this.state.regions.push(newRegion);
        this.selectRegion(newRegion.id);
        this.saveHistory();
        this.notify();
    }

    updateRegion(id, updates, context) { 
        const r = this.getRegion(id); 
        if (r) Object.assign(r, updates); 
        this.notify(context);
    }

    deleteRegion(id) {
        this.state.regions = this.state.regions.filter(r => r.id !== id);
        if (this.state.activeRegionId === id) this.deselect();
        this.saveHistory();
        this.notify();
    }

    getRegion(id) { return this.state.regions.find(r => r.id === id); }

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
            this.state.history = this.state.history.slice(0, this.state.historyIndex + 1);
        }
        // Deep copy
        const regionsCopy = this.state.regions.map(r => ({
            id: r.id, rect: {...r.rect}, svgContent: r.svgContent,
            bpDims: r.bpDims ? {...r.bpDims} : undefined, visible: r.visible,
            status: r.status, contentType: r.contentType,
            offset: {...r.offset}, scale: {...r.scale}
        }));
        this.state.history.push(regionsCopy);
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
        this.state.regions = JSON.parse(JSON.stringify(this.state.history[this.state.historyIndex]));
        this.deselect();
        this.notify();
    }
}

// ============================================================================
// 4. LOGIC & CONTROLLER
// ============================================================================

class ImageProcessor {
    constructor(model) { this.model = model; this.scaleFactor = 2; }
    isDark(data, i) { return data[i*4+3] > 128 && data[i*4] < 200 && data[i*4+1] < 200 && data[i*4+2] < 200; }
    
    processRegion(normRect, pad=4) {
        const s = this.model.state, cvs = s.canvas;
        if (!cvs) return null;
        const pw = Math.floor(normRect.w*s.canvasWidth), ph = Math.floor(normRect.h*s.canvasHeight);
        if (pw < 1 || ph < 1) return null;
        
        const tmp = document.createElement("canvas");
        tmp.width = pw*this.scaleFactor; tmp.height = ph*this.scaleFactor;
        const ctx = tmp.getContext("2d");
        ctx.drawImage(cvs, normRect.x*s.canvasWidth, normRect.y*s.canvasHeight, pw, ph, 0, 0, tmp.width, tmp.height);
        
        const d = ctx.getImageData(0,0,tmp.width,tmp.height).data, W = tmp.width, H = tmp.height;
        let minX=W, minY=H, maxX=0, maxY=0, found=false;
        for(let y=0; y<H; y++) for(let x=0; x<W; x++) if(this.isDark(d, y*W+x)) { minX=Math.min(minX,x); maxX=Math.max(maxX,x); minY=Math.min(minY,y); maxY=Math.max(maxY,y); found=true; }
        if(!found) return null;

        minX=Math.max(0,minX-pad); minY=Math.max(0,minY-pad); maxX=Math.min(W,maxX+pad); maxY=Math.min(H,maxY+pad);
        const bpW = maxX-minX;
        const bpH = maxY-minY;
        let rle = "";
        for(let y=minY; y<maxY; y+=this.scaleFactor) {
            let sx=-1;
            for(let x=minX; x<maxX; x++) {
                if(this.isDark(d, y*W+x)) { if(sx===-1) sx=x; }
                else if(sx!==-1) { rle+=`M${sx} ${y}h${x-sx}v${this.scaleFactor}h-${x-sx}z`; sx=-1; }
            }
            if(sx!==-1) rle+=`M${sx} ${y}h${maxX-sx}v${this.scaleFactor}h-${maxX-sx}z`;
        }
        
        return {
            rle, bpDims: { w: bpW, h: bpH },
            newRect: { x: normRect.x+(minX/this.scaleFactor)/s.canvasWidth, y: normRect.y+(minY/this.scaleFactor)/s.canvasHeight, w: (maxX-minX)/this.scaleFactor/s.canvasWidth, h: (maxY-minY)/this.scaleFactor/s.canvasHeight },
            imageData: tmp.toDataURL("image/png").split(",")[1]
        };
    }
}

class RegionEditor {
    constructor(controller) {
        this.controller = controller;
        this.mode = 'IDLE'; 
        this.dragStart = null;
        this.initialRect = null;
        this.activeHandle = null;
    }
    init() {
        this.controller.view.els.interactionLayer.addEventListener('mousedown', e => this.handleMouseDown(e));
        document.addEventListener('mousemove', e => this.handleMouseMove(e));
        document.addEventListener('mouseup', e => this.handleMouseUp(e));
        document.addEventListener('keydown', e => this.handleKeyDown(e));
    }
    getPhysicalDims() {
        const s = this.controller.model.state;
        const cw = s.baseWidth * s.scaleMultiplier;
        return { physicalCw: cw, physicalCh: cw * (s.canvasHeight / s.canvasWidth) };
    }
    getLocalPos(e) {
        const rect = this.controller.view.els.canvasWrapper.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    
    // Extracted hit detection logic from old file
    hitDetection(pos) {
        const state = this.controller.model.state;
        const { physicalCw, physicalCh } = this.getPhysicalDims();

        // Check resize handles first
        const active = state.activeRegionId ? this.controller.model.getRegion(state.activeRegionId) : null;
        if (active) {
            const rx = active.rect.x * physicalCw;
            const ry = active.rect.y * physicalCh;
            const rw = active.rect.w * physicalCw;
            const rh = active.rect.h * physicalCh;

            const handles = [
                {name:'nw', x:rx-4, y:ry-4}, {name:'n', x:rx+rw/2-4, y:ry-4},
                {name:'ne', x:rx+rw-4, y:ry-4}, {name:'e', x:rx+rw-4, y:ry+rh/2-4},
                {name:'se', x:rx+rw-4, y:ry+rh-4}, {name:'s', x:rx+rw/2-4, y:ry+rh-4},
                {name:'sw', x:rx-4, y:ry+rh-4}, {name:'w', x:rx-4, y:ry+rh/2-4}
            ];

            for (const h of handles) {
                if (pos.x >= h.x && pos.x <= h.x+8 && pos.y >= h.y && pos.y <= h.y+8) {
                    return { type: 'HANDLE', handle: h.name };
                }
            }
        }

        // Check region bodies
        for (const r of state.regions.slice().reverse()) {
            const rx = r.rect.x * physicalCw;
            const ry = r.rect.y * physicalCh;
            const rw = r.rect.w * physicalCw;
            const rh = r.rect.h * physicalCh;
            if (pos.x >= rx && pos.x <= rx+rw && pos.y >= ry && pos.y <= ry+rh) {
                return { type: 'BODY', id: r.id };
            }
        }

        return { type: 'NONE' };
    }
    
    handleMouseDown(e) {
        if (e.button !== 0) return;
        const pos = this.getLocalPos(e);
        if (this.controller.splitMode) { this.dragStart = pos; return; }
        
        const s = this.controller.model.state;
        const hit = this.hitDetection(pos);

        if (hit.type === 'BODY') {
            if (hit.id !== s.activeRegionId) this.controller.model.selectRegion(hit.id);
            this.mode = 'MOVE';
        } else if (hit.type === 'HANDLE') {
            this.mode = 'RESIZE';
            this.activeHandle = hit.handle;
        } else {
            this.controller.model.deselect();
            this.mode = 'CREATE';
        }
        this.dragStart = pos;
        const active = this.controller.model.getRegion(s.activeRegionId);
        this.initialRect = active ? { ...active.rect } : null;
    }

    handleMouseMove(e) {
        const pos = this.getLocalPos(e);
        const s = this.controller.model.state;
        const { physicalCw, physicalCh } = this.getPhysicalDims();
        const layer = this.controller.view.els.interactionLayer; // Get layer
        const active = s.activeRegionId ? s.regions.find(r => r.id === s.activeRegionId) : null;
        
        if (this.controller.splitMode && active) {
            const r = this.controller.model.getRegion(s.activeRegionId);
            const rx = r.rect.x * physicalCw, ry = r.rect.y * physicalCh;
            const rw = r.rect.w * physicalCw, rh = r.rect.h * physicalCh;
            
            // --- FIXED: Add cursor logic for split mode ---
            if (this.controller.splitType === 'horizontal') {
                 layer.style.cursor = 'ns-resize'; 
                 this.controller.splitPosition = Math.min(0.9, Math.max(0.1, (pos.y - ry) / rh));
            } else {
                 layer.style.cursor = 'ew-resize'; 
                 this.controller.splitPosition = Math.min(0.9, Math.max(0.1, (pos.x - rx) / rw));
            }
            this.controller.model.notify({ noHistory:true });
            return;
        }
        
        // Handle IDLE mode cursor logic (restored from old file)
        if (this.mode === 'IDLE') {
            const hit = this.hitDetection(pos);
            if (hit.type === 'HANDLE') {
                layer.style.cursor = hit.handle.includes('n') && hit.handle.includes('s') ? 'ns-resize' : 
                                     hit.handle.includes('e') && hit.handle.includes('w') ? 'ew-resize' : 
                                     hit.handle.includes('nw') || hit.handle.includes('se') ? 'nwse-resize' : 'nesw-resize';
            } else if (hit.type === 'BODY') {
                layer.style.cursor = 'move';
            } else {
                layer.style.cursor = 'default';
            }
            return;
        }


        if (this.mode === 'CREATE') {
            const w = Math.abs(pos.x - this.dragStart.x), h = Math.abs(pos.y - this.dragStart.y);
            const x = Math.min(pos.x, this.dragStart.x), y = Math.min(pos.y, this.dragStart.y);
            Object.assign(this.controller.view.els.selectionBox.style, { display:'block', left:x+'px', top:y+'px', width:w+'px', height:h+'px' });
        } else if (this.mode === 'MOVE' && this.initialRect) {
            const dx = (pos.x - this.dragStart.x)/physicalCw, dy = (pos.y - this.dragStart.y)/physicalCh;
            const r = this.controller.model.getRegion(s.activeRegionId);
            this.controller.model.updateRegion(r.id, { rect: { x: this.initialRect.x+dx, y: this.initialRect.y+dy, w:this.initialRect.w, h:this.initialRect.h }}, {noHistory:true});
        } else if (this.mode === 'RESIZE' && this.initialRect && this.activeHandle) {
            const r = this.controller.model.getRegion(s.activeRegionId);
            const ix = this.initialRect.x * physicalCw, iy = this.initialRect.y * physicalCh;
            const iw = this.initialRect.w * physicalCw, ih = this.initialRect.h * physicalCh;

            let nx = ix, ny = iy, nw = iw, nh = ih;

            if (this.activeHandle.includes('e')) nw = pos.x - ix;
            if (this.activeHandle.includes('s')) nh = pos.y - iy;
            if (this.activeHandle.includes('w')) { nw = (ix + iw) - pos.x; nx = pos.x; }
            if (this.activeHandle.includes('n')) { nh = (iy + ih) - pos.y; ny = pos.y; }

            if (nw > 5 && nh > 5) {
                const newRect = { x: nx/physicalCw, y: ny/physicalCh, w: nw/physicalCw, h: nh/physicalCh };
                this.controller.model.updateRegion(r.id, { rect: newRect }, { noHistory: true });
            }
        }
    }

    handleMouseUp(e) {
        if (this.controller.splitMode) { this.dragStart = null; return; }
        if (this.mode === 'CREATE') {
            const pos = this.getLocalPos(e);
            const w = Math.abs(pos.x - this.dragStart.x), h = Math.abs(pos.y - this.dragStart.y);
            if (w > 5 && h > 5) {
                const { physicalCw, physicalCh } = this.getPhysicalDims();
                this.controller.model.addRegion({
                    id: `r${Date.now()}`,
                    rect: { x: Math.min(pos.x, this.dragStart.x)/physicalCw, y: Math.min(pos.y, this.dragStart.y)/physicalCh, w: w/physicalCw, h: h/physicalCh },
                    status: 'pending', svgContent: ''
                });
            }
            this.controller.view.els.selectionBox.style.display = 'none';
        } else if (this.initialRect) {
            this.controller.model.saveHistory();
        }
        this.mode = 'IDLE';
    }

    handleKeyDown(e) {
        if (e.key === 'Escape') this.controller.splitMode ? this.controller.exitSplitMode() : (this.mode = 'IDLE');
        if (this.controller.splitMode && e.key === 'Tab') { e.preventDefault(); this.controller.toggleSplitType(); }
        if (this.controller.splitMode && e.key === 'Enter') { e.preventDefault(); this.controller.confirmSplit(); }
    }
}

class SciTextController {
    constructor(model, view) {
        this.model = model; this.view = view;
        this.draw = new RegionEditor(this);
        this.splitMode = false; this.splitType = 'horizontal'; this.splitPosition = 0.5;
    }
    async init() {
        this.view.init();
        this.model.state.canvas = this.view.els.processingCanvas;
        this.imageProcessor = new ImageProcessor(this.model);
        await this.loadPDFJS();
        this.draw.init();
        
        // Bindings
        this.view.els.pdfUpload.onchange = e => this.handleFileUpload(e);
        this.view.els.svgImport.onchange = e => this.handleSvgImport(e.target.files[0]);
        this.view.els.btnUndo.onclick = () => this.model.undo();
        this.view.els.btnRedo.onclick = () => this.model.redo();
        this.view.els.zoomIn.onclick = () => this.setZoom(this.model.state.scaleMultiplier + 0.25);
        this.view.els.zoomOut.onclick = () => this.setZoom(this.model.state.scaleMultiplier - 0.25);
        this.view.els.btnAutoSegment.onclick = () => this.autoSegment();
        this.view.els.btnDelete.onclick = () => { Array.from(this.model.state.selectedIds).forEach(id => this.model.deleteRegion(id)); };
        this.view.els.btnClearAll.onclick = () => { this.model.setState({regions:[]}); this.model.deselect(); this.model.saveHistory(); };
        this.view.els.fullscreenToggle.onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
        this.view.els.tabOverlay.onclick = () => this.view.switchTab('overlay');
        this.view.els.tabDebug.onclick = () => this.view.switchTab('debug');
        this.view.els.btnExport.onclick = () => this.exportSVG();
        this.view.els.btnFitArea.onclick = () => this.fitArea();
        this.view.els.btnFitContent.onclick = () => this.fitContent();
        this.view.els.btnSplit.onclick = () => this.enterSplitMode(); 
        this.view.els.btnGroup.onclick = () => this.groupSelectedRegions();
        this.view.els.btnSaveRawSvg.onclick = () => this.saveRawSvgChanges();
        this.view.els.btnToggleVisibilityAll.onclick = () => {
             const anyHidden = this.model.state.regions.some(r => !r.visible);
             this.model.state.regions.forEach(r => this.model.updateRegion(r.id, { visible: !anyHidden }));
        };
        
        ['propX','propY','propW','propH'].forEach(k => { if(this.view.els[k]) this.view.els[k].onchange = () => this.updateRegionFromProps('rect'); });
        ['propOffsetX','propOffsetY','propScaleX','propScaleY'].forEach(k => { if(this.view.els[k]) this.view.els[k].onchange = () => this.updateRegionFromProps('svg-transform'); });

        this.view.els.regionActionsBar.onclick = (e) => { const type = e.target.dataset.type; if (type) this.generateContent(type); };
        
        // Layer list interaction (updated to use new layout)
        this.view.els.layerItems?.addEventListener('click', (e) => {
            const item = e.target.closest('.layer-item'); if (!item) return;
            const id = item.dataset.id;
            if (e.target.classList.contains('visibility-toggle')) { const r = this.model.getRegion(id); this.model.updateRegion(id, { visible: !r.visible }); }
            else if (e.target.classList.contains('delete-btn')) this.model.deleteRegion(id);
            else this.model.selectRegion(id);
        });

        window.addEventListener('resize', () => { this.updateBaseWidth(); this.model.notify(); });
        this.loadDefaultImage();
    }
    
    enterSplitMode() {
        if (!this.model.state.activeRegionId) return;
        this.splitMode = true; 
        const r = this.model.getRegion(this.model.state.activeRegionId);
        const cw = this.model.state.canvasWidth, ch = this.model.state.canvasHeight;
        this.splitType = (r.rect.w * cw) > (r.rect.h * ch) ? 'vertical' : 'horizontal';
        this.model.notify();
    }
    exitSplitMode() { this.splitMode = false; this.model.notify(); }
    toggleSplitType() { this.splitType = this.splitType === 'horizontal' ? 'vertical' : 'horizontal'; this.model.notify(); }
    confirmSplit() {
        const id = this.model.state.activeRegionId; if(!id) return this.exitSplitMode();
        const r = this.model.getRegion(id);
        let r1 = {...r.rect}, r2 = {...r.rect};
        if(this.splitType === 'horizontal') { r1.h *= this.splitPosition; r2.h *= (1-this.splitPosition); r2.y += r1.h; }
        else { r1.w *= this.splitPosition; r2.w *= (1-this.splitPosition); r2.x += r1.w; }
        
        this.view.els.aiStatus.classList.remove('hidden');
        const s1 = this.imageProcessor.processRegion(r1), s2 = this.imageProcessor.processRegion(r2);
        const mk = (s) => ({ id:`r${Date.now()}_${Math.random()}`, rect:s.newRect, svgContent:`<path d="${s.rle}" fill="black" />`, status:'scanned', contentType:'scan', bpDims:s.bpDims, scale:{x:1,y:1}, offset:{x:0,y:0} });
        
        if(s1 && s2) {
            this.model.deleteRegion(id);
            this.model.addRegion(mk(s1));
            this.model.addRegion(mk(s2));
        }
        this.view.els.aiStatus.classList.add('hidden');
        this.exitSplitMode();
    }

    updateBaseWidth() {
        const w = Math.min(this.model.state.canvasWidth, this.view.els.canvasScroller.clientWidth - 32);
        if (w > 0 && Math.abs(w - this.model.state.baseWidth) > 1) this.model.setState({ baseWidth: w });
    }

    async loadPDFJS() {
        if (window.pdfjsLib) return;
        const script = 'https://unpkg.com/pdfjs-dist@5.4.449/build/pdf.min.mjs';
        await import(script);
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs';
    }

    setZoom(s) { this.model.setState({ scaleMultiplier: Math.max(0.25, Math.min(5.0, s)) }); }

    async handleFileUpload(e) {
        const file = e.target.files[0]; if(!file) return;
        this.view.toggleLoader(true);
        const canvas = this.model.state.canvas, ctx = canvas.getContext("2d");
        
        if (file.type === "application/pdf" && window.pdfjsLib) {
            const doc = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
            const page = await doc.getPage(1), vp = page.getViewport({ scale: 2.0 });
            canvas.width = vp.width; canvas.height = vp.height;
            await page.render({ canvasContext: ctx, viewport: vp }).promise;
        } else {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            await new Promise(r => img.onload = r);
            canvas.width = img.width; canvas.height = img.height;
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
        const img = new Image(); img.crossOrigin = "anonymous"; img.src = window.embeddedDefaultImage;
        img.onload = () => {
            const c = this.model.state.canvas; c.width = img.width; c.height = img.height;
            c.getContext("2d").drawImage(img, 0, 0);
            this.view.els.pdfLayer.style.backgroundImage = `url(${c.toDataURL()})`;
            this.view.els.pdfLayer.style.backgroundSize = "100% 100%";
            this.model.setCanvasDimensions(img.width, img.height, img.width);
            this.updateBaseWidth();
            this.view.toggleWorkspace(true);
        };
    }

    updateRegionFromProps(type) {
        const id = this.model.state.activeRegionId; if(!id) return;
        const cw = this.model.state.canvasWidth, ch = this.model.state.canvasHeight;
        let u = {};
        if (type === 'rect') u.rect = { x:parseFloat(this.view.els.propX.value)/cw, y:parseFloat(this.view.els.propY.value)/ch, w:parseFloat(this.view.els.propW.value)/cw, h:parseFloat(this.view.els.propH.value)/ch };
        else u = { offset: { x:parseFloat(this.view.els.propOffsetX.value), y:parseFloat(this.view.els.propOffsetY.value) }, scale: { x:parseFloat(this.view.els.propScaleX.value), y:parseFloat(this.view.els.propScaleY.value) } };
        this.model.updateRegion(id, u); this.model.saveHistory();
    }

    saveRawSvgChanges() {
        const id = this.model.state.activeRegionId; if(!id) return;
        this.model.updateRegion(id, { svgContent: this.view.els.svgRawContent.value.replace(/<svg[^>]*?>|<\/svg>/g, '').trim(), status: 'edited' });
        this.model.saveHistory();
    }

    fitArea() {
        const id = this.model.state.activeRegionId, r = this.model.getRegion(id); if(!r) return;
        const s = this.imageProcessor.processRegion(r.rect); if(!s) return;
        this.model.updateRegion(id, { rect: s.newRect, svgContent: `<path d="${s.rle}" fill="black" />`, bpDims: s.bpDims, scale:{x:1,y:1}, offset:{x:0,y:0} });
        this.model.saveHistory();
    }

    fitContent() {
        const id = this.model.state.activeRegionId; if(id) { this.model.updateRegion(id, { scale:{x:1,y:1}, offset:{x:0,y:0} }); this.model.saveHistory(); }
    }

    groupSelectedRegions() {
        const sel = this.model.state.regions.filter(r => this.model.state.selectedIds.has(r.id));
        if (sel.length < 2) return;
        const cw = this.model.state.canvasWidth, ch = this.model.state.canvasHeight;
        let minX=Infinity, minY=Infinity, maxX=0, maxY=0;
        sel.forEach(r => { minX=Math.min(minX,r.rect.x); minY=Math.min(minY,r.rect.y); maxX=Math.max(maxX,r.rect.x+r.rect.w); maxY=Math.max(maxY,r.rect.y+r.rect.h); });
        
        const groupW = maxX-minX;
        const groupH = maxY-minY;

        let svg = '';
        sel.forEach(r => {
             const x = (r.rect.x - minX)*cw, y = (r.rect.y - minY)*ch;
             // Use original scale logic for nested SVGs to correctly position content
             const tx = r.offset?.x ?? 0;
             const ty = r.offset?.y ?? 0;
             const sx = r.scale?.x ?? 1;
             const sy = r.scale?.y ?? 1;
             const bpW = r.bpDims?.w ?? (r.rect.w * cw * 2); 
             const bpH = r.bpDims?.h ?? (r.rect.h * ch * 2);
             const viewBoxX = -(tx / sx);
             const viewBoxY = -(ty / sy);
             const viewBoxW = bpW / sx;
             const viewBoxH = bpH / sy;
             const transformedViewBox = `${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}`;

             svg += `<svg x="${x*2}" y="${y*2}" width="${r.rect.w*cw*2}" height="${r.rect.h*ch*2}" viewBox="${transformedViewBox}" preserveAspectRatio="none">${r.svgContent}</svg>`;
        });
        
        const grp = { id:`r${Date.now()}`, rect:{x:minX, y:minY, w:groupW, h:groupH}, svgContent:svg, bpDims:{w:groupW*cw*2, h:groupH*ch*2}, scale:{x:1,y:1}, offset:{x:0,y:0}, contentType:'group' };
        this.model.state.regions = this.model.state.regions.filter(r => !this.model.state.selectedIds.has(r.id));
        this.model.addRegion(grp);
    }
    
    exportSVG() {
        const cw = this.model.state.canvasWidth, ch = this.model.state.canvasHeight;
        let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}" viewBox="0 0 ${cw} ${ch}"><rect width="${cw}" height="${ch}" fill="white"/>\n`;
        this.model.state.regions.forEach(r => {
            const x=r.rect.x*cw, y=r.rect.y*ch, w=r.rect.w*cw, h=r.rect.h*ch;
            
            const tx = r.offset?.x ?? 0, ty = r.offset?.y ?? 0;
            const sx = r.scale?.x ?? 1, sy = r.scale?.y ?? 1;
            const bpW = r.bpDims?.w ?? (r.rect.w * cw * 2);
            const bpH = r.bpDims?.h ?? (r.rect.h * ch * 2);
            const viewBoxX = -(tx / sx);
            const viewBoxY = -(ty / sy);
            const viewBoxW = bpW / sx;
            const viewBoxH = bpH / sy;
            const transformedViewBox = `${viewBoxX.toFixed(2)} ${viewBoxY.toFixed(2)} ${viewBoxW.toFixed(2)} ${viewBoxH.toFixed(2)}`;

            out += `<svg x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" viewBox="${transformedViewBox}" preserveAspectRatio="none">${r.svgContent}</svg>\n`;
        });
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out+'</svg>'], {type:"image/svg+xml"})); a.download="export.svg"; a.click();
    }

    async generateContent(type) {
        const r = this.model.getRegion(this.model.state.activeRegionId); if(!r) return;
        if(type==='empty') { this.model.updateRegion(r.id, {svgContent:'', status:'done'}); return; }
        
        this.view.els.aiStatus.classList.remove('hidden');
        const s = this.imageProcessor.processRegion(r.rect, 0);
        if(!s) { this.view.els.aiStatus.classList.add('hidden'); return; }
        
        if(type==='blueprint') {
            this.model.updateRegion(r.id, { svgContent:`<path d="${s.rle}" fill="black" />`, status:'scanned', bpDims:s.bpDims });
            this.view.els.aiStatus.classList.add('hidden');
            return;
        }

        try {
            const promptType = type === 'image' ? 'SVG Graphic' : 'SVG Text';
            const prompt = `You are a precision SVG Typesetter.\nINPUT: 2x scale scan.\nTASK: Generate ${promptType}.\nViewBox: 0 0 ${s.bpDims.w} ${s.bpDims.h}. Output raw SVG only.`;
            
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: s.imageData } }] }] })
            });
            const responseText = await resp.text();

            if (!resp.ok) {
                 throw new Error(`API returned HTTP ${resp.status}. Response: ${responseText.substring(0, 100)}...`);
            }
            const json = JSON.parse(responseText);

            let txt = json.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if(!txt) throw new Error("No content");
            
            const cleanSVG = txt.replace(/```svg/g, "").replace(/```/g, "").replace(/<svg[^>]*>/g, '').replace(/<\/svg>/g, '').trim();
            if(cleanSVG.length < 10) throw new Error("AI output too short/invalid");

            this.model.updateRegion(r.id, { svgContent: cleanSVG, status:'generated', bpDims:s.bpDims });
        } catch(e) { 
            console.error("AI Generation Error:", e);
            this.model.updateRegion(r.id, { svgContent: `<text x="10" y="30" fill="red" font-size="20">ERROR</text>` });
        }
        this.view.els.aiStatus.classList.add('hidden');
    }
    
    async handleSvgImport(file) {
        if(!file) return;
        this.view.toggleLoader(true);
        try {
            const text = await file.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, "image/svg+xml");
            if(doc.querySelector('parsererror')) throw new Error("Invalid SVG");

            const root = doc.documentElement;
            const viewBox = root.getAttribute("viewBox")?.split(/\s+/).map(parseFloat) || [0, 0, parseFloat(root.getAttribute("width") || "0"), parseFloat(root.getAttribute("height") || "0")];
            const cw = viewBox[2], ch = viewBox[3];
            
            if (cw <= 0 || ch <= 0) throw new Error("Invalid SVG dimensions");

            if(this.model.state.canvasWidth===0) {
                 this.model.setCanvasDimensions(cw,ch,cw);
                 this.view.els.pdfLayer.style.background = 'white';
                 this.updateBaseWidth();
                 this.view.toggleWorkspace(true);
            }
            
            this.model.setState({regions:[]});
            
            // Extract nested <svg> elements (regions) - Restored scale/offset calculation
            Array.from(root.children).filter(el => el.tagName.toLowerCase() === 'svg').forEach(el => {
                 const x=parseFloat(el.getAttribute('x')), y=parseFloat(el.getAttribute('y')), w=parseFloat(el.getAttribute('width')), h=parseFloat(el.getAttribute('height'));
                 const viewBoxStr = el.getAttribute("viewBox");
                 const [vx, vy, vw, vh] = viewBoxStr ? viewBoxStr.split(/\s+/).map(parseFloat) : [0, 0, w, h];
                 const svgContent = el.innerHTML.trim();

                 const bpW = w * CONFIG.aiScale;
                 const bpH = h * CONFIG.aiScale;
                 const sx = vw > 0 ? bpW / vw : 1;
                 const sy = vh > 0 ? bpH / vh : 1;
                 const offsetX = -vx * sx;
                 const offsetY = -vy * sy;

                 this.model.addRegion({ 
                    id:`r${Date.now()}`, 
                    rect:{x:x/cw, y:y/ch, w:w/cw, h:h/ch}, 
                    svgContent:svgContent, 
                    bpDims:{w:bpW,h:bpH}, 
                    offset:{x:offsetX, y:offsetY}, 
                    scale:{x:sx,y:sy},
                    contentType: 'imported'
                 });
            });
        } catch(e) { alert(e.message); }
        this.view.toggleLoader(false);
    }

    async autoSegment() {
        const s = this.model.state; if(s.canvasWidth===0) return;
        this.view.els.aiStatus.classList.remove('hidden');
        this.model.setState({regions:[]});
        
        const w=s.canvas.width, h=s.canvas.height;
        const d=s.canvas.getContext('2d').getImageData(0,0,w,h).data;
        const visited = new Uint8Array(w*h);
        const CONNECTION_RADIUS = 10;
        
        for(let y=0; y<h; y++) for(let x=0; x<w; x++) {
             const i = y*w+x;
             if(!visited[i] && this.imageProcessor.isDark(d, i)) {
                 let q=[{x,y}], minX=x, maxX=x, minY=y, maxY=y, count=0;
                 visited[i]=1;
                 while(q.length) {
                     const p = q.shift();
                     minX=Math.min(minX,p.x); maxX=Math.max(maxX,p.x); minY=Math.min(minY,p.y); maxY=Math.max(maxY,p.y); count++;
                     
                     for(let dy=-CONNECTION_RADIUS; dy<=CONNECTION_RADIUS; dy++) 
                     for(let dx=-CONNECTION_RADIUS; dx<=CONNECTION_RADIUS; dx++) {
                         if(dx===0 && dy===0) continue;
                         const nx=p.x+dx, ny=p.y+dy;
                         if(nx>=0 && nx<w && ny>=0 && ny<h) {
                             const ni = ny*w+nx;
                             if(!visited[ni] && this.imageProcessor.isDark(d,ni)) { visited[ni]=1; q.push({x:nx,y:ny}); }
                         }
                     }
                 }
                 if(count > 250) {
                     const pad = 2; // small padding
                     let initialRect = {x:Math.max(0,minX-pad)/w, y:Math.max(0,minY-pad)/h, w:(Math.min(w-1,maxX+pad)-Math.max(0,minX-pad))/w, h:(Math.min(h-1,maxY+pad)-Math.max(0,minY-pad))/h};
                     const scan = this.imageProcessor.processRegion(initialRect);
                     if(scan) this.model.addRegion({ id:`r${Date.now()}_${x}`, rect:scan.newRect, svgContent:`<path d="${scan.rle}" fill="black" />`, bpDims:scan.bpDims });
                 }
             }
        }
        this.view.els.aiStatus.classList.add('hidden');
    }
}

// ============================================================================
// 5. VIEW (BRIDGE)
// ============================================================================

class UIManager {
    constructor() {
        this.els = {};
        this.model = null; 
    }

    init() {
        // Use the new SciTextUI System
        SciTextUI.init(this.els);
    }

    toggleLoader(show) { this.els.pdfLoader.classList.toggle('hidden', !show); }
    toggleWorkspace(show) { this.els.emptyState.classList.toggle('hidden', show); this.els.workspaceContainer.classList.toggle('hidden', !show); }
    hideRegionActionsBar() { this.els.regionActionsBar.classList.add('hidden'); }

    showRegionActionsBar(region, state) {
        this.els.regionActionsBar.classList.remove('hidden');
        const scale = state.scaleMultiplier;
        const aspectRatio = state.canvasHeight / state.canvasWidth;
        const physicalCw = state.baseWidth * scale;
        const physicalCh = physicalCw * aspectRatio;
        const x = region.rect.x * physicalCw;
        const y = region.rect.y * physicalCh;
        const w = region.rect.w * physicalCw;
        const wrapperRect = this.els.canvasWrapper.getBoundingClientRect();
        const bar = this.els.regionActionsBar;
        const scroller = this.els.canvasScroller;
        const scrollX = scroller.scrollLeft;
        const scrollY = scroller.scrollTop;
        const barLeft = wrapperRect.left + x + w / 2 - bar.offsetWidth / 2 - scrollX;
        const barTop = wrapperRect.top + y - bar.offsetHeight - 10 - scrollY;
        bar.style.left = `${barLeft}px`;
        bar.style.top = `${barTop}px`;
    }

    updatePropertiesInputs(region, state) {
        if (!region) {
            ['propX','propY','propW','propH','propOffsetX','propOffsetY','propScaleX','propScaleY'].forEach(key => {
                if(this.els[key]) this.els[key].value = '';
            });
            return;
        }
        const cw = state.canvasWidth; 
        const ch = state.canvasHeight;
        this.els.propX.value = Math.round(region.rect.x * cw);
        this.els.propY.value = Math.round(region.rect.y * ch);
        this.els.propW.value = Math.round(region.rect.w * cw);
        this.els.propH.value = Math.round(region.rect.h * ch);
        this.els.propOffsetX.value = (region.offset?.x ?? 0).toFixed(1);
        this.els.propOffsetY.value = (region.offset?.y ?? 0).toFixed(1);
        this.els.propScaleX.value = (region.scale?.x ?? 1).toFixed(2);
        this.els.propScaleY.value = (region.scale?.y ?? 1).toFixed(2);
    }

    renderActiveControls(region, state) {
        let frame = document.getElementById('active-selection-frame');
        if (!frame) {
            frame = document.createElement('div');
            frame.id = 'active-selection-frame';
            frame.className = 'selection-frame';
            this.els.interactionLayer.appendChild(frame);
            // Handles are now positioned by CSS classes added to SciTextUI.generateStyles()
            ['nw','n','ne','e','se','s','sw','w'].forEach(dir => {
                const h = document.createElement('div');
                h.className = `resize-handle handle-${dir}`;
                frame.appendChild(h);
            });
        }
        const scale = state.scaleMultiplier;
        const aspectRatio = state.canvasHeight / state.canvasWidth;
        const physicalCw = state.baseWidth * scale;
        const physicalCh = physicalCw * aspectRatio;
        Object.assign(frame.style, { 
            left: (region.rect.x * physicalCw)+'px', 
            top: (region.rect.y * physicalCh)+'px', 
            width: (region.rect.w * physicalCw)+'px', 
            height: (region.rect.h * physicalCh)+'px' 
        });
    }
    
    // --- ADDED: Helper to render split bar label ---
    renderSplitLabel(bar, text) {
        let label = document.getElementById('split-bar-label');
        if (!label) {
            label = document.createElement('div');
            label.id = 'split-bar-label';
            this.els.canvasWrapper.appendChild(label);
        }
        
        const barRect = bar.getBoundingClientRect();
        const wrapperRect = this.els.canvasWrapper.getBoundingClientRect();
        const scroller = this.els.canvasScroller;
        const scrollX = scroller.scrollLeft;
        const scrollY = scroller.scrollTop;

        label.textContent = text;
        
        // Position logic restored from old implementation
        if (this.model.controller.splitType === 'horizontal') {
            Object.assign(label.style, {
                left: `${barRect.left - wrapperRect.left + 5 + scrollX}px`,
                top: `${barRect.top - wrapperRect.top - label.offsetHeight - 5 + scrollY}px`,
                transform: 'none'
            });
        } else {
             Object.assign(label.style, {
                left: `${barRect.left - wrapperRect.left - label.offsetWidth - 5 + scrollX}px`,
                top: `${barRect.top - wrapperRect.top + 5 + scrollY}px`,
                transform: 'none'
            });
        }
    }
    // --- END ADDED HELPER ---

    renderSplitBar(region, state, splitType, splitPosition) {
        const { physicalCw, physicalCh } = this.model.controller.draw.getPhysicalDims();
        const rx = region.rect.x * physicalCw;
        const ry = region.rect.y * physicalCh;
        const rw = region.rect.w * physicalCw;
        const rh = region.rect.h * physicalCh;
        const bar = this.els.splitBar;
        bar.classList.remove('hidden');

        if (splitType === 'horizontal') {
            const py = ry + rh * splitPosition;
            Object.assign(bar.style, { left: rx + 'px', top: py - 1 + 'px', width: rw + 'px', height: '2px', cursor: 'ns-resize' });
            this.renderSplitLabel(bar, 'Horizontal (TAB to switch)'); // ADDED
        } else {
            const px = rx + rw * splitPosition;
            Object.assign(bar.style, { left: px - 1 + 'px', top: ry + 'px', width: '2px', height: rh + 'px', cursor: 'ew-resize' });
            this.renderSplitLabel(bar, 'Vertical (TAB to switch)'); // ADDED
        }
    }

    hideSplitBar() { 
        this.els.splitBar.classList.add('hidden'); 
        const label = document.getElementById('split-bar-label'); // ADDED
        if(label) label.remove(); // ADDED
    }

    switchTab(tab) {
        const activeClass = 'text-primary'; 
        const activeStyle = 'border-bottom:2px solid #2563eb';
        const inactiveClass = 'text-txt-muted';
        const inactiveStyle = 'border-bottom:2px solid transparent';

        if (tab === 'overlay') {
            // Logic to handle class/style switching (simplified for robust replacement)
            this.els.tabOverlay.className = this.els.tabOverlay.className.replace(inactiveClass, activeClass);
            this.els.tabDebug.className = this.els.tabDebug.className.replace(activeClass, inactiveClass);
            this.els.tabOverlay.style.cssText = this.els.tabOverlay.style.cssText.replace(inactiveStyle, '') + activeStyle;
            this.els.tabDebug.style.cssText = this.els.tabDebug.style.cssText.replace(activeStyle, '') + inactiveStyle;
            
            this.els.workspaceContainer.classList.remove('hidden');
            this.els.debugContainer.classList.add('hidden');
        } else if (tab === 'debug') {
            // Logic to handle class/style switching (simplified for robust replacement)
            this.els.tabOverlay.className = this.els.tabOverlay.className.replace(activeClass, inactiveClass);
            this.els.tabDebug.className = this.els.tabDebug.className.replace(inactiveClass, activeClass);
            this.els.tabOverlay.style.cssText = this.els.tabOverlay.style.cssText.replace(activeStyle, '') + inactiveStyle;
            this.els.tabDebug.style.cssText = this.els.tabDebug.style.cssText.replace(inactiveStyle, '') + activeStyle;

            this.els.workspaceContainer.classList.add('hidden');
            this.els.debugContainer.classList.remove('hidden');
        }
    }

    // --- UPDATED: Layer List Rendering ---
    renderLayerList(activeRegion) {
        const container = this.els.layerItems;
        if (!container) return;
        const regions = this.model.state.regions.slice().reverse();
        if (regions.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:#9ca3af;font-size:0.75rem;padding:1rem;">No regions yet</div>';
            return;
        }
        container.innerHTML = regions.map(r => {
            const isActive = r.id === (activeRegion?.id || this.model.state.activeRegionId);
            const eye = r.visible !== false ? '◉' : '◯';
            const label = r.status === 'pending' ? 'Pending' : (r.contentType ? r.contentType.charAt(0).toUpperCase() + r.contentType.slice(1) : 'Region');
            return `
<div class="layer-item ${isActive ? 'active' : ''}" data-id="${r.id}">
    <span class="drag-handle">⋮⋮</span>
    <span class="visibility-toggle ${r.visible !== false ? '' : 'hidden'}">${eye}</span>
    <span class="layer-name">${label}</span>
    <span class="delete-btn">×</span>
</div>`;
        }).join('');
    }

    render(state) {
        const controller = this.model.controller;
        this.els.regionCount.textContent = state.regions.length;
        this.els.zoomLevel.textContent = Math.round(state.scaleMultiplier * 100) + "%";
        
        const scale = state.scaleMultiplier;
        const aspectRatio = state.canvasHeight / state.canvasWidth;
        let physicalCw = state.baseWidth > 0 ? state.baseWidth * scale : state.canvasWidth * scale;
        let physicalCh = physicalCw * aspectRatio;
        
        if(state.canvasWidth > 0) {
             this.els.canvasWrapper.style.width = physicalCw + "px";
             this.els.canvasWrapper.style.height = physicalCh + "px";
        }

        this.els.svgLayer.innerHTML = '';
        this.els.interactionLayer.innerHTML = '';
        this.els.selectionBox.style.display = 'none';
        this.hideSplitBar();
        const oldFrame = document.getElementById('active-selection-frame');
        if (oldFrame) oldFrame.remove();

        state.regions.forEach(r => {
            const px = r.rect.x * physicalCw, py = r.rect.y * physicalCh;
            const pw = r.rect.w * physicalCw, ph = r.rect.h * physicalCh;
            
            const div = document.createElement("div");
            div.className = "absolute region-highlight";
            if (state.selectedIds.has(r.id)) div.classList.add("region-selected");
            if (r.visible === false) div.style.opacity = "0.3";
            Object.assign(div.style, { left: px+"px", top: py+"px", width: pw+"px", height: ph+"px" });
            div.dataset.id = r.id;
            this.els.interactionLayer.appendChild(div);

            if (r.visible !== false && r.svgContent) {
                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                const tx = r.offset?.x ?? 0, ty = r.offset?.y ?? 0;
                const sx = r.scale?.x ?? 1, sy = r.scale?.y ?? 1;
                const bpW = r.bpDims?.w ?? (r.rect.w * state.canvasWidth * 2); 
                const bpH = r.bpDims?.h ?? (r.rect.h * state.canvasHeight * 2);
                svg.setAttribute("viewBox", `${-(tx/sx)} ${-(ty/sy)} ${bpW/sx} ${bpH/sy}`);
                svg.setAttribute("preserveAspectRatio", "none");
                Object.assign(svg.style, { position:"absolute", left:px+"px", top:py+"px", width:pw+"px", height:ph+"px", pointerEvents:"none" });
                svg.innerHTML = r.svgContent;
                this.els.svgLayer.appendChild(svg);
            }
        });

        const active = state.activeRegionId ? state.regions.find(r => r.id === state.activeRegionId) : null;
        this.updatePropertiesInputs(active, state);
        
        if (active && active.svgContent !== undefined) {
            this.els.svgRawEditorPanel.classList.remove('hidden');
            if (this.els.svgRawContent.value !== active.svgContent) this.els.svgRawContent.value = active.svgContent;
        } else {
            this.els.svgRawEditorPanel.classList.add('hidden');
        }

        if (active) {
            if (controller.splitMode) {
                this.renderSplitBar(active, state, controller.splitType, controller.splitPosition);
                this.hideRegionActionsBar();
            } else {
                this.renderActiveControls(active, state);
                this.showRegionActionsBar(active, state);
            }
        } else {
            this.hideRegionActionsBar();
        }
        this.renderLayerList(active);
        if (!this.els.debugContainer.classList.contains('hidden')) {
            this.els.debugLog.textContent = JSON.stringify(state, null, 2);
        }
    }
}

// ============================================================================
// 6. BOOTSTRAP
// ============================================================================

const appObject = (function() {
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
        model, view, controller
    };
})();
export default appObject;
