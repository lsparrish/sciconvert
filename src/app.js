/*
 * SciText Digitizer - Application Bundle (src/app.js)
 * This file consolidates:
 * 1. SciTextHelpers: Core math and SVG utilities.
 * 2. App Logic: State management, AI integration, and Canvas interaction.
 * 3. Default UI Extensions: The "Region Actions" toolbar logic.
 * 4. Embedded Template: HTML structure and CSS styles separated for clarity.
 * Consolidated Logic with Modular Drawing System.
 */

let RegionEditor;
window.app = (function () {
  // =========================================================================
  // 0. EMBEDDED RESOURCES (Styles & Structure)
  // =========================================================================

  const APP_STYLES = `
  /* --- Global Reset and Base Styles --- */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    background-color: #111827;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    color: #1f2937;
    font-size: 14px;
    line-height: 1.5;
  }
  .hidden { display: none !important; }
  .relative { position: relative; }
  .absolute { position: absolute; }
  .inset-0 { top: 0; left: 0; right: 0; bottom: 0; }
  .transition { transition: all 0.15s ease-in-out; }
  .cursor-pointer { cursor: pointer; }
  .uppercase { text-transform: uppercase; }
  .select-none { user-select: none; }
  .disabled, .disabled-bar { opacity: 0.5; pointer-events: none; transition: opacity 0.15s ease-in-out; }
  
  /* --- Animations --- */
  .loader-spinner { width: 3rem; height: 3rem; border: 4px solid #4b5563; border-top-color: #3b82f6; border-radius: 9999px; animation: spin 1s linear infinite; margin-bottom: 1rem; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  #ai-status { animation: pulse 1s infinite alternate; }
  @keyframes pulse { from { opacity: 0.5; } to { opacity: 1; } }

  /* --- Header & Layout --- */
  .app-header { background-color: #1f2937; padding: 0.75rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border-bottom: 1px solid #111827; flex-shrink: 0; z-index: 30; }
  .header-group { display: flex; align-items: center; gap: 1rem; }
  .header-title { font-size: 1.25rem; font-weight: 700; letter-spacing: 0.05em; color: #f3f4f6; margin-right: 1rem; }
  .header-title span { color: #60a5fa; }
  .header-divider { width: 1px; height: 1.5rem; background-color: #4b5563; margin: 0 0.5rem; }

  /* --- Controls --- */
  .zoom-controls { display: flex; align-items: center; background-color: #374151; border-radius: 0.375rem; padding: 0.125rem; border: 1px solid #4b5563; }
  .zoom-button { color: #d1d5db; padding: 0.25rem 0.5rem; border-radius: 0.125rem; font-weight: 700; cursor: pointer; }
  .zoom-button:hover { opacity: 0.8; }
  .zoom-level-text { font-size: 0.75rem; font-family: monospace; width: 3.5rem; text-align: center; color: #e5e7eb; user-select: none; }
  
  .btn { padding: 0.375rem 0.75rem; border-radius: 0.25rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; border: 1px solid transparent; transition: all 0.15s ease-in-out; }
  .btn-primary { background-color: #2563eb; color: white; border-color: rgba(96, 165, 250, 0.2); font-size: 0.875rem; }
  .btn-primary:hover { background-color: #3b82f6; }
  .btn-secondary { background-color: #374151; color: #e5e7eb; border-color: #4b5563; font-size: 0.75rem; }
  .btn-secondary:hover { background-color: #4b5563; }
  
  .action-bar-btn { padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-weight: 700; font-size: 0.75rem; color: white; transition: background-color 0.15s; border: 1px solid transparent; cursor: pointer; }
  .action-bar-btn:hover { opacity: 0.9; }

  /* --- Main Content --- */
  .main-content-wrapper { flex: 1 1 0%; flex-direction: column; overflow: hidden; position: relative; background-color: white; display: flex; }
  .workspace-container { flex: 1 1 0%; display: flex; overflow: hidden; position: relative; }

  /* --- Sidebar --- */
  .sidebar-panel { width: 20rem; min-width: 320px; height: 100%; display: flex; flex-direction: column; border-right: 1px solid #e5e7eb; background-color: white; z-index: 10; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); flex-shrink: 0; }
  .prop-header { background-color: #f3f4f6; padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 700; color: #4b5563; border-bottom: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: 0.5rem; flex-shrink: 0; }
  .prop-header-top { display: flex; justify-content: space-between; align-items: center; }
  .region-count-badge { background-color: #dbeafe; color: #1d4ed8; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 10px; font-weight: 700; }
  .mode-toggle-group { display: flex; background-color: #e5e7eb; border-radius: 0.25rem; padding: 0.125rem; border: 1px solid #d1d5db; }
  .mode-button { padding: 0.125rem 0.5rem; border-radius: 0.25rem; font-size: 10px; font-weight: 700; transition: background-color 0.15s; }
  .mode-button-active { background-color: white; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); color: #2563eb; }
  .mode-button-inactive { color: #6b7280; }
  .prop-header-bottom { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e5e7eb; padding-top: 0.5rem; margin-top: 0.25rem; }
  .prop-header-tools { display: flex; gap: 0.5rem; }
  .geometry-inputs { 
    padding: 1rem; 
    background-color: #f9fafb; 
    border-bottom: 1px solid #e5e7eb; 
    display: grid; 
    grid-template-columns: repeat(2, minmax(0, 1fr)); 
    gap: 0.75rem; 
    font-size: 0.75rem; 
    user-select: none; 
    position: relative; 
    flex-shrink: 0;
  }
  .input-label { display: block; color: #9ca3af; font-weight: 700; margin-bottom: 0.25rem; font-size: 10px; }
  .input-field { width: 100%; background-color: white; border: 1px solid #d1d5db; border-radius: 0.25rem; padding: 0.375rem; font-family: monospace; color: #374151; outline: none; text-align: center; }
  .mode-status { position: absolute; top: 0.25rem; right: 0.5rem; font-size: 9px; font-weight: 700; letter-spacing: 0.05em; pointer-events: none; color: #60a5fa; }
  .layer-list-header { padding: 0.5rem 1rem; font-size: 0.75rem; font-weight: 700; color: #6b7280; border-bottom: 1px solid #e5e7eb; background-color: #f3f4f6; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
  .layer-list-container { flex: 1 1 0%; overflow-y: auto; padding: 0.5rem; background-color: #f3f4f6; border-top: 1px solid #e5e7eb; }
  .sidebar-footer { padding: 0.75rem; border-top: 1px solid #e5e7eb; background-color: #f9fafb; display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: space-between; align-items: center; flex-shrink: 0; }


  /* --- Canvas Area --- */
  .canvas-view-style { flex: 1 1 0%; height: 100%; display: flex; flex-direction: column; background-color: #e5e7eb; overflow: hidden; position: relative; }
  .canvas-scroller-style { flex: 1 1 0%; overflow: auto; display: flex; justify-content: center; padding: 3rem; position: relative; cursor: default; background-color: #e5e7eb; }
  .canvas-wrapper-style { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); transition: width 0.15s ease-out; background-color: white; position: relative; transform-origin: top; border: 1px solid rgba(17, 24, 39, 0.05); }
  
  /* --- SVG & Interaction Elements --- */
  .region-highlight { fill: rgba(59, 130, 246, 0.05); stroke: #3b82f6; stroke-width: 1; opacity: 0.5; transition: opacity 0.15s; pointer-events: all; }
  .region-highlight:hover { opacity: 0.8; cursor: move; stroke-width: 2; }
  .region-selected { stroke: #2563eb; stroke-width: 2; fill: rgba(37, 99, 235, 0.1); opacity: 1.0; }
  
  #selection-box { border: 2px dashed #2563eb; background-color: rgba(37, 99, 235, 0.1); position: absolute; pointer-events: none; display: none; z-index: 50; }
  
  /* --- New Selection Frame & Handles (Managed by draw.js) --- */
  .selection-frame { position: absolute; border: 1px solid #3b82f6; box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3); background-color: rgba(59, 130, 246, 0.05); z-index: 40; box-sizing: border-box; pointer-events: none; }
  .resize-handle { position: absolute; width: 8px; height: 8px; background-color: white; border: 1px solid #2563eb; z-index: 50; pointer-events: all; }
  .resize-handle:hover { background-color: #2563eb; }
  
  /* Handle Positions */
  .handle-nw { top: -4px; left: -4px; cursor: nwse-resize; }
  .handle-n { top: -4px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
  .handle-ne { top: -4px; right: -4px; cursor: nesw-resize; }
  .handle-e { top: 50%; right: -4px; transform: translateY(-50%); cursor: ew-resize; }
  .handle-se { bottom: -4px; right: -4px; cursor: nwse-resize; }
  .handle-s { bottom: -4px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
  .handle-sw { bottom: -4px; left: -4px; cursor: nesw-resize; }
  .handle-w { top: 50%; left: -4px; transform: translateY(-50%); cursor: ew-resize; }

  /* --- Action Bar (Renamed from draft-actions-bar) --- */
  .region-actions-bar { 
    position: fixed; 
    z-index: 100; 
    background-color: rgba(255, 255, 255, 0.95); 
    padding: 0.5rem; 
    border-radius: 0.5rem; 
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); 
    border: 1px solid #d1d5db; 
    display: flex; 
    gap: 0.5rem; 
  }
  `;

  const APP_STRUCTURE = `
<div id="template-structure">
    <!-- HEADER -->
    <header class="app-header z-30 shrink-0">
      <div class="header-group">
        <h1 class="header-title">SciText <span>Digitizer</span></h1>
        <div class="relative">
          <input type="file" id="pdf-upload" accept="application/pdf, image/*" class="hidden" />
          <label for="pdf-upload" class="btn btn-primary">Load</label>
        </div>
        <div class="header-divider"></div>
        <div id="pdf-zoom-controls" class="zoom-controls">
          <button id="zoom-out" class="zoom-button">-</button>
          <span id="zoom-level" class="zoom-level-text">100%</span>
          <button id="zoom-in" class="zoom-button">+</button>
        </div>
        <div class="header-group" style="gap:0.25rem; margin-left:0.5rem;">
            <button id="btn-undo" class="zoom-button" title="Undo">Undo</button>
            <button id="btn-redo" class="zoom-button" title="Redo">Redo</button>
        </div>
      </div>
      <div class="header-group">
          <span id="ai-status" class="hidden" style="color:#60a5fa; font-size:0.75rem; font-family:monospace;">Processing...</span>
          <button id="fullscreen-toggle" class="btn btn-secondary" style="font-weight:600; border:1px solid #4b5563;">Full Screen</button>
      </div>
    </header>

    <main class="main-content-wrapper">
      <!-- Tab Bar - Restored -->
      <div class="header-group" style="background-color:#f9fafb; border-bottom:1px solid #e5e7eb; box-shadow:inset 0 2px 4px 0 rgba(0,0,0,0.06); flex-shrink:0; z-index:20; padding-left:0; padding-right:0;">
        <button id="tab-overlay" class="tab-button tab-button-active">Compositor</button>
        <button id="tab-debug" class="tab-button">Debug View</button>
      </div>

      <!-- Main Workspace -->
      <div id="workspace-container" class="workspace-container hidden">
          <!-- Sidebar -->
          <div class="sidebar-panel">
              <!-- Property Header - Restored full structure -->
              <div class="prop-header">
                  <div class="prop-header-top">
                      <span class="uppercase">Properties</span>
                      <div class="header-group" style="gap:0.5rem;">
                          <div class="mode-toggle-group">
                              <button id="mode-area" class="mode-button mode-button-active">Area</button>
                              <button id="mode-content" class="mode-button mode-button-inactive">Content</button>
                          </div>
                          <span id="region-count" class="region-count-badge">0</span>
                      </div>
                  </div>
                  <div class="prop-header-bottom">
                      <span>Geometry Tools:</span>
                      <div class="prop-header-tools">
                           <button id="btn-fit-area" class="btn btn-secondary" style="font-size:10px; font-weight:600;">Fit Area</button>
                           <button id="btn-fit-content" class="btn btn-secondary" style="font-size:10px; font-weight:600;">Fill Content</button>
                      </div>
                  </div>
              </div>
              
              <!-- Geometry Inputs - Restored -->
              <div class="geometry-inputs">
                  <div id="mode-label" class="mode-status">Area Mode</div>
                  <div style="grid-column: span 2; display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                      <div><label id="lbl-x" class="input-label uppercase">Pos X</label><input type="number" id="prop-x" class="input-field" disabled></div>
                      <div><label id="lbl-y" class="input-label uppercase">Pos Y</label><input type="number" id="prop-y" class="input-field" disabled></div>
                  </div>
                  <div style="grid-column: span 2; display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                      <div><label id="lbl-w" class="input-label uppercase">Width</label><input type="number" id="prop-w" class="input-field" disabled></div>
                      <div><label id="lbl-h" class="input-label uppercase">Height</label><input type="number" id="prop-h" class="input-field" disabled></div>
                  </div>
              </div>

              <!-- Layer List Header - Restored -->
              <div class="layer-list-header">
                  <span class="uppercase">Region Layers</span>
                  <button id="btn-add-layer"> + Add</button>
              </div>

              <div id="layer-list" class="layer-list-container">
                  <div style="text-align:center; color:#9ca3af; font-size:10px; margin-top:1rem;">Select a region to view layers</div>
              </div>
              
              <!-- Sidebar Footer - Restored full context actions -->
              <div class="sidebar-footer">
                  <div class="header-group" style="gap:0.25rem;">
                    <button id="btn-export" class="action-bar-btn" style="background-color:#047857;">Export SVG</button>
                    <button id="btn-clear-all" class="action-bar-btn" style="color:#ef4444; background:transparent;">Reset</button>
                  </div>
                  <div id="context-actions" class="header-group disabled-bar" style="gap:0.5rem;">
                       <button id="btn-digitize" class="action-bar-btn" style="background-color:#9333ea;">AI Text</button>
                       <button id="btn-split" class="action-bar-btn" style="background-color:#eef2ff; color:#4338ca; border:1px solid #c7d2fe;">Split</button>
                       <button id="btn-group" class="action-bar-btn" style="background-color:#0d9488;">Group</button>
                       <button id="btn-optimize" class="action-bar-btn" style="background-color:#eef2ff; color:#4338ca; border:1px solid #c7d2fe;">Opt</button>
                       <button id="btn-regen" class="action-bar-btn" style="background-color:#2563eb;">Regen</button>
                       <button id="btn-delete" class="action-bar-btn" style="background-color:#ef4444;">Del</button>
                  </div>
              </div>
          </div>

          <!-- Canvas Viewport -->
          <div id="canvas-view-area" class="canvas-view-style">
              <div id="canvas-scroller" class="canvas-scroller-style">
                  <div id="canvas-wrapper" class="canvas-wrapper-style">
                      <div id="pdf-layer" class="transition"></div> 
                      <div id="svg-layer" class="absolute inset-0 z-10 transition" style="pointer-events:none;"></div> 
                      <div id="interaction-layer" class="absolute inset-0 z-20"></div>
                      <div id="selection-box"></div>
                  </div>
              </div>
          </div>
      </div>
      
      <!-- Debug View Container - Restored (Hidden by default) -->
      <div id="debug-container" class="workspace-container hidden" style="background-color:#111827; flex-direction:column; padding:1.5rem; overflow-y:auto;">
           <div style="color:white; font-family:monospace;">[Debug View - Select a region to view details]</div>
           <pre id="debug-log" style="color:#4ade80; font-size:10px;"></pre>
      </div>
      
      <!-- Loaders & Empty States -->
      <div id="empty-state" style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; background-color:#f3f4f6;">
        <div style="background:white; padding:2rem; border-radius:1rem; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); text-align:center;">
            <h2 style="font-size:1.25rem; font-weight:700; color:#374151; margin-bottom:0.5rem;">No Document Loaded</h2>
            <p style="color:#6b7280;">Upload a PDF or Image to begin.</p>
        </div>
      </div>
      <div id="pdf-loader" class="hidden" style="position:absolute; inset:0; background:rgba(17,24,39,0.7); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:50;">
          <div class="loader-spinner"></div>
          <span style="color:white; font-weight:700;">Loading...</span>
      </div>
    </main>

    <!-- Region Actions (Floating) - Renamed from draft-actions-bar -->
    <div id="region-actions-bar" class="region-actions-bar hidden">
      <button data-type="text" class="action-bar-btn" style="background-color:#2563eb;">AI Text</button>
      <button data-type="image" class="action-bar-btn" style="background-color:#d97706;">Image</button>
      <button data-type="empty" class="action-bar-btn" style="background-color:#4b5563;">Empty</button>
      <div style="width:1px;height:1.5rem;background-color:#d1d5db;"></div>
      <button id="btn-cancel-region" class="action-bar-btn" style="color:#ef4444;background:transparent;border:1px solid #d1d5db;">Cancel</button>
    </div>
    
    <canvas id="processing-canvas" style="display:none;"></canvas>
</div>`;

  // =========================================================================
  // 1. STATE & INIT
  // =========================================================================

  const app = window.app || {};
  const CONFIG = { defaultPdfUrl: "https://lsparrish.github.io/sciconvert/sample.png" };
  const apiKey = "";

  const state = {
    pdfDoc: null,
    scaleMultiplier: 1.0,
    baseWidth: 0,
    regions: [],
    activeRegionId: null,
    selectedIds: new Set(),
    editMode: 'area', // Restored
    history: [],
    historyIndex: -1,
    canvas: null,
  };

  app.state = state;
  const els = {};
  let regionEditor = null; // Instance of RegionEditor

  async function init() {
    // Dynamically import draw.js if not already available
    if (!RegionEditor) {
        try {
            const module = await import('./draw.js');
            RegionEditor = module.RegionEditor;
        } catch (e) {
            console.warn("Local import failed, trying CDN fallback...");
            try {
                const module = await import('https://lsparrish.github.io/sciconvert/src/draw.js');
                RegionEditor = module.RegionEditor;
            } catch (err) {
                console.error("Failed to load draw.js:", err);
                return; // Critical failure
            }
        }
    }

    // Inject Styles
    const style = document.createElement("style");
    style.textContent = APP_STYLES;
    document.head.appendChild(style);
    document.body.insertAdjacentHTML("beforeend", APP_STRUCTURE);

    // Bind DOM
    state.canvas = document.getElementById("processing-canvas");
    els.upload = document.getElementById("pdf-upload");
    els.btnZoomIn = document.getElementById("zoom-in");
    els.btnZoomOut = document.getElementById("zoom-out");
    els.txtZoomLevel = document.getElementById("zoom-level");
    els.btnUndo = document.getElementById("btn-undo");
    els.btnRedo = document.getElementById("btn-redo");
    
    // Tabs & Views
    els.tabOverlay = document.getElementById("tab-overlay"); 
    els.tabDebug = document.getElementById("tab-debug");     
    els.debugContainer = document.getElementById("debug-container"); 
    els.debugLog = document.getElementById("debug-log");
    els.workspace = document.getElementById("workspace-container");
    
    // Main UI
    els.emptyState = document.getElementById("empty-state");
    els.loader = document.getElementById("pdf-loader");
    els.wrapper = document.getElementById("canvas-wrapper");
    els.pdfLayer = document.getElementById("pdf-layer");
    els.svgLayer = document.getElementById("svg-layer");
    els.interactionLayer = document.getElementById("interaction-layer");
    els.selectionBox = document.getElementById("selection-box");
    
    // Action Bars 
    els.regionActionsBar = document.getElementById("region-actions-bar");
    els.btnCancelRegion = document.getElementById("btn-cancel-region"); 

    // Sidebar
    els.layerList = document.getElementById("layer-list");
    els.regionCount = document.getElementById("region-count");
    els.contextActions = document.getElementById("context-actions");
    els.aiStatus = document.getElementById("ai-status");
    els.btnDelete = document.getElementById("btn-delete");
    els.fullscreenBtn = document.getElementById("fullscreen-toggle");
    
    // Sidebar - Geometry & Mode 
    els.modeArea = document.getElementById("mode-area");
    els.modeContent = document.getElementById("mode-content");
    els.modeLabel = document.getElementById("mode-label");
    els.btnFitArea = document.getElementById("btn-fit-area");
    els.btnFitContent = document.getElementById("btn-fit-content");
    els.propX = document.getElementById("prop-x");
    els.propY = document.getElementById("prop-y");
    els.propW = document.getElementById("prop-w");
    els.propH = document.getElementById("prop-h");
    els.btnAddLayer = document.getElementById("btn-add-layer");
    
    // Sidebar - Context Actions 
    els.btnDigitize = document.getElementById("btn-digitize");
    els.btnSplit = document.getElementById("btn-split");
    els.btnGroup = document.getElementById("btn-group");
    els.btnOptimize = document.getElementById("btn-optimize");
    els.btnRegen = document.getElementById("btn-regen");


    app.els = els; // Expose els to modules

    // Initialize Draw Module
    regionEditor = new RegionEditor(app);
    regionEditor.init();

    setupEventListeners();
    
    // Load default
    try { loadDefaultImage(); } catch (e) { console.warn("Default load failed", e); }
  }

  // =========================================================================
  // 2. CORE OPERATIONS
  // =========================================================================

  app.addRegionFromDraw = function(normalizedRect) {
      const newRegion = {
          id: `r${Date.now()}`,
          rect: normalizedRect,
          status: 'pending',
          svgContent: `<text x="50%" y="50%" font-size="20" fill="#60a5fa" text-anchor="middle">Awaiting Action</text>`,
          bpDims: null,
          scale: { x: 1, y: 1 },
          offset: { x: 0, y: 0 }
      };
      state.regions.push(newRegion);
      app.selectRegion(newRegion.id);
      saveState();
      
      // Show action bar near the new region
      showRegionActionsBar(newRegion);
  };

  app.getRegion = function(id) {
      return state.regions.find(r => r.id === id);
  };
  
  // Restored: denormalizeRect function for properties display
  app.denormalizeRect = function(r) {
      return {
          x: r.x * state.canvas.width,
          y: r.y * state.canvas.height,
          w: r.w * state.canvas.width,
          h: r.h * state.canvas.height
      };
  };

  app.selectRegion = function(id) {
      state.selectedIds.clear();
      state.selectedIds.add(id);
      state.activeRegionId = id;
      
      renderRegions();
      
      const r = app.getRegion(id);
      if (r) {
          regionEditor.renderActiveControls(r);
          renderLayerList(r);
          updateUIProperties(r); 
          showRegionActionsBar(r);
          els.debugLog.textContent = JSON.stringify(r, null, 2); // Debug View Update
      }
      updateUI();
  };

  app.deselect = function() {
      state.activeRegionId = null;
      state.selectedIds.clear();
      els.regionActionsBar.classList.add("hidden"); 
      const frame = document.getElementById('active-selection-frame');
      if (frame) frame.remove();
      
      renderRegions();
      updateUI();
  };

  app.renderRegions = function() {
      const cw = state.canvas.width;
      const ch = state.canvas.height;
      els.svgLayer.innerHTML = '';
      els.interactionLayer.innerHTML = ''; // Clear old highlights/controls

      state.regions.forEach(r => {
          const px = r.rect.x * cw;
          const py = r.rect.y * ch;
          const pw = r.rect.w * cw;
          const ph = r.rect.h * ch;
          const dimW = r.bpDims ? r.bpDims.w : pw;
          const dimH = r.bpDims ? r.bpDims.h : ph;

          // Render Visual SVG
          const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.setAttribute("x", px);
          svg.setAttribute("y", py);
          svg.setAttribute("width", pw);
          svg.setAttribute("height", ph);
          svg.setAttribute("viewBox", `0 0 ${dimW} ${dimH}`);
          svg.setAttribute("preserveAspectRatio", "none");
          // Add default color if black
          svg.style.color = "black";
          svg.innerHTML = `<g transform="translate(${r.offset.x || 0}, ${r.offset.y || 0}) scale(${r.scale?.x || 1}, ${r.scale?.y || 1})">${r.svgContent || ''}</g>`;
          els.svgLayer.appendChild(svg);

          // Render Interaction Highlight
          const highlight = document.createElement("div");
          highlight.className = "absolute region-highlight";
          if (state.selectedIds.has(r.id)) highlight.classList.add("region-selected");
          highlight.style.left = px + "px";
          highlight.style.top = py + "px";
          highlight.style.width = pw + "px";
          highlight.style.height = ph + "px";
          highlight.dataset.id = r.id; // Added for editor hit testing in app.js if needed
          els.interactionLayer.appendChild(highlight);
      });

      // Re-render active controls on top
      if (state.activeRegionId) {
          const r = app.getRegion(state.activeRegionId);
          if (r) regionEditor.renderActiveControls(r);
      }
      
      // Update property inputs if region is active
      if (state.activeRegionId) updateUIProperties(app.getRegion(state.activeRegionId));
  };

  // =========================================================================
  // 3. UI & EVENTS
  // =========================================================================

  function renderLayerList(r) {
      els.layerList.innerHTML = '';
      if (!r || !r.svgContent) {
        els.layerList.innerHTML = '<div style="text-align:center; color:#9ca3af; font-size:10px; margin-top:1rem;">Select a region to view layers</div>';
        return;
      }
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<svg>${r.svgContent}</svg>`, "image/svg+xml");
      const children = Array.from(doc.documentElement.childNodes).filter(n => n.nodeType === 1);

      children.forEach((child, idx) => {
          const div = document.createElement('div');
          div.style.cssText = "background:white; border:1px solid #e5e7eb; border-radius:4px; padding:4px; margin-bottom:4px;";
          div.innerHTML = `<div style="font-size:10px; font-weight:700; color:#3b82f6; margin-bottom:2px;">${child.tagName}</div>
          <textarea style="width:100%; height: 60px; font-size:10px; border:1px solid #f3f4f6; resize:vertical; font-family:monospace;">${child.outerHTML}</textarea>`;
          
          const ta = div.querySelector('textarea');
          ta.onchange = () => {
              // Basic editing logic
              child.outerHTML = ta.value;
              r.svgContent = doc.documentElement.innerHTML;
              app.renderRegions();
              saveState(); // Save after user edits a layer
          };
          els.layerList.appendChild(div);
      });
  }
  
  // Restored: updateUIProperties
  function updateUIProperties(r) {
    if (!r) return;
    const { x, y, w, h } = app.denormalizeRect(r.rect);
    
    if (state.editMode === "area") {
      els.propX.value = x.toFixed(0);
      els.propY.value = y.toFixed(0);
      els.propW.value = w.toFixed(0);
      els.propH.value = h.toFixed(0);
    } else {
      // Content mode logic (simplified: show offsets and initial size)
      els.propX.value = (r.offset?.x || 0).toFixed(2);
      els.propY.value = (r.offset?.y || 0).toFixed(2);
      els.propW.value = (r.bpDims?.w || w).toFixed(2);
      els.propH.value = (r.bpDims?.h || h).toFixed(2);
    }
  }

  function showRegionActionsBar(r) {
      const rect = els.interactionLayer.getBoundingClientRect();
      const cw = state.canvas.width;
      const ch = state.canvas.height;
      const ratio = rect.width / cw;
      
      const px = r.rect.x * cw * ratio;
      const py = r.rect.y * ch * ratio;
      const ph = r.rect.h * ch * ratio;
      
      els.regionActionsBar.style.left = (rect.left + px) + "px";
      els.regionActionsBar.style.top = (rect.top + py + ph + 10) + "px";
      els.regionActionsBar.classList.remove("hidden");
  }

  function updateUI() {
      els.regionCount.textContent = state.regions.length;
      if (state.activeRegionId) els.contextActions.classList.remove("disabled-bar");
      else els.contextActions.classList.add("disabled-bar");
      
      els.btnUndo.disabled = state.historyIndex <= 0;
      els.btnRedo.disabled = state.historyIndex >= state.history.length - 1;
  }
  
  function switchTab(t) {
    els.workspace.classList.toggle("hidden", t !== "overlay");
    els.debugContainer.classList.toggle("hidden", t !== "debug");
    els.debugContainer.classList.toggle("flex", t === "debug");
    els.tabOverlay.classList.toggle("tab-button-active", t === "overlay");
    els.tabDebug.classList.toggle("tab-button-active", t === "debug");
    state.activeTab = t;
  }

  function setupEventListeners() {
      // Zoom
      els.btnZoomIn.onclick = () => setZoom(state.scaleMultiplier + 0.25);
      els.btnZoomOut.onclick = () => setZoom(state.scaleMultiplier - 0.25);

      // History
      els.btnUndo.onclick = undo;
      els.btnRedo.onclick = redo;

      // File Upload - Restored PDF Support
      els.upload.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          els.loader.classList.remove("hidden");
          
          if (file.type === "application/pdf" && window.pdfjsLib) {
              const ab = await file.arrayBuffer();
              const pdf = await pdfjsLib.getDocument(ab).promise;
              const page = await pdf.getPage(1);
              const viewport = page.getViewport({ scale: 2.0 });
              state.canvas.width = viewport.width;
              state.canvas.height = viewport.height;
              state.baseWidth = viewport.width;
              await page.render({
                canvasContext: state.canvas.getContext("2d"),
                viewport,
              }).promise;
          } else {
              const img = new Image();
              img.src = URL.createObjectURL(file);
              await new Promise(r => img.onload = r);
              state.canvas.width = img.width;
              state.canvas.height = img.height;
              state.baseWidth = img.width;
              state.canvas.getContext('2d').drawImage(img, 0, 0);
          }
          
          renderPage();
          els.loader.classList.add("hidden");
          els.emptyState.classList.add("hidden");
          els.workspace.classList.remove("hidden");
          els.workspace.classList.add("flex");
          // Reset
          state.regions = [];
          state.history = [];
          saveState(true);
      };

      // Actions
      els.btnDelete.onclick = () => {
          state.regions = state.regions.filter(r => !state.selectedIds.has(r.id));
          app.deselect();
          saveState();
      };
      
      // Full Screen Toggle
      els.fullscreenBtn.onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();

      // Region Actions Bar
      els.regionActionsBar.onclick = (e) => {
          const type = e.target.dataset.type;
          if (type) generateContent(type);
          else if (e.target.id === 'btn-cancel-region') { // Renamed ID
              state.regions = state.regions.filter(r => r.id !== state.activeRegionId);
              app.deselect();
              saveState();
          }
      };
      
      // Sidebar Controls - NEW
      els.tabOverlay.onclick = () => switchTab("overlay");
      els.tabDebug.onclick = () => switchTab("debug");
      
      els.modeArea.onclick = () => { state.editMode = 'area'; updateUIProperties(app.getRegion(state.activeRegionId)); };
      els.modeContent.onclick = () => { state.editMode = 'content'; updateUIProperties(app.getRegion(state.activeRegionId)); };
      
      els.propX.onchange = els.propY.onchange = els.propW.onchange = els.propH.onchange = () => {
          // This is a minimal implementation, needs proper validation and coordinate conversion
          const r = app.getRegion(state.activeRegionId);
          if (!r) return;
          if (state.editMode === 'area') {
            const cw = state.canvas.width;
            const ch = state.canvas.height;
            r.rect.x = parseFloat(els.propX.value) / cw;
            r.rect.y = parseFloat(els.propY.value) / ch;
            r.rect.w = parseFloat(els.propW.value) / cw;
            r.rect.h = parseFloat(els.propH.value) / ch;
          }
          // Note: Content mode handling is complex and omitted for this minimal fix
          app.renderRegions();
          saveState();
      };
      
      // Context Actions (Placeholder actions)
      els.btnDigitize.onclick = () => generateContent('text');
      els.btnRegen.onclick = () => generateContent('text');
      els.btnGroup.onclick = groupSelectedRegions; // Restored

      document.getElementById('btn-export').onclick = () => {
          // Use SciTextHelpers.composeSVG for proper export
          const svg = SciTextHelpers.composeSVG(state.regions, state.canvas.width, state.canvas.height);
          const blob = new Blob([svg], {type: "image/svg+xml"});
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = "scitext_export.svg";
          a.click();
      };
      
      document.getElementById('btn-clear-all').onclick = () => {
          state.regions = [];
          app.deselect();
          saveState();
      };
      
      // Prevent pointer events on the highlight rectangles from blocking clicks on handles
      els.interactionLayer.addEventListener('click', (e) => {
          if (e.target.classList.contains('region-highlight')) {
              e.stopPropagation(); // Stops the event from hitting the layer underneath
              
              // Only select if not already interacting via a handle
              if (regionEditor.interactionMode === 'IDLE') {
                  const id = e.target.dataset.id;
                  if (id) app.selectRegion(id);
              }
          }
      });
  }

  // =========================================================================
  // 4. HELPERS (Zoom, History, AI, SVG)
  // =========================================================================

  // Restored: SciTextHelpers for SVG Ops and RLE
  const SciTextHelpers = {
    normalizeRect: function (x, y, w, h, canvasWidth, canvasHeight) {
      return { x: x / canvasWidth, y: y / canvasHeight, w: w / canvasWidth, h: h / canvasHeight };
    },
    runLengthEncode: function (imageData) {
      let path = "";
      const { width, height, data } = imageData;
      for (let y = 0; y < height; y += 2) {
        let startX = -1;
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const isDark = data[idx + 3] > 128 && data[idx] < 128 && data[idx + 1] < 128 && data[idx + 2] < 128;
          if (isDark) {
            if (startX === -1) startX = x;
          } else {
            if (startX !== -1) {
              path += `M${startX} ${y}h${x - startX}v2h-${x - startX}z`;
              startX = -1;
            }
          }
        }
        if (startX !== -1) path += `M${startX} ${y}h${width - startX}v2h-${width - startX}z`;
      }
      return path;
    },
    composeSVG: function (regions, canvasWidth, canvasHeight) {
      let out = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`;
      out += `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">\n`;
      out += `  <rect width="100%" height="100%" fill="white"/>\n`;
      regions.forEach((r) => {
        if (!r.svgContent) return;
        const x = (r.rect.x * canvasWidth).toFixed(3);
        const y = (r.rect.y * canvasHeight).toFixed(3);
        const w = (r.rect.w * canvasWidth).toFixed(3);
        const h = (r.rect.h * canvasHeight).toFixed(3);
        r.scale = r.scale || { x: 1, y: 1 };
        r.offset = r.offset || { x: 0, y: 0 };
        out += `  <svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${r.bpDims.w} ${r.bpDims.h}" preserveAspectRatio="none" overflow="visible">\n`;
        out += `    <g transform="translate(${r.offset.x},${r.offset.y}) scale(${r.scale.x},${r.scale.y})">\n`;
        out += `      ${r.svgContent}\n`;
        out += `    </g>\n`;
        out += `  </svg>\n`;
      });
      out += `</svg>`;
      return out;
    }
  };

  function groupSelectedRegions() {
    const selected = state.regions.filter((r) => state.selectedIds.has(r.id));
    if (selected.length < 2) return;
    const cw = state.canvas.width;
    const ch = state.canvas.height;
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    selected.forEach((r) => {
      minX = Math.min(minX, r.rect.x);
      minY = Math.min(minY, r.rect.y);
      maxX = Math.max(maxX, r.rect.x + r.rect.w);
      maxY = Math.max(maxY, r.rect.y + r.rect.h);
    });
    let mergedContent = "";
    selected.forEach((r) => {
      const relX = (r.rect.x - minX) * cw;
      const relY = (r.rect.y - minY) * ch;
      mergedContent += `<svg x="${relX.toFixed(3)}" y="${relY.toFixed(3)}" width="${(r.rect.w * cw).toFixed(3)}" height="${(r.rect.h * ch).toFixed(3)}" viewBox="0 0 ${r.bpDims.w} ${r.bpDims.h}" preserveAspectRatio="none" overflow="visible"><g transform="translate(${r.offset.x},${r.offset.y}) scale(${r.scale.x},${r.scale.y})">${r.svgContent}</g></svg>`;
    });
    const newRegion = {
      id: `r${Date.now()}`,
      rect: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
      bpDims: { w: (maxX - minX) * cw, h: (maxY - minY) * ch },
      svgContent: mergedContent,
      scale: { x: 1, y: 1 },
      offset: { x: 0, y: 0 },
      status: "grouped",
    };
    state.regions = state.regions.filter((r) => !state.selectedIds.has(r.id));
    state.regions.push(newRegion);
    app.selectRegion(newRegion.id);
    saveState();
  }

  function setZoom(m) {
      state.scaleMultiplier = Math.max(0.25, Math.min(5.0, m));
      els.txtZoomLevel.textContent = Math.round(state.scaleMultiplier * 100) + "%";
      const w = state.baseWidth * state.scaleMultiplier;
      els.wrapper.style.width = w + "px";
      els.wrapper.style.height = (w * (state.canvas.height / state.canvas.width)) + "px";
      app.renderRegions();
  }

  function renderPage() {
      els.pdfLayer.innerHTML = '';
      els.pdfLayer.appendChild(state.canvas);
      state.canvas.style.display = 'block';
      state.canvas.style.width = '100%';
      state.canvas.style.height = '100%';
      setZoom(state.scaleMultiplier);
      app.renderRegions();
  }

  function saveState(isInitial) {
      if (state.historyIndex < state.history.length - 1) {
          state.history = state.history.slice(0, state.historyIndex + 1);
      }
      state.history.push(JSON.parse(JSON.stringify(state.regions)));
      state.historyIndex++;
      if (state.history.length > 50) { state.history.shift(); state.historyIndex--; }
      updateUI();
  }
  app.saveState = saveState;

  function undo() {
      if (state.historyIndex > 0) {
          state.historyIndex--;
          restoreState();
      }
  }

  function redo() {
      if (state.historyIndex < state.history.length - 1) {
          state.historyIndex++;
          restoreState();
      }
  }

  function restoreState() {
      state.regions = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
      app.deselect(); 
      app.renderRegions();
      updateUI();
  }
  
  function loadDefaultImage() {
      els.loader.classList.remove("hidden");
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
          state.canvas.width = img.width;
          state.canvas.height = img.height;
          state.baseWidth = img.width;
          state.canvas.getContext("2d").drawImage(img, 0, 0);
          renderPage();
          els.loader.classList.add("hidden");
          els.emptyState.classList.add("hidden");
          els.workspace.classList.remove("hidden");
          els.workspace.classList.add("flex");
          saveState(true);
      };
      img.src = CONFIG.defaultPdfUrl;
  }

  async function generateContent(type) {
      const r = app.getRegion(state.activeRegionId);
      if (!r) return;
      
      els.aiStatus.classList.remove("hidden");
      els.regionActionsBar.classList.add("hidden"); 

      if (type === 'empty') {
          r.svgContent = '';
          r.status = 'done';
          app.renderRegions();
          els.aiStatus.classList.add("hidden");
          saveState();
          return;
      }

      // Prepare AI Request (Real Logic Restored)
      els.aiStatus.textContent = `Generating ${type}...`;
      const cw = state.canvas.width;
      const ch = state.canvas.height;
      const pw = Math.floor(r.rect.w * cw);
      const ph = Math.floor(r.rect.h * ch);
      
      // 1. Create High-Res Crop
      const tmp = document.createElement("canvas");
      tmp.width = pw * 2;
      tmp.height = ph * 2;
      tmp.getContext("2d").drawImage(state.canvas, r.rect.x * cw, r.rect.y * ch, pw, ph, 0, 0, pw * 2, ph * 2);
      const base64 = tmp.toDataURL("image/png").split(",")[1];

      // 2. Create Blueprint
      const bpC = document.createElement("canvas");
      bpC.width = pw; bpC.height = ph;
      bpC.getContext("2d").drawImage(state.canvas, r.rect.x * cw, r.rect.y * ch, pw, ph, 0, 0, pw, ph);
      const rle = SciTextHelpers.runLengthEncode(bpC.getContext("2d").getImageData(0, 0, pw, ph));
      
      r.bpDims = { w: pw, h: ph };
      
      const prompt = `You are a precision SVG Typesetter.\nINPUTS:\n1. IMAGE: A 2x scale scan.\n2. BLUEPRINT: A 1x scale vector path.\nTASK:\nGenerate SVG <text> elements positioned over the BLUEPRINT.\nViewBox: 0 0 ${pw} ${ph}.\nOutput strictly valid SVG elements.\nBLUEPRINT (Partial):\n${rle.substring(0, 500)}...`;

      try {
          const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: base64 } }] }]
              }),
            }
          );
          const json = await resp.json();
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) throw new Error("No SVG generated.");

          r.svgContent = text.replace(/```svg/g, "").replace(/```/g, "").trim();
          r.status = "generated";
          r.scale = { x: 1, y: 1 };
          r.offset = { x: 0, y: 0 };

          saveState();
          app.renderRegions();
          app.selectRegion(r.id);
      } catch (e) {
          console.error("AI Error:", e);
          els.aiStatus.textContent = "Error generating content.";
          r.svgContent = `<text x="50%" y="50%" font-size="20" fill="red">Error</text>`;
          app.renderRegions();
      } finally {
          setTimeout(() => {
            els.aiStatus.classList.add("hidden");
            els.aiStatus.textContent = "Processing...";
          }, 3000);
      }
  }

  app.bootstrap = init;
  return app;
})();
