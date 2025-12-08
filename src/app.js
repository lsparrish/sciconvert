/*
 * SciText Digitizer - Single File Architecture
 * Contains:
 * 1. Config, Styles, HTML.
 * 2. SciTextModel (State & Data)
 * 3. UIManager (View & DOM)
 * 4. SciTextController (Logic & Events)
 * 5. RegionEditor (Canvas Interaction Logic)
 * * NOTE: The SVG editor has been simplified to an in-panel raw text editor for the selected region.
 */

// ============================================================================
// 1. CONFIG & STYLES
// ============================================================================

const CONFIG = {
    defaultImgUrl: "https://lsparrish.github.io/sciconvert/sample.png",
    aiScale: 2.0
};

const apiKey = ""; // Injected by environment

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
.main-content-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; background-color: white; }
.workspace-container { flex: 1; display: flex; overflow: hidden; position: relative; }

.sidebar-panel { width: 20rem; display: flex; flex-direction: column; border-right: 1px solid #e5e7eb; background-color: white; z-index: 10; }
.prop-header { background-color: #f3f4f6; padding: 0.75rem 1rem; border-bottom: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: 0.5rem; }
.geometry-inputs { padding: 1rem; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb; display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.75rem; position: relative; }
.input-label { display: block; color: #9ca3af; font-weight: 700; margin-bottom: 0.25rem; font-size: 10px; text-transform: uppercase; }
.input-field { width: 100%; border: 1px solid #d1d5db; border-radius: 0.25rem; padding: 0.375rem; text-align: center; }
.layer-list-container { display: flex; flex-direction: column; background-color: #e5e7eb; overflow: hidden; position: relative; }
.layer-item {
    padding: 0.5rem 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    cursor: pointer;
    border-bottom: 1px solid #e5e7eb;
    background: white;
    transition: background 0.15s;
}
.layer-item:hover { background: #f3f4f6; }
.layer-item.active { background: #dbeafe; font-weight: 600; }
.layer-item .visibility-toggle { font-size: 1rem; opacity: 0.6; cursor: pointer; }
.layer-item .visibility-toggle.hidden { opacity: 0.2; }
.layer-item .drag-handle { cursor: move; color: #9ca3af; }
.layer-item .layer-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.layer-item .delete-btn { color: #ef4444; opacity: 0; font-size: 0.9rem; }
.layer-item:hover .delete-btn { opacity: 1; }
.sidebar-footer { padding: 0.75rem; border-top: 1px solid #e5e7eb; background-color: #f9fafb; display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: space-between; }

/* --- Canvas --- */
.canvas-view-style { flex: 1; display: flex; flex-direction: column; background-color: #e5e7eb; overflow: hidden; position: relative; }
.canvas-scroller-style { flex: 1; overflow: auto; display: flex; justify-content: center; padding: 1rem; position: relative; }
.canvas-wrapper-style { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); background-color: white; position: relative; transform-origin: top; }

/* --- SVG Elements --- */
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
        <div style="width:1px; height:0.5rem; background:#4b5563;"></div>
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
              </div>
              
              <div class="geometry-inputs">
                  <div style="position:absolute; top:0.25rem; right:0.5rem; font-size:9px; font-weight:700; color:#60a5fa;">COORDS</div>
                  <div><label class="input-label">Pos X</label><input type="number" id="prop-x" class="input-field"></div>
                  <div><label class="input-label">Pos Y</label><input type="number" id="prop-y" class="input-field"></div>
                  <div><label class="input-label">Width</label><input type="number" id="prop-w" class="input-field"></div>
                  <div><label class="input-label">Height</label><input type="number" id="prop-h" class="input-field"></div>
              </div>

              <div id="svg-raw-editor-panel" class="hidden" style="padding: 1rem; background-color: #fff; border-bottom: 1px solid #e5e7eb; display:flex; flex-direction:column; gap:0.5rem;">
                  <span class="input-label" style="margin-bottom:0;">SVG Content (Edit Raw)</span>
                  <textarea id="svg-raw-content" style="width: 100%; min-height: 150px; border: 1px solid #d1d5db; border-radius: 0.25rem; padding: 0.5rem; font-family: monospace; font-size: 11px; line-height: 1.2; resize: vertical;"></textarea>
                  <button id="btn-save-raw-svg" class="action-bar-btn" style="background:#4f46e5; font-size:0.75rem;">Apply Changes</button>
              </div>
              <div id="layer-list" class="layer-list-container">
                  <div class="layer-list-header" style="padding:0.5rem 1rem; background:#f3f4f6; border-bottom:1px solid #e5e7eb; font-size:0.75rem; font-weight:700; color:#4b5563; text-transform:uppercase; letter-spacing:0.05em;">
                      Layers
                      <button id="btn-toggle-visibility-all" style="float:right; background:none; border:none; cursor:pointer; color:#6b7280; font-size:1rem;">👁</button>
                  </div>
                  <div id="layer-items" style="flex:1; overflow-y:auto; padding:0.25rem 0;"></div>
              </div>
              
              <div class="sidebar-footer">
                  <div style="display:flex; gap:0.25rem;">
                    <button id="btn-export" class="action-bar-btn" style="background:#047857;">Export</button>
                    <button id="btn-clear-all" class="action-bar-btn" style="color:#ef4444; background:transparent;">Reset</button>
                  </div>
              </div>
          </div>

          <div id="canvas-view-area" class="canvas-view-style">
              <div id="canvas-scroller" class="canvas-scroller-style">
                  <div id="canvas-wrapper" class="canvas-wrapper-style">
                      <div id="pdf-layer" class="transition absolute inset-0"></div>
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
      <button data-type="text" class="action-bar-btn" style="background:#2563eb;">Digitize</button>
      <button data-type="image" class="action-bar-btn" style="background:#d97706;">Image</button>
      <button data-type="blueprint" class="action-bar-btn" style="background:#059669;">Scan</button> 
      <button data-type="empty" class="action-bar-btn" style="background:#4b5563;">Empty</button>
      <div style="width:1px;height:1.5rem;background:#d1d5db;"></div>
      <button id="btn-fit-area" class="action-bar-btn" style="background:#6b21a8;">Fit Area</button>
      <button id="btn-fit-content" class="action-bar-btn" style="background:#1e40af;">Fill</button>
      <div style="width:1px;height:1.5rem;background:#d1d5db;"></div>
      <button id="btn-split" class="action-bar-btn" style="background:#4338ca;">Split</button>
      <button id="btn-group" class="action-bar-btn" style="background:#0d9488;">Group</button>
      <button id="btn-delete" class="action-bar-btn" style="background:#ef4444;">Del</button>
    </div>
    
    <canvas id="processing-canvas" style="display:none;"></canvas>
</div>`;

// ============================================================================
// 2. MODEL
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
        this.state.regions.push({ ...region, visible: true });
        this.selectRegion(region.id);
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
        this.state.regions = JSON.parse(JSON.stringify(this.state.history[this.state.historyIndex]));
        this.deselect();
        this.notify();
    }
}

// ============================================================================
// 3. VIEW (UI Manager)
// ============================================================================

class UIManager {
    constructor() {
        this.els = {};
    }

    init() {
        const style = document.createElement("style");
        style.textContent = APP_STYLES;
        document.head.appendChild(style);
        document.body.insertAdjacentHTML("beforeend", APP_STRUCTURE);
        this.bindElements();
    }

    bindElements() {
        const ids = [
            'processing-canvas','pdf-upload','zoom-in','zoom-out','zoom-level','btn-undo','btn-redo',
            'tab-overlay','tab-debug','debug-container','debug-log','workspace-container','empty-state',
            'pdf-loader','canvas-wrapper','pdf-layer','svg-layer','interaction-layer','selection-box',
            'region-actions-bar','layer-list','region-count','layer-items','btn-toggle-visibility-all',
            'ai-status','fullscreen-toggle','prop-x','prop-y','prop-w','prop-h',
            'btn-fit-area','btn-fit-content','btn-split','btn-group','btn-delete','btn-export','btn-clear-all',
            'canvas-scroller',
            'svg-raw-editor-panel', 'svg-raw-content', 'btn-save-raw-svg' 
        ];
        const camelCase = (s) => s.replace(/-./g, x=>x[1].toUpperCase());
        ids.forEach(id => {
            const el = document.getElementById(id);
            if(el) this.els[camelCase(id)] = el;
        });
    }

    toggleLoader(show) {
        this.els.pdfLoader.classList.toggle('hidden', !show);
    }

    toggleWorkspace(show) {
        this.els.emptyState.classList.toggle('hidden', show);
        this.els.workspaceContainer.classList.toggle('hidden', !show);
    }

    hideRegionActionsBar() {
        this.els.regionActionsBar.classList.add('hidden');
    }

    showRegionActionsBar(region, state) {
        this.els.regionActionsBar.classList.remove('hidden');
        const scale = state.scaleMultiplier;
        const physicalCw = state.canvasWidth * scale;
        const physicalCh = state.canvasHeight * scale;
        const x = region.rect.x * physicalCw;
        const y = region.rect.y * physicalCh;
        const w = region.rect.w * physicalCw;
        const wrapperRect = this.els.canvasWrapper.getBoundingClientRect();
        const bar = this.els.regionActionsBar;
        bar.style.left = `${wrapperRect.left + x + w / 2 - bar.offsetWidth / 2}px`;
        bar.style.top = `${wrapperRect.top + y - bar.offsetHeight - 10}px`;
    }

    updatePropertiesInputs(region, state) {
        if (!region) {
            this.els.propX.value = this.els.propY.value = this.els.propW.value = this.els.propH.value = '';
            return;
        }
        const cw = state.canvasWidth;
        const ch = state.canvasHeight;
        this.els.propX.value = Math.round(region.rect.x * cw);
        this.els.propY.value = Math.round(region.rect.y * ch);
        this.els.propW.value = Math.round(region.rect.w * cw);
        this.els.propH.value = Math.round(region.rect.h * ch);
    }

    renderActiveControls(region, state) {
        let frame = document.getElementById('active-selection-frame');
        if (!frame) {
            frame = document.createElement('div');
            frame.id = 'active-selection-frame';
            frame.className = 'selection-frame';
            this.els.interactionLayer.appendChild(frame);

            const handles = ['nw','n','ne','e','se','s','sw','w'];
            handles.forEach(dir => {
                const h = document.createElement('div');
                h.className = `resize-handle handle-${dir}`;
                frame.appendChild(h);
            });
        }

        const scale = state.scaleMultiplier;
        const x = region.rect.x * state.canvasWidth * scale;
        const y = region.rect.y * state.canvasHeight * scale;
        const w = region.rect.w * state.canvasWidth * scale;
        const h = region.rect.h * state.canvasHeight * scale;

        Object.assign(frame.style, { left: x+'px', top: y+'px', width: w+'px', height: h+'px' });
    }

    switchTab(tab) {
        if (tab === 'overlay') {
            this.els.tabOverlay.classList.add('tab-button-active');
            this.els.tabDebug.classList.remove('tab-button-active');
            this.els.workspaceContainer.classList.remove('hidden');
            this.els.debugContainer.classList.add('hidden');
        } else if (tab === 'debug') {
            this.els.tabOverlay.classList.remove('tab-button-active');
            this.els.tabDebug.classList.add('tab-button-active');
            this.els.workspaceContainer.classList.add('hidden');
            this.els.debugContainer.classList.remove('hidden');
        }
    }

    renderLayerList(activeRegion) {
        const container = this.els.layerItems;
        if (!container) return;

        const regions = this.model.state.regions.slice().reverse(); // newest on top

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
        this.els.regionCount.textContent = state.regions.length;
        this.els.zoomLevel.textContent = Math.round(state.scaleMultiplier * 100) + "%";

        if (state.canvasWidth > 0) {
            const w = state.baseWidth * state.scaleMultiplier;
            const h = w * (state.canvasHeight / state.canvasWidth);
            this.els.canvasWrapper.style.width = w + "px";
            this.els.canvasWrapper.style.height = h + "px";
        }

        const scale = state.scaleMultiplier;
        const logicalCw = state.canvasWidth;
        const logicalCh = state.canvasHeight;
        const physicalCw = logicalCw * scale;
        const physicalCh = logicalCh * scale;

        this.els.svgLayer.innerHTML = '';
        this.els.interactionLayer.innerHTML = '';
        this.els.selectionBox.style.display = 'none';

        // Remove old active frame if any
        const oldFrame = document.getElementById('active-selection-frame');
        if (oldFrame) oldFrame.remove();

        state.regions.forEach(r => {
            const px = r.rect.x * physicalCw;
            const py = r.rect.y * physicalCh;
            const pw = r.rect.w * physicalCw;
            const ph = r.rect.h * physicalCh;

            const viewW = r.bpDims?.w ?? (r.rect.w * logicalCw);
            const viewH = r.bpDims?.h ?? (r.rect.h * logicalCh);

            // Interaction highlight
            const div = document.createElement("div");
            div.className = "absolute region-highlight";
            if (state.selectedIds.has(r.id)) div.classList.add("region-selected");
            if (r.visible === false) div.style.opacity = "0.3";
            div.style.left   = px + "px";
            div.style.top    = py + "px";
            div.style.width  = pw + "px";
            div.style.height = ph + "px";
            div.dataset.id   = r.id;
            this.els.interactionLayer.appendChild(div);

            // SVG content (only when visible)
            if (r.visible === false) return;

            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("x", px);
            svg.setAttribute("y", py);
            svg.setAttribute("width", pw);
            svg.setAttribute("height", ph);
            svg.setAttribute("viewBox", `0 0 ${viewW} ${viewH}`);
            svg.setAttribute("preserveAspectRatio", "none");
            svg.style.position = "absolute";
            svg.style.left = px + "px";
            svg.style.top  = py + "px";
            svg.style.pointerEvents = "none";

            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            const tx = r.offset?.x ?? 0;
            const ty = r.offset?.y ?? 0;
            const sx = r.scale?.x ?? 1;
            const sy = r.scale?.y ?? 1;
            g.setAttribute("transform", `translate(${tx},${ty}) scale(${sx},${sy})`);
            g.innerHTML = r.svgContent || "";
            svg.appendChild(g);

            this.els.svgLayer.appendChild(svg);
        });

        // Update properties when there is an active region
        const active = state.activeRegionId ? state.regions.find(r => r.id === state.activeRegionId) : null;
        this.updatePropertiesInputs(active, state);
        
        // --- NEW LOGIC FOR IN-PANEL SVG EDITOR ---
        if (active && (active.svgContent !== undefined) ) {
            this.els.svgRawEditorPanel.classList.remove('hidden');
            // Only update the textarea if the controller isn't actively editing it
            if (this.els.svgRawContent.value !== active.svgContent) {
                 this.els.svgRawContent.value = active.svgContent;
            }
        } else {
            this.els.svgRawEditorPanel.classList.add('hidden');
            this.els.svgRawContent.value = '';
        }
        // --- END NEW LOGIC ---

        if (active) {
            this.renderActiveControls(active, state);
            this.showRegionActionsBar(active, state);
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
// 4. RegionEditor (canvas interaction)
// ============================================================================

class RegionEditor {
    constructor(controller) {
        this.controller = controller;
        this.mode = 'IDLE'; // IDLE, CREATE, MOVE, RESIZE
        this.dragStart = null;
        this.initialRect = null;
        this.activeHandle = null;
    }

    init() {
        this.controller.view.els.interactionLayer.addEventListener('mousedown', e => this.handleMouseDown(e));
        document.addEventListener('mousemove', e => this.handleMouseMove(e));
        document.addEventListener('mouseup', e => this.handleMouseUp(e));
        this.controller.view.els.interactionLayer.addEventListener('mouseleave', () => this.handleMouseLeave());
        document.addEventListener('keydown', e => this.handleKeyDown(e));
    }

    getLocalPos(e) {
        const rect = this.controller.view.els.canvasWrapper.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    hitDetection(pos) {
        const state = this.controller.model.state;
        const scale = state.scaleMultiplier;
        const cw = state.canvasWidth * scale;
        const ch = state.canvasHeight * scale;

        // Check resize handles first
        const active = state.activeRegionId ? this.controller.model.getRegion(state.activeRegionId) : null;
        if (active) {
            const rx = active.rect.x * cw;
            const ry = active.rect.y * ch;
            const rw = active.rect.w * cw;
            const rh = active.rect.h * ch;

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
        for (const r of state.regions) {
            const rx = r.rect.x * cw;
            const ry = r.rect.y * ch;
            const rw = r.rect.w * cw;
            const rh = r.rect.h * ch;
            if (pos.x >= rx && pos.x <= rx+rw && pos.y >= ry && pos.y <= ry+rh) {
                return { type: 'BODY', id: r.id };
            }
        }

        return { type: 'NONE' };
    }

    handleMouseDown(e) {
        if (e.button !== 0) return;

        const pos = this.getLocalPos(e);
        const hit = this.hitDetection(pos);

        if (hit.type === 'BODY') {
            if (hit.id !== this.controller.model.state.activeRegionId) {
                this.controller.model.selectRegion(hit.id);
            }
            this.mode = 'MOVE';
        } else if (hit.type === 'HANDLE') {
            this.mode = 'RESIZE';
            this.activeHandle = hit.handle;
        } else {
            this.controller.model.deselect();
            this.mode = 'CREATE';
        }

        this.dragStart = pos;
        const active = this.controller.model.getRegion(this.controller.model.state.activeRegionId);
        this.initialRect = active ? { ...active.rect } : null;
    }

    handleMouseMove(e) {
        const pos = this.getLocalPos(e);
        const hit = this.hitDetection(pos);
        const layer = this.controller.view.els.interactionLayer;

        if (this.mode === 'IDLE') {
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
            const s = this.dragStart;
            const x = Math.min(pos.x, s.x), y = Math.min(pos.y, s.y);
            const w = Math.abs(pos.x - s.x), h = Math.abs(pos.y - s.y);
            this.controller.view.els.selectionBox.style.display = 'block';
            this.controller.view.els.selectionBox.style.left = x + 'px';
            this.controller.view.els.selectionBox.style.top = y + 'px';
            this.controller.view.els.selectionBox.style.width = w + 'px';
            this.controller.view.els.selectionBox.style.height = h + 'px';
        } else if (this.mode === 'MOVE') {
            const scale = this.controller.model.state.scaleMultiplier;
            const physicalCw = this.controller.model.state.canvasWidth * scale;
            const physicalCh = this.controller.model.state.canvasHeight * scale;
            const dx = (pos.x - this.dragStart.x) / physicalCw;
            const dy = (pos.y - this.dragStart.y) / physicalCh;
            const r = this.controller.model.getRegion(this.controller.model.state.activeRegionId);
            if (r && this.initialRect) {
                const newRect = {
                    x: this.initialRect.x + dx,
                    y: this.initialRect.y + dy,
                    w: this.initialRect.w,
                    h: this.initialRect.h
                };
                this.controller.model.updateRegion(r.id, { rect: newRect });
            }
        } else if (this.mode === 'RESIZE') {
            const r = this.controller.model.getRegion(this.controller.model.state.activeRegionId);
            if (r && this.initialRect && this.activeHandle) {
                const scale = this.controller.model.state.scaleMultiplier;
                const physicalCw = this.controller.model.state.canvasWidth * scale;
                const physicalCh = this.controller.model.state.canvasHeight * scale;
                const ix = this.initialRect.x * physicalCw, iy = this.initialRect.y * physicalCh;
                const iw = this.initialRect.w * physicalCw, ih = this.initialRect.h * physicalCh;

                let nx = ix, ny = iy, nw = iw, nh = ih;

                if (this.activeHandle.includes('e')) nw = pos.x - ix;
                if (this.activeHandle.includes('s')) nh = pos.y - iy;
                if (this.activeHandle.includes('w')) { nw = (ix + iw) - pos.x; nx = pos.x; }
                if (this.activeHandle.includes('n')) { nh = (iy + ih) - pos.y; ny = pos.y; }

                if (nw > 5 && nh > 5) {
                    const newRect = { x: nx/physicalCw, y: ny/physicalCh, w: nw/physicalCw, h: nh/physicalCh };
                    this.controller.model.updateRegion(r.id, { rect: newRect });
                }
            }
        }
    }

    handleMouseUp(e) {
        if (this.mode === 'IDLE') return;

        if (this.mode === 'CREATE') {
            const pos = this.getLocalPos(e);
            const w = Math.abs(pos.x - this.dragStart.x);
            const h = Math.abs(pos.y - this.dragStart.y);
            if (w > 5 && h > 5) {
                const lx = Math.min(pos.x, this.dragStart.x);
                const ly = Math.min(pos.y, this.dragStart.y);
                const scale = this.controller.model.state.scaleMultiplier;
                const physicalCw = this.controller.model.state.canvasWidth * scale;
                const physicalCh = this.controller.model.state.canvasHeight * scale;
                this.controller.model.addRegion({
                    id: `r${Date.now()}`,
                    rect: { x: lx/physicalCw, y: ly/physicalCh, w: w/physicalCw, h: h/physicalCh },
                    status: 'pending', svgContent: ''
                });
            }
            this.controller.view.els.selectionBox.style.display = 'none';
        } else {
            this.controller.model.saveHistory();
        }

        this.mode = 'IDLE';
        this.activeHandle = null;
        this.initialRect = null;
    }

    handleMouseLeave() {
        if (this.mode !== 'IDLE') this.cancelInteraction();
        this.controller.view.els.interactionLayer.style.cursor = 'default';
    }

    handleKeyDown(e) {
        if (e.key === 'Escape') {
            this.mode = 'IDLE';
            this.controller.view.els.selectionBox.style.display = 'none';
        }
    }

    cancelInteraction() {
        if (this.mode === 'CREATE') {
            this.controller.view.els.selectionBox.style.display = 'none';
        } else if (this.mode === 'MOVE' || this.mode === 'RESIZE') {
            const r = this.controller.model.getRegion(this.controller.model.state.activeRegionId);
            if (r && this.initialRect) {
                this.controller.model.updateRegion(r.id, { rect: this.initialRect });
            }
        }
        this.mode = 'IDLE';
    }
}

// ============================================================================
// 5. CONTROLLER
// ============================================================================

class SciTextController {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        this.draw = new RegionEditor(this);
        // Removed activeSvgDom and activeElementMap as they are no longer needed for the raw editor.
    }

    async init() {
        this.view.init();

        this.model.state.canvas = this.view.els.processingCanvas;
        await this.loadPDFJS();
        
        this.draw.init();

        // Basic UI bindings
        this.view.els.pdfUpload.onchange = e => this.handleFileUpload(e);
        this.view.els.btnUndo.onclick = () => this.model.undo();
        this.view.els.btnRedo.onclick = () => this.model.redo();
        this.view.els.zoomIn.onclick = () => this.setZoom(this.model.state.scaleMultiplier + 0.25);
        this.view.els.zoomOut.onclick = () => this.setZoom(this.model.state.scaleMultiplier - 0.25);
        this.view.els.btnDelete.onclick = () => {
            Array.from(this.model.state.selectedIds).forEach(id => this.model.deleteRegion(id));
        };
        this.view.els.btnClearAll.onclick = () => { 
            this.model.setState({regions:[]}); 
            this.model.deselect(); 
            this.model.saveHistory(); 
        };
        this.view.els.fullscreenToggle.onclick = () => this.toggleFullscreen();
        this.view.els.tabOverlay.onclick = () => this.switchTab('overlay');
        this.view.els.tabDebug.onclick = () => this.switchTab('debug');
        this.view.els.btnExport.onclick = () => this.exportSVG();
        this.view.els.btnFitArea.onclick = () => this.fitArea();
        this.view.els.btnFitContent.onclick = () => this.fitContent();
        this.view.els.btnSplit.onclick = () => this.splitRegion();
        this.view.els.btnGroup.onclick = () => this.groupSelectedRegions();
        
        // NEW SVG Editor Bindings (Simplified)
        this.view.els.btnSaveRawSvg.onclick = () => this.saveRawSvgChanges();

        // Property inputs
        ['propX','propY','propW','propH'].forEach(k => {
            if(this.view.els[k]) this.view.els[k].onchange = () => this.updateRegionFromProps();
        });

        // Region actions bar
        this.view.els.regionActionsBar.onclick = (e) => {
            const type = e.target.dataset.type;
            if (type) this.generateContent(type);
        };

        // Layer list interactions
        this.view.els.layerItems?.addEventListener('click', (e) => {
            const item = e.target.closest('.layer-item');
            if (!item) return;
            const id = item.dataset.id;

            if (e.target.classList.contains('visibility-toggle')) {
                const r = this.model.getRegion(id);
                if (r) this.model.updateRegion(id, { visible: !r.visible });
            } else if (e.target.classList.contains('delete-btn')) {
                this.model.deleteRegion(id);
            } else {
                this.model.selectRegion(id);
            }
        });

        // Toggle all visibility
        this.view.els.btnToggleVisibilityAll.onclick = () => {
            const anyHidden = this.model.state.regions.some(r => !r.visible);
            this.model.state.regions.forEach(r => this.model.updateRegion(r.id, { visible: !anyHidden }));
        };

        this.loadDefaultImage();
    }

    switchTab(t) {
        this.view.switchTab(t);
    }

    async loadPDFJS() {
        if (!window.pdfjsLib) {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js');
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        }
    }

    loadScript(src) {
        return new Promise((resolve) => {
            const s = document.createElement('script'); s.src = src; s.onload = resolve; document.head.appendChild(s);
        });
    }

    setZoom(s) {
        this.model.setState({ scaleMultiplier: Math.max(0.25, Math.min(5.0, s)) });
    }

    toggleFullscreen() {
        document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    }

    async handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        this.view.toggleLoader(true);

        const canvas = this.model.state.canvas;
        const ctx = canvas.getContext("2d");

        if (file.type === "application/pdf" && window.pdfjsLib) {
            const ab = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(ab).promise;
            const page = await pdf.getPage(1);
            const vp = page.getViewport({ scale: 2.0 });

            this.model.setCanvasDimensions(vp.width, vp.height, vp.width);
            canvas.width = vp.width;
            canvas.height = vp.height;

            await page.render({ canvasContext: ctx, viewport: vp }).promise;
        } else {
            const img = new Image();
            const loaded = new Promise(resolve => img.onload = resolve);
            img.src = URL.createObjectURL(file);
            await loaded;

            this.model.setCanvasDimensions(img.width, img.height, img.width);
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
        }

        this.view.els.pdfLayer.style.backgroundImage = `url(${canvas.toDataURL()})`;
        this.view.els.pdfLayer.style.backgroundSize = "100% 100%";

        this.view.toggleLoader(false);
        this.view.toggleWorkspace(true);
        this.model.setState({ regions: [], history: [] });
        this.model.saveHistory();
    }

    loadDefaultImage() {
        this.view.toggleLoader(true);
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            this.model.setCanvasDimensions(img.width, img.height, img.width);

            const canvas = this.model.state.canvas;
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext("2d").drawImage(img, 0, 0);

            this.view.els.pdfLayer.style.backgroundImage = `url(${img.src})`;
            this.view.els.pdfLayer.style.backgroundSize = "100% 100%";

            this.view.toggleLoader(false);
            this.view.toggleWorkspace(true);
            this.model.saveHistory();
        };
        img.onerror = () => {
            console.error("Failed to load default image");
            this.view.toggleLoader(false);
        };
        img.src = CONFIG.defaultImgUrl;
    }

    updateRegionFromProps() {
        const id = this.model.state.activeRegionId;
        if (!id) return;
        const cw = this.model.state.canvasWidth;
        const ch = this.model.state.canvasHeight;
        const r = {
            x: parseFloat(this.view.els.propX.value) / cw || 0,
            y: parseFloat(this.view.els.propY.value) / ch || 0,
            w: parseFloat(this.view.els.propW.value) / cw || 0,
            h: parseFloat(this.view.els.propH.value) / ch || 0
        };
        this.model.updateRegion(id, { rect: r });
        this.model.saveHistory();
    }
    
    // ======== SVG EDITOR LOGIC (Simplified) ========

    saveRawSvgChanges() {
        const activeId = this.model.state.activeRegionId;
        if (!activeId) return;
        
        const newSvgContent = this.view.els.svgRawContent.value;

        // Strip surrounding SVG tags if the user accidentally included them
        const strippedContent = newSvgContent
            .replace(/<svg[^>]*?>/g, '')
            .replace(/<\/svg>/g, '')
            .trim();

        this.model.updateRegion(activeId, {
            svgContent: strippedContent,
            status: 'edited',
            contentType: 'custom' 
        });

        this.model.saveHistory();
        this.model.notify(); // Force re-render with new SVG content
    }
    
    // ======== End SVG EDITOR LOGIC (Simplified) ========

    async fitArea() {
        const id = this.model.state.activeRegionId;
        const r = this.model.getRegion(id);
        if (!r) return;

        const s = this.model.state;
        const pw = Math.floor(r.rect.w * s.canvasWidth);
        const ph = Math.floor(r.rect.h * s.canvasHeight);

        if (pw < 1 || ph < 1) return;

        const tmp = document.createElement("canvas");
        tmp.width = pw * 2; tmp.height = ph * 2;
        const ctx = tmp.getContext("2d");
        ctx.drawImage(s.canvas, r.rect.x * s.canvasWidth, r.rect.y * s.canvasHeight, pw, ph, 0, 0, pw * 2, ph * 2);

        const data = ctx.getImageData(0, 0, pw * 2, ph * 2).data;

        let minX = pw * 2, minY = ph * 2, maxX = 0, maxY = 0;
        let found = false;

        for (let y = 0; y < ph * 2; y++) {
            for (let x = 0; x < pw * 2; x++) {
                const i = (y * (pw * 2) + x) * 4;
                if (data[i + 3] > 128 && data[i] < 128) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    found = true;
                }
            }
        }

        if (!found) return;

        const pad = 4;
        minX = Math.max(0, minX - pad);
        minY = Math.max(0, minY - pad);
        maxX = Math.min(pw * 2, maxX + pad);
        maxY = Math.min(ph * 2, maxY + pad);

        const globalX = r.rect.x + (minX / 2) / s.canvasWidth;
        const globalY = r.rect.y + (minY / 2) / s.canvasHeight;
        const globalW = ((maxX - minX) / 2) / s.canvasWidth;
        const globalH = ((maxY - minY) / 2) / s.canvasHeight;

        this.model.updateRegion(id, {
            rect: { x: globalX, y: globalY, w: globalW, h: globalH },
            scale: { x: 1, y: 1 },
            offset: { x: 0, y: 0 }
        });

        await this.generateContent('blueprint');
    }

    fitContent() {
        const id = this.model.state.activeRegionId;
        if (!id) return;
        this.model.updateRegion(id, { scale: {x: 1, y: 1}, offset: {x: 0, y: 0} });
        this.model.saveHistory();
    }

    splitRegion() {
        const id = this.model.state.activeRegionId;
        if (!id) return;

        const r = this.model.getRegion(id);
        const cw = this.model.state.canvasWidth;
        const ch = this.model.state.canvasHeight;

        const isHorizontalSplit = (r.rect.w * cw) > (r.rect.h * ch);

        const r1Rect = { ...r.rect };
        const r2Rect = { ...r.rect };

        if (isHorizontalSplit) {
            r1Rect.w /= 2;
            r2Rect.w /= 2;
            r2Rect.x += r1Rect.w;
        } else {
            r1Rect.h /= 2;
            r2Rect.h /= 2;
            r2Rect.y += r1Rect.h;
        }

        const r1 = {
            id: `r${Date.now()}_1`,
            rect: r1Rect,
            status: 'pending', svgContent: '',
            scale: {x:1, y:1}, offset: {x:0, y:0}
        };

        const r2 = {
            id: `r${Date.now()}_2`,
            rect: r2Rect,
            status: 'pending', svgContent: '',
            scale: {x:1, y:1}, offset: {x:0, y:0}
        };

        this.model.deleteRegion(id);
        this.model.state.regions.push(r1);
        this.model.state.regions.push(r2);

        this.model.selectRegion(r1.id);
        this.model.saveHistory();
    }

    groupSelectedRegions() {
        const selected = this.model.state.regions.filter(r => this.model.state.selectedIds.has(r.id));
        if (selected.length < 2) return;

        let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
        selected.forEach(r => {
            minX = Math.min(minX, r.rect.x);
            minY = Math.min(minY, r.rect.y);
            maxX = Math.max(maxX, r.rect.x + r.rect.w);
            maxY = Math.max(maxY, r.rect.y + r.rect.h);
        });

        const groupW = maxX - minX;
        const groupH = maxY - minY;
        const cw = this.model.state.canvasWidth;
        const ch = this.model.state.canvasHeight;
        const bpW = groupW * cw;
        const bpH = groupH * ch;

        let svgContent = '';
        selected.forEach(r => {
            const offX = (r.rect.x - minX) * cw;
            const offY = (r.rect.y - minY) * ch;
            svgContent += `<g transform="translate(${offX},${offY})">${r.svgContent}</g>`;
        });

        const newRegion = {
            id: `r${Date.now()}`,
            rect: { x: minX, y: minY, w: groupW, h: groupH },
            svgContent,
            bpDims: { w: bpW, h: bpH },
            scale: {x:1, y:1}, offset: {x:0, y:0}
        };

        this.model.state.regions = this.model.state.regions.filter(r => !this.model.state.selectedIds.has(r.id));
        this.model.addRegion(newRegion);
    }

    exportSVG() {
        const cw = this.model.state.canvasWidth;
        const ch = this.model.state.canvasHeight;
        let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}" viewBox="0 0 ${cw} ${ch}">\n`;
        this.model.state.regions.forEach(r => {
            const x = r.rect.x * cw;
            const y = r.rect.y * ch;
            const w = r.rect.w * cw;
            const h = r.rect.h * ch;
            out += `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${r.bpDims?.w||w} ${r.bpDims?.h||h}" preserveAspectRatio="none"><g transform="translate(${r.offset?.x||0},${r.offset?.y||0}) scale(${r.scale?.x||1},${r.scale?.y||1})">${r.svgContent}</g></svg>\n`;
        });
        out += `</svg>`;

        const blob = new Blob([out], {type: "image/svg+xml"});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = "scitext_export.svg";
        a.click();
    }

    async generateContent(type) {
        const r = this.model.getRegion(this.model.state.activeRegionId);
        if (!r) return;

        this.view.els.aiStatus.classList.remove('hidden');
        this.view.hideRegionActionsBar();

        if (type === 'empty') {
            r.svgContent = '';
            r.status = 'done';
            r.contentType = 'empty';
            this.model.notify();
            this.view.els.aiStatus.classList.add("hidden");
            this.model.saveHistory();
            return;
        }

        const s = this.model.state;
        const pw = Math.floor(r.rect.w * s.canvasWidth);
        const ph = Math.floor(r.rect.h * s.canvasHeight);

        const tmp = document.createElement("canvas");
        tmp.width = pw * 2; tmp.height = ph * 2;
        const ctx = tmp.getContext("2d");
        ctx.drawImage(s.canvas, r.rect.x*s.canvasWidth, r.rect.y*s.canvasHeight, pw, ph, 0, 0, pw*2, ph*2);

        let rle = "";
        const data = ctx.getImageData(0,0,pw*2,ph*2).data;
        for (let y=0; y<ph*2; y+=2) {
            let sx = -1;
            for (let x=0; x<pw*2; x++) {
                const i = (y*pw*2 + x)*4;
                if(data[i+3]>128 && data[i]<128) {
                    if(sx===-1) sx=x;
                } else {
                    if(sx!==-1) {
                        rle+=`M${sx} ${y}h${x-sx}v2h-${x-sx}z`;
                        sx=-1;
                    }
                }
            }
            if(sx!==-1) rle+=`M${sx} ${y}h${pw*2-sx}v2h-${pw*2-sx}z`;
        }

        if (type === 'blueprint') {
            r.svgContent = `<path d="${rle}" fill="black" />`;
            r.status = 'scanned';
            r.contentType = 'scan';
            r.bpDims = { w: pw * 2, h: ph * 2 };
            r.scale = { x: 1, y: 1 };
            r.offset = { x: 0, y: 0 };

            this.model.saveHistory();
            this.model.notify();
            this.view.els.aiStatus.classList.add('hidden');
            return;
        }

        this.view.els.aiStatus.textContent = `Generating ${type}...`;
        const base64 = tmp.toDataURL("image/png").split(",")[1];
        const promptType = type === 'image' ? 'SVG Graphic' : 'SVG Text';
        const prompt = `You are a precision SVG Typesetter.\nINPUT: 2x scale scan.\nTASK: Generate ${promptType}.\nViewBox: 0 0 ${pw} ${ph}.\nOutput only <svg> code.\nRLE: ${rle.substring(0,500)}...`;

        try {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: base64 } }] }] })
            });
            const json = await resp.json();
            let text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error("No SVG");

            r.svgContent = text.replace(/```svg/g, "").replace(/```/g, "").trim();
            r.status = 'generated';
            r.contentType = type;
            r.bpDims = { w: pw, h: ph };

            this.model.saveHistory();
            this.model.notify();
        } catch(e) {
            console.error(e);
            r.svgContent = '<text x="10" y="20" fill="red">Error</text>';
            this.model.notify();
        } finally {
            this.view.els.aiStatus.classList.add('hidden');
        }
    }
}

// ============================================================================
// 6. BOOTSTRAP
// ============================================================================

window.app = (function() {
    const model = new SciTextModel();
    const view = new UIManager();
    const controller = new SciTextController(model, view);
    view.model = model;

    model.subscribe((state) => {
        view.render(state);
    });

    return {
        bootstrap: () => controller.init(),
        model, view, controller
    };
})();
