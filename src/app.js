/**
 * SciText Digitizer - Application Bundle
 * Merges previous helpers.js and main.js into a unified logic file.
 * * Contains:
 * 1. SciTextHelpers: Core math and SVG utilities.
 * 2. App Logic: State management, AI integration, and Canvas interaction.
 */

(function(global) {
    // =========================================================================
    // 1. SCITEXT HELPERS (Utilities)
    // =========================================================================
    const SciTextHelpers = {
        normalizeRect: function(x, y, w, h, canvasWidth, canvasHeight) {
            return { x: x / canvasWidth, y: y / canvasHeight, w: w / canvasWidth, h: h / canvasHeight };
        },

        runLengthEncode: function(imageData) {
            let path = "";
            const { width, height, data } = imageData;
            for (let y = 0; y < height; y += 2) {
                let startX = -1;
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;
                    // Threshold for "dark" pixels
                    const isDark = data[idx + 3] > 128 && data[idx] < 128 && data[idx+1] < 128 && data[idx+2] < 128;
                    if (isDark) {
                        if (startX === -1) startX = x;
                    } else {
                        if (startX !== -1) {
                            path += `M${startX} ${y}h${x - startX}v2h-${x - startX}z`;
                            startX = -1;
                        }
                    }
                }
                if (startX !== -1) {
                    path += `M${startX} ${y}h${width - startX}v2h-${width - startX}z`;
                }
            }
            return path;
        },

        compressSVG: function(svgString) { 
            if (!svgString) return '';
            return svgString.replace(/\s+/g, ' ').replace(/>\s*</g, '><').trim(); 
        },

        composeSVG: function(regions, canvasWidth, canvasHeight) {
            let out = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`;
            out += `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">\n`;
            out += `  <rect width="100%" height="100%" fill="white"/>\n`;

            regions.forEach(r => {
                if (!r.svgContent) return;
                const x = (r.rect.x * canvasWidth).toFixed(3);
                const y = (r.rect.y * canvasHeight).toFixed(3);
                const w = (r.rect.w * canvasWidth).toFixed(3);
                const h = (r.rect.h * canvasHeight).toFixed(3);
                
                r.scale = r.scale || { x: 1, y: 1 };
                r.offset = r.offset || { x: 0, y: 0 };
                
                out += `  <svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${r.bpDims.w} ${r.bpDims.h}" preserveAspectRatio="none" overflow="visible">\n`;
                out += `    <rect width="100%" height="100%" fill="white" opacity="0"/>\n`;
                out += `    <g transform="translate(${r.offset.x},${r.offset.y}) scale(${r.scale.x},${r.scale.y})">\n`;
                out += `      ${r.svgContent}\n`;
                out += `    </g>\n`;
                out += `  </svg>\n`;
            });

            out += `</svg>`;
            return out;
        }
    };

    // =========================================================================
    // 2. MAIN APPLICATION LOGIC
    // =========================================================================
    
    // Ensure the global app object exists
    const app = global.app = global.app || {};

    const CONFIG = { 
        defaultPdfUrl: "https://lsparrish.github.io/sciconvert/sample.png", 
        aiScale: 2.0 
    };
    const apiKey = ""; // API Key provided by environment at runtime

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
        editMode: 'area', 
        history: [],
        historyIndex: -1,
        dragAction: null, 
        dragStart: { x: 0, y: 0 }, 
        initialRect: null, 
        initialScale: null, 
        canvas: null,
    };

    app.state_ = state;
    const els = {};

    // --- INITIALIZATION ---

    async function originalBootstrap() {
        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }
        
        try {
            const response = await fetch('https://lsparrish.github.io/sciconvert/src/template.html');
            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            
            const styleElement = doc.querySelector('style');
            const structureDiv = doc.querySelector('#template-structure');
            
            if (styleElement && structureDiv) {
                document.head.appendChild(styleElement.cloneNode(true));
                const body = document.querySelector('body');
                while (structureDiv.firstChild) {
                    body.appendChild(structureDiv.firstChild);
                }
            }
            
            init(); 
        } catch (error) {
            console.error("Failed to load template.html:", error);
            document.body.innerHTML = '<h1>Error loading template.</h1>';
        }
    }

    function init() {
        state.canvas = document.getElementById('processing-canvas');

        // Populate element references
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
        els.btnSplit = document.getElementById('btn-split');
        
        try { loadDefaultImage(); } catch(e) { els.loader.classList.add('hidden'); }
        setupEventListeners();
        updateHistoryUI();
    }

    // --- CORE LOGIC & AI INTEGRATION (Merged) ---

    /**
     * Initializes a new region and immediately triggers content generation.
     */
    app.createRegion = async function(type, id) {
        const tid = id || state.activeRegionId; if(!tid) return;
        const r = getRegion(tid); if(!r) return;
        
        els.aiStatus.classList.remove('hidden'); 
        els.selectionBar.classList.add('hidden');
        
        const cw = state.canvas.width; const ch = state.canvas.height;
        const pxW = Math.floor(r.rect.w * cw); const pxH = Math.floor(r.rect.h * ch);
        
        // 1. Create high-res crop
        const tmp = document.createElement('canvas'); tmp.width = pxW * 2; tmp.height = pxH * 2;
        tmp.getContext('2d').drawImage(state.canvas, r.rect.x * cw, r.rect.y * ch, pxW, pxH, 0, 0, pxW*2, pxH*2);
        r.srcCrop = tmp.toDataURL();

        try {
            // 2. Create blueprint & RLE
            const bpC = document.createElement('canvas'); 
            const MAX_BP = 300;
            let bpW = pxW, bpH = pxH;
            if (pxW > MAX_BP || pxH > MAX_BP) {
                const ratio = Math.min(MAX_BP/pxW, MAX_BP/pxH);
                bpW = Math.floor(pxW*ratio); bpH = Math.floor(pxH*ratio);
            }
            bpC.width = bpW; bpC.height = bpH;
            bpC.getContext('2d').drawImage(tmp, 0, 0, bpW, bpH);
            
            const rlePath = SciTextHelpers.runLengthEncode(bpC.getContext('2d').getImageData(0,0,bpW,bpH));
            r.blueprint = `<svg viewBox="0 0 ${bpW} ${bpH}"><path d="${rlePath}" fill="#00ff00"/></svg>`;
            
            // 3. Initialize Region Props
            r.bpDims = {w: bpW, h: bpH};
            r.status = undefined; 
            r.scale = { x: 1, y: 1 }; r.offset = { x: 0, y: 0 };
            r.type = type;

            if (type === 'empty') {
                r.svgContent = '';
                r.status = 'generated';
            } else {
                r.svgContent = `<text x="50%" y="50%" font-size="${bpH/5}" text-anchor="middle" fill="#ccc">Processing...</text>`;
                selectRegion(r.id); 
                renderRegions(); 
                // 4. Trigger AI Generation
                await app.generateRegionContent(type, r.id);
            }
            
            saveState(); 
            selectRegion(r.id);
        } catch(e) { 
            console.error(e); 
            r.status = 'draft'; 
        }
        els.aiStatus.classList.add('hidden');
    };

    /**
     * Handles the API call to generate SVG content.
     */
    app.generateRegionContent = async function(type, id) {
        const r = getRegion(id); if (!r) return;
        
        els.aiStatus.classList.remove('hidden');
        els.aiStatus.textContent = `Generating ${type} content...`;

        const cw = state.canvas.width; const ch = state.canvas.height;
        const pw = Math.floor(r.rect.w * cw); const ph = Math.floor(r.rect.h * ch);
        
        const tmp = document.createElement('canvas'); tmp.width = pw * 2; tmp.height = ph * 2;
        tmp.getContext('2d').drawImage(state.canvas, r.rect.x * cw, r.rect.y * ch, pw, ph, 0, 0, pw*2, ph*2);
        const base64 = tmp.toDataURL('image/png').split(',')[1];
        
        const bpC = document.createElement('canvas');
        bpC.width = r.bpDims.w; bpC.height = r.bpDims.h; 
        bpC.getContext('2d').drawImage(state.canvas, r.rect.x * cw, r.rect.y * ch, pw, ph, 0, 0, r.bpDims.w, r.bpDims.h);
        const rle = SciTextHelpers.runLengthEncode(bpC.getContext('2d').getImageData(0,0,r.bpDims.w,r.bpDims.h));

        let prompt = '';
        if (type === 'text') {
            prompt = `You are a precision SVG Typesetter.\nINPUTS:\n1. IMAGE: A 2x scale scan.\n2. BLUEPRINT: A 1x scale vector path.\nTASK:\nGenerate SVG <text> elements positioned over the BLUEPRINT.\nViewBox: 0 0 ${r.bpDims.w} ${r.bpDims.h}.\nOutput strictly valid SVG elements.\nBLUEPRINT (Partial):\n${rle.substring(0, 500)}...`; 
        } else {
            prompt = `You are a precision SVG Graphic Designer.\nINPUTS:\n1. IMAGE: 2x scan.\n2. BLUEPRINT: 1x vector path.\nTASK:\nReplicate the figure. Use <image> with href="data:image/png;base64,${base64}" if complex, or vector shapes if simple.\nViewBox: 0 0 ${r.bpDims.w} ${r.bpDims.h}.\nBLUEPRINT (Partial):\n${rle.substring(0, 500)}...`;
        }

        try {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: base64 } }] }] })
            });
            const json = await resp.json();
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error("No SVG generated.");
            
            r.svgContent = text.replace(/```svg/g, '').replace(/```/g, '').trim();
            r.status = 'generated';
            r.scale = { x: 1, y: 1 }; r.offset = { x: 0, y: 0 };
            
            saveState();
            selectRegion(r.id);
            // Auto-fit content to area after generation
            fitContentToArea();
            
        } catch(e) {
            console.error("AI Error:", e);
            els.aiStatus.textContent = "Error generating content.";
            r.svgContent = `<text x="50%" y="50%" font-size="20" fill="red">Error</text>`;
        } finally {
            setTimeout(() => { els.aiStatus.classList.add('hidden'); els.aiStatus.textContent = 'Processing...'; }, 3000);
            renderRegions();
        }
    };

    // --- STANDARD APP FUNCTIONS ---

    function getRegion(id) { return state.regions.find(x => x.id === id); }
    app.getRegion = getRegion;

    function getLocalPos(e) {
        const r = els.interactionLayer.getBoundingClientRect();
        const sx = state.canvas.width / r.width;
        const sy = state.canvas.height / r.height;
        return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
    }

    function loadDefaultImage() {
        els.loader.classList.remove('hidden');
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            state.canvas.width = img.width; state.canvas.height = img.height; state.baseWidth = img.width;
            state.canvas.getContext('2d').drawImage(img, 0, 0);
            state.pdfDoc = { numPages: 1, isImage: true };
            renderPage();
            els.loader.classList.add('hidden'); els.emptyState.classList.add('hidden');
            els.workspace.classList.remove('hidden'); els.workspace.classList.add('flex');
            saveState(true);
            switchTab('overlay');
        };
        img.src = `${CONFIG.defaultPdfUrl}?v=${Date.now()}`;
    }

    function renderLayerList(r) {
        // Updated robust layer list renderer
        els.layerList.innerHTML = '';
        if (!r || !r.svgContent) {
             els.layerList.innerHTML = '<div class="text-center text-gray-400 text-[10px] mt-4">Select a region to view layers</div>';
             return;
        }
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<svg>${r.svgContent}</svg>`, "image/svg+xml");
        const children = Array.from(doc.documentElement.childNodes).filter(n => n.nodeType === 1);

        if (children.length === 0 && r.svgContent.trim()) {
             createLayerItem(r.svgContent, 0);
        } else if (children.length > 0) {
            children.forEach((child, index) => createLayerItem(child.outerHTML, index));
        } else {
            els.layerList.innerHTML = '<div class="text-center text-gray-400 text-[10px] mt-4">No content</div>';
        }
    }

    function createLayerItem(content, index) {
        const div = document.createElement('div');
        div.className = 'bg-white border border-gray-300 rounded p-2 shadow-sm group relative mb-2';
        let tagName = content.match(/^<([a-z0-9]+)/i)?.[1] || 'Element';
        
        div.innerHTML = `<div class="text-[10px] font-bold text-blue-500 uppercase mb-1 flex justify-between">
            ${tagName} <button class="text-red-500" onclick="app.deleteLayer(${index})">&times;</button>
        </div>`;
        const ta = document.createElement('textarea');
        ta.className = 'w-full text-[10px] font-mono border border-gray-100 bg-gray-50 rounded p-1 resize-y outline-none h-16';
        ta.value = content;
        ta.oninput = () => {
            const r = getRegion(state.activeRegionId);
            if(r) {
                const allTas = Array.from(els.layerList.querySelectorAll('textarea'));
                r.svgContent = allTas.map(t => t.value).join('\n');
                renderRegions(); 
            }
        };
        ta.onblur = () => saveState();
        div.appendChild(ta);
        els.layerList.appendChild(div);
    }

    app.deleteLayer = function(index) {
        const r = getRegion(state.activeRegionId); if(!r) return;
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<svg>${r.svgContent}</svg>`, "image/svg+xml");
        const children = Array.from(doc.documentElement.childNodes).filter(n => n.nodeType === 1);
        if (index >= 0 && index < children.length) children[index].remove();
        r.svgContent = doc.documentElement.innerHTML.trim();
        renderRegions(); renderLayerList(r); saveState();
    };

    function renderRegions() {
        const gRegions = els.svgLayer.querySelector('#regions');
        const gHighlights = els.svgLayer.querySelector('#highlights');
        gRegions.innerHTML = ''; gHighlights.innerHTML = '';
        const cw = state.canvas.width; const ch = state.canvas.height;
        
        state.regions.forEach(r => {
            r.scale = r.scale || {x:1, y:1}; r.offset = r.offset || {x:0, y:0};
            if (!r.bpDims) r.bpDims = { w: r.rect.w*cw, h: r.rect.h*ch };
            const px = r.rect.x * cw; const py = r.rect.y * ch;
            const pw = r.rect.w * cw; const ph = r.rect.h * ch; 
            
            if (r.status === 'draft') {
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("x", px); rect.setAttribute("y", py);
                rect.setAttribute("width", pw); rect.setAttribute("height", ph); 
                rect.setAttribute("class", "region-draft");
                gRegions.appendChild(rect);
            } else {
                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svg.setAttribute("x", px); svg.setAttribute("y", py);
                svg.setAttribute("width", pw); svg.setAttribute("height", ph); 
                svg.setAttribute("viewBox", `0 0 ${r.bpDims.w} ${r.bpDims.h}`); 
                svg.setAttribute("preserveAspectRatio", "none");
                svg.setAttribute("id", `svg-region-${r.id}`);
                svg.innerHTML = `<g id="group-${r.id}" transform="translate(${r.offset.x}, ${r.offset.y}) scale(${r.scale.x}, ${r.scale.y})">${r.svgContent}</g>`;
                gRegions.appendChild(svg);
            }
            
            if (r.id === state.activeRegionId && state.selectedIds.size <= 1) {
                renderActiveSelectionControls(r);
            } else if (state.selectedIds.has(r.id)) {
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("x", px); rect.setAttribute("y", py);
                rect.setAttribute("width", pw); rect.setAttribute("height", ph); 
                rect.setAttribute("class", "region-selected");
                gHighlights.appendChild(rect);
            }
        });
        updateUI();
    }

    function renderActiveSelectionControls(region) {
        if (document.querySelector(`.selection-frame[data-id="${region.id}"]`)) return;
        const w = state.canvas.width; const h = state.canvas.height;
        const ds = state.scaleMultiplier; 
        const px = region.rect.x * w * ds; const py = region.rect.y * h * ds;
        const pw = region.rect.w * w * ds; const ph = region.rect.h * h * ds;

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

    function selectRegion(id, multi = false) {
        if (multi) {
            if (state.selectedIds.has(id)) {
                state.selectedIds.delete(id);
                if (state.activeRegionId === id) state.activeRegionId = Array.from(state.selectedIds).pop() || null;
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
            if (r.status === 'draft') showCreationBar(r); else els.selectionBar.classList.add('hidden');
        } else els.selectionBar.classList.add('hidden');
    }
    app.selectRegion = selectRegion;

    function deselect() {
        state.activeRegionId = null;
        state.selectedIds.clear();
        renderRegions();
        els.selectionBar.classList.add('hidden');
        els.selectionBox.style.display = 'none';
        els.layerList.innerHTML = '';
        els.contextActions.classList.add('disabled-bar');
        [els.propX, els.propY, els.propW, els.propH].forEach(el => { el.value = ''; el.disabled = true; });
    }
    app.deselect = deselect;

    // --- UTILS & HELPERS ---
    function updateUI() {
        els.regionCount.textContent = `${state.regions.length}`;
        if(state.activeRegionId) els.contextActions.classList.remove('disabled-bar');
    }

    function showCreationBar(r) {
        const rect = els.interactionLayer.getBoundingClientRect();
        const cw = state.canvas.width; const ch = state.canvas.height;
        const ratio = rect.width / cw; 
        const sx = rect.left + (r.rect.x * cw * ratio);
        const sy = rect.top + (r.rect.y * ch * ratio) + (r.rect.h * ch * ratio) + 10;
        els.selectionBar.style.left = Math.min(window.innerWidth - 250, Math.max(10, sx)) + 'px';
        els.selectionBar.style.top = sy + 'px';
        els.selectionBar.classList.remove('hidden');
    }

    function updateUIProperties(r) {
        const multiple = state.selectedIds.size > 1;
        if (!multiple) {
            updatePropertyInputs();
            if (r.srcCrop) els.debugImg.src = r.srcCrop;
            els.debugLog.textContent = JSON.stringify(r, null, 2);
        }
    }

    function updatePropertyInputs() {
        const r = getRegion(state.activeRegionId); if(!r) return;
        const cw = state.canvas.width; const ch = state.canvas.height;
        if (state.editMode === 'area') {
            els.propX.value = (r.rect.x * cw).toFixed(0); els.propY.value = (r.rect.y * ch).toFixed(0);
            els.propW.value = (r.rect.w * cw).toFixed(0); els.propH.value = (r.rect.h * ch).toFixed(0);
        } else {
            els.propX.value = r.offset.x.toFixed(2); els.propY.value = r.offset.y.toFixed(2);
            els.propW.value = r.bpDims.w.toFixed(2); els.propH.value = r.bpDims.h.toFixed(2);
        }
    }

    function setupEventListeners() {
        els.interactionLayer.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('keydown', handleKeyDown);
        
        els.btnZoomIn.onclick = () => setZoom(state.scaleMultiplier + 0.25);
        els.btnZoomOut.onclick = () => setZoom(state.scaleMultiplier - 0.25);
        els.btnUndo.onclick = undo; els.btnRedo.onclick = redo;
        
        document.getElementById('btn-export').onclick = () => {
            const out = SciTextHelpers.composeSVG(state.regions, state.canvas.width, state.canvas.height);
            const url = URL.createObjectURL(new Blob([out], {type: 'image/svg+xml'}));
            const a = document.createElement('a'); a.href = url; a.download = "scitext.svg"; a.click();
        };
        document.getElementById('btn-clear-all').onclick = () => { state.regions = []; renderRegions(); saveState(); };
        document.getElementById('btn-delete').onclick = () => { 
            state.regions = state.regions.filter(r => !state.selectedIds.has(r.id)); 
            deselect(); renderRegions(); saveState(); 
        };
        document.getElementById('btn-regen').onclick = () => { if(state.activeRegionId) app.generateRegionContent(getRegion(state.activeRegionId).type, state.activeRegionId); };
        
        [els.propX, els.propY, els.propW, els.propH].forEach(input => {
            input.addEventListener('input', () => {
                const r = getRegion(state.activeRegionId); if(!r) return;
                const cw = state.canvas.width; const ch = state.canvas.height;
                if (state.editMode === 'area') {
                    r.rect.x = parseFloat(els.propX.value) / cw; r.rect.y = parseFloat(els.propY.value) / ch;
                    r.rect.w = parseFloat(els.propW.value) / cw; r.rect.h = parseFloat(els.propH.value) / ch;
                } else {
                    r.offset.x = parseFloat(els.propX.value) || 0; r.offset.y = parseFloat(els.propY.value) || 0;
                    r.bpDims.w = parseFloat(els.propW.value) || r.bpDims.w; r.bpDims.h = parseFloat(els.propH.value) || r.bpDims.h;
                }
                renderRegions();
            });
            input.addEventListener('change', () => saveState());
        });
        
        els.modeArea.onclick = () => { state.editMode = 'area'; updatePropertyInputs(); };
        els.modeContent.onclick = () => { state.editMode = 'content'; updatePropertyInputs(); };
        els.btnFitContent.onclick = fitContentToArea;
        els.btnFitArea.onclick = fitAreaToContent;
        
        els.chkSource.onchange = () => els.pdfLayer.style.opacity = els.chkSource.checked ? 1 : 0;
        els.chkSvg.onchange = () => els.svgLayer.style.opacity = els.chkSvg.checked ? 1 : 0;
        els.chkGrid.onchange = () => document.getElementById('grid-layer').classList.toggle('hidden', !els.chkGrid.checked);
        els.upload.onchange = handleFileUpload;
        document.getElementById('fullscreen-toggle').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
        document.getElementById('tab-overlay').onclick = () => switchTab('overlay');
        document.getElementById('tab-debug').onclick = () => switchTab('debug');
    }

    function switchTab(t) {
        els.workspace.classList.toggle('hidden', t !== 'overlay');
        els.debugContainer.classList.toggle('hidden', t !== 'debug');
        els.debugContainer.classList.toggle('flex', t === 'debug');
        document.getElementById('tab-overlay').classList.toggle('active', t === 'overlay');
        document.getElementById('tab-debug').classList.toggle('active', t === 'debug');
    }

    function fitContentToArea() {
        const r = getRegion(state.activeRegionId); if (!r) return;
        // Simplified Logic for Demo: Assuming bbox matches rect for now
        renderLayerList(r); renderRegions(); saveState();
    }
    
    function fitAreaToContent() {
        const r = getRegion(state.activeRegionId); if (!r) return;
        renderRegions(); saveState();
    }

    // --- EVENT HANDLERS (Brief) ---
    function handleMouseDown(e) {
        if(e.button !== 0 || !e.target.dataset.action && !document.elementFromPoint(e.clientX, e.clientY).classList.contains('region-highlight')) {
            state.dragAction = 'create'; state.dragStart = getLocalPos(e); 
            if(!e.shiftKey) deselect();
            els.selectionBox.style.display = 'block';
        }
    }
    function handleMouseMove(e) {
        if(!state.dragAction) return;
        const pos = getLocalPos(e);
        if(state.dragAction === 'create') {
            const start = state.dragStart;
            const x = Math.min(pos.x, start.x); const y = Math.min(pos.y, start.y);
            const w = Math.abs(pos.x - start.x); const h = Math.abs(pos.y - start.y);
            const rect = els.interactionLayer.getBoundingClientRect();
            const ratio = rect.width / state.canvas.width;
            els.selectionBox.style.left = (x*ratio)+'px'; els.selectionBox.style.top = (y*ratio)+'px';
            els.selectionBox.style.width = (w*ratio)+'px'; els.selectionBox.style.height = (h*ratio)+'px';
        }
    }
    function handleMouseUp(e) {
        if(state.dragAction === 'create') {
            const w = Math.abs(getLocalPos(e).x - state.dragStart.x);
            const h = Math.abs(getLocalPos(e).y - state.dragStart.y);
            if(w>5 && h>5) {
                const lx = Math.min(getLocalPos(e).x, state.dragStart.x);
                const ly = Math.min(getLocalPos(e).y, state.dragStart.y);
                const newRegion = {
                    id: `r${Date.now()}`,
                    rect: { x: lx/state.canvas.width, y: ly/state.canvas.height, w: w/state.canvas.width, h: h/state.canvas.height },
                    status: 'draft'
                };
                state.regions.push(newRegion);
                saveState(); selectRegion(newRegion.id);
            }
            els.selectionBox.style.display = 'none';
        }
        state.dragAction = null;
    }
    function handleKeyDown(e) { 
        if(e.key === 'Escape') deselect(); 
        if((e.ctrlKey||e.metaKey)&&e.key==='z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    }

    function setZoom(m) { state.scaleMultiplier = Math.max(0.25, Math.min(5.0, m)); applyZoom(); }
    function applyZoom() {
        const nw = state.baseWidth * state.scaleMultiplier;
        const nh = (state.canvas.height / state.canvas.width) * nw;
        els.wrapper.style.width = `${nw}px`; els.wrapper.style.height = `${nh}px`;
        els.txtZoomLevel.textContent = `${Math.round(state.scaleMultiplier * 100)}%`;
    }
    function renderPage() { 
        els.pdfLayer.innerHTML = ''; els.pdfLayer.appendChild(state.canvas); 
        state.canvas.style.display = 'block'; state.canvas.style.width='100%'; state.canvas.style.height='100%'; 
        applyZoom(); 
        els.svgLayer.innerHTML = `<svg id="main-svg" width="${state.canvas.width}" height="${state.canvas.height}" style="width:100%; height:100%;" viewBox="0 0 ${state.canvas.width} ${state.canvas.height}" xmlns="http://www.w3.org/2000/svg"><g id="regions"></g><g id="highlights"></g></svg>`;
        renderRegions();
    }

    // --- HISTORY ---
    function saveState(isInitial) {
        if(state.historyIndex < state.history.length-1) state.history = state.history.slice(0, state.historyIndex+1);
        state.history.push(JSON.parse(JSON.stringify(state.regions)));
        state.historyIndex++;
        if(state.history.length > 50) { state.history.shift(); state.historyIndex--; }
        updateHistoryUI();
        uiExtensions.forEach(ext => ext.callback?.());
    }
    app.saveState = saveState;
    function undo() { if(state.historyIndex>0) { state.historyIndex--; restoreState(); } }
    function redo() { if(state.historyIndex<state.history.length-1) { state.historyIndex++; restoreState(); } }
    function restoreState() { 
        state.regions = JSON.parse(JSON.stringify(state.history[state.historyIndex])); 
        deselect(); renderRegions(); updateHistoryUI(); 
    }
    function updateHistoryUI() {
        els.btnUndo.disabled = state.historyIndex <= 0;
        els.btnRedo.disabled = state.historyIndex >= state.history.length - 1;
    }

    // --- EXTENSIONS ---
    const uiExtensions = [];
    app.insertElementBefore = (html, sel, cb) => uiExtensions.push({ html, sel, cb });
    app.observeState = (cb) => { uiExtensions.push({ callback: cb }); cb(); };
    
    function applyUIExtensions() {
        uiExtensions.forEach(ext => {
            if(ext.applied || !ext.html) return;
            const t = document.querySelector(ext.sel);
            if(t) { t.insertAdjacentHTML('beforebegin', ext.html); ext.cb(t.previousElementSibling); ext.applied = true; }
        });
    }

    app.bootstrap = async function() {
        await originalBootstrap();
        applyUIExtensions();
    };

})(window); // Pass window to closure
