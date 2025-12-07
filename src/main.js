// Main application logic for SciText Digitizer.
// Extracted from inline script in main.html to separate concerns.
// Uses SciTextHelpers (loaded from https://lsparrish.github.io/sciconvert/src/helpers.js) for core utilities.
// lives at https://lsparrish.github.io/sciconvert/src/main.js
// Note: Use the full url.

const CONFIG = { 
    defaultPdfUrl: "https://lsparrish.github.io/sciconvert/sample.png", 
    aiScale: 2.0 
};
const apiKey = ""; // API Key provided by environment if needed

const state = {
    pdfDoc: null,
    scaleMultiplier: 1.0,
    baseWidth: 0,
    regions: [],
    activeRegionId: null,
    selectedIds: new Set(),
    splitMode: false,
    splitTargetId: null,
    splitSelection: new Set(),
    aspectLocked: false,
    editMode: 'area', 
    history: [],
    historyIndex: -1,
    dragAction: null, 
    dragStart: { x: 0, y: 0 }, 
    initialRect: null, 
    initialScale: null, 
    canvas: null,
};

const els = {};

// --- UTILS & CORE HELPERS ---

/**
 * Gets coordinates relative to the interaction layer in canvas (unscaled) pixels.
 * @param {MouseEvent} e 
 * @returns {{x: number, y: number}}
 */
function getLocalPos(e) {
    const r = els.interactionLayer.getBoundingClientRect();
    const sx = state.canvas.width / r.width;
    const sy = state.canvas.height / r.height;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
}

/**
 * Finds the region object by ID.
 * @param {string} id 
 * @returns {object | undefined}
 */
function getRegion(id) {
    return state.regions.find(x => x.id === id);
}

// --- NEW BOOTSTRAP FUNCTION (MOVED FROM main.html) ---

/**
 * Fetches the template.html file, extracts the CSS and structure,
 * injects them into the document, and then initializes the application.
 * This function handles the full UI bootstrap process.
 */
export async function bootstrap() {
    // Check if the DOM is ready before proceeding (though this is called on DOMContentLoaded)
    if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }
    
    try {
        // 1. Fetch template HTML which contains the structure and CSS
        const response = await fetch('https://lsparrish.github.io/sciconvert/src/template.html');
        const htmlText = await response.text();
        
        // 2. Parse the content
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        
        const styleElement = doc.querySelector('style');
        const structureDiv = doc.querySelector('#template-structure');
        
        if (styleElement && structureDiv) {
            // 3. Inject Styles into the main document's head
            document.head.appendChild(styleElement.cloneNode(true));
            
            // 4. Inject structural HTML into the main document's body
            const body = document.querySelector('body');
            while (structureDiv.firstChild) {
                body.appendChild(structureDiv.firstChild);
            }
            
        } else {
            console.error("Template parsing error: Structure or styles missing.");
            document.body.innerHTML = '<h1>Error loading application template.</h1>';
            return;
        }
        
        // 5. Initialize the application logic
        init(); // Call the original init function
    } catch (error) {
        console.error("Failed to load or parse template.html:", error);
        document.body.innerHTML = '<h1>Critical Error: Failed to fetch application template.</h1>';
    }
}

// --- INIT & SETUP (EXPORTED) ---

/**
 * Initializes DOM element references and starts the application.
 * Must be exported for the main.html script to call it.
 */
export function init() {
    // Canvas element is hidden in HTML, but we need it initialized for drawing operations
    state.canvas = document.getElementById('processing-canvas');

    // Populate element references after template has loaded into the DOM
    els.upload = document.getElementById('pdf-upload');
    els.btnZoomIn = document.getElementById('zoom-in');
    els.btnZoomOut = document.getElementById('zoom-out');
    els.txtZoomLevel = document.getElementById('zoom-level');
    els.btnUndo = document.getElementById('btn-undo');
    els.btnRedo = document.getElementById('btn-redo');
    els.workspace = document.getElementById('workspace-container');
    els.emptyState = document.getElementById('empty-state');
    els.loader = document.getElementById('pdf-loader');
    els.wrapper = document.getElementById('canvas-wrapper'); 
    els.pdfLayer = document.getElementById('pdf-layer');
    els.svgLayer = document.getElementById('svg-layer');
    els.interactionLayer = document.getElementById('interaction-layer');
    els.selectionBox = document.getElementById('selection-box');
    els.selectionBar = document.getElementById('new-selection-action-bar');
    els.layerList = document.getElementById('layer-list'); 
    els.btnAddLayer = document.getElementById('btn-add-layer');
    els.regionCount = document.getElementById('region-count');
    els.contextActions = document.getElementById('context-actions');
    els.aiStatus = document.getElementById('ai-status');
    els.modeArea = document.getElementById('mode-area');
    els.modeContent = document.getElementById('mode-content');
    els.modeLabel = document.getElementById('mode-label');
    els.btnFitArea = document.getElementById('btn-fit-area');
    els.btnFitContent = document.getElementById('btn-fit-content');
    els.lblX = document.getElementById('lbl-x'); els.lblY = document.getElementById('lbl-y');
    els.lblW = document.getElementById('lbl-w'); els.lblH = document.getElementById('lbl-h');
    els.propX = document.getElementById('prop-x'); els.propY = document.getElementById('prop-y');
    els.propW = document.getElementById('prop-w'); els.propH = document.getElementById('prop-h');
    els.chkSource = document.getElementById('chk-source');
    els.chkSvg = document.getElementById('chk-svg');
    els.chkGrid = document.getElementById('chk-grid');
    els.debugContainer = document.getElementById('debug-container');
    els.debugImg = document.getElementById('debug-img-source');
    els.debugSvg = document.getElementById('debug-svg-preview');
    els.debugBlueprint = document.getElementById('debug-blueprint');
    els.debugLog = document.getElementById('debug-log');
    els.btnDigitize = document.getElementById('btn-digitize');
    els.btnSplit = document.getElementById('btn-split');
    
    try { 
        loadDefaultImage(); 
    } catch(e) { 
        console.error("Initialization Error:", e);
        els.loader.classList.add('hidden');
    }
    setupEventListeners();
    updateHistoryUI();
}

/**
 * Loads a default image if no PDF is specified.
 */
function loadDefaultImage() {
    els.loader.classList.remove('hidden');
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
        state.canvas.width = img.width;
        state.canvas.height = img.height;
        state.baseWidth = img.width;
        const ctx = state.canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        state.pdfDoc = { numPages: 1, isImage: true };
        renderPage();
        els.loader.classList.add('hidden');
        els.emptyState.classList.add('hidden');
        els.workspace.classList.remove('hidden');
        els.workspace.classList.add('flex');
        saveState(true);
        switchTab('overlay');
    };
    img.onerror = () => {
        console.error("Failed to load default image");
        els.emptyState.innerHTML = '<div class="bg-white p-8 rounded-2xl shadow-xl text-center border border-gray-200"><h2 class="text-xl font-bold mb-2 text-red-700">Load Error</h2><p class="text-sm text-gray-500">Could not load default image. Please try uploading a file.</p></div>';
        els.loader.classList.add('hidden');
    };
    img.src = `${CONFIG.defaultPdfUrl}?v=${Date.now()}`;
}

/**
 * Sets up all necessary DOM event listeners.
 */
function setupEventListeners() {
    els.interactionLayer.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    els.btnZoomIn.onclick = () => setZoom(state.scaleMultiplier + 0.25);
    els.btnZoomOut.onclick = () => setZoom(state.scaleMultiplier - 0.25);
    els.btnUndo.onclick = undo;
    els.btnRedo.onclick = redo;
    
    els.modeArea.onclick = () => setMode('area');
    els.modeContent.onclick = () => setMode('content');
    els.btnFitContent.onclick = fitContentToArea;
    els.btnFitArea.onclick = fitAreaToContent;

    [els.propX, els.propY, els.propW, els.propH].forEach(input => {
        input.addEventListener('input', updateRegionFromInput);
        input.addEventListener('change', () => saveState());
    });
    
    els.btnAddLayer.onclick = addLayerToRegion;

    els.chkSource.onchange = () => els.pdfLayer.style.opacity = els.chkSource.checked ? 1 : 0;
    els.chkSvg.onchange = () => els.svgLayer.style.opacity = els.chkSvg.checked ? 1 : 0;
    els.chkGrid.onchange = () => document.getElementById('grid-layer').classList.toggle('hidden', !els.chkGrid.checked);
    
    els.upload.onchange = handleFileUpload;
    
    document.getElementById('btn-export').onclick = exportSVG;
    document.getElementById('btn-clear-all').onclick = () => { 
        console.log('Resetting all regions. User confirmation assumed.'); 
        state.regions = []; 
        renderRegions(); 
        saveState(); 
    };
    document.getElementById('btn-delete').onclick = () => { 
        if(state.activeRegionId) { 
            state.regions = state.regions.filter(r => !state.selectedIds.has(r.id)); 
            deselect(); 
            renderRegions(); 
            saveState(); 
        }
    };
    document.getElementById('btn-regen').onclick = () => { 
        if(state.activeRegionId) createRegion('text', state.activeRegionId); 
    };
    if(els.btnDigitize) els.btnDigitize.onclick = digitizeRegion;
    els.btnSplit.onclick = handleSplitAction;
    document.getElementById('btn-group').onclick = groupSelectedRegions;
    document.getElementById('btn-optimize').onclick = optimizeActiveRegion;
    
    document.getElementById('tab-overlay').onclick = () => switchTab('overlay');
    document.getElementById('tab-debug').onclick = () => switchTab('debug');
    document.getElementById('fullscreen-toggle').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
}

/**
 * Toggles between Area and Content editing mode.
 * @param {'area' | 'content'} m 
 */
function setMode(m) {
    state.editMode = m;
    els.modeArea.className = m === 'area' ? 'px-2 py-0.5 rounded text-[10px] font-bold transition bg-white shadow-sm text-blue-600' : 'px-2 py-0.5 rounded text-[10px] font-bold transition text-gray-500 hover:text-gray-700';
    els.modeContent.className = m === 'content' ? 'px-2 py-0.5 rounded text-[10px] font-bold transition bg-white shadow-sm text-blue-600' : 'px-2 py-0.5 rounded text-[10px] font-bold transition text-gray-500 hover:text-gray-700';
    els.modeLabel.textContent = m === 'area' ? 'Area Mode' : 'Content Mode';
    els.modeLabel.className = m === 'area' ? 'absolute top-1 right-2 text-[9px] font-bold text-blue-400 uppercase tracking-widest pointer-events-none' : 'absolute top-1 right-2 text-[9px] font-bold text-amber-500 uppercase tracking-widest pointer-events-none';
    els.lblX.textContent = m === 'area' ? 'Pos X' : 'Shift X';
    els.lblY.textContent = m === 'area' ? 'Pos Y' : 'Shift Y';
    els.lblW.textContent = m === 'area' ? 'Width' : 'Eff. W';
    els.lblH.textContent = m === 'area' ? 'Height' : 'Eff. H';
    updatePropertyInputs();
};


// --- HISTORY SYSTEM ---

/**
 * Saves the current state of regions to the history stack.
 * @param {boolean} isInitial 
 */
function saveState(isInitial = false) {
    if (state.historyIndex < state.history.length - 1) state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(JSON.parse(JSON.stringify(state.regions)));
    state.historyIndex++;
    if (state.history.length > 50) { state.history.shift(); state.historyIndex--; }
    updateHistoryUI();
}
function undo() { if (state.historyIndex > 0) { state.historyIndex--; restoreState(); } }
function redo() { if (state.historyIndex < state.history.length - 1) { state.historyIndex++; restoreState(); } }
function restoreState() { 
    state.regions = JSON.parse(JSON.stringify(state.history[state.historyIndex])); 
    deselect(); 
    renderRegions(); 
    updateHistoryUI(); 
}
function updateHistoryUI() {
    els.btnUndo.disabled = state.historyIndex <= 0;
    els.btnUndo.classList.toggle('opacity-30', state.historyIndex <= 0);
    els.btnRedo.disabled = state.historyIndex >= state.history.length - 1;
    els.btnRedo.classList.toggle('opacity-30', state.historyIndex >= state.history.length - 1);
}

// --- ZOOM & RENDER ---

function setZoom(m) { state.scaleMultiplier = Math.max(0.25, Math.min(5.0, m)); applyZoom(); }
function applyZoom() {
    const nw = state.baseWidth * state.scaleMultiplier;
    const nh = (state.canvas.height / state.canvas.width) * nw;
    els.wrapper.style.width = `${nw}px`; els.wrapper.style.height = `${nh}px`;
    els.txtZoomLevel.textContent = `${Math.round(state.scaleMultiplier * 100)}%`;
}
function renderPage() { 
    els.pdfLayer.innerHTML = ''; 
    els.pdfLayer.appendChild(state.canvas); 
    state.canvas.style.display = 'block';
    state.canvas.style.width='100%'; 
    state.canvas.style.height='100%'; 
    applyZoom(); 
    initSvgLayer(); 
}
function initSvgLayer() {
    const w = state.canvas.width; const h = state.canvas.height;
    els.svgLayer.innerHTML = `<svg id="main-svg" width="${w}" height="${h}" style="width:100%; height:100%;" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><g id="regions"></g><g id="highlights"></g></svg>`;
    renderRegions();
}

// --- MOUSE HANDLERS ---
function handleMouseDown(e) {
    if(e.button !== 0) return;
    const target = e.target;
    
    if (target.classList.contains('split-overlay')) {
        const idx = parseInt(target.dataset.splitIndex);
        if (state.splitSelection.has(idx)) {
            state.splitSelection.delete(idx);
        } else {
            state.splitSelection.add(idx);
        }
        renderRegions();
        return;
    }

    if (state.splitMode) {
        return;
    }

    if (target.dataset.action) {
        const frame = target.closest('.selection-frame');
        if (frame && frame.dataset.id && frame.dataset.id !== state.activeRegionId) {
            selectRegion(frame.dataset.id, e.shiftKey);
            return; 
        }
        state.dragAction = target.dataset.action;
        state.dragStart = getLocalPos(e);
        
        const r = getRegion(state.activeRegionId);
        if (r) {
            r.scale = r.scale || {x: 1, y: 1}; r.offset = r.offset || {x: 0, y: 0};
            state.initialRect = { ...r.rect }; 
            state.initialScale = { ...r.scale };
            updateUIProperties(r);
        }
        return;
    }
    
    els.interactionLayer.style.pointerEvents = 'none';
    const below = document.elementFromPoint(e.clientX, e.clientY);
    els.interactionLayer.style.pointerEvents = 'auto';
    
    if (below && below.classList.contains('region-highlight')) {
        selectRegion(below.getAttribute('data-id'), e.shiftKey);
        return;
    } else if (below && below.classList.contains('region-selected')) {
        selectRegion(below.getAttribute('data-id'), e.shiftKey);
        return;
    }

    state.dragAction = 'create';
    state.dragStart = getLocalPos(e); 
    if (!e.shiftKey) deselect();
    els.selectionBox.style.display = 'block';
    els.selectionBox.style.width = '0'; els.selectionBox.style.height = '0';
    els.selectionBar.style.display = 'none';
}

function handleMouseMove(e) {
    if (!state.dragAction) return;
    const cw = state.canvas.width; const ch = state.canvas.height;
    const pos = getLocalPos(e);

    if (state.dragAction === 'create') {
        const start = state.dragStart;
        const x = Math.min(pos.x, start.x); const y = Math.min(pos.y, start.y);
        const w = Math.abs(pos.x - start.x); const h = Math.abs(pos.y - start.y);
        const wrapRect = els.interactionLayer.getBoundingClientRect();
        const ratio = wrapRect.width / cw; 
        els.selectionBox.style.left = (x * ratio) + 'px'; 
        els.selectionBox.style.top = (y * ratio) + 'px';
        els.selectionBox.style.width = (w * ratio) + 'px'; 
        els.selectionBox.style.height = (h * ratio) + 'px';
    } else {
        const r = getRegion(state.activeRegionId);
        if (!r || !state.initialRect) return;

        const dx = (pos.x - state.dragStart.x) / cw;
        const dy = (pos.y - state.dragStart.y) / ch;
        let newRect = { ...state.initialRect };

        const action = state.dragAction;
        if (action === 'move') {
            newRect.x += dx; newRect.y += dy;
        } else {
            if (action.includes('e')) newRect.w = Math.max(0.001, state.initialRect.w + dx);
            if (action.includes('s')) newRect.h = Math.max(0.001, state.initialRect.h + dy);
            if (action.includes('w')) { 
                const maxD = state.initialRect.w - 0.001;
                const validDx = Math.min(maxD, dx);
                newRect.x += validDx; newRect.w -= validDx; 
            }
            if (action.includes('n')) {
                const maxD = state.initialRect.h - 0.001;
                const validDy = Math.min(maxD, dy);
                newRect.y += validDy; newRect.h -= validDy;
            }
        }
        
        if (newRect.w > 0.005 && newRect.h > 0.005) {
            r.rect = newRect;
            updateRegionVisuals(r, cw, ch, state.scaleMultiplier);
            updatePropertyInputs();
        }
    }
}

function handleMouseUp(e) {
    if (!state.dragAction) return;
    
    if (state.dragAction === 'create') {
         const sb = els.selectionBox;
         
         // Use local coordinates to determine drag distance in canvas pixels
         const w = Math.abs(getLocalPos(e).x - state.dragStart.x);
         const h = Math.abs(getLocalPos(e).y - state.dragStart.y);
         
         if (w > 5 && h > 5) { // Check if the drag distance in canvas pixels is significant
             const lx = Math.min(getLocalPos(e).x, state.dragStart.x);
             const ly = Math.min(getLocalPos(e).y, state.dragStart.y);
             
             const newRegion = {
                 id: `r${Date.now()}`,
                 // Coordinates are already in canvas pixels (0 to cw/ch)
                 rect: { x: lx/state.canvas.width, y: ly/state.canvas.height, w: w/state.canvas.width, h: h/state.canvas.height },
                 bpDims: { w: w, h: h },
                 svgContent: '', 
                 scale: { x: 1, y: 1 }, offset: { x: 0, y: 0 },
                 status: 'draft'
             };
             state.regions.push(newRegion);
             saveState();
             selectRegion(newRegion.id); 
         }
         sb.style.display = 'none';
    } else {
        saveState();
    }
    state.dragAction = null;
    state.dragStart = null;
    state.initialRect = null;
}

function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); return; }
    if (e.key === 'Escape') {
        if (state.splitMode) {
            state.splitMode = false;
            state.splitTargetId = null;
            state.splitSelection.clear();
            els.btnSplit.textContent = "Split";
            els.btnSplit.classList.remove('ring-2', 'ring-offset-1', 'ring-indigo-500');
            renderRegions();
            updateUI();
            return;
        }

        if (state.dragAction === 'create') { state.dragAction = null; els.selectionBox.style.display = 'none'; }
        else if (state.activeRegionId) deselect();
        return;
    }
    if (!state.activeRegionId) return;
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    
    const r = getRegion(state.activeRegionId);
    if (!r) return;
    
    const step = e.shiftKey ? 0.01 : 0.001;
    let handled = true;
    if (e.key === 'ArrowUp') r.rect.y -= step;
    else if (e.key === 'ArrowDown') r.rect.y += step;
    else if (e.key === 'ArrowLeft') r.rect.x -= step;
    else if (e.key === 'ArrowRight') r.rect.x += step;
    else if (e.key === 'Delete' || e.key === 'Backspace') {
        state.regions = state.regions.filter(x => x.id !== state.activeRegionId);
        deselect(); saveState(); handled = true;
    } else handled = false;
    
    if (handled) { e.preventDefault(); renderRegions(); updatePropertyInputs(); saveState(); }
}


// --- DATA UPDATE LOGIC ---
function updateRegionFromInput() {
    const r = getRegion(state.activeRegionId);
    if(!r) return;
    const cw = state.canvas.width; const ch = state.canvas.height;
    
    if (state.editMode === 'area') {
        r.rect.x = parseFloat(els.propX.value) / cw;
        r.rect.y = parseFloat(els.propY.value) / ch;
        r.rect.w = parseFloat(els.propW.value) / cw;
        r.rect.h = parseFloat(els.propH.value) / ch;
    } else {
        r.offset.x = parseFloat(els.propX.value) || 0;
        r.offset.y = parseFloat(els.propY.value) || 0;
        const inputW = parseFloat(els.propW.value);
        const inputH = parseFloat(els.propH.value);
        if (inputW > 0) r.bpDims.w = inputW;
        if (inputH > 0) r.bpDims.h = inputH;
    }
    
    // FIX: Pass scaleMultiplier
    updateRegionVisuals(r, cw, ch, state.scaleMultiplier);
}

function renderLayerList(r) {
    const list = els.layerList;
    list.innerHTML = '';
    
    if (!r || !r.svgContent) {
         list.innerHTML = '<div class="text-center text-gray-400 text-[10px] mt-4">Select a region to view layers</div>';
         return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(`<svg>${r.svgContent}</svg>`, "image/svg+xml");
    const root = doc.documentElement;
    const children = Array.from(root.childNodes).filter(n => n.nodeType === 1);

    if (children.length === 0 && r.svgContent.trim()) {
        createLayerItem(r.svgContent, 0);
    } else if (children.length > 0) {
        children.forEach((child, index) => {
            createLayerItem(child.outerHTML, index);
        });
    } else {
        list.innerHTML = '<div class="text-center text-gray-400 text-[10px] mt-4">No content</div>';
    }
}

function createLayerItem(content, index) {
    const div = document.createElement('div');
    div.className = 'bg-white border border-gray-300 rounded p-2 shadow-sm group relative mb-2';
    
    let tagName = 'element';
    const match = content.match(/^<([a-z0-9]+)/i);
    if (match) {
        tagName = match[1];
    } else if (content.startsWith('<')) {
        tagName = content.substring(1, content.indexOf(' ')).replace('/', '').trim() || 'element';
    } else {
        tagName = 'Text Content';
    }
    
    const header = document.createElement('div');
    header.className = 'text-[10px] font-bold text-blue-500 uppercase mb-1 flex justify-between items-center';
    
    const title = document.createElement('span');
    title.innerText = tagName;
    header.appendChild(title);
    
    const delBtn = document.createElement('button');
    delBtn.innerHTML = '&times;';
    delBtn.className = 'text-gray-400 hover:text-red-500 text-lg leading-none px-1';
    delBtn.title = 'Delete Element';
    delBtn.onclick = () => deleteLayer(index);
    header.appendChild(delBtn);

    div.appendChild(header);

    const ta = document.createElement('textarea');
    ta.className = 'w-full text-[10px] font-mono border border-gray-100 bg-gray-50 rounded p-1 resize-y outline-none focus:border-blue-300 h-16';
    ta.value = content;
    ta.spellcheck = false;
    ta.oninput = updateRegionFromList;
    ta.onblur = () => { updateRegionFromList(); saveState(); };
    ta.dataset.index = index;
    
    div.appendChild(ta);
    els.layerList.appendChild(div);
}

function deleteLayer(index) {
    const textareas = Array.from(els.layerList.querySelectorAll('textarea'));
    
    const r = getRegion(state.activeRegionId);
    if(!r) return;

    let newSvgContent = '';
    textareas.forEach((ta, idx) => {
        if (idx !== index) {
            newSvgContent += ta.value + '\n';
        }
    });
    
    r.svgContent = newSvgContent.trim();
    
    // FIX: Pass scaleMultiplier
    updateRegionVisuals(r, state.canvas.width, state.canvas.height, state.scaleMultiplier);
    renderLayerList(r);
    saveState();
}

function addLayerToRegion() {
    const r = getRegion(state.activeRegionId);
    if(!r) return;
    
    r.svgContent += `\n<text x="10" y="10" font-size="10" fill="black">New Text</text>`;
    // FIX: Pass scaleMultiplier
    updateRegionVisuals(r, state.canvas.width, state.canvas.height, state.scaleMultiplier);
    renderLayerList(r);
    saveState();
}

function updateRegionFromList() {
    const r = getRegion(state.activeRegionId);
    if(!r) return;

    const textareas = Array.from(els.layerList.querySelectorAll('textarea'));
    r.svgContent = textareas.map(ta => ta.value).join('\n');
    
    // FIX: Pass scaleMultiplier
    updateRegionVisuals(r, state.canvas.width, state.canvas.height, state.scaleMultiplier);
}

/**
 * Updates the visual representation (frame on interaction layer, and nested SVG on svg layer)
 * @param {object} r - The region object.
 * @param {number} cw - Canvas width.
 * @param {number} ch - Canvas height.
 * @param {number} ds - Display scale multiplier.
 */
function updateRegionVisuals(r, cw, ch, ds) {
    const frame = document.getElementById(`frame-${r.id}`);
    const nested = document.getElementById(`svg-region-${r.id}`);
    
    if(frame) {
        // FIX: Apply ds (scaleMultiplier) to frame position and size
        frame.style.left = (r.rect.x * cw * ds) + 'px'; 
        frame.style.top = (r.rect.y * ch * ds) + 'px';
        frame.style.width = (r.rect.w * cw * ds) + 'px'; 
        frame.style.height = (r.rect.h * ch * ds) + 'px';
    }
    
    if(nested) {
        const pxW = r.rect.w * cw; const pxH = r.rect.h * ch;
        // SVG element attributes (x, y, width, height) are in canvas pixels, not scaled screen pixels
        nested.setAttribute('x', r.rect.x * cw); nested.setAttribute('y', r.rect.y * ch);
        nested.setAttribute('width', pxW); nested.setAttribute('height', pxH);
        nested.setAttribute('viewBox', `0 0 ${r.bpDims.w} ${r.bpDims.h}`); 
        
        const grp = document.getElementById(`group-${r.id}`);
        if (grp) {
            // Include scale in the transform for consistency
            grp.setAttribute('transform', `translate(${r.offset.x}, ${r.offset.y}) scale(${r.scale.x}, ${r.scale.y})`);
            grp.innerHTML = r.svgContent;
        }
    }
}

// --- GEOMETRY UTILS ---
function fitContentToArea() {
    const r = getRegion(state.activeRegionId);
    if (!r) return;
    
    const group = document.getElementById(`group-${r.id}`);
    if (!group) return;
    
    try {
        const originalTransform = group.getAttribute('transform');
        group.removeAttribute('transform'); 
        const contentBBox = group.getBBox();
        group.setAttribute('transform', originalTransform || "");
        
        const contentW = contentBBox.width;
        const contentH = contentBBox.height;
        const contentX = contentBBox.x;
        const contentY = contentBBox.y;

        if (contentW <= 0 || contentH <= 0) {
            console.warn("Content has zero dimensions. Cannot fit content.");
            return;
        }

        r.bpDims.w = contentW;
        r.bpDims.h = contentH;
        r.scale = { x: 1, y: 1 };
        r.offset.x = -contentX;
        r.offset.y = -contentY;

    } catch(e) {
        console.error("Error calculating content BBox for Fill Content:", e);
        return;
    }

    renderLayerList(r);
    // FIX: Pass scaleMultiplier
    updateRegionVisuals(r, state.canvas.width, state.canvas.height, state.scaleMultiplier);
    renderRegions(); 
    updatePropertyInputs(); 
    saveState();
}

function fitAreaToContent() {
    const r = getRegion(state.activeRegionId);
    if (!r) return;
    const group = document.getElementById(`group-${r.id}`);
    if (!group) return;

    const cw = state.canvas.width; 
    const ch = state.canvas.height;

    try {
        const contentRect = group.getBoundingClientRect();
        const wrapperRect = els.interactionLayer.getBoundingClientRect();
        
        const ratio = cw / wrapperRect.width;
        const absX = (contentRect.left - wrapperRect.left) * ratio;
        const absY = (contentRect.top - wrapperRect.top) * ratio;
        const absW = contentRect.width * ratio;
        const absH = contentRect.height * ratio;

        r.rect = { 
            x: absX / cw, 
            y: absY / ch, 
            w: absW / cw, 
            h: absH / ch 
        };

        updateRegionVisuals(r, cw, ch, state.scaleMultiplier);
        fitContentToArea(); // Reset internal content to align with new container (0,0)
        
    } catch(e) {
        console.error("Error calculating visual BBox for Fit Area:", e);
        return;
    }
}

// --- CORE FUNCTIONS (Rendering, Selection, Creation) ---
function renderRegions() {
    const gRegions = els.svgLayer.querySelector('#regions');
    const gHighlights = els.svgLayer.querySelector('#highlights');
    gRegions.innerHTML = ''; gHighlights.innerHTML = '';
    
    if (!state.dragAction || state.dragAction === 'create') els.interactionLayer.innerHTML = '';
    
    const cw = state.canvas.width; const ch = state.canvas.height;
    
    state.regions.forEach(r => {
        r.scale = r.scale || {x:1, y:1}; r.offset = r.offset || {x:0, y:0};
        if (!r.bpDims) r.bpDims = { w: r.rect.w*cw, h: r.rect.h*ch };

        const px = r.rect.x * cw; const py = r.rect.y * ch;
        const pw = r.rect.w * cw; const ph = r.rect.h * ch; 
        
        if (r.status === 'draft') {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", px); rect.setAttribute("y", py);
            rect.setAttribute("width", pw);
            rect.setAttribute("height", ph); 
            rect.setAttribute("class", "region-draft");
            gRegions.appendChild(rect);
        } else {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("x", px); svg.setAttribute("y", py);
            svg.setAttribute("width", pw);
            svg.setAttribute("height", ph); 
            svg.setAttribute("viewBox", `0 0 ${r.bpDims.w} ${r.bpDims.h}`); 
            svg.setAttribute("preserveAspectRatio", "none");
            svg.setAttribute("id", `svg-region-${r.id}`);
            
            svg.innerHTML = `<g id="group-${r.id}" transform="translate(${r.offset.x}, ${r.offset.y}) scale(${r.scale.x}, ${r.scale.y})">${r.svgContent}</g>`;
            gRegions.appendChild(svg);
        }
        
        if (r.id === state.activeRegionId && state.selectedIds.size <= 1 && !state.dragAction) {
            if (state.splitMode && state.splitTargetId === r.id) {
                 renderSplitOverlays(r);
            } else {
                 renderActiveSelectionControls(r);
            }
        } else if (state.selectedIds.has(r.id)) {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", px); rect.setAttribute("y", py);
            rect.setAttribute("width", pw); rect.setAttribute("height", ph); 
            rect.setAttribute("class", "region-selected");
            rect.setAttribute("data-id", r.id);
            gHighlights.appendChild(rect);
        } else {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", px); rect.setAttribute("y", py);
            rect.setAttribute("width", pw); rect.setAttribute("height", ph); 
            rect.setAttribute("class", "region-highlight");
            rect.setAttribute("data-id", r.id);
            gHighlights.appendChild(rect);
        }
    });
    updateUI();
}

/**
 * Renders the resize/move handles for the active region.
 * (FIX: Corrected to use state.scaleMultiplier for scaled positioning)
 */
function renderActiveSelectionControls(region) {
    // Prevent re-drawing if already exists (only remove on full renderRegions)
    if (document.querySelector(`.selection-frame[data-id="${region.id}"]`)) return;

    const w = state.canvas.width; const h = state.canvas.height;
    const ds = state.scaleMultiplier; // Get scale multiplier

    // Position and size must be scaled to match the canvas-wrapper's size
    const px = region.rect.x * w * ds; 
    const py = region.rect.y * h * ds;
    const pw = region.rect.w * w * ds; 
    const ph = region.rect.h * h * ds;

    const frame = document.createElement('div');
    frame.className = 'selection-frame'; frame.id = `frame-${region.id}`;
    frame.style.left = `${px}px`; frame.style.top = `${py}px`;
    frame.style.width = `${pw}px`; frame.style.height = `${ph}px`;
    frame.dataset.id = region.id; frame.dataset.action = 'move';

    ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `resize-handle handle-${pos}`;
        handle.dataset.action = pos;
        frame.appendChild(handle);
    });
    els.interactionLayer.appendChild(frame);
}

function renderSplitOverlays(region) {
     const group = document.getElementById(`group-${region.id}`);
     if (!group) return;
     
     const children = Array.from(group.children);
     const wrapperRect = els.interactionLayer.getBoundingClientRect();
     const cw = state.canvas.width;
     // The ratio converts screen pixels to canvas pixels.
     const ratio = cw / wrapperRect.width; 

     // Clear old overlays
     els.interactionLayer.querySelectorAll('.split-overlay').forEach(el => el.remove());

     children.forEach((child, idx) => {
         if (!(child instanceof SVGGraphicsElement)) return;
         
         const rect = child.getBoundingClientRect();
         const layerRect = els.interactionLayer.getBoundingClientRect();
         // Position calculation needs to be in screen pixels for the div overlay
         const x = (rect.left - layerRect.left);
         const y = (rect.top - layerRect.top);
         const w = rect.width;
         const h = rect.height;
         
         const div = document.createElement('div');
         div.className = 'absolute border-2 border-dashed border-indigo-400 bg-indigo-500/20 hover:bg-indigo-500/40 cursor-pointer pointer-events-auto transition-colors';
         if (state.splitSelection.has(idx)) {
             div.className = 'absolute border-2 border-red-500 bg-red-500/40 cursor-pointer pointer-events-auto transition-colors';
         }
         
         div.style.left = x + 'px';
         div.style.top = y + 'px';
         div.style.width = w + 'px';
         div.style.height = h + 'px';
         div.dataset.splitIndex = idx;
         div.dataset.regionId = region.id;
         div.classList.add('split-overlay');
         
         els.interactionLayer.appendChild(div);
     });
}

function selectRegion(id, multi = false) {
    if (state.splitMode) return;

    if (multi) {
        if (state.selectedIds.has(id)) {
            state.selectedIds.delete(id);
            if (state.activeRegionId === id) {
                state.activeRegionId = state.selectedIds.size > 0 ? Array.from(state.selectedIds).pop() : null;
            }
        } else {
            state.selectedIds.add(id);
            state.activeRegionId = id;
        }
    } else {
        state.selectedIds.clear();
        state.selectedIds.add(id);
        state.activeRegionId = id;
    }
    
    renderRegions();
    
    const r = getRegion(state.activeRegionId);
    if(r) {
        renderLayerList(r);
        updateUIProperties(r);
        if (r.status === 'draft') showCreationBar(r); else els.selectionBar.style.display = 'none';
    } else els.selectionBar.style.display = 'none';
}

function deselect() {
    if (state.splitMode) {
        state.splitMode = false;
        state.splitTargetId = null;
        state.splitSelection.clear();
        els.btnSplit.textContent = "Split";
        els.btnSplit.classList.remove('ring-2', 'ring-offset-1', 'ring-indigo-500');
    }
    
    state.activeRegionId = null;
    state.selectedIds.clear();
    renderRegions();
    els.selectionBar.style.display = 'none';
    els.selectionBox.style.display = 'none';
    els.layerList.innerHTML = '<div class="text-center text-gray-400 text-[10px] mt-4">Select a region to view layers</div>';
    els.contextActions.classList.add('disabled-bar');
    [els.propX, els.propY, els.propW, els.propH].forEach(el => { el.value = ''; el.disabled = true; });
}

export function clearSelection() {
    deselect();
}

function updateUIProperties(r) {
    const multiple = state.selectedIds.size > 1;
    [els.propX, els.propY, els.propW, els.propH].forEach(el => { 
        el.disabled = multiple; 
        if (multiple) {
            el.classList.add('disabled-input');
            el.value = '';
        } else {
            el.classList.remove('disabled-input'); 
        }
    });
    
    if (!multiple) {
        updatePropertyInputs();
        updateDebug(r);
    }
}

function showCreationBar(r) {
     const rect = els.interactionLayer.getBoundingClientRect();
     const cw = state.canvas.width; const ch = state.canvas.height;
     const ratio = rect.width / cw; 
     const sx = rect.left + (r.rect.x * cw * ratio);
     const sy = rect.top + (r.rect.y * ch * ratio) + (r.rect.h * ch * ratio) + 10;
     els.selectionBar.style.left = Math.min(window.innerWidth - 250, Math.max(10, sx)) + 'px';
     els.selectionBar.style.top = sy + 'px';
     els.selectionBar.style.display = 'flex';
}

function updatePropertyInputs() {
    const r = getRegion(state.activeRegionId);
    if(!r || state.selectedIds.size > 1) return;
    const cw = state.canvas.width || 1000; const ch = state.canvas.height || 1000;
    
    if (state.editMode === 'area') {
        els.propX.value = (r.rect.x * cw).toFixed(0);
        els.propY.value = (r.rect.y * ch).toFixed(0);
        els.propW.value = (r.rect.w * cw).toFixed(0);
        els.propH.value = (r.rect.h * ch).toFixed(0);
    } else {
        els.propX.value = r.offset.x.toFixed(2);
        els.propY.value = r.offset.y.toFixed(2);
        els.propW.value = (r.bpDims.w).toFixed(2);
        els.propH.value = (r.bpDims.h).toFixed(2);
    }
}

function updateUI() {
    els.regionCount.textContent = `${state.regions.length}`;
    if(state.activeRegionId) els.contextActions.classList.remove('disabled-bar');
    else els.contextActions.classList.add('disabled-bar');
}

async function handleFileUpload(e) {
    const file = e.target.files[0]; if(!file) return;
    els.loader.classList.remove('hidden');
    if (file.type === 'application/pdf') {
        const ab = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(ab).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        state.canvas.width = viewport.width; state.canvas.height = viewport.height; state.baseWidth = viewport.width;
        await page.render({ canvasContext: state.canvas.getContext('2d'), viewport }).promise;
    } else {
        const img = new Image(); img.src = URL.createObjectURL(file);
        await new Promise(r => img.onload = r);
        state.canvas.width = img.width; state.canvas.height = img.height; state.baseWidth = img.width;
        state.canvas.getContext('2d').drawImage(img, 0, 0);
    }
    state.regions = []; state.history = []; renderPage();
    els.loader.classList.add('hidden'); els.emptyState.classList.add('hidden');
    els.workspace.classList.remove('hidden'); els.workspace.classList.add('flex');
    saveState(true);
}

/**
 * Creates a new vector blueprint and dummy SVG content for a draft region.
 * Must be exported to be callable from HTML.
 * @param {string} type - 'text', 'image', 'empty'
 * @param {string} id - Region ID
 */
export async function createRegion(type, id) {
    const tid = id || state.activeRegionId; if(!tid) return;
    const r = getRegion(tid); if(!r) return;
    els.aiStatus.classList.remove('hidden'); els.selectionBar.style.display = 'none';
    
    const cw = state.canvas.width; const ch = state.canvas.height;
    const pxW = Math.floor(r.rect.w * cw); const pxH = Math.floor(r.rect.h * ch);
    
    // Create high-res crop for visual check
    const tmp = document.createElement('canvas'); tmp.width = pxW * 2; tmp.height = pxH * 2;
    tmp.getContext('2d').drawImage(state.canvas, r.rect.x * cw, r.rect.y * ch, pxW, pxH, 0, 0, pxW*2, pxH*2);
    r.srcCrop = tmp.toDataURL();

    try {
        // Create low-res blueprint crop
        const bpC = document.createElement('canvas'); 
        const MAX_BP = 300;
        let bpW = pxW, bpH = pxH;
        if (pxW > MAX_BP || pxH > MAX_BP) {
            const ratio = Math.min(MAX_BP/pxW, MAX_BP/pxH); // FIX: Corrected variable name from 'ph' to 'pxH'
            bpW = Math.floor(pxW*ratio); bpH = Math.floor(pxH*ratio);
        }
        bpC.width = bpW; bpC.height = bpH;
        bpC.getContext('2d').drawImage(tmp, 0, 0, bpW, bpH);
        
        // Use the global helper function for RLE
        // Note: SciTextHelpers is loaded globally via a separate script tag in main.html
        const rlePath = SciTextHelpers.runLengthEncode(bpC.getContext('2d').getImageData(0,0,bpW,bpH));
        
        r.blueprint = `<svg viewBox="0 0 ${bpW} ${bpH}"><path d="${rlePath}" fill="#00ff00"/></svg>`;
        
        // Initial SVG content is the path of the Blueprint (or placeholder for image/empty)
        if (type === 'image') {
             r.svgContent = `<rect x="0" y="0" width="${bpW}" height="${bpH}" fill="#f0f0f0" stroke="#ccc"/>
                             <text x="${bpW/2}" y="${bpH/2}" font-size="${bpH/10}" text-anchor="middle" fill="#555">Image Placeholder</text>`;
        } else if (type === 'empty') {
            r.svgContent = '';
        } else {
            // 'text' type defaults to the RLE blueprint
            r.svgContent = `<path d="${rlePath}" fill="black" />`;
        }
        
        r.bpDims = {w: bpW, h: bpH}; // Set intrinsic size to blueprint pixel size
        r.status = undefined; 
        r.scale = { x: 1, y: 1 }; r.offset = { x: 0, y: 0 };
        
        saveState(); selectRegion(r.id);
    } catch(e) { console.error(e); }
    els.aiStatus.classList.add('hidden');
}

/**
 * Calls the Gemini API to digitize the region using RLE and Image input.
 */
async function digitizeRegion() {
    const r = getRegion(state.activeRegionId);
    if (!r) return;
    
    els.aiStatus.classList.remove('hidden');
    els.aiStatus.textContent = 'Digitizing...';

    const cw = state.canvas.width; const ch = state.canvas.height;
    const pw = Math.floor(r.rect.w * cw); const ph = Math.floor(r.rect.h * ch);
    
    // Create high-res canvas for image input
    const tmp = document.createElement('canvas'); tmp.width = pw * 2; tmp.height = ph * 2;
    tmp.getContext('2d').drawImage(state.canvas, r.rect.x * cw, r.rect.y * ch, pw, ph, 0, 0, pw*2, ph*2);
    const base64 = tmp.toDataURL('image/png').split(',')[1];
    
    // Create low-res canvas for blueprint generation
    const bpC = document.createElement('canvas');
    bpC.width = pw; bpC.height = ph; 
    bpC.getContext('2d').drawImage(state.canvas, r.rect.x * cw, r.rect.y * ch, pw, ph, 0, 0, pw, ph);
    const rle = SciTextHelpers.runLengthEncode(bpC.getContext('2d').getImageData(0,0,pw,ph));

    const prompt = `You are a precision SVG Typesetter.
INPUTS:
1. IMAGE: A 2x scale scan of text. Read this text.
2. BLUEPRINT: A 1x scale vector path marking the exact black pixels of the text.

TASK:
Generate semantic SVG <text> elements that match the text in the IMAGE, but positioned precisely over the BLUEPRINT.
- Use the BLUEPRINT as the ground truth for positioning (x, y) and font-size.
- The Output ViewBox is 0 0 ${pw} ${ph}.
- Do not return the blueprint path itself, only the new text elements.
- Use fill="black".
- Output strictly valid SVG elements (e.g. <text x="..." y="...">Content</text>).
- Do not wrap the output in any code block indicators (\`\`\`).

BLUEPRINT PATH (Partial):
${rle.substring(0, 500)}...`; 
    
    const payload = { 
        contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: base64 } }] }] 
    };
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const MAX_RETRIES = 5;
    let attempt = 0;
    let resp;
    let success = false;

    while (attempt < MAX_RETRIES && !success) {
        try {
            resp = await fetch(apiUrl, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (resp.status === 429 || resp.status >= 500) {
                if (attempt < MAX_RETRIES - 1) {
                    const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                    console.log(`Rate limit or server error. Retrying in ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    attempt++;
                    continue;
                }
            }
            if (!resp.ok) throw new Error(`API Error: ${resp.status}`);
            success = true;
        } catch (e) {
            console.error(`Attempt ${attempt + 1} failed:`, e);
            attempt++;
            if (attempt === MAX_RETRIES) throw e; 
        }
    }

    if (!success || !resp) {
        els.aiStatus.textContent = 'Error: Max Retries';
        setTimeout(() => { els.aiStatus.classList.add('hidden'); els.aiStatus.textContent = 'Processing...'; }, 3000);
        return;
    }
    
    try {
        const json = await resp.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error(`No SVG generated.`);

        // Clean any code fences if the model failed the instruction
        let cleanSvg = text.replace(/```svg/g, '').replace(/```/g, '').trim();
        
        r.svgContent = cleanSvg;
        r.bpDims = { w: pw, h: ph };
        r.scale = { x: 1, y: 1 }; 
        r.offset = { x: 0, y: 0 };
        
        saveState();
        selectRegion(r.id);

    } catch(e) {
        console.error("Digitization Processing Error:", e);
        els.aiStatus.textContent = `Error: ${e.message.substring(0, 30)}...`;
    } finally {
        setTimeout(() => { 
             els.aiStatus.classList.add('hidden');
             els.aiStatus.textContent = 'Processing...'; 
        }, 3000);
    }
}

function optimizeActiveRegion() {
    if (!state.activeRegionId) return;
    const r = getRegion(state.activeRegionId);
    if (r && r.svgContent) {
         const original = r.svgContent;
         const optimized = mergeAdjacentTextElements(original);
         r.svgContent = optimized;
         renderLayerList(r);
         updateRegionVisuals(r, state.canvas.width, state.canvas.height, state.scaleMultiplier);
         saveState();
         console.log("Optimization complete");
    }
}

function groupSelectedRegions() {
    const selected = state.regions.filter(r => state.selectedIds.has(r.id));
    if (selected.length < 2) {
        console.error("Please select at least 2 regions to group.");
        return;
    }

    const cw = state.canvas.width;
    const ch = state.canvas.height;

    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    selected.forEach(r => {
        minX = Math.min(minX, r.rect.x);
        minY = Math.min(minY, r.rect.y);
        maxX = Math.max(maxX, r.rect.x + r.rect.w);
        maxY = Math.max(maxY, r.rect.y + r.rect.h);
    });

    const unionRect = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    const pxW = unionRect.w * cw;
    const pxH = unionRect.h * ch;

    let mergedContent = "";
    selected.forEach(r => {
        const relX = (r.rect.x - minX) * cw;
        const relY = (r.rect.y - minY) * ch;
        const visW = r.rect.w * cw;
        const visH = r.rect.h * ch;
        
        mergedContent += `<svg x="${relX.toFixed(3)}" y="${relY.toFixed(3)}" width="${visW.toFixed(3)}" height="${visH.toFixed(3)}" viewBox="0 0 ${r.bpDims.w} ${r.bpDims.h}" preserveAspectRatio="none" overflow="visible">
            <g transform="translate(${r.offset.x}, ${r.offset.y}) scale(${r.scale.x}, ${r.scale.y})">
                ${r.svgContent}
            </g>
        </svg>`;
    });

    const newRegion = {
        id: `r${Date.now()}`,
        rect: unionRect,
        bpDims: { w: pxW, h: pxH }, 
        svgContent: mergedContent,
        scale: { x: 1, y: 1 },
        offset: { x: 0, y: 0 },
        status: 'grouped'
    };

    state.regions = state.regions.filter(r => !state.selectedIds.has(r.id));
    state.regions.push(newRegion);
    
    state.selectedIds.clear();
    selectRegion(newRegion.id); 
    saveState();
}

function handleSplitAction() {
     if (state.splitMode) {
         const r = getRegion(state.splitTargetId);
         if (!r) { deselect(); return; }
         if (state.splitSelection.size === 0) { deselect(); return; }
         
         const group = document.getElementById(`group-${r.id}`);
         if (!group) return;
         
         const children = Array.from(group.children);
         const newRegions = [];
         const cw = state.canvas.width;
         const ch = state.canvas.height;
         const parentPxX = r.rect.x * cw;
         const parentPxY = r.rect.y * ch;
         const wrapperRect = els.interactionLayer.getBoundingClientRect();
         const ratio = cw / wrapperRect.width;

         const parser = new DOMParser();
         const doc = parser.parseFromString(`<svg>${r.svgContent}</svg>`, "image/svg+xml");
         const root = doc.documentElement;
         const domChildren = Array.from(root.children);
         
         const extractedIndices = Array.from(state.splitSelection).sort((a,b) => a-b);
         const remainingNodes = domChildren.filter((_, idx) => !extractedIndices.includes(idx));
         
         const extractedNodes = [];

         extractedIndices.forEach(idx => {
             const child = domChildren[idx];
             const renderedChild = children[idx];
             
             if (child && renderedChild) {
                 let absX, absY, absW, absH, content, bpW, bpH;
                 
                 try {
                     // Get bounding box in screen coordinates relative to the canvas
                     const rect = renderedChild.getBoundingClientRect();
                     const layerRect = els.interactionLayer.getBoundingClientRect();
                     const absX_screen = (rect.left - layerRect.left) * ratio;
                     const absY_screen = (rect.top - layerRect.top) * ratio;
                     absW = rect.width * ratio;
                     absH = rect.height * ratio;
                     
                     absX = absX_screen;
                     absY = absY_screen;
                     
                     // Get intrinsic content size (BBox) and offset for the new region's content
                     const bbox = renderedChild.getBBox();
                     content = child.outerHTML;
                     bpW = bbox.width; 
                     bpH = bbox.height;

                 } catch(e) {
                     console.error("Split bounding box error:", e);
                     return;
                 }
                 
                 newRegions.push({
                    id: `r${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    rect: { x: absX / cw, y: absY / ch, w: absW / cw, h: absH / ch },
                    bpDims: { w: bpW, h: bpH }, // Estimated BPDims from BBox
                    svgContent: content,
                    scale: { x: 1, y: 1 },
                    offset: { x: 0, y: 0 },
                    status: 'optimized', // Mark as optimized
                    // Store the original BBox origin to shift the content later:
                    _splitBBox: { x: bbox.x, y: bbox.y } 
                });
                
                extractedNodes.push(child);
             }
         });
         
         // Remove extracted nodes from parent DOM structure
         extractedNodes.forEach(node => {
             if (node.parentNode) {
                 node.parentNode.removeChild(node);
             } else {
                 console.warn("Node to remove has no parent, skipping removal.");
             }
         });

         // Update Parent Region with remaining nodes
         r.svgContent = root.innerHTML.trim();
         
         // If parent is empty, remove it.
         if (!r.svgContent || r.svgContent.replace(/\s/g, '') === '') {
             state.regions = state.regions.filter(reg => reg.id !== r.id);
         } else {
             // If parent still exists, optimize its new bounds
             r.status = 'optimized';
             updateRegionVisuals(r, cw, ch, state.scaleMultiplier);
             fitContentToArea(); // This resets the offset/bpDims based on new content BBox
         }
         
         // Add new regions and fit their content
         newRegions.forEach(newR => {
             // Before adding, apply the BBox offset shift 
             newR.offset.x = -newR._splitBBox.x;
             newR.offset.y = -newR._splitBBox.y;
             delete newR._splitBBox;
             
             state.regions.push(newR);
         });
         
         deselect();
         saveState();
         
     } else {
         const r = getRegion(state.activeRegionId);
         if (!r || !r.svgContent) return;
         
         state.splitMode = true;
         state.splitTargetId = r.id;
         state.splitSelection.clear();
         
         els.btnSplit.textContent = "Extract";
         els.btnSplit.classList.add('ring-2', 'ring-offset-1', 'ring-indigo-500');
         
         renderRegions();
     }
}

function mergeAdjacentTextElements(svgString) {
    if (!svgString.includes('<text')) return svgString;
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<svg>${svgString}</svg>`, "image/svg+xml");
    const svgRoot = doc.querySelector('svg');
    if (!svgRoot) return svgString;

    const textElements = Array.from(svgRoot.querySelectorAll('text'));
    textElements.sort((a, b) => {
        const ay = parseFloat(a.getAttribute('y') || '0');
        const by = parseFloat(b.getAttribute('y') || '0');
        if (Math.abs(ay - by) > 0.5) return ay - by;
        const ax = parseFloat(a.getAttribute('x') || '0');
        const bx = parseFloat(b.getAttribute('x') || '0');
        return ax - bx;
    });

    if (textElements.length < 2) return svgString;

    const mergedElements = [];
    let currentGroup = [];
    
    const getStyleKey = (el) => {
        let key = (el.getAttribute('font-family') || '') + '|' + 
                  (el.getAttribute('font-size') || '') + '|' + 
                  (el.getAttribute('font-weight') || '') + '|' + 
                  (el.getAttribute('fill') || '');
        const style = el.getAttribute('style') || '';
        return key + '|' + style;
    };

    for (const textEl of textElements) {
        if (currentGroup.length === 0) {
            currentGroup.push(textEl);
            continue;
        }
        const lastEl = currentGroup[currentGroup.length - 1];
        const currentY = parseFloat(textEl.getAttribute('y') || '0');
        const lastY = parseFloat(lastEl.getAttribute('y') || '0');
        
        if (getStyleKey(textEl) === getStyleKey(lastEl) && Math.abs(currentY - lastY) < 1.0) {
            currentGroup.push(textEl);
        } else {
            mergedElements.push(currentGroup);
            currentGroup = [textEl];
        }
    }
    if (currentGroup.length > 0) mergedElements.push(currentGroup);

    for (const group of mergedElements) {
        if (group.length > 1) {
            const firstEl = group[0];
            let mergedText = firstEl.textContent;
            group.sort((a, b) => parseFloat(a.getAttribute('x')) - parseFloat(b.getAttribute('x')));
            
            for (let i = 1; i < group.length; i++) {
                const nextEl = group[i];
                mergedText += ' ' + nextEl.textContent;
                nextEl.remove();
            }
            firstEl.textContent = mergedText.trim();
        }
    }
    return svgRoot.innerHTML;
}

function updateDebug(r) {
     if(r.srcCrop) els.debugImg.src = r.srcCrop;
     if(r.blueprint) els.debugBlueprint.innerHTML = r.blueprint;
     // Note: The viewBox may need to be adjusted for scaling if the content is not fully visible.
     // Currently using bpDims for viewBox, which is the internal canvas pixel size of the crop.
     els.debugSvg.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 ${r.bpDims.w} ${r.bpDims.h}" style="border:1px solid red">${r.svgContent}</svg>`;
     els.debugLog.textContent = JSON.stringify(r, null, 2);
}

function switchTab(t) {
     els.workspace.classList.toggle('hidden', t !== 'overlay');
     els.debugContainer.classList.toggle('hidden', t !== 'debug');
     els.debugContainer.classList.toggle('flex', t === 'debug');
     document.getElementById('tab-overlay').classList.toggle('active', t === 'overlay');
     document.getElementById('tab-debug').classList.toggle('active', t === 'debug');
     if (t === 'debug' && state.activeRegionId) {
        updateDebug(getRegion(state.activeRegionId));
     }
}

function exportSVG() {
    const out = SciTextHelpers.composeSVG(state.regions, state.canvas.width, state.canvas.height);
    const url = URL.createObjectURL(new Blob([out], {type: 'image/svg+xml'}));
    const a = document.createElement('a'); a.href = url; a.download = "scitext.svg"; a.click();
}
