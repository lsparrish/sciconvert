/*
 * SciText Digitizer - Single File Architecture
 * Contains:
 * 1. SciTextModel (State & Data)
 * 2. UIManager (View & DOM)
 * 3. SciTextController (Logic & Events)
 * 4. RegionEditor (Canvas Interaction Logic)
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
              <div id="prop-preview" style="height: 120px; border-bottom: 1px solid #e5e7eb; background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
                <span style="color: #9ca3af; font-size: 10px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Ink Blueprint</span>
                <div id="preview-content" style="width: 90%; height: 80px; border: 1px dashed #d1d5db; display: flex; align-items: center; justify-content: center;">
                   <span style="color:#d1d5db; font-size:9px;">No Data</span>
                </div>
              </div>
              <div id="layer-list" class="layer-list-container">
                  <div style="text-align:center; color:#9ca3af; font-size:10px; margin-top:1rem;">Select a region</div>
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
        this.state.regions.push(region);
        this.selectRegion(region.id);
        this.saveHistory();
        this.notify();
    }

    updateRegion(id, updates, context) { const r = this.getRegion(id); if (r) Object.assign(r, updates); this.notify(context);
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
            'region-actions-bar','layer-list','region-count',
            'ai-status','fullscreen-toggle','prop-x','prop-y','prop-w','prop-h',
            'btn-fit-area','btn-fit-content','btn-split','btn-group','btn-delete','btn-export','btn-clear-all',
            'preview-content','canvas-scroller'
        ];
        const camelCase = (s) => s.replace(/-./g, x=>x[1].toUpperCase());
        ids.forEach(id => {
            const el = document.getElementById(id);
            if(el) this.els[camelCase(id)] = el;
        });
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

        state.regions.forEach(r => {
            const px = r.rect.x * physicalCw, py = r.rect.y * physicalCh;
            const pw = r.rect.w * physicalCw, ph = r.rect.h * physicalCh;
            const dimW = r.bpDims?.w || (r.rect.w * logicalCw), dimH = r.bpDims?.h || (r.rect.h * logicalCh);

            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("x", px); svg.setAttribute("y", py);
            svg.setAttribute("width", pw); svg.setAttribute("height", ph);
            svg.setAttribute("viewBox", `0 0 ${dimW} ${dimH}`);
            svg.setAttribute("preserveAspectRatio", "none");
            svg.style.position = "absolute";
            svg.style.left = px + "px";
            svg.style.top = py + "px";
            svg.style.color = "black";
            svg.style.pointerEvents = "none"; 
            
            svg.innerHTML = `<g transform="translate(${r.offset?.x||0},${r.offset?.y||0}) scale(${r.scale?.x||1},${r.scale?.y||1})">${r.svgContent}</g>`;
            this.els.svgLayer.appendChild(svg);

            const div = document.createElement("div");
            div.className = "absolute region-highlight";
            if (state.selectedIds.has(r.id)) div.classList.add("region-selected");
            Object.assign(div.style, { left: px+'px', top: py+'px', width: pw+'px', height: ph+'px' });
            div.dataset.id = r.id;
            this.els.interactionLayer.appendChild(div);
        });

        if (state.activeRegionId) {
            const r = state.regions.find(x => x.id === state.activeRegionId);
            this.els.debugLog.textContent = JSON.stringify(r, null, 2);
            this.updatePropertiesInputs(r, state);
            this.showRegionActionsBar(r, state);
            this.renderLayerList(r);
            const previewEl = this.els.previewContent;
            if (r.inkMapSVG) {
                previewEl.innerHTML = r.inkMapSVG;
            } else {
                previewEl.innerHTML = '<span style="color:#d1d5db; font-size:9px;">No Data</span>';
            }
        } else {
            this.els.regionActionsBar.classList.add('hidden');
            this.els.propX.value = ''; this.els.propY.value = '';
            this.els.propW.value = ''; this.els.propH.value = '';
            this.els.layerList.innerHTML = '<div style="text-align:center; color:#9ca3af; font-size:10px; margin-top:1rem;">Select a region</div>';
            const f = document.getElementById('active-selection-frame');
            if (f) f.remove();
        }
    }

    updateRegionGeometry(id, state) {
        const r = state.regions.find(x => x.id === id);
        if(!r) return;
        const cw = state.canvasWidth, ch = state.canvasHeight;
        const x = r.rect.x * cw, y = r.rect.y * ch;
        const w = r.rect.w * cw, h = r.rect.h * ch;

        // 1. Update SVG Position
        const svg = this.els.svgLayer.querySelector(`svg[data-id="${id}"]`);
        if(svg) {
             svg.setAttribute("x", x); svg.setAttribute("y", y);
             svg.setAttribute("width", w); svg.setAttribute("height", h);
             svg.style.left = x + "px"; svg.style.top = y + "px";
        }

        // 2. Update Interaction Highlight Div
        const div = this.els.interactionLayer.querySelector(`div[data-id="${id}"]`);
        if(div) {
            Object.assign(div.style, { left: x+'px', top: y+'px', width: w+'px', height: h+'px' });
        }

        // 3. Update Active Controls (Frame & Handles)
        if(state.activeRegionId === id) {
            const frame = document.getElementById("active-selection-frame");
            if(frame) {
                Object.assign(frame.style, { left: x+'px', top: y+'px', width: w+'px', height: h+'px' });
            }
            
            const handles = this.els.interactionLayer.querySelectorAll('.resize-handle');
            handles.forEach(el => {
                const dir = Array.from(el.classList).find(c => c.startsWith('handle-') && c !== 'handle-size')?.replace('handle-', '');
                if (!dir) return;

                let hx=0, hy=0;
                if (dir.includes('e')) hx = x + w; else if (dir.includes('w')) hx = x; else hx = x + w/2;
                if (dir.includes('s')) hy = y + h; else if (dir.includes('n')) hy = y; else hy = y + h/2;
                
                el.style.left = (hx - 4) + "px";
                el.style.top = (hy - 4) + "px";
            });

            this.updatePropertiesInputs(r, state);
            this.showRegionActionsBar(r, state);
        }
    }

    renderActiveControls(r, state) {
        const scale = state.scaleMultiplier;
        const physicalCw = state.canvasWidth * scale;
        const physicalCh = state.canvasHeight * scale;
        const x = r.rect.x * physicalCw;
        const y = r.rect.y * physicalCh;
        const w = r.rect.w * physicalCw;
        const h = r.rect.h * physicalCh;

        // Create the selection frame (the thin blue line)
        const frame = document.createElement("div");
        frame.id = "active-selection-frame";
        frame.className = "selection-frame";
        frame.style.left = x + "px";
        frame.style.top = y + "px";
        frame.style.width = w + "px";
        frame.style.height = h + "px";
        this.els.interactionLayer.appendChild(frame);

        // Create the 8 resize handles
        const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
        handles.forEach(dir => {
            const el = document.createElement("div");
            el.className = `resize-handle handle-${dir}`;
            
            // Positioning logic based on direction
            // Note: CSS classes handle cursor and some positioning, 
            // but we need to anchor them to the frame's specific geometry here
            // relative to the interaction layer.
            
            let hx = 0, hy = 0;
            
            // X positioning
            if (dir.includes('e')) hx = x + w;
            else if (dir.includes('w')) hx = x;
            else hx = x + w/2; // n, s
            
            // Y positioning
            if (dir.includes('s')) hy = y + h;
            else if (dir.includes('n')) hy = y;
            else hy = y + h/2; // e, w

            // Offset by handle size (4px is half of 8px handle)
            el.style.left = (hx - 4) + "px";
            el.style.top = (hy - 4) + "px";
            
            this.els.interactionLayer.appendChild(el);
        });
    }
    renderLayerList(r) {
        const container = this.els.layerList;
        container.innerHTML = '';
        if (!r || !r.svgContent) {
            container.innerHTML = '<div style="text-align:center; color:#9ca3af; font-size:10px; margin-top:1rem;">No content</div>';
            return;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(`<svg>${r.svgContent}</svg>`, "image/svg+xml");
        const children = Array.from(doc.documentElement.childNodes).filter(n => n.nodeType === 1);

        children.forEach((child, idx) => {
            const div = document.createElement('div');
            div.style.cssText = "background:white; border:1px solid #e5e7eb; border-radius:4px; padding:4px; margin-bottom:4px;";
            div.innerHTML = `<div style="font-size:10px; font-weight:700; color:#3b82f6; margin-bottom:2px;">${child.tagName}</div>
            <textarea readonly style="width:100%; height: 60px; font-size:10px; border:1px solid #f3f4f6; resize:vertical; font-family:monospace;">${child.outerHTML}</textarea>`;
            container.appendChild(div);
        });
    }

    updatePropertiesInputs(r, state) {
        const x = r.rect.x * state.canvasWidth;
        const y = r.rect.y * state.canvasHeight;
        const w = r.rect.w * state.canvasWidth;
        const h = r.rect.h * state.canvasHeight;
        this.els.propX.value = x.toFixed(0);
        this.els.propY.value = y.toFixed(0);
        this.els.propW.value = w.toFixed(0);
        this.els.propH.value = h.toFixed(0);
    }

    showRegionActionsBar(r, state) {
        const rect = this.els.interactionLayer.getBoundingClientRect();
        const scale = rect.width / state.canvasWidth;
        const px = r.rect.x * state.canvasWidth * scale;
        const py = r.rect.y * state.canvasHeight * scale;
        const ph = r.rect.h * state.canvasHeight * scale;
        const pw = r.rect.w * state.canvasWidth * scale;
        
        let top = rect.top + py + ph + 10;
        let left = rect.left + px + (pw / 2) - (this.els.regionActionsBar.offsetWidth / 2);

        if (left < 10) left = 10;
        if (top > window.innerHeight - 50) top = rect.top + py - 50; 

        this.els.regionActionsBar.style.left = left + "px";
        this.els.regionActionsBar.style.top = top + "px";
        this.els.regionActionsBar.classList.remove("hidden");
    }

    hideRegionActionsBar() {
        this.els.regionActionsBar.classList.add('hidden');
    }

    updateZoomDisplay(scale) {
        this.els.zoomLevel.textContent = Math.round(scale * 100) + "%";
    }

    toggleLoader(show) {
        if(show) this.els.pdfLoader.classList.remove('hidden');
        else this.els.pdfLoader.classList.add('hidden');
    }

    toggleWorkspace(show) {
        if(show) {
            this.els.emptyState.classList.add('hidden');
            this.els.workspaceContainer.classList.remove('hidden');
        } else {
            this.els.emptyState.classList.remove('hidden');
            this.els.workspaceContainer.classList.add('hidden');
        }
    }

    setDebugLog(data) {
        this.els.debugLog.textContent = JSON.stringify(data, null, 2);
    }
    switchTab(tabName) {
        if (tabName === 'overlay') {
            this.els.workspaceContainer.classList.remove('hidden');
            this.els.debugContainer.classList.add('hidden');
            this.els.tabOverlay.classList.add('tab-button-active');
            this.els.tabDebug.classList.remove('tab-button-active');
        } else if (tabName === 'debug') {
            this.els.workspaceContainer.classList.add('hidden');
            this.els.debugContainer.classList.remove('hidden');
            this.els.tabOverlay.classList.remove('tab-button-active');
            this.els.tabDebug.classList.add('tab-button-active');
        }
    }
    updateSelectionBox(x, y, w, h, state) {
        const box = this.els.selectionBox;
        box.style.left = x + "px";
        box.style.top = y + "px";
        box.style.width = w + "px";
        box.style.height = h + "px";
        // Convert to percentage for display or debugging if needed, 
        // but strictly visual logic stays in pixels here.
    }
}

// ============================================================================
// 4. REGION EDITOR (Canvas Interaction Logic)
// ============================================================================

class RegionEditor {
    constructor(controller) {
        this.controller = controller;
        this.mode = 'IDLE'; 
        this.activeHandle = null;
        this.dragStart = { x: 0, y: 0 };
        this.initialRect = null;
        this.handleSize = 8;
        this.minSize = 5;
    }

    init() {
        const layer = this.controller.view.els.interactionLayer;
        layer.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
        window.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    getLocalPos(e) {
        const rect = this.controller.view.els.interactionLayer.getBoundingClientRect();
        const scaleX = this.controller.model.state.canvasWidth / rect.width;
        const scaleY = this.controller.model.state.canvasHeight / rect.height;
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    }

    hitTest(pos) {
        const handles = document.querySelectorAll('.resize-handle');
        for (let h of handles) {
            const r = h.getBoundingClientRect();
            const layerRect = this.controller.view.els.interactionLayer.getBoundingClientRect();
            const hx = r.left - layerRect.left;
            const hy = r.top - layerRect.top;
            if (pos.x >= hx && pos.x <= hx + r.width && pos.y >= hy && pos.y <= hy + r.height) {
                return { type: 'HANDLE', dir: h.className.match(/handle-(\w+)/)[1] };
            }
        }

        const r = this.controller.model.getRegion(this.controller.model.state.activeRegionId);
        if (r) {
            const scale = this.controller.model.state.scaleMultiplier;
            const cw = this.controller.model.state.canvasWidth * scale;
            const ch = this.controller.model.state.canvasHeight * scale;
            const rx = r.rect.x * cw, ry = r.rect.y * ch;
            const rw = r.rect.w * cw, rh = r.rect.h * ch;
            if (pos.x >= rx && pos.x <= rx + rw && pos.y >= ry && pos.y <= ry + rh) {
                return { type: 'BODY' };
            }
        }
        return { type: 'NONE' };
    }

    handleMouseDown(e) {
        if (e.button !== 0) return;
        const pos = this.getLocalPos(e);
        let hit = this.hitTest(pos);

        // Smart Select: Check all regions if we didn't hit the active one
        if (hit.type === 'NONE') {
            const allRegions = this.controller.model.state.regions;
            const cw = this.controller.model.state.canvasWidth;
            const ch = this.controller.model.state.canvasHeight;
            
            // Reverse iterate to find top-most
            for (let i = allRegions.length - 1; i >= 0; i--) {
                const r = allRegions[i];
                const rx = r.rect.x * cw, ry = r.rect.y * ch;
                const rw = r.rect.w * cw, rh = r.rect.h * ch;
                
                if (pos.x >= rx && pos.x <= rx+rw && pos.y >= ry && pos.y <= ry+rh) {
                    this.controller.model.selectRegion(r.id);
                    hit = { type: 'BODY' }; // Grab immediately
                    break;
                }
            }
        }

        this.dragStart = pos;

        if (hit.type === 'HANDLE') {
            this.mode = 'RESIZE';
            this.activeHandle = hit.handle;
            this.initialRect = { ...this.controller.model.getRegion(this.controller.model.state.activeRegionId).rect };
            this.controller.view.hideRegionActionsBar(); 
            e.preventDefault(); e.stopPropagation();
        } else if (hit.type === 'BODY') {
            this.mode = 'MOVE';
            this.initialRect = { ...this.controller.model.getRegion(this.controller.model.state.activeRegionId).rect };
            this.controller.view.hideRegionActionsBar(); 
            e.preventDefault(); e.stopPropagation();
        } else {
            this.mode = 'CREATE';
            this.controller.model.deselect();
            this.controller.view.els.selectionBox.style.display = 'block';
            this.controller.view.updateSelectionBox(pos.x, pos.y, 0, 0, this.controller.model.state);
        }
    }

    handleMouseMove(e) {
        const pos = this.getLocalPos(e);
        
        if (this.mode === 'IDLE') {
            const hit = this.hitTest(pos);
            const layer = this.controller.view.els.interactionLayer;
            
            // Check hover for ANY region to change cursor
            let hoveringAny = false;
            if (hit.type === 'NONE') {
                const scale = this.controller.model.state.scaleMultiplier;
                const cw = this.controller.model.state.canvasWidth * scale;
                const ch = this.controller.model.state.canvasHeight * scale;
                for (const r of this.controller.model.state.regions) {
                    const rx = r.rect.x * cw, ry = r.rect.y * ch;
                    const rw = r.rect.w * cw, rh = r.rect.h * ch;
                    if (pos.x >= rx && pos.x <= rx+rw && pos.y >= ry && pos.y <= ry+rh) {
                        hoveringAny = true;
                        break;
                    }
                }
            }

            if (hit.type === 'HANDLE') layer.style.cursor = 'crosshair'; 
            else if (hit.type === 'BODY' || hoveringAny) layer.style.cursor = 'move';
            else layer.style.cursor = 'default';
            return;
        }

        e.preventDefault();

        if (this.mode === 'CREATE') {
            const s = this.dragStart;
            const x = Math.min(pos.x, s.x), y = Math.min(pos.y, s.y);
            const w = Math.abs(pos.x - s.x), h = Math.abs(pos.y - s.y);
            this.controller.view.updateSelectionBox(x, y, w, h, this.controller.model.state);
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
                // Immediate UI update
                this.controller.view.updatePropertiesInputs(r, this.controller.model.state);
            }
        } else if (this.mode === 'RESIZE') {
            const r = this.controller.model.getRegion(this.controller.model.state.activeRegionId);
            if (r && this.initialRect && this.activeHandle) {
                const scale = this.controller.model.state.scaleMultiplier;
                const physicalCw = this.controller.model.state.canvasWidth * scale;
                const physicalCh = this.controller.model.state.canvasHeight * scale;
                const ix = this.initialRect.x * physicalCw, iy = this.initialRect.y * physicalCh;
                const iw = this.initialRect.w * physicalCw, ih = this.initialRect.h * physicalCh;
                
                let nx=ix, ny=iy, nw=iw, nh=ih;
                
                if (this.activeHandle.includes('e')) nw = pos.x - ix;
                if (this.activeHandle.includes('s')) nh = pos.y - iy;
                if (this.activeHandle.includes('w')) { nw = (ix+iw) - pos.x; nx = pos.x; }
                if (this.activeHandle.includes('n')) { nh = (iy+ih) - pos.y; ny = pos.y; }
                
                if(nw > 5 && nh > 5) {
                    const newRect = { x: nx/physicalCw, y: ny/physicalCh, w: nw/physicalCw, h: nh/physicalCh };
                    this.controller.model.updateRegion(r.id, { rect: newRect });
                    this.controller.view.updatePropertiesInputs(r, this.controller.model.state);
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
            } else {
                this.controller.model.deselect();
            }
            this.controller.view.els.selectionBox.style.display = 'none';
        } else {
            // End of Move/Resize
            this.controller.model.saveHistory();
            // Reshow action bar
            const r = this.controller.model.getRegion(this.controller.model.state.activeRegionId);
            if(r) this.controller.view.showRegionActionsBar(r, this.controller.model.state);
        }
        this.mode = 'IDLE';
    }

    handleMouseLeave() {
        if (this.mode !== 'IDLE') {
            this.cancelInteraction();
        }
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
    }

    async init() {
        this.view.init();

        this.model.state.canvas = this.view.els.processingCanvas;
        await this.loadPDFJS();
        
        this.draw.init();
        
        this.view.els.pdfUpload.onchange = (e) => this.handleFileUpload(e);
        this.view.els.btnUndo.onclick = () => this.model.undo();
        this.view.els.btnRedo.onclick = () => this.model.redo();
        this.view.els.zoomIn.onclick = () => this.setZoom(this.model.state.scaleMultiplier + 0.25);
        this.view.els.zoomOut.onclick = () => this.setZoom(this.model.state.scaleMultiplier - 0.25);
        this.view.els.btnDelete.onclick = () => {
            Array.from(this.model.state.selectedIds).forEach(id => this.model.deleteRegion(id));
};
        this.view.els.btnClearAll.onclick = () => { this.model.setState({regions:[]}); this.model.deselect(); this.model.saveHistory(); };
        this.view.els.regionActionsBar.onclick = (e) => {
            const type = e.target.dataset.type;
            if(type) this.generateContent(type);
            else if (e.target.id === 'btn-cancel-region') this.model.deleteRegion(this.model.state.activeRegionId);
        }
        
        // Bind UI Elements missing handlers
        this.view.els.fullscreenToggle.onclick = () => this.toggleFullscreen();
        this.view.els.tabOverlay.onclick = () => this.switchTab('overlay');
        this.view.els.tabDebug.onclick = () => this.switchTab('debug');
        this.view.els.btnExport.onclick = () => this.exportSVG();
        this.view.els.btnFitArea.onclick = () => this.fitArea();
        this.view.els.btnFitContent.onclick = () => this.fitContent();
        this.view.els.btnSplit.onclick = () => this.splitRegion();
        this.view.els.btnGroup.onclick = () => this.groupSelectedRegions();
        
        ['propX','propY','propW','propH'].forEach(k => {
             if(this.view.els[k]) this.view.els[k].onchange = () => this.updateRegionFromProps();
        });

        this.loadDefaultImage();
    }
    splitRegion() {
        const id = this.model.state.activeRegionId;
        if (!id) return;
        
        const r = this.model.getRegion(id);
        const cw = this.model.state.canvasWidth;
        const ch = this.model.state.canvasHeight;
        
        // Determine split direction based on aspect ratio
        // If wider than tall, split vertically (Left/Right). Otherwise horizontally (Top/Bottom)
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
        
        // Create two new regions
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

        // Remove old, add news
        this.model.deleteRegion(id);
        this.model.state.regions.push(r1);
        this.model.state.regions.push(r2);
        
        // Select the first new region
        this.model.selectRegion(r1.id);
        this.model.saveHistory();
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
    
    switchTab(t) {
        this.view.switchTab(t);
    }

    async handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        this.view.toggleLoader(true);
        
        // 1. Prepare the Processing Canvas
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
            // IMAGE LOGIC
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
      this.view.els.pdfLoader.classList.remove("hidden");
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
            this.model.setCanvasDimensions(img.width, img.height, img.width);
            
            // Prepare Processing Canvas
            const canvas = this.model.state.canvas;
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext("2d").drawImage(img, 0, 0);
            
            // UPDATE VIEW: Set the visible layer background
            this.view.els.pdfLayer.style.backgroundImage = `url(${img.src})`;
            this.view.els.pdfLayer.style.backgroundSize = "100% 100%";
            
            this.view.toggleLoader(false);
            this.view.toggleWorkspace(true);
            this.model.saveHistory();
      };
      img.onerror = () => {
          console.error("Failed to load default image");
          this.view.els.pdfLoader.classList.add("hidden");
      }
      img.src = CONFIG.defaultImgUrl;
    }
    
    updateRegionFromProps() {
        const id = this.model.state.activeRegionId;
        if (!id) return;
        const cw = this.model.state.canvasWidth;
        const ch = this.model.state.canvasHeight;
        const r = {
            x: parseFloat(this.view.els.propX.value) / cw,
            y: parseFloat(this.view.els.propY.value) / ch,
            w: parseFloat(this.view.els.propW.value) / cw,
            h: parseFloat(this.view.els.propH.value) / ch
        };
        this.model.updateRegion(id, { rect: r });
        this.model.saveHistory();
    }

    async fitArea() {
        const id = this.model.state.activeRegionId;
        const r = this.model.getRegion(id);
        if (!r) return;

        // 1. Setup Scan (Using 2x scale to match blueprint precision)
        const s = this.model.state;
        const pw = Math.floor(r.rect.w * s.canvasWidth);
        const ph = Math.floor(r.rect.h * s.canvasHeight);
        
        if (pw < 1 || ph < 1) return;

        const tmp = document.createElement("canvas");
        tmp.width = pw * 2; tmp.height = ph * 2;
        const ctx = tmp.getContext("2d");
        ctx.drawImage(s.canvas, r.rect.x * s.canvasWidth, r.rect.y * s.canvasHeight, pw, ph, 0, 0, pw * 2, ph * 2);
        
        const data = ctx.getImageData(0, 0, pw * 2, ph * 2).data;
        
        // 2. Find Bounds of Ink
        let minX = pw * 2, minY = ph * 2, maxX = 0, maxY = 0;
        let found = false;

        for (let y = 0; y < ph * 2; y++) {
            for (let x = 0; x < pw * 2; x++) {
                const i = (y * (pw * 2) + x) * 4;
                // Threshold matches your RLE logic (Dark < 128)
                if (data[i + 3] > 128 && data[i] < 128) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    found = true;
                }
            }
        }

        if (!found) return; // No ink found, do nothing

        // 3. Add Padding (4px at 2x scale = 2px visual padding)
        const pad = 4;
        minX = Math.max(0, minX - pad);
        minY = Math.max(0, minY - pad);
        maxX = Math.min(pw * 2, maxX + pad);
        maxY = Math.min(ph * 2, maxY + pad);

        // 4. Calculate New Global Rect (Converting 2x coords back to global 0-1)
        const globalX = r.rect.x + (minX / 2) / s.canvasWidth;
        const globalY = r.rect.y + (minY / 2) / s.canvasHeight;
        const globalW = ((maxX - minX) / 2) / s.canvasWidth;
        const globalH = ((maxY - minY) / 2) / s.canvasHeight;

        // 5. Update Region
        this.model.updateRegion(id, {
            rect: { x: globalX, y: globalY, w: globalW, h: globalH },
            scale: { x: 1, y: 1 },  // Reset transforms
            offset: { x: 0, y: 0 }
        });

        // 6. Regenerate Blueprint for the new tight box
        await this.generateContent('blueprint');
    }
    
    fitContent() {
        const id = this.model.state.activeRegionId;
        if (!id) return;
        // Reset transform but keep the box
        this.model.updateRegion(id, { 
            scale: {x: 1, y: 1}, 
            offset: {x: 0, y: 0} 
        });
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

        // 1. Handle Empty/Clear
        if (type === 'empty') {
            r.svgContent = ''; 
            r.status = 'done';
            this.model.notify();
            this.view.els.aiStatus.classList.add("hidden");
            this.model.saveHistory();
            return;
        }

        // 2. Prepare Image Data & RLE
        this.view.els.aiStatus.textContent = `Processing...`;
        const s = this.model.state;
        const pw = Math.floor(r.rect.w * s.canvasWidth);
        const ph = Math.floor(r.rect.h * s.canvasHeight);

        // Create 2x scale canvas for better resolution
        const tmp = document.createElement("canvas");
        tmp.width = pw * 2; tmp.height = ph * 2;
        const ctx = tmp.getContext("2d");
        ctx.drawImage(s.canvas, r.rect.x*s.canvasWidth, r.rect.y*s.canvasHeight, pw, ph, 0, 0, pw*2, ph*2);
        
        // RLE Logic
        let rle = "";
        const data = ctx.getImageData(0,0,pw*2,ph*2).data;
        // Basic RLE loop (Threshold < 128 is dark/ink)
        for (let y=0; y<ph*2; y+=2) {
            let sx = -1;
            for (let x=0; x<pw*2; x++) {
                const i = (y*pw*2 + x)*4;
                // Check if pixel is dark enough (using alpha > 128 and red channel < 128 as proxy)
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

        // 3. Handle Local Blueprint (NO AI)
        if (type === 'blueprint') {
            r.svgContent = `<path d="${rle}" fill="black" />`;
            r.status = 'scanned';
            r.bpDims = { w: pw * 2, h: ph * 2 };
            
            r.scale = { x: 1, y: 1 };
            r.offset = { x: 0, y: 0 };
            // -----------------------------

            this.model.saveHistory();
            this.model.notify();
            this.view.els.aiStatus.classList.add('hidden');
            return;
        }

        // 4. Handle AI Generation
        this.view.els.aiStatus.textContent = `Generating ${type}...`;
        const base64 = tmp.toDataURL("image/png").split(",")[1];
        const promptType = type === 'image' ? 'SVG Graphic' : 'SVG Text';
        const prompt = `You are a precision SVG Typesetter.\nINPUT: 2x scale scan.\nTASK: Generate ${promptType}.\nViewBox: 0 0 ${pw} ${ph}.\nOutput only <svg> code.\nRLE: ${rle.substring(0,500)}...`;

        try {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: base64 } }] }] })
            });
            const json = await resp.json();
            let text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error("No SVG");
            
            r.svgContent = text.replace(/```svg/g, "").replace(/```/g, "").trim();
            r.status = 'generated';
            r.bpDims = { w: pw, h: ph }; // AI usually returns 1x scale coordinates
            
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

    // Wire Observer
    model.subscribe((state, context) => {
        view.render(state, context);
        if (state.activeRegionId && (!context || context.type !== 'GEOMETRY')) {
            const r = model.getRegion(state.activeRegionId);
            if (r) {
                view.renderActiveControls(r, state);
            }
        }
    });

    return {
        bootstrap: () => controller.init(),
        model, view, controller
    };
})();
