/*
 * SciText Digitizer - Application Bundle (src/app.js)
 * This file consolidates:
 * 1. SciTextHelpers: Core math and SVG utilities.
 * 2. App Logic: State management, AI integration, and Canvas interaction.
 * 3. Default UI Extensions: The "Region Actions" toolbar logic.
 * 4. Embedded Template: HTML structure and CSS styles separated for clarity.
 * 5. Consolidated Logic with Modular Drawing System.
 */

import { RegionEditor } from 'https://lsparrish.github.io/sciconvert/src/draw.js'

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

  /* --- Action Bar --- */
  .region-actions-bar { position: fixed; z-index: 100; background-color: rgba(255, 255, 255, 0.95); padding: 0.5rem; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #d1d5db; display: flex; gap: 0.5rem; }
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
      </div>
    </header>

    <main class="main-content-wrapper">
      <div id="workspace-container" class="workspace-container hidden">
          <!-- Sidebar -->
          <div class="sidebar-panel">
              <div class="prop-header">
                  <div style="display:flex; justify-content:space-between;">
                      <span class="uppercase">Properties</span>
                      <span id="region-count" style="background-color:#dbeafe; color:#1d4ed8; padding:0 0.5rem; border-radius:9px; font-size:10px;">0</span>
                  </div>
              </div>
              <div id="layer-list" class="layer-list-container">
                  <div style="text-align:center; color:#9ca3af; font-size:10px; margin-top:1rem;">Select a region to view layers</div>
              </div>
              <div class="sidebar-footer">
                  <div style="display:flex; gap:0.5rem;">
                    <button id="btn-export" class="btn btn-secondary">Export SVG</button>
                    <button id="btn-clear-all" style="color:#ef4444; font-weight:600; font-size:0.75rem; border:none; background:none; cursor:pointer;">Reset</button>
                  </div>
                  <div id="context-actions" class="disabled-bar" style="display:flex; gap:0.25rem;">
                       <button id="btn-delete" class="btn btn-secondary">Del</button>
                  </div>
              </div>
          </div>
          <!-- Canvas Viewport -->
          <div id="canvas-view-area" class="canvas-view-style">
              <div id="canvas-scroller" class="canvas-scroller-style">
                  <div id="canvas-wrapper" class="canvas-wrapper-style">
                      <div id="pdf-layer" class="transition"></div> 
                      <div id="svg-layer" class="absolute inset-0 z-10 transition" style="pointer-events:none;"></div> 
                      <!-- Interaction Layer: Manages Clicks, Drags, and Handles via DrawController -->
                      <div id="interaction-layer" class="absolute inset-0 z-20"></div>
                      <div id="selection-box"></div>
                  </div>
              </div>
          </div>
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

    <!-- Draft Actions (Floating) -->
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
    history: [],
    historyIndex: -1,
    canvas: null,
  };

  app.state = state;
  const els = {};
  let regionEditor = null; // Instance of RegionEditor

  function init() {
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
    els.workspace = document.getElementById("workspace-container");
    els.emptyState = document.getElementById("empty-state");
    els.loader = document.getElementById("pdf-loader");
    els.wrapper = document.getElementById("canvas-wrapper");
    els.pdfLayer = document.getElementById("pdf-layer");
    els.svgLayer = document.getElementById("svg-layer");
    els.interactionLayer = document.getElementById("interaction-layer");
    els.selectionBox = document.getElementById("selection-box");
    els.regionActionsBar = document.getElementById("region-actions-bar");
    els.layerList = document.getElementById("layer-list");
    els.regionCount = document.getElementById("region-count");
    els.contextActions = document.getElementById("context-actions");
    els.aiStatus = document.getElementById("ai-status");
    els.btnDelete = document.getElementById("btn-delete");

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
          bpDims: null, // Will be set on generation
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

  app.selectRegion = function(id) {
      state.selectedIds.clear();
      state.selectedIds.add(id);
      state.activeRegionId = id;
      
      renderRegions();
      
      const r = app.getRegion(id);
      if (r) {
          regionEditor.renderActiveControls(r);
          renderLayerList(r);
          showRegionActionsBar(r);
      }
      updateUI();
  };

  app.deselect = function() {
      state.activeRegionId = null;
      state.selectedIds.clear();
      els.regionActionsBar.classList.add("hidden");
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
          svg.innerHTML = `<g transform="translate(${r.offset.x}, ${r.offset.y}) scale(${r.scale.x}, ${r.scale.y})">${r.svgContent}</g>`;
          els.svgLayer.appendChild(svg);

          // Render Interaction Highlight (Used for clicking/selecting via RegionEditor)
          // We render these into interactionLayer BEHIND the active controls
          const highlight = document.createElement("div");
          highlight.className = "absolute region-highlight";
          if (state.selectedIds.has(r.id)) highlight.classList.add("region-selected");
          highlight.style.left = px + "px";
          highlight.style.top = py + "px";
          highlight.style.width = pw + "px";
          highlight.style.height = ph + "px";
          
          // Important: DrawController relies on hit-testing these coordinates logic, 
          // or we can let the highlight element handle 'mouseover' style changes.
          // Since DrawController handles logic, these are mostly visual unless hit-testing uses elements.
          // Our RegionEditor uses coordinate math, so these are purely visual cues.
          els.interactionLayer.appendChild(highlight);
      });

      // Re-render active controls on top
      if (state.activeRegionId) {
          const r = app.getRegion(state.activeRegionId);
          if (r) regionEditor.renderActiveControls(r);
      }
  };

  // =========================================================================
  // 3. UI & EVENTS
  // =========================================================================

  function renderLayerList(r) {
      els.layerList.innerHTML = '';
      if (!r || !r.svgContent) return;
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<svg>${r.svgContent}</svg>`, "image/svg+xml");
      const children = Array.from(doc.documentElement.childNodes).filter(n => n.nodeType === 1);

      children.forEach((child, idx) => {
          const div = document.createElement('div');
          div.style.cssText = "background:white; border:1px solid #e5e7eb; border-radius:4px; padding:4px; margin-bottom:4px;";
          div.innerHTML = `<div style="font-size:10px; font-weight:700; color:#3b82f6; margin-bottom:2px;">${child.tagName}</div>
          <textarea style="width:100%; font-size:10px; border:1px solid #f3f4f6; resize:vertical; font-family:monospace;">${child.outerHTML}</textarea>`;
          
          const ta = div.querySelector('textarea');
          ta.onchange = () => {
              // Basic editing logic
              child.outerHTML = ta.value;
              r.svgContent = doc.documentElement.innerHTML;
              app.renderRegions();
          };
          els.layerList.appendChild(div);
      });
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

  function setupEventListeners() {
      // Zoom
      els.btnZoomIn.onclick = () => setZoom(state.scaleMultiplier + 0.25);
      els.btnZoomOut.onclick = () => setZoom(state.scaleMultiplier - 0.25);

      // History
      els.btnUndo.onclick = undo;
      els.btnRedo.onclick = redo;

      // File
      els.upload.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          els.loader.classList.remove("hidden");
          const img = new Image();
          img.src = URL.createObjectURL(file);
          await new Promise(r => img.onload = r);
          state.canvas.width = img.width;
          state.canvas.height = img.height;
          state.baseWidth = img.width;
          state.canvas.getContext('2d').drawImage(img, 0, 0);
          renderPage();
          els.loader.classList.add("hidden");
          els.emptyState.classList.add("hidden");
          els.workspace.classList.remove("hidden");
      };

      // Actions
      els.btnDelete.onclick = () => {
          state.regions = state.regions.filter(r => r.id !== state.activeRegionId);
          app.deselect();
          saveState();
      };

      els.regionActionsBar.onclick = (e) => {
          const type = e.target.dataset.type;
          if (type) generateContent(type);
          else if (e.target.id === 'btn-cancel-region') {
              state.regions = state.regions.filter(r => r.id !== state.activeRegionId);
              app.deselect();
              saveState();
          }
      };
      
      document.getElementById('btn-export').onclick = () => {
          const svg = els.svgLayer.innerHTML; // Simplified export
          const blob = new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${state.canvas.width}" height="${state.canvas.height}">${svg}</svg>`], {type: "image/svg+xml"});
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = "export.svg";
          a.click();
      };
      
      document.getElementById('btn-clear-all').onclick = () => {
          state.regions = [];
          app.deselect();
          saveState();
      };
  }

  // =========================================================================
  // 4. HELPERS (Zoom, History, AI)
  // =========================================================================

  function setZoom(m) {
      state.scaleMultiplier = Math.max(0.25, Math.min(5.0, m));
      els.txtZoomLevel.textContent = Math.round(state.scaleMultiplier * 100) + "%";
      const w = state.baseWidth * state.scaleMultiplier;
      els.wrapper.style.width = w + "px";
      els.wrapper.style.height = (w * (state.canvas.height / state.canvas.width)) + "px";
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

  function saveState() {
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
      app.deselect(); // Clear active state on undo/redo to prevent ghost handles
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
          saveState();
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

      // Simulation of AI generation (keeping it simple for this step)
      setTimeout(() => {
          const color = type === 'image' ? '#f59e0b' : '#10b981';
          r.svgContent = `<rect width="100%" height="100%" fill="${color}" fill-opacity="0.2"/><text x="50%" y="50%" font-size="20" fill="black" text-anchor="middle">Generated ${type}</text>`;
          r.status = 'done';
          r.bpDims = { w: r.rect.w * state.canvas.width, h: r.rect.h * state.canvas.height };
          
          app.renderRegions();
          els.aiStatus.classList.add("hidden");
          saveState();
      }, 1000);
  }

  app.bootstrap = init;
  return app;
})();
