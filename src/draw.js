/**
 * SciText Digitizer - Drawing & Interaction Module
 * Handles region creation, selection, movement, and resizing.
 * Designed to mimic standard vector drawing application behavior.
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
        
        // Configuration
        this.handleSize = 8; // Size of resize handles in pixels
        this.minSize = 5;    // Minimum region size in pixels
    }

    init() {
        this.attachListeners();
    }

    attachListeners() {
        const layer = this.els.interactionLayer;
        
        // We bind 'this' to preserve context
        layer.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Cursor management
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.cancelInteraction();
        });
    }

    /**
     * Coordinate Conversion Helper
     * Converts client (mouse) coordinates to Canvas-Space Pixels (Intrinsic Image Coordinates)
     */
    getLocalPos(e) {
        const rect = this.els.interactionLayer.getBoundingClientRect();
        const scaleX = this.state.canvas.width / rect.width;
        const scaleY = this.state.canvas.height / rect.height;
        return { 
            x: (e.clientX - rect.left) * scaleX, 
            y: (e.clientY - rect.top) * scaleY 
        };
    }

    /**
     * Hit Test
     * Checks if the mouse is over a handle or the body of the ACTIVE region.
     */
    hitTest(pos) {
        const activeId = this.state.activeRegionId;
        if (!activeId) return { type: 'NONE' };

        const region = this.app.getRegion(activeId);
        if (!region) return { type: 'NONE' };

        const { x, y, w, h } = this.denormalizeRect(region.rect);
        const handleOffset = (this.handleSize / 2) * (this.state.canvas.width / this.els.interactionLayer.getBoundingClientRect().width); 
        // Note: We use a simplified proximity check for handles relative to canvas scale, 
        // but for robustness we calculate handle positions in canvas space.
        
        // Define Handles
        const handles = {
            nw: { x: x, y: y },
            ne: { x: x + w, y: y },
            sw: { x: x, y: y + h },
            se: { x: x + w, y: y + h },
            n:  { x: x + w/2, y: y },
            s:  { x: x + w/2, y: y + h },
            e:  { x: x + w, y: y + h/2 },
            w:  { x: x, y: y + h/2 }
        };

        const threshold = 10 * this.state.scaleMultiplier; // Hit tolerance scales with zoom

        // Check Handles
        for (const [key, p] of Object.entries(handles)) {
            if (Math.abs(pos.x - p.x) < threshold && Math.abs(pos.y - p.y) < threshold) {
                return { type: 'HANDLE', handle: key };
            }
        }

        // Check Body
        if (pos.x >= x && pos.x <= x + w && pos.y >= y && pos.y <= y + h) {
            return { type: 'BODY' };
        }

        return { type: 'NONE' };
    }

    handleMouseDown(e) {
        if (e.button !== 0) return; // Only left click

        const pos = this.getLocalPos(e);
        const hit = this.hitTest(pos);

        this.dragStart = pos;

        if (hit.type === 'HANDLE') {
            // Start Resizing
            this.interactionMode = 'RESIZE';
            this.activeHandle = hit.handle;
            this.initialRect = { ...this.app.getRegion(this.state.activeRegionId).rect };
            e.preventDefault();
            e.stopPropagation();

        } else if (hit.type === 'BODY') {
            // Start Moving
            this.interactionMode = 'MOVE';
            this.initialRect = { ...this.app.getRegion(this.state.activeRegionId).rect };
            e.preventDefault();
            e.stopPropagation();

        } else {
            // Start Creation (or Deselection if clicking empty space)
            // Check if we clicked another existing unselected region (handled by app.js logic usually, but we can intercept here)
            // For now, we assume if we didn't hit the *active* region, we are creating or selecting a new one.
            
            // Note: Currently simple selection logic is embedded in app.js rendering (via region-highlight elements).
            // If the user clicks a region-highlight that isn't active, app.js handles the click.
            // If the user clicks empty space, we create.
            
            if (e.target === this.els.interactionLayer || e.target === this.els.selectionBox) {
                this.interactionMode = 'CREATE';
                this.app.deselect(); // Clear existing selection
                this.els.selectionBox.style.display = 'block';
                this.updateSelectionBoxCSS(pos.x, pos.y, 0, 0);
            }
        }
    }

    handleMouseMove(e) {
        const pos = this.getLocalPos(e);

        // 1. Cursor Updates (Passive)
        if (this.interactionMode === 'IDLE') {
            const hit = this.hitTest(pos);
            this.updateCursor(hit);
            return;
        }

        // 2. Interaction Handling (Active)
        e.preventDefault();

        if (this.interactionMode === 'CREATE') {
            const x = Math.min(pos.x, this.dragStart.x);
            const y = Math.min(pos.y, this.dragStart.y);
            const w = Math.abs(pos.x - this.dragStart.x);
            const h = Math.abs(pos.y - this.dragStart.y);
            
            this.updateSelectionBoxCSS(x, y, w, h);
            
        } else if (this.interactionMode === 'MOVE') {
            const dx = (pos.x - this.dragStart.x) / this.state.canvas.width;
            const dy = (pos.y - this.dragStart.y) / this.state.canvas.height;
            
            const r = this.app.getRegion(this.state.activeRegionId);
            if (r) {
                r.rect.x = this.initialRect.x + dx;
                r.rect.y = this.initialRect.y + dy;
                this.app.renderRegions(); // Re-render to show movement
            }

        } else if (this.interactionMode === 'RESIZE') {
            this.handleResize(pos);
            this.app.renderRegions();
        }
    }

    handleResize(pos) {
        const r = this.app.getRegion(this.state.activeRegionId);
        if (!r) return;

        // Convert normalized initial rect to pixels for calculation
        const init = this.denormalizeRect(this.initialRect);
        
        let newX = init.x;
        let newY = init.y;
        let newW = init.w;
        let newH = init.h;

        // Calculate deltas
        // Note: This logic allows free resizing. Constraint logic (minSize) is applied at the end.
        
        if (this.activeHandle.includes('e')) newW = pos.x - init.x;
        if (this.activeHandle.includes('s')) newH = pos.y - init.y;
        if (this.activeHandle.includes('w')) {
            newW = (init.x + init.w) - pos.x;
            newX = pos.x;
        }
        if (this.activeHandle.includes('n')) {
            newH = (init.y + init.h) - pos.y;
            newY = pos.y;
        }

        // Apply Min Size Constraints & flipping
        if (newW < this.minSize) {
            if (this.activeHandle.includes('w')) newX = init.x + init.w - this.minSize;
            newW = this.minSize;
        }
        if (newH < this.minSize) {
            if (this.activeHandle.includes('n')) newY = init.y + init.h - this.minSize;
            newH = this.minSize;
        }

        // Normalize back to 0-1
        r.rect = this.normalizeRect({ x: newX, y: newY, w: newW, h: newH });
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
                
                // Create the region via App logic
                this.app.addRegionFromDraw({
                    x: lx / this.state.canvas.width,
                    y: ly / this.state.canvas.height,
                    w: w / this.state.canvas.width,
                    h: h / this.state.canvas.height
                });
            } else {
                // Clicked without dragging much -> Deselect
                this.app.deselect();
            }
            this.els.selectionBox.style.display = 'none';
        } else if (this.interactionMode === 'MOVE' || this.interactionMode === 'RESIZE') {
            // Interaction finished, save history
            this.app.saveState();
        }

        this.interactionMode = 'IDLE';
        this.activeHandle = null;
        this.initialRect = null;
        this.els.interactionLayer.style.cursor = 'default';
    }

    cancelInteraction() {
        if (this.interactionMode === 'CREATE') {
            this.els.selectionBox.style.display = 'none';
        } else if (this.interactionMode === 'MOVE' || this.interactionMode === 'RESIZE') {
            // Revert
            const r = this.app.getRegion(this.state.activeRegionId);
            if (r && this.initialRect) {
                r.rect = { ...this.initialRect };
                this.app.renderRegions();
            }
        }
        this.interactionMode = 'IDLE';
    }

    // --- RENDERERS ---

    renderActiveControls(region) {
        if (this.interactionMode === 'CREATE') return; // Don't show handles while creating new box

        // Remove old frame
        const oldFrame = document.getElementById('active-selection-frame');
        if (oldFrame) oldFrame.remove();

        const { x, y, w, h } = this.denormalizeRect(region.rect);
        const rect = this.els.interactionLayer.getBoundingClientRect();
        
        // Scale factor for display (DOM pixels vs Canvas pixels)
        const scale = rect.width / this.state.canvas.width;
        
        const domX = x * scale;
        const domY = y * scale;
        const domW = w * scale;
        const domH = h * scale;

        const frame = document.createElement('div');
        frame.id = 'active-selection-frame';
        frame.className = 'selection-frame';
        frame.style.left = `${domX}px`;
        frame.style.top = `${domY}px`;
        frame.style.width = `${domW}px`;
        frame.style.height = `${domH}px`;
        
        // Create Handles
        const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
        handles.forEach(pos => {
            const hDiv = document.createElement('div');
            hDiv.className = `resize-handle handle-${pos}`;
            hDiv.dataset.handle = pos;
            frame.appendChild(hDiv);
        });

        this.els.interactionLayer.appendChild(frame);
    }

    updateSelectionBoxCSS(x, y, w, h) {
        const rect = this.els.interactionLayer.getBoundingClientRect();
        const ratio = rect.width / this.state.canvas.width;
        
        this.els.selectionBox.style.left = (x * ratio) + "px";
        this.els.selectionBox.style.top = (y * ratio) + "px";
        this.els.selectionBox.style.width = (w * ratio) + "px";
        this.els.selectionBox.style.height = (h * ratio) + "px";
    }

    updateCursor(hit) {
        let cursor = 'default';
        if (hit.type === 'BODY') cursor = 'move';
        if (hit.type === 'HANDLE') {
            const h = hit.handle;
            if (h === 'n' || h === 's') cursor = 'ns-resize';
            else if (h === 'e' || h === 'w') cursor = 'ew-resize';
            else if (h === 'ne' || h === 'sw') cursor = 'nesw-resize';
            else if (h === 'nw' || h === 'se') cursor = 'nwse-resize';
        }
        this.els.interactionLayer.style.cursor = cursor;
    }

    // --- MATH UTILS ---

    normalizeRect(r) {
        return {
            x: r.x / this.state.canvas.width,
            y: r.y / this.state.canvas.height,
            w: r.w / this.state.canvas.width,
            h: r.h / this.state.canvas.height
        };
    }

    denormalizeRect(r) {
        return {
            x: r.x * this.state.canvas.width,
            y: r.y * this.state.canvas.height,
            w: r.w * this.state.canvas.width,
            h: r.h * this.state.canvas.height
        };
    }
}
