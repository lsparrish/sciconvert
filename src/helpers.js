// scitext-helpers.js
// Robust utility functions and the Core Application API for SciText Digitizer.
// Should only include functions unlikely to change.
// lives at https://lsparrish.github.io/sciconvert/src/scitext-helpers.js

const SciTextHelpers = (function () {
    
    // --- 1. CORE MATH & NORMALIZATION UTILITIES ---

    function normalizeRect(x, y, w, h, canvasWidth, canvasHeight) {
        return {
            x: x / canvasWidth,
            y: y / canvasHeight,
            w: w / canvasWidth,
            h: h / canvasHeight
        };
    }

    function denormalizeRect(rect, canvasWidth, canvasHeight) {
        return {
            x: rect.x * canvasWidth,
            y: rect.y * canvasHeight,
            w: rect.w * canvasWidth,
            h: rect.h * canvasHeight
        };
    }

    // --- 2. SVG RENDERING & COMPOSITION ---

    function runLengthEncode(imageData) {
        let path = "";
        const { width, height, data } = imageData;
        for (let y = 0; y < height; y += 2) {
            let startX = -1;
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
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
    }

    function compressSVG(svgString) { 
        if (!svgString) return '';
        return svgString.replace(/\s+/g, ' ').replace(/>\s*</g, '><').trim(); 
    }

    function composeSVG(regions, canvasWidth, canvasHeight) {
        let out = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`;
        out += `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}">\n`;
        out += `  <rect width="100%" height="100%" fill="white"/>\n`;

        regions.forEach(r => {
            if (!r.svgContent) return;
            const x = (r.rect.x * canvasWidth).toFixed(3);
            const y = (r.rect.y * canvasHeight).toFixed(3);
            const w = (r.rect.w * canvasWidth).toFixed(3);
            const h = (r.rect.h * canvasHeight).toFixed(3);
            out += `  <svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${r.bpDims.w} ${r.bpDims.h}" preserveAspectRatio="none" overflow="visible">\n`;
            out += `    <rect width="100%" height="100%" fill="white" opacity="0"/>\n`;
            out += `    <g transform="translate(${r.offset.x},${r.offset.y})">\n`;
            out += `      ${r.svgContent}\n`;
            out += `    </g>\n`;
            out += `  </svg>\n`;
        });

        out += `</svg>`;
        return out;
    }
    
    // --- 3. UI RENDERING LOGIC (Stable API for main.html) ---
    // These functions manipulate the DOM based on state but should remain stable.

    function renderRegionList(state, els, activeRegionId) { // Renamed: activeRegionId -> activeRegionId
         if (!els.regionListContainer) return; // Note: Assuming the container ID is still 'patchListContainer' in template
         const container = els.regionListContainer;
         container.innerHTML = '';
         
         if (state.regiones.length === 0) { // Renamed: state.regiones -> state.patches (as state lives in main.html)
             container.innerHTML = `<div class="p-4 text-xs text-gray-400">Draw a selection to create the first region.</div>`;
             return;
         }
         
         state.regiones.forEach((region, index) => { // Renamed: state.regiones -> state.patches, p -> region
             const item = document.createElement('div');
             item.className = 'region-list-item'; // Note: Assuming CSS class name remains 'patch-list-item'
             item.dataset.id = region.id;
             
             let statusIndicator = region.status === 'draft' ? 
                 `<span class="text-blue-500 font-medium">Draft</span>` : 
                 region.svgContent && region.svgContent.length > 10 ? 
                 `<span class="text-green-600">Generated</span>` : 
                 `<span class="text-gray-500">Empty</span>`;
                 
             if (region.id === activeRegionId) {
                 item.classList.add('active');
             }
             
             item.innerHTML = `
                <div class="flex flex-col">
                    <span class="text-sm font-medium">Region #${index + 1}</span>
                    <span class="text-[10px] text-gray-400">(${region.rect.w.toFixed(3)} x ${region.rect.h.toFixed(3)})</span>
                </div>
                <div>${statusIndicator}</div>
             `;
             container.appendChild(item);
         });
    }

    function renderRegiones(state, els, activeRegionId, dragAction) { // Renamed: renderRegiones -> renderRegiones, activePatchId -> activeRegionId
        const rootSvg = document.getElementById('main-svg');
        if (!rootSvg) return;

        const gRegiones = rootSvg.querySelector('#regiones'); // Note: Assuming g element ID remains '#patches'
        const gHighlights = rootSvg.querySelector('#highlights');
        
        if (!gRegiones || !gHighlights) {
            console.error("SVG structure is incomplete.");
            return;
        }

        gRegiones.innerHTML = ''; 
        gHighlights.innerHTML = '';
        
        if (!dragAction || dragAction === 'create') els.interactionLayer.innerHTML = '';
        
        const cw = state.canvas.width; 
        const ch = state.canvas.height;
        
        state.regiones.forEach(region => { // Renamed: state.regiones -> state.patches, p -> region
            region.scale = region.scale || {x:1, y:1}; region.offset = region.offset || {x:0, y:0};
            if (!region.bpDims) region.bpDims = { w: region.rect.w*cw, h: region.rect.h*ch };

            const px = region.rect.x * cw; const py = region.rect.y * ch;
            const pw = region.rect.w * cw; const ph = region.rect.h * ch;
            
            if (region.status === 'draft') {
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("x", px); rect.setAttribute("y", py);
                rect.setAttribute("width", pw); rect.setAttribute("height", ph);
                rect.setAttribute("class", "region-draft"); // Note: Assuming CSS class name remains 'patch-draft'
                gRegiones.appendChild(rect);
            } else if (region.svgContent) {
                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svg.setAttribute("x", px); svg.setAttribute("y", py);
                svg.setAttribute("width", pw); svg.setAttribute("height", ph);
                svg.setAttribute("viewBox", `0 0 ${region.bpDims.w} ${region.bpDims.h}`); 
                svg.setAttribute("preserveAspectRatio", "none");
                svg.setAttribute("id", `svg-region-${region.id}`);
                svg.innerHTML = `<g id="group-${region.id}" transform="translate(${region.offset.x}, ${region.offset.y}) scale(${region.scale.x}, ${region.scale.y})">${region.svgContent}</g>`;
                gRegiones.appendChild(svg);
            }
            
            if (region.id === activeRegionId && !dragAction) renderActiveSelectionControls(region, state, els);
            else {
                const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                rect.setAttribute("x", px); rect.setAttribute("y", py);
                rect.setAttribute("width", pw); rect.setAttribute("height", ph);
                rect.setAttribute("class", "region-highlight"); // Note: Assuming CSS class name remains 'patch-highlight'
                rect.setAttribute("data-id", region.id);
                gHighlights.appendChild(rect);
            }
        });
    }

    function renderActiveSelectionControls(region, state, els) {
        if (!els.interactionLayer) return;

        // Clear existing frames
        els.interactionLayer.querySelectorAll('.selection-frame').forEach(el => el.remove());

        const w = state.canvas.width; const h = state.canvas.height;
        const ds = state.scaleMultiplier;

        const px = region.rect.x * w * ds; 
        const py = region.rect.y * h * ds;
        const pw = region.rect.w * w * ds; 
        const ph = region.rect.h * h * ds;

        const frame = document.createElement('div');
        frame.className = 'selection-frame'; 
        frame.id = `frame-${region.id}`;
        frame.style.left = `${px}px`; 
        frame.style.top = `${py}px`;
        frame.style.width = `${pw}px`; 
        frame.style.height = `${ph}px`;
        frame.dataset.id = region.id; 
        frame.dataset.action = 'move';

        ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach(pos => {
            const handle = document.createElement('div');
            handle.className = `resize-handle handle-${pos}`;
            handle.dataset.action = pos;
            frame.appendChild(handle);
        });
        els.interactionLayer.appendChild(frame);
    }
    
    function updateRegionVisuals(region, cw, ch, ds) { // Renamed: updateRegionVisuals -> updateRegionVisuals, p -> region
        const frame = document.getElementById(`frame-${region.id}`);
        const nested = document.getElementById(`svg-region-${region.id}`); // Renamed: svg-region- -> svg-region-
        
        if(frame) {
            frame.style.left = (region.rect.x * cw * ds) + 'px'; 
            frame.style.top = (region.rect.y * ch * ds) + 'px';
            frame.style.width = (region.rect.w * cw * ds) + 'px'; 
            frame.style.height = (region.rect.h * ch * ds) + 'px';
        }
        
        if(nested) {
            const pw = region.rect.w * cw;
            const ph = region.rect.h * ch;

            nested.setAttribute('x', region.rect.x * cw); 
            nested.setAttribute('y', region.rect.y * ch);
            nested.setAttribute('width', pw); 
            nested.setAttribute('height', ph);
            nested.setAttribute('viewBox', `0 0 ${region.bpDims.w} ${region.bpDims.h}`); 
            
            const grp = document.getElementById(`group-${region.id}`);
            if (grp) {
                grp.setAttribute('transform', `translate(${region.offset.x}, ${region.offset.y}) scale(${region.scale.x}, ${region.scale.y})`);
                grp.innerHTML = region.svgContent;
            }
        }
    }


    return {
        // Core Utilities
        runLengthEncode,
        compressSVG,
        composeSVG,
        
        // UI Rendering API
        renderRegionList, // Renamed
        renderRegiones,   // Renamed
        updateRegionVisuals, // Renamed
    };
})();
