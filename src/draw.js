/**
 * SciText Digitizer - Drawing & Interaction Module
 * Handles region creation, selection, movement, and resizing.
 */

export class RegionEditor {
    constructor(appContext) {
        this.app = appContext;
        this.state = appContext.state;
        this.els = appContext.els;

        // Interaction State
        this.interactionMode = 'IDLE'; // IDLE, CREATE, MOVE, RESIZE
        this.activeHandle = null;      // n, s, e, w, ne, nw, se, sw
        this.dragStart = { x: 0, y: 0 };
        this.initialRect = null;       // Snapshot for delta calcs
        
        // Debug
        this.debugEl = null;

        // Configuration
        this.handleSize = 8; 
        this.minSize = 5;
    }

    init() {
        this.createDebugToolbar();
        this.attachListeners();
    }

    createDebugToolbar() {
        const div = document.createElement('div');
        div.style.cssText = `
            position: fixed; bottom: 10px; right: 10px; z-index: 9999;
            background: rgba(0,0,0,0.8); color: lime; font-family: monospace;
            font-size: 10px; padding: 8px; border-radius: 4px; pointer-events: none;
            min-width: 200px;
        `;
        div.id = 'draw-debug-toolbar';
        document.body.appendChild(div);
        this.debugEl = div;
    }

    updateDebugInfo(pos, hit) {
        if (!this.debugEl) return;
        const mode = this.interactionMode;
        const handle = this.activeHandle || '-';
        const hitType = hit ? hit.type : '-';
        const hitHandle = hit && hit.handle ? hit.handle : '-';
        
        this.debugEl.innerHTML = `
            <div><strong>Draw State</strong></div>
            <div>Mode: <span style="color:${mode === 'IDLE' ? 'lime' : 'yellow'}">${mode}</span></div>
            <div>Pos: ${Math.round(pos.x)}, ${Math.round(pos.y)}</div>
            <div>Hit: ${hitType} (${hitHandle})</div>
            <div>Active Handle: ${handle}</div>
            <div>Regions: ${this.state.regions.length}</div>
            <div>Active ID: ${this.state.activeRegionId || 'None'}</div>
        `;
    }

    attachListeners() {
        const layer = this.els.interactionLayer;
        layer.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.cancelInteraction();
        });
    }

    // --- Interaction Handlers ---

    handleMouseDown(e) {
        if (e.button !== 0) return;

        const pos = this.getLocalPos(e);
        let hit = this.hitTest(pos);

        // Smart Selection: If clicking a non-active region, select it immediately
        if (hit.type === 'NONE') {
            const highlight = e.target.closest('.region-highlight');
            if (highlight) {
                const id = highlight.dataset.id;
                if (id) {
                    this.app.selectRegion(id);
                    hit = this.hitTest(pos); 
                }
            }
        }

        this.dragStart = pos;
        this.updateDebugInfo(pos, hit);

        if (hit.type === 'HANDLE') {
            this.interactionMode = 'RESIZE';
            this.activeHandle = hit.handle;
            this.initialRect = { ...this.app.getRegion(this.state.activeRegionId).rect };
            e.preventDefault(); e.stopPropagation();
        } else if (hit.type === 'BODY') {
            this.interactionMode = 'MOVE';
            this.initialRect = { ...this.app.getRegion(this.state.activeRegionId).rect };
            e.preventDefault(); e.stopPropagation();
        } else {
            this.interactionMode = 'CREATE';
            this.app.deselect();
            this.els.selectionBox.style.display = 'block';
            this.updateSelectionBoxCSS(pos.x, pos.y, 0, 0);
        }
    }

    handleMouseMove(e) {
        const pos = this.getLocalPos(e);
        let hit = null;

        if (this.interactionMode === 'IDLE') {
            hit = this.hitTest(pos);
            
            // Cursor Logic check
            if (hit.type === 'NONE') {
                const target = document.elementFromPoint(e.clientX, e.clientY);
                if (target && target.closest('.region-highlight')) {
                    this.els.interactionLayer.style.cursor = 'pointer';
                } else {
                    this.updateCursor(hit);
                }
            } else {
                this.updateCursor(hit);
            }
            this.updateDebugInfo(pos, hit);
            return;
        }

        e.preventDefault();
        this.updateDebugInfo(pos, { type: 'INTERACTING' });

        if (this.interactionMode === 'CREATE') {
            const x = Math.min(pos.x, this.dragStart.x);
            const y = Math.min(pos.y, this.dragStart.y);
            const w = Math.abs(pos.x - this.dragStart.x);
            const h = Math.abs(pos.y - this.dragStart.y);
            this.updateSelectionBoxCSS(x, y, w, h);

        } else if (this.interactionMode === 'MOVE') {
            const r = this.app.getRegion(this.state.activeRegionId);
            if (r && this.initialRect) {
                const dx = (pos.x - this.dragStart.x) / this.state.canvas.width;
                const dy = (pos.y - this.dragStart.y) / this.state.canvas.height;
                r.rect.x = this.initialRect.x + dx;
                r.rect.y = this.initialRect.y + dy;
                this.app.renderRegions();
            }

        } else if (this.interactionMode === 'RESIZE') {
            this.handleResize(pos);
            this.app.renderRegions();
        }
    }

    handleMouseUp(e) {
        if (this.interactionMode === 'IDLE') return;

        if (this.interactionMode === 'CREATE') {
            const pos = this.getLocalPos(e);
            const w = Math.abs(pos.x - this.dragStart.x);
            const h = Math.abs(pos.y - this.dragStart.y);

            if (w > this.minSize && h > this.minSize) {
                const lx = Math.min(pos.x, this.dragStart.x);
                const ly = Math.min(pos.y, this.dragStart.y);
                this.app.addRegionFromDraw({
                    x: lx / this.state.canvas.width,
                    y: ly / this.state.canvas.height,
                    w: w / this.state.canvas.width,
                    h: h / this.state.canvas.height
                });
            } else {
                this.app.deselect();
            }
            this.els.selectionBox.style.display = 'none';
        } else {
            this.app.saveState();
        }

        this.interactionMode = 'IDLE';
        this.activeHandle = null;
        this.initialRect = null;
        this.els.interactionLayer.style.cursor = 'default';
        this.updateDebugInfo({x:0, y:0}, null);
    }

    handleResize(pos) {
        const r = this.app.getRegion(this.state.activeRegionId);
        if (!r) return;

        const cw = this.state.canvas.width;
        const ch = this.state.canvas.height;
        
        const ix = this.initialRect.x * cw;
        const iy = this.initialRect.y * ch;
        const iw = this.initialRect.w * cw;
        const ih = this.initialRect.h * ch;

        let nx = ix, ny = iy, nw = iw, nh = ih;

        if (this.activeHandle.includes('e')) nw = pos.x - ix;
        if (this.activeHandle.includes('s')) nh = pos.y - iy;
        if (this.activeHandle.includes('w')) { nw = (ix + iw) - pos.x; nx = pos.x; }
        if (this.activeHandle.includes('n')) { nh = (iy + ih) - pos.y; ny = pos.y; }

        if (nw < this.minSize) {
            if (this.activeHandle.includes('w')) nx = ix + iw - this.minSize;
            nw = this.minSize;
        }
        if (nh < this.minSize) {
            if (this.activeHandle.includes('n')) ny = iy + ih - this.minSize;
            nh = this.minSize;
        }

        r.rect = { x: nx / cw, y: ny / ch, w: nw / cw, h: nh / ch };
    }

    cancelInteraction() {
        if (this.interactionMode === 'CREATE') {
            this.els.selectionBox.style.display = 'none';
        } else if (this.interactionMode === 'MOVE' || this.interactionMode === 'RESIZE') {
            const r = this.app.getRegion(this.state.activeRegionId);
            if (r && this.initialRect) {
                r.rect = { ...this.initialRect };
                this.app.renderRegions();
            }
        }
        this.interactionMode = 'IDLE';
    }

    // --- Helpers ---

    getLocalPos(e) {
        const rect = this.els.interactionLayer.getBoundingClientRect();
        const scaleX = this.state.canvas.width / rect.width;
        const scaleY = this.state.canvas.height / rect.height;
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    }

    hitTest(pos) {
        const r = this.app.getRegion(this.state.activeRegionId);
        if (!r) return { type: 'NONE' };

        const { x, y, w, h } = this.app.denormalizeRect(r.rect);
        const threshold = 10 * this.state.scaleMultiplier;

        const handles = {
            nw: { x, y }, ne: { x: x + w, y }, sw: { x, y: y + h }, se: { x: x + w, y: y + h },
            n: { x: x + w/2, y }, s: { x: x + w/2, y: y + h }, e: { x: x + w, y: y + h/2 }, w: { x, y: y + h/2 }
        };

        for (const [k, p] of Object.entries(handles)) {
            if (Math.abs(pos.x - p.x) < threshold && Math.abs(pos.y - p.y) < threshold) return { type: 'HANDLE', handle: k };
        }

        if (pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h) return { type: 'BODY' };
        return { type: 'NONE' };
    }

    renderActiveControls(region) {
        if (this.interactionMode === 'CREATE') return;
        const old = document.getElementById('active-selection-frame');
        if (old) old.remove();

        const { x, y, w, h } = this.app.denormalizeRect(region.rect);
        const rect = this.els.interactionLayer.getBoundingClientRect();
        const scale = rect.width / this.state.canvas.width;

        const frame = document.createElement('div');
        frame.id = 'active-selection-frame';
        frame.className = 'selection-frame';
        Object.assign(frame.style, {
            left: `${x * scale}px`, top: `${y * scale}px`,
            width: `${w * scale}px`, height: `${h * scale}px`
        });

        ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach(pos => {
            const h = document.createElement('div');
            h.className = `resize-handle handle-${pos}`;
            frame.appendChild(h);
        });
        this.els.interactionLayer.appendChild(frame);
    }

    updateSelectionBoxCSS(x, y, w, h) {
        const rect = this.els.interactionLayer.getBoundingClientRect();
        const s = rect.width / this.state.canvas.width;
        Object.assign(this.els.selectionBox.style, {
            left: `${x * s}px`, top: `${y * s}px`, width: `${w * s}px`, height: `${h * s}px`
        });
    }

    updateCursor(hit) {
        let c = 'default';
        if (hit.type === 'BODY') c = 'move';
        if (hit.type === 'HANDLE') {
            const h = hit.handle;
            if (h === 'n' || h === 's') c = 'ns-resize';
            else if (h === 'e' || h === 'w') c = 'ew-resize';
            else if (['ne', 'sw'].includes(h)) c = 'nesw-resize';
            else c = 'nwse-resize';
        }
        this.els.interactionLayer.style.cursor = c;
    }
}
