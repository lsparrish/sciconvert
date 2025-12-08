/*
 * SciText Digitizer - Application Bundle (src/app.js)
 * This file consolidates:
 * 1. SciTextHelpers: Core math and SVG utilities.
 * 2. App Logic: State management, AI integration, and Canvas interaction.
 * 3. Default UI Extensions: The "Region Actions" toolbar logic.
 * 4. Embedded Template: HTML structure and CSS styles separated for clarity.
 * Consolidated Logic with Modular Drawing System.
 */

// Global variable for the module class
let RegionEditor;

window.app = (function () {
  // =========================================================================
  // 0. EMBEDDED RESOURCES (Styles & Structure)
  // =========================================================================

  const APP_STYLES = `
  /* --- Base --- */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Segoe UI", sans-serif; background-color: #111827; height: 100vh; overflow: hidden; display: flex; flex-direction: column; color: #1f2937; font-size: 14px; }
  .hidden { display: none !important; }
  .relative { position: relative; }
  .absolute { position: absolute; }
  .inset-0 { top: 0; left: 0; right: 0; bottom: 0; }
  .transition { transition: all 0.15s ease-in-out; }
  .uppercase { text-transform: uppercase; }
  .select-none { user-select: none; }
  .disabled-bar { opacity: 0.5; pointer-events: none; }
  
  /* --- Components --- */
  .loader-spinner { width: 3rem; height: 3rem; border: 4px solid #4b5563; border-top-color: #3b82f6; border-radius: 9999px; animation: spin 1s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  #ai-status { animation: pulse 1s infinite alternate; }
  @keyframes pulse { from { opacity: 0.5; } to { opacity: 1; } }

  .app-header { background-color: #1f2937; padding: 0.75rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #111827; z-index: 30; }
  .header-title { font-size: 1.25rem; font-weight: 700; color: #f3f4f6; margin-right: 1rem; }
  .header-title span { color: #60a5fa; }
  
  .btn { padding: 0.375rem 0.75rem; border-radius: 0.25rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; }
  .btn-primary { background-color: #2563eb; color: white; } .btn-primary:hover { background-color: #3b82f6; }
  .btn-secondary { background-color: #374151; color: #e5e7eb; border-color: #4b5563; font-size: 0.75rem; }
  .action-bar-btn { padding: 0.25rem 0.75rem; border-radius: 0.25rem; font-weight: 700; font-size: 0.75rem; color: white; border: 1px solid transparent; cursor: pointer; }

  /* --- Layout --- */
  .main-content-wrapper { flex: 1; display: flex; overflow: hidden; position: relative; background-color: white; }
  .workspace-container { flex: 1; display: flex; overflow: hidden; position: relative; }
  
  .sidebar-panel { width: 20rem; min-width: 320px; display: flex; flex-direction: column; border-right: 1px solid #e5e7eb; background-color: white; z-index: 10; }
  .prop-header { background-color: #f3f4f6; padding: 0.75rem 1rem; border-bottom: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: 0.5rem; }
  .geometry-inputs { padding: 1rem; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb; display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.75rem; position: relative; }
  .input-label { display: block; color: #9ca3af; font-weight: 700; margin-bottom: 0.25rem; font-size: 10px; text-transform: uppercase; }
  .input-field { width: 100%; border: 1px solid #d1d5db; border-radius: 0.25rem; padding: 0.375rem; text-align: center; }
  .layer-list-container { flex: 1; overflow-y: auto; padding: 0.5rem; background-color: #f3f4f6; border-top: 1px solid #e5e7eb; }
  .sidebar-footer { padding: 0.75rem; border-top: 1px solid #e5e7eb; background-color: #f9fafb; display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: space-between; }

  /* --- Canvas --- */
  .canvas-view-style { flex: 1; display: flex; flex-direction: column; background-color: #e5e7eb; overflow: hidden; position: relative; }
  .canvas-scroller-style { flex: 1; overflow: auto; display: flex; justify-content: center; padding: 3rem; position: relative; }
  .canvas-wrapper-style { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); background-color: white; position: relative; transform-origin: top; }
  
  /* --- SVG Elements --- */
  /* FIX: Use background/border for Divs instead of fill/stroke */
  .region-highlight { background-color: rgba(59, 130, 246, 0.1); border: 1px solid #3b82f6; opacity: 0.6; pointer-events: all; }
  .region-highlight:hover { opacity: 0.9; border-width: 2px; cursor: move; }
  .region-selected { border: 2px solid #2563eb; background-color: rgba(37, 99, 235, 0.2); opacity: 1.0; }
  #selection-box { border: 2px dashed #2563eb; background: rgba(37, 99, 235, 0.1); position: absolute; pointer-events: none; display: none; z-index: 50; }
  
  /* --- Draw Handles --- */
  .selection-frame { position: absolute; border: 1px solid #3b82f6; box-shadow: 0 0 0 1px rgba(59,130,246,0.3); pointer-events: none; z-index: 40; }
  .resize-handle { position: absolute; width: 8px; height: 8px; background: white; border: 1px solid #2563eb; z-index: 50; pointer-events: all; }
  .resize-handle:hover { background: #2563eb; }
  .handle-nw { top: -4px; left: -4px; cursor: nwse-resize; } .handle-n { top: -4px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
  .handle-ne { top: -4px; right: -4px; cursor: nesw-resize; } .handle-e { top: 50%; right: -4px; transform: translateY(-50%); cursor: ew-resize; }
  .handle-se { bottom: -4px; right: -4px; cursor: nwse-resize; } .handle-s { bottom: -4px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
  .handle-sw { bottom: -4px; left: -4px; cursor: nesw-resize; } .handle-w { top: 50%; left: -4px; transform: translateY(-50%); cursor: ew-resize; }

  .region-actions-bar { position: fixed; z-index: 100; background: rgba(255,255,255,0.95); padding: 0.5rem; border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 1px solid #d1d5db; display: flex; gap: 0.5rem; }
  .tab-button { padding: 0.5rem 1rem; font-size: 0.75rem; font-weight: 600; color: #6b7280; border-bottom: 2px solid transparent; cursor: pointer; }
  .tab-button-active { color: #2563eb; border-bottom-color: #2563eb; }
  `;

  const APP_STRUCTURE = `
<div id="template-structure">
    <header class="app-header z-30 shrink-0">
      <div class="header-group" style="display:flex; align-items:center; gap:1rem;">
        <h1 class="header-title">SciText <span>Digitizer</span></h1>
        <div class="relative">
          <input type="file" id="pdf-upload" accept="application/pdf, image/*" class="hidden" />
          <label for="pdf-upload" class="btn btn-primary">Load</label>
        </div>
        <div style="width:1px; height:1.5rem; background:#4b5563;"></div>
        <div style="display:flex; border:1px solid #4b5563; border-radius:0.375rem;">
          <button id="zoom-out" style="color:#d1d5db; padding:0.25rem 0.5rem;">-</button>
          <span id="zoom-level" style="font-size:0.75rem; width:3.5rem; text-align:center; color:#e5e7eb; align-self:center;">100%</span>
          <button id="zoom-in" style="color:#d1d5db; padding:0.25rem 0.5rem;">+</button>
        </div>
        <div style="display:flex; gap:0.25rem;">
            <button id="btn-undo" class="btn btn-secondary">Undo</button>
            <button id="btn-redo" class="btn btn-secondary">Redo</button>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:1rem;">
          <span id="ai-status" class="hidden" style="color:#60a5fa; font-size:0.75rem; font-family:monospace;">Processing...</span>
          <button id="fullscreen-toggle" class="btn btn-secondary">Full Screen</button>
      </div>
    </header>

    <main class="main-content-wrapper">
      <div style="background:#f9fafb; border-bottom:1px solid #e5e7eb; flex-shrink:0; padding:0;">
        <button id="tab-overlay" class="tab-button tab-button-active">Compositor</button>
        <button id="tab-debug" class="tab-button">Debug View</button>
      </div>

      <div id="workspace-container" class="workspace-container hidden">
          <div class="sidebar-panel">
              <div class="prop-header">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span class="uppercase" style="font-size:0.75rem; font-weight:700; color:#4b5563;">Properties</span>
                      <span id="region-count" style="background:#dbeafe; color:#1d4ed8; padding:0.125rem 0.5rem; border-radius:99px; font-size:10px; font-weight:700;">0</span>
                  </div>
                  <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
                       <button id="btn-fit-area" class="btn btn-secondary" style="flex:1;">Fit Area</button>
                       <button id="btn-fit-content" class="btn btn-secondary" style="flex:1;">Fill</button>
                  </div>
              </div>
              
              <div class="geometry-inputs">
                  <div style="position:absolute; top:0.25rem; right:0.5rem; font-size:9px; font-weight:700; color:#60a5fa;">COORDS</div>
                  <div><label class="input-label">Pos X</label><input type="number" id="prop-x" class="input-field"></div>
                  <div><label class="input-label">Pos Y</label><input type="number" id="prop-y" class="input-field"></div>
                  <div><label class="input-label">Width</label><input type="number" id="prop-w" class="input-field"></div>
                  <div><label class="input-label">Height</label><input type="number" id="prop-h" class="input-field"></div>
              </div>

              <div id="layer-list" class="layer-list-container">
                  <div style="text-align:center; color:#9ca3af; font-size:10px; margin-top:1rem;">Select a region</div>
              </div>
              
              <div class="sidebar-footer">
                  <div style="display:flex; gap:0.25rem;">
                    <button id="btn-export" class="action-bar-btn" style="background:#047857;">Export</button>
                    <button id="btn-clear-all" class="action-bar-btn" style="color:#ef4444; background:transparent;">Reset</button>
                  </div>
                  <div id="context-actions" class="disabled-bar" style="display:flex; gap:0.5rem;">
                       <button id="btn-digitize" class="action-bar-btn" style="background:#9333ea;">AI Text</button>
                       <button id="btn-split" class="action-bar-btn" style="background:#4338ca;">Split</button>
                       <button id="btn-group" class="action-bar-btn" style="background:#0d9488;">Group</button>
                       <button id="btn-delete" class="action-bar-btn" style="background:#ef4444;">Del</button>
                  </div>
              </div>
          </div>

          <div id="canvas-view-area" class="canvas-view-style">
              <div id="canvas-scroller" class="canvas-scroller-style">
                  <div id="canvas-wrapper" class="canvas-wrapper-style">
                      <div id="pdf-layer" class="transition"></div> 
                      <div id="svg-layer" class="absolute inset-0 z-10" style="pointer-events:none;"></div> 
                      <div id="interaction-layer" class="absolute inset-0 z-20"></div>
                      <div id="selection-box"></div>
                  </div>
              </div>
          </div>
      </div>
      
      <div id="debug-container" class="hidden" style="flex:1; background:#111827; padding:1.5rem; overflow:auto;">
           <pre id="debug-log" style="color:#4ade80; font-size:10px; font-family:monospace;"></pre>
      </div>
      
      <div id="empty-state" style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f3f4f6;">
        <div style="background:white; padding:2rem; border-radius:1rem; box-shadow:0 10px 15px rgba(0,0,0,0.1); text-align:center;">
            <h2 style="font-size:1.25rem; font-weight:700; color:#374151;">No Document Loaded</h2>
            <p style="color:#6b7280; margin-top:0.5rem;">Upload a PDF or Image.</p>
        </div>
      </div>
      <div id="pdf-loader" class="hidden" style="position:absolute; inset:0; background:rgba(17,24,39,0.8); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:50;">
          <div class="loader-spinner"></div>
          <span style="color:white; font-weight:700; margin-top:1rem;">Loading...</span>
      </div>
    </main>

    <div id="region-actions-bar" class="region-actions-bar hidden">
      <button data-type="text" class="action-bar-btn" style="background:#2563eb;">AI Text</button>
      <button data-type="image" class="action-bar-btn" style="background:#d97706;">Image</button>
      <button data-type="empty" class="action-bar-btn" style="background:#4b5563;">Empty</button>
      <div style="width:1px;height:1.5rem;background:#d1d5db;"></div>
      <button id="btn-cancel-region" class="action-bar-btn" style="color:#ef4444;background:transparent;border:1px solid #d1d5db;">Cancel</button>
    </div>
    
    <canvas id="processing-canvas" style="display:none;"></canvas>
</div>`;

  const app = window.app || {};
  const CONFIG = { defaultPdfUrl: "https://lsparrish.github.io/sciconvert/sample.png" };
  const apiKey = ""; // API Key injected by environment

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
  let regionEditor = null;

  async function loadScript(src) {
      if (document.querySelector(`script[src="${src}"]`)) return;
      return new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = src;
          s.onload = resolve;
          s.onerror = reject;
          document.head.appendChild(s);
      });
  }

  async function init() {
    // 1. DYNAMIC IMPORT
    if (!RegionEditor) {
        try {
            const mod = await import('./draw.js');
            RegionEditor = mod.RegionEditor;
        } catch (e) {
            console.warn("Local draw.js failed, using CDN...");
            const mod = await import('https://lsparrish.github.io/sciconvert/src/draw.js');
            RegionEditor = mod.RegionEditor;
        }
    }

    // 2. DYNAMICALLY LOAD PDF.JS
    try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js');
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    } catch(e) {
        console.warn("PDF.js loading failed", e);
    }

    // 3. STYLES & DOM
    const style = document.createElement("style");
    style.textContent = APP_STYLES;
    document.head.appendChild(style);
    document.body.insertAdjacentHTML("beforeend", APP_STRUCTURE);

    // 4. BIND ELEMENTS
    ['processing-canvas','pdf-upload','zoom-in','zoom-out','zoom-level','btn-undo','btn-redo',
     'tab-overlay','tab-debug','debug-container','debug-log','workspace-container','empty-state',
     'pdf-loader','canvas-wrapper','pdf-layer','svg-layer','interaction-layer','selection-box',
     'region-actions-bar','btn-cancel-region','layer-list','region-count','context-actions',
     'ai-status','btn-delete','fullscreen-toggle','prop-x','prop-y','prop-w','prop-h',
     'btn-fit-area','btn-fit-content','btn-digitize','btn-split','btn-group','btn-export','btn-clear-all'
    ].forEach(id => els[camelCase(id)] = document.getElementById(id));

    state.canvas = els.processingCanvas;
    app.els = els;

    // 5. INIT MODULES
    regionEditor = new RegionEditor(app);
    regionEditor.init();

    setupEventListeners();
    loadDefaultImage();
  }

  // --- Core Operations ---

  app.addRegionFromDraw = function(normRect) {
      const newRegion = {
          id: `r${Date.now()}`,
          rect: normRect,
          status: 'pending',
          svgContent: '',
          bpDims: null,
          scale: { x: 1, y: 1 },
          offset: { x: 0, y: 0 }
      };
      state.regions.push(newRegion);
      app.selectRegion(newRegion.id);
      saveState();
      showRegionActionsBar(newRegion);
  };

  app.getRegion = (id) => state.regions.find(r => r.id === id);
  
  app.denormalizeRect = (r) => ({
      x: r.x * state.canvas.width, y: r.y * state.canvas.height,
      w: r.w * state.canvas.width, h: r.h * state.canvas.height
  });

  app.selectRegion = (id) => {
      state.selectedIds.clear();
      state.selectedIds.add(id);
      state.activeRegionId = id;
      renderRegions();
      
      const r = app.getRegion(id);
      if (r) {
          regionEditor.renderActiveControls(r);
          updateUIProperties(r);
          showRegionActionsBar(r);
          els.debugLog.textContent = JSON.stringify(r, null, 2);
      }
      updateUI();
  };

  app.deselect = () => {
      state.activeRegionId = null;
      state.selectedIds.clear();
      els.regionActionsBar.classList.add("hidden");
      const f = document.getElementById('active-selection-frame');
      if (f) f.remove();
      renderRegions();
      updateUI();
  };

  app.renderRegions = () => {
      const cw = state.canvas.width, ch = state.canvas.height;
      els.svgLayer.innerHTML = '';
      els.interactionLayer.innerHTML = '';

      state.regions.forEach(r => {
          const px = r.rect.x * cw, py = r.rect.y * ch;
          const pw = r.rect.w * cw, ph = r.rect.h * ch;
          const dimW = r.bpDims?.w || pw, dimH = r.bpDims?.h || ph;

          // Visual SVG
          const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.setAttribute("x", px); svg.setAttribute("y", py);
          svg.setAttribute("width", pw); svg.setAttribute("height", ph);
          svg.setAttribute("viewBox", `0 0 ${dimW} ${dimH}`);
          svg.setAttribute("preserveAspectRatio", "none");
          svg.style.color = "black";
          svg.innerHTML = `<g transform="translate(${r.offset.x},${r.offset.y}) scale(${r.scale.x},${r.scale.y})">${r.svgContent}</g>`;
          els.svgLayer.appendChild(svg);

          // Interaction Hitbox
          const div = document.createElement("div");
          div.className = "absolute region-highlight";
          if (state.selectedIds.has(r.id)) div.classList.add("region-selected");
          Object.assign(div.style, { left: px+'px', top: py+'px', width: pw+'px', height: ph+'px' });
          div.dataset.id = r.id;
          els.interactionLayer.appendChild(div);
      });

      if (state.activeRegionId) {
          regionEditor.renderActiveControls(app.getRegion(state.activeRegionId));
      }
  };

  // --- UI & Event Handlers ---

  function updateUIProperties(r) {
      if (!r) return;
      const d = app.denormalizeRect(r.rect);
      els.propX.value = d.x.toFixed(0); els.propY.value = d.y.toFixed(0);
      els.propW.value = d.w.toFixed(0); els.propH.value = d.h.toFixed(0);
  }

  function showRegionActionsBar(r) {
      const rect = els.interactionLayer.getBoundingClientRect();
      const scale = rect.width / state.canvas.width;
      const px = r.rect.x * state.canvas.width * scale;
      const py = r.rect.y * state.canvas.height * scale;
      const ph = r.rect.h * state.canvas.height * scale;
      
      els.regionActionsBar.style.left = (rect.left + px) + "px";
      els.regionActionsBar.style.top = (rect.top + py + ph + 10) + "px";
      els.regionActionsBar.classList.remove("hidden");
  }

  function updateUI() {
      els.regionCount.textContent = state.regions.length;
      if (state.activeRegionId) els.contextActions.classList.remove("disabled-bar");
      else els.contextActions.classList.add("disabled-bar");
  }

  function setupEventListeners() {
      // Zoom
      els.zoomIn.onclick = () => setZoom(state.scaleMultiplier + 0.25);
      els.zoomOut.onclick = () => setZoom(state.scaleMultiplier - 0.25);
      
      // History
      els.btnUndo.onclick = undo;
      els.btnRedo.onclick = redo;

      // File Load
      els.pdfUpload.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          els.pdfLoader.classList.remove("hidden");
          
          if (file.type === "application/pdf" && window.pdfjsLib) {
              const ab = await file.arrayBuffer();
              const pdf = await pdfjsLib.getDocument(ab).promise;
              const page = await pdf.getPage(1);
              const vp = page.getViewport({ scale: 2.0 });
              state.canvas.width = vp.width; state.canvas.height = vp.height;
              state.baseWidth = vp.width;
              await page.render({ canvasContext: state.canvas.getContext("2d"), viewport: vp }).promise;
          } else {
              const img = new Image();
              img.src = URL.createObjectURL(file);
              await new Promise(r => img.onload = r);
              state.canvas.width = img.width; state.canvas.height = img.height;
              state.baseWidth = img.width;
              state.canvas.getContext('2d').drawImage(img, 0, 0);
          }
          
          els.pdfLoader.classList.add("hidden");
          els.emptyState.classList.add("hidden");
          els.workspaceContainer.classList.remove("hidden");
          state.regions = []; state.history = [];
          renderPage();
          saveState(true);
      };

      // General Buttons
      els.fullscreenToggle.onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
      els.btnDelete.onclick = () => { state.regions = state.regions.filter(r => !state.selectedIds.has(r.id)); app.deselect(); saveState(); };
      els.btnClearAll.onclick = () => { state.regions = []; app.deselect(); saveState(); };
      
      // Action Bar
      els.regionActionsBar.onclick = (e) => {
          const type = e.target.dataset.type;
          if (type) generateContent(type);
          else if (e.target.id === 'btn-cancel-region') {
              state.regions = state.regions.filter(r => r.id !== state.activeRegionId);
              app.deselect();
              saveState();
          }
      };

      // Context
      els.btnDigitize.onclick = () => generateContent('text');
      els.btnSplit.onclick = () => alert("Split not implemented yet."); // Placeholder
      els.btnGroup.onclick = groupSelectedRegions;

      // Inputs
      [els.propX, els.propY, els.propW, els.propH].forEach(el => {
          el.onchange = () => {
              const r = app.getRegion(state.activeRegionId);
              if (r) {
                  const cw = state.canvas.width, ch = state.canvas.height;
                  r.rect.x = parseFloat(els.propX.value) / cw;
                  r.rect.y = parseFloat(els.propY.value) / ch;
                  r.rect.w = parseFloat(els.propW.value) / cw;
                  r.rect.h = parseFloat(els.propH.value) / ch;
                  app.renderRegions();
                  saveState();
              }
          }
      });

      // Tabs
      els.tabOverlay.onclick = () => switchTab('overlay');
      els.tabDebug.onclick = () => switchTab('debug');
  }

  // --- Logic Helpers ---

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
      
      let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
      selected.forEach(r => {
          minX = Math.min(minX, r.rect.x); minY = Math.min(minY, r.rect.y);
          maxX = Math.max(maxX, r.rect.x + r.rect.w); maxY = Math.max(maxY, r.rect.y + r.rect.h);
      });
      
      const newRegion = {
          id: `r${Date.now()}`,
          rect: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
          svgContent: selected.map(r => r.svgContent).join(''), // Simplification
          bpDims: { w: (maxX-minX)*state.canvas.width, h: (maxY-minY)*state.canvas.height },
          scale: {x:1, y:1}, offset: {x:0, y:0}
      };
      
      state.regions = state.regions.filter(r => !state.selectedIds.has(r.id));
      state.regions.push(newRegion);
      app.selectRegion(newRegion.id);
      saveState();
  }

  function setZoom(m) {
      state.scaleMultiplier = Math.max(0.25, Math.min(5.0, m));
      els.zoomLevel.textContent = Math.round(state.scaleMultiplier * 100) + "%";
      const w = state.baseWidth * state.scaleMultiplier;
      els.canvasWrapper.style.width = w + "px";
      els.canvasWrapper.style.height = (w * (state.canvas.height / state.canvas.width)) + "px";
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

  function saveState(initial) {
      if (!initial) {
          if (state.historyIndex < state.history.length - 1) state.history = state.history.slice(0, state.historyIndex + 1);
          state.history.push(JSON.parse(JSON.stringify(state.regions)));
          state.historyIndex++;
      }
      updateUI();
  }

  function undo() { if(state.historyIndex > 0) { state.historyIndex--; restoreState(); } }
  function redo() { if(state.historyIndex < state.history.length - 1) { state.historyIndex++; restoreState(); } }
  
  function restoreState() {
      state.regions = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
      app.deselect();
      app.renderRegions();
  }

  function switchTab(t) {
      els.workspaceContainer.classList.toggle('hidden', t !== 'overlay');
      els.debugContainer.classList.toggle('hidden', t !== 'debug');
      els.tabOverlay.classList.toggle('tab-button-active', t === 'overlay');
      els.tabDebug.classList.toggle('tab-button-active', t === 'debug');
  }

  function loadDefaultImage() {
      els.pdfLoader.classList.remove("hidden");
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
          state.canvas.width = img.width; state.canvas.height = img.height;
          state.baseWidth = img.width;
          state.canvas.getContext("2d").drawImage(img, 0, 0);
          els.pdfLoader.classList.add("hidden");
          els.emptyState.classList.add("hidden");
          els.workspaceContainer.classList.remove("hidden");
          renderPage();
          saveState(true);
      };
      img.onerror = () => {
          console.error("Failed to load default image");
          els.pdfLoader.classList.add("hidden");
      }
      img.src = CONFIG.defaultPdfUrl;
  }

  // --- Real AI Logic ---

  async function generateContent(type) {
      const r = app.getRegion(state.activeRegionId);
      if (!r) return;
      els.aiStatus.classList.remove("hidden");
      els.regionActionsBar.classList.add("hidden");

      if (type === 'empty') {
          r.svgContent = ''; r.status = 'done';
          app.renderRegions();
          els.aiStatus.classList.add("hidden");
          saveState();
          return;
      }

      els.aiStatus.textContent = `Generating ${type}...`;
      const cw = state.canvas.width, ch = state.canvas.height;
      const pw = Math.floor(r.rect.w * cw), ph = Math.floor(r.rect.h * ch);

      // Crop
      const tmp = document.createElement("canvas");
      tmp.width = pw * 2; tmp.height = ph * 2;
      tmp.getContext("2d").drawImage(state.canvas, r.rect.x * cw, r.rect.y * ch, pw, ph, 0, 0, pw * 2, ph * 2);
      const base64 = tmp.toDataURL("image/png").split(",")[1];

      // Simple RLE for prompt
      const bpC = document.createElement("canvas");
      bpC.width = pw; bpC.height = ph;
      bpC.getContext("2d").drawImage(state.canvas, r.rect.x * cw, r.rect.y * ch, pw, ph, 0, 0, pw, ph);
      const rle = SciTextHelpers.runLengthEncode(bpC.getContext("2d").getImageData(0, 0, pw, ph));
      
      const prompt = `You are a precision SVG Typesetter.\nINPUT: 2x scale scan.\nTASK: Generate SVG <text> elements.\nViewBox: 0 0 ${pw} ${ph}.\nOutput only <svg> code.\nRLE Blueprint: ${rle.substring(0, 200)}...`;

      try {
          const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: base64 } }] }] })
          });
          const json = await resp.json();
          let text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) throw new Error("No SVG generated.");
          
          text = text.replace(/```svg/g, "").replace(/```/g, "").trim();
          r.svgContent = text;
          r.bpDims = { w: pw, h: ph };
          r.status = 'generated';
          
          saveState();
          app.renderRegions();
          // Ensure region stays selected so user can see it
          if (state.activeRegionId === r.id) app.selectRegion(r.id);
      } catch (e) {
          console.error(e);
          r.svgContent = `<text x="10" y="20" font-size="20" fill="red">Error</text>`;
          app.renderRegions();
      } finally {
          els.aiStatus.classList.add("hidden");
      }
  }

  function camelCase(s) { return s.replace(/-./g, x=>x[1].toUpperCase()); }

  app.bootstrap = init;
  return app;
})();
