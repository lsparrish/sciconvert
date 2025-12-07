/*// At the top or appropriate place in app.js
 * SciText Digitizer - Application Bundle (src/app.js)
 * This file consolidates:
 * 1. SciTextHelpers: Core math and SVG utilities.
 * 2. App Logic: State management, AI integration, and Canvas interaction.
 * 3. Default UI Extensions: The "Draft Actions" toolbar logic.
 * 4. Embedded Template: HTML structure and CSS styles separated for clarity.
 */

// lives at https://lsparrish.github.io/sciconvert/src/main.js
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
  .flex-container { display: flex; align-items: center; }
  .flex-col { flex-direction: column; }
  .flex-1 { flex: 1 1 0%; }
  .shrink-0 { flex-shrink: 0; }

  /* --- Animations --- */
  .loader-spinner {
    width: 3rem; height: 3rem; 
    border: 4px solid #4b5563; 
    border-top-color: #3b82f6; 
    border-radius: 9999px; 
    animation: spin 1s linear infinite; 
    margin-bottom: 1rem;
  }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  #ai-status { animation: pulse 1s infinite alternate; }
  @keyframes pulse { from { opacity: 0.5; } to { opacity: 1; } }

  /* --- Z-Indices --- */
  .z-0 { z-index: 0; }
  .z-10 { z-index: 10; }
  .z-20 { z-index: 20; }
  .z-30 { z-index: 30; }
  .z-50 { z-index: 50; }
  .z-100 { z-index: 100; }

  /* --- Header Styles --- */
  .app-header {
    background-color: #1f2937;
    padding: 0.75rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    border-bottom: 1px solid #111827;
    flex-shrink: 0;
    z-index: 30;
  }
  .header-group { display: flex; align-items: center; gap: 1rem; }
  .header-title { font-size: 1.25rem; font-weight: 700; letter-spacing: 0.05em; color: #f3f4f6; margin-right: 1rem; }
  .header-title span { color: #60a5fa; }
  .header-divider { width: 1px; height: 1.5rem; background-color: #4b5563; margin-left: 0.5rem; margin-right: 0.5rem; }

  /* --- Header Component Styles --- */
  .zoom-controls {
    display: flex;
    align-items: center;
    background-color: #374151;
    border-radius: 0.375rem;
    padding: 0.125rem;
    box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
    border: 1px solid #4b5563;
  }
  .zoom-button { color: #d1d5db; padding: 0.25rem 0.5rem; border-radius: 0.125rem; font-weight: 700; }
  .zoom-button:hover { opacity: 0.8; }
  .zoom-level-text { font-size: 0.75rem; font-family: monospace; width: 3.5rem; text-align: center; color: #e5e7eb; user-select: none; }
  
  /* --- Button Styles --- */
  .btn {
    padding: 0.375rem 0.75rem;
    border-radius: 0.25rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.15s ease-in-out;
  }
  .btn-primary { 
      background-color: #2563eb; 
      color: white; 
      border-color: rgba(96, 165, 250, 0.2); 
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      font-size: 0.875rem;
  }
  .btn-primary:hover { background-color: #3b82f6; }
  
  .btn-secondary { 
      background-color: #374151;
      color: #e5e7eb;
      border-color: #4b5563;
      font-size: 0.75rem;
  }
  .btn-secondary:hover { background-color: #4b5563; }
  
  .action-bar-btn {
    padding: 0.25rem 0.75rem;
    border-radius: 0.25rem;
    font-weight: 700;
    font-size: 0.75rem;
    color: white;
    transition: background-color 0.15s;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    border: 1px solid transparent;
  }
  .action-bar-btn:hover { opacity: 0.9; }

  /* --- Main Layout --- */
  .main-content-wrapper {
    flex: 1 1 0%; 
    flex-direction: column; 
    overflow: hidden; 
    position: relative; 
    background-color: white;
    display: flex;
  }
  .workspace-container {
    flex: 1 1 0%;
    display: flex;
    overflow: hidden;
    position: relative;
  }

  /* --- Empty State/Loader --- */
  .empty-state-container, .loader-overlay {
    position: absolute; 
    top: 0; left: 0; right: 0; bottom: 0;
    display: flex; 
    flex-direction: column; 
    align-items: center; 
    justify-content: center; 
    z-index: 50; 
  }
  .empty-state-container { background-color: #f3f4f6; color: #6b7280; }
  .empty-card { 
    background-color: white; 
    padding: 1.5rem; 
    border-radius: 1rem; 
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05); 
    text-align: center; 
    border: 1px solid #e5e7eb;
  }
  .empty-card h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: #374151; }
  .empty-card p { font-size: 0.875rem; color: #6b7280; margin-bottom: 1.5rem; }
  
  .loader-overlay { background-color: rgba(17, 24, 39, 0.7); backdrop-filter: blur(4px); }
  .loader-text { color: white; font-weight: 700; letter-spacing: 0.025em; font-size: 1.125rem; }

  /* --- Sidebar --- */
  .sidebar-panel {
    width: 20rem;
    min-width: 320px;
    height: 100%;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #e5e7eb;
    background-color: white;
    z-index: 10;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    flex-shrink: 0;
  }
  .prop-header {
      background-color: #f3f4f6;
      padding: 0.75rem 1rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: #4b5563;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      flex-shrink: 0;
  }
  .prop-header-top { display: flex; justify-content: space-between; align-items: center; }
  .prop-header-top span { letter-spacing: 0.025em; }
  .region-count-badge { background-color: #dbeafe; color: #1d4ed8; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 10px; font-weight: 700; }
  .mode-toggle-group { display: flex; background-color: #e5e7eb; border-radius: 0.25rem; padding: 0.125rem; border: 1px solid #d1d5db; }
  .mode-button { padding: 0.125rem 0.5rem; border-radius: 0.25rem; font-size: 10px; font-weight: 700; transition: background-color 0.15s; }
  .mode-button-active { background-color: white; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); color: #2563eb; }
  .mode-button-inactive { color: #6b7280; }
  .prop-header-bottom { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e5e7eb; padding-top: 0.5rem; margin-top: 0.25rem; }
  .prop-header-bottom span { font-size: 10px; color: #9ca3af; font-weight: 400; }
  .prop-header-tools { display: flex; gap: 0.5rem; }

  /* --- Geometry Inputs --- */
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
  .input-field {
    width: 100%;
    background-color: white;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
    padding: 0.375rem;
    font-family: monospace;
    color: #374151;
    outline: none;
    text-align: center;
  }
  .input-field:focus { border-color: #3b82f6; box-shadow: 0 0 0 1px #3b82f6; }
  .mode-status { 
    position: absolute; 
    top: 0.25rem; 
    right: 0.5rem; 
    font-size: 9px; 
    font-weight: 700; 
    letter-spacing: 0.05em; 
    pointer-events: none;
    color: #60a5fa; 
  }

  /* --- Layer List --- */
  .layer-list-header {
      padding: 0.5rem 1rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: #6b7280;
      border-bottom: 1px solid #e5e7eb;
      background-color: #f3f4f6;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);
      flex-shrink: 0;
  }
  .layer-list-header button { 
      font-size: 10px; 
      font-weight: 700; 
      color: #2563eb; 
      padding: 0.125rem 0.5rem; 
      background-color: #eff6ff; 
      border-radius: 0.25rem; 
      border: 1px solid #bfdbfe; 
      transition: opacity 0.15s; 
  }
  .layer-list-container {
    flex: 1 1 0%; 
    overflow-y: auto; 
    padding: 0.5rem; 
    background-color: #f3f4f6; 
    border-top: 1px solid #e5e7eb;
  }
  .layer-list-empty { text-align: center; color: #9ca3af; font-size: 10px; margin-top: 1rem; }

  /* --- Sidebar Footer --- */
  .sidebar-footer { 
    padding: 0.75rem; 
    border-top: 1px solid #e5e7eb; 
    background-color: #f9fafb; 
    display: flex; 
    flex-wrap: wrap; 
    gap: 0.5rem; 
    justify-content: space-between; 
    align-items: center; 
    flex-shrink: 0; 
  }
  .sidebar-footer-group { display: flex; gap: 0.5rem; }

  /* --- Canvas Viewport --- */
  .canvas-view-style {
    flex: 1 1 0%; 
    height: 100%; 
    display: flex; 
    flex-direction: column; 
    background-color: #e5e7eb; 
    overflow: hidden; 
    position: relative;
  }
  .view-toggles-style {
      background-color: white; 
      padding: 0.5rem 1rem; 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      gap: 1.5rem; 
      font-size: 0.75rem; 
      font-weight: 700; 
      color: #374151; 
      border-bottom: 1px solid #d1d5db; 
      flex-shrink: 0;
      z-index: 20;
  }
  .view-toggle-item { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
  .view-toggle-divider { width: 1px; height: 1rem; background-color: #d1d5db; }

  /* --- Canvas Scroller --- */
  .canvas-scroller-style {
    flex: 1 1 0%;
    overflow: auto; 
    display: flex; 
    justify-content: center; 
    padding: 3rem; 
    position: relative; 
    cursor: default; 
    background-color: #e5e7eb;
  }
  .canvas-wrapper-style {
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    transition: width 0.15s ease-out;
    background-color: white;
    position: relative;
    transform-origin: top;
    border: 1px solid rgba(17, 24, 39, 0.05);
  }
  .grid-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 0;
      background-size: 50px 50px;
      background-image:
        linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
      pointer-events: none;
      opacity: 0.5;
  }
  
  /* --- SVG Interaction --- */
  .region-highlight { stroke: #f97316; stroke-width: 2; fill: rgba(249, 115, 22, 0.05); opacity: 0; transition: opacity 0.15s; pointer-events: all; }
  .region-highlight:hover { opacity: 1.0; cursor: pointer; }
  .region-selected { stroke: #3b82f6; stroke-width: 2; fill: rgba(59, 130, 246, 0.2); pointer-events: all; cursor: move; }
  .region-draft { fill: rgba(59, 130, 246, 0.1); stroke: #3b82f6; stroke-width: 2; stroke-dasharray: 8, 4; animation: dash 30s linear infinite; pointer-events: none; }
  @keyframes dash { to { stroke-dashoffset: -1000; } }
  #selection-box { border: 2px dashed #3b82f6; background-color: rgba(59, 130, 246, 0.1); position: absolute; pointer-events: none; display: none; z-index: 50; }
  .selection-frame {
      position: absolute; border: 1px solid #3b82f6;
      box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3);
      background-color: rgba(59, 130, 246, 0.05);
      cursor: move; z-index: 40; box-sizing: border-box;
  }
  .resize-handle {
      position: absolute; width: 10px; height: 10px;
      background-color: white; border: 2px solid #3b82f6;
      z-index: 50; border-radius: 2px; transition: transform 0.1s;
  }

  /* --- Tab Bar --- */
  .tab-button {
      padding: 0.5rem 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #6b7280;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition: all 0.15s;
  }
  .tab-button:hover { color: #374151; }
  .tab-button-active { color: #2563eb; border-bottom-color: #2563eb; }
    `;

  const APP_STRUCTURE = `
<div id="template-structure">
    <!-- HEADER -->
    <header class="app-header z-30 shrink-0">
      <div class="header-group">
        <h1 class="header-title">SciText <span>Digitizer</span></h1>
        <div class="relative">
          <input type="file" id="pdf-upload" accept="application/pdf, image/*" class="hidden" />
          <label for="pdf-upload" class="btn btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:1rem; height:1rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
            Load
          </label>
        </div>
        <div class="header-divider"></div>
        <div id="pdf-zoom-controls" class="zoom-controls">
          <button id="zoom-out" class="zoom-button">-</button>
          <span id="zoom-level" class="zoom-level-text">100%</span>
          <button id="zoom-in" class="zoom-button">+</button>
        </div>
        <div class="header-group" style="gap:0.25rem; margin-left:0.5rem;">
            <button id="btn-undo" class="zoom-button" title="Undo" style="color:#9ca3af; padding:0.25rem;"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:1.25rem; height:1.25rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg></button>
            <button id="btn-redo" class="zoom-button" title="Redo" style="color:#9ca3af; padding:0.25rem;"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:1.25rem; height:1.25rem;"><path stroke-linecap="round" stroke-linejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" /></svg></button>
        </div>
      </div>
      <div class="header-group">
          <span id="ai-status" class="hidden" style="color:#60a5fa; font-size:0.75rem; font-family:monospace;">Processing...</span>
          <button id="fullscreen-toggle" class="btn btn-secondary" style="font-weight:600; border:1px solid #4b5563;">Full Screen</button>
      </div>
    </header>

    <main class="main-content-wrapper">
      <!-- Tab Bar -->
      <div class="header-group" style="background-color:#f9fafb; border-bottom:1px solid #e5e7eb; box-shadow:inset 0 2px 4px 0 rgba(0,0,0,0.06); flex-shrink:0; z-index:20; padding-left:0; padding-right:0;">
        <button id="tab-overlay" class="tab-button tab-button-active">Compositor</button>
        <button id="tab-debug" class="tab-button">Debug View</button>
      </div>
      
      <!-- Empty State & Loader -->
      <div id="empty-state" class="empty-state-container">
        <div class="empty-card">
            <h2>No Document Loaded</h2>
            <p>Upload a PDF or Image to begin.</p>
        </div>
      </div>
      <div id="pdf-loader" class="loader-overlay hidden">
          <div class="loader-spinner"></div>
          <span class="loader-text">Loading...</span>
      </div>

      <!-- Main Workspace -->
      <div id="workspace-container" class="workspace-container hidden">
          <!-- Sidebar -->
          <div class="sidebar-panel">
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
              <div class="layer-list-header">
                  <span class="uppercase">Region Layers</span>
                  <button id="btn-add-layer"> + Add</button>
              </div>
              <div id="layer-list" class="layer-list-container">
                  <div class="layer-list-empty">Select a region to view layers</div>
              </div>
              <div class="sidebar-footer">
                  <div class="sidebar-footer-group">
                    <button id="btn-export" class="btn btn-secondary" style="color:#047857; border-color:#6ee7b7; font-weight:700;">Compose SVG</button>
                    <button id="btn-clear-all" style="color:#ef4444; font-weight:500; padding:0.375rem 0.75rem;">Reset</button>
                  </div>
                  <div id="context-actions" class="header-group disabled-bar">
                       <button id="btn-digitize" class="action-bar-btn" style="background-color:#9333ea;">AI Text</button>
                       <button id="btn-split" class="action-bar-btn" style="background-color:#eef2ff; color:#4338ca; border:1px solid #c7d2fe;">Split</button>
                       <button id="btn-group" class="action-bar-btn" style="background-color:#0d9488;">Group</button>
                       <button id="btn-optimize" class="action-bar-btn" style="background-color:#eef2ff; color:#4338ca; border:1px solid #c7d2fe;">Opt</button>
                       <button id="btn-regen" class="action-bar-btn" style="background-color:#2563eb;">Regen</button>
                       <button id="btn-delete" class="btn btn-secondary" style="color:#374151; border:1px solid #d1d5db; font-weight:600;">Del</button>
                  </div>
              </div>
          </div>
          <!-- Canvas Viewport -->
          <div id="canvas-view-area" class="canvas-view-style">
              <div class="view-toggles-style">
                   <label class="view-toggle-item"><input type="checkbox" id="chk-source" checked style="color:#2563eb;"/><span>Source</span></label>
                   <div class="view-toggle-divider"></div>
                   <label class="view-toggle-item"><input type="checkbox" id="chk-svg" checked style="color:#2563eb;"/><span>SVG Overlay</span></label>
                   <div class="view-toggle-divider"></div>
                   <label class="view-toggle-item"><input type="checkbox" id="chk-grid" style="color:#2563eb;"/><span>Grid</span></label>
              </div>
              <div id="canvas-scroller" class="canvas-scroller-style">
                  <div id="canvas-wrapper" class="canvas-wrapper-style">
                      <div id="pdf-layer" class="transition"></div> 
                      <div id="grid-layer" class="grid-overlay hidden"></div>
                      <div id="svg-layer" class="absolute inset-0 z-10 transition" style="pointer-events:none;"></div> 
                      <div id="interaction-layer" class="absolute inset-0 z-20"></div>
                      <div id="selection-box"></div>
                  </div>
              </div>
          </div>
      </div>
      <!-- Debug View -->
      <div id="debug-container" class="workspace-container hidden" style="background-color:#111827; flex-direction:column; padding:1.5rem; overflow-y:auto;">
           <div class="header-group" style="justify-content:center; gap:1rem; margin-bottom:1.5rem; height:20rem; flex-shrink:0;">
               <div style="border:1px solid #374151; background-color:black; padding:0.75rem; border-radius:0.5rem; display:flex; flex-direction:column; align-items:center; width:33.333%;">
                   <span style="font-size:0.75rem; font-weight:700; color:#f59e0b; margin-bottom:0.5rem;" class="uppercase">Source Crop</span>
                   <img id="debug-img-source" style="height:100%; object-fit:contain; background-color:#1a1a1a;"/>
               </div>
               <div style="border:1px solid #374151; background-color:black; padding:0.75rem; border-radius:0.5rem; display:flex; flex-direction:column; align-items:center; width:33.333%;">
                   <span style="font-size:0.75rem; font-weight:700; color:#c084fc; margin-bottom:0.5rem;" class="uppercase">Blueprint (RLE)</span>
                   <div id="debug-blueprint" style="height:100%; width:100%; display:flex; align-items:center; justify-content:center; background-color:white; color:black;"></div>
               </div>
               <div style="border:1px solid #374151; background-color:black; padding:0.75rem; border-radius:0.5rem; display:flex; flex-direction:column; align-items:center; width:33.333%;">
                   <span style="font-size:0.75rem; font-weight:700; color:#60a5fa; margin-bottom:0.5rem;" class="uppercase">SVG Result</span>
                   <div id="debug-svg-preview" style="height:100%; width:100%; display:flex; align-items:center; justify-content:center; background-color:white; color:black;"></div>
               </div>
           </div>
           <div style="flex:1 1 0%; display:flex; flex-direction:column; border:1px solid #374151; background-color:#1f2937; border-radius:0.5rem; padding:0.75rem;">
               <span style="font-size:0.75rem; font-weight:700; color:#9ca3af; display:block; margin-bottom:0.25rem;" class="uppercase">Region Data (JSON)</span>
               <pre id="debug-log" style="font-size:0.75rem; font-family:monospace; color:#4ade80; overflow:auto; height:100%; padding:0.5rem;"></pre>
           </div>
      </div>
    </main>
    <div id="new-selection-action-bar" class="hidden" style="position:fixed; z-index:100;"></div>
    <canvas id="processing-canvas" style="display:none;"></canvas>
</div>
    `;

  // =========================================================================
  // 1. SCITEXT HELPERS (Utilities)
  // =========================================================================
  const SciTextHelpers = {
    normalizeRect: function (x, y, w, h, canvasWidth, canvasHeight) {
      return {
        x: x / canvasWidth,
        y: y / canvasHeight,
        w: w / canvasWidth,
        h: h / canvasHeight,
      };
    },
    denormalizeRect: function (rect, canvasWidth, canvasHeight) {
      return {
        x: rect.x * canvasWidth,
        y: rect.y * canvasHeight,
        w: rect.w * canvasWidth,
        h: rect.h * canvasHeight,
      };
    },
    runLengthEncode: function (imageData) {
      let path = "";
      const { width, height, data } = imageData;
      for (let y = 0; y < height; y += 2) {
        let startX = -1;
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const isDark =
            data[idx + 3] > 128 &&
            data[idx] < 128 &&
            data[idx + 1] < 128 &&
            data[idx + 2] < 128;
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
    compressSVG: function (svgString) {
      if (!svgString) return "";
      return svgString.replace(/\s+/g, " ").replace(/>\s*</g, "><").trim();
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
        out += `    <rect width="100%" height="100%" fill="white" opacity="0"/>\n`;
        out += `    <g transform="translate(${r.offset.x},${r.offset.y}) scale(${r.scale.x},${r.scale.y})">\n`;
        out += `      ${r.svgContent}\n`;
        out += `    </g>\n`;
        out += `  </svg>\n`;
      });
      out += `</svg>`;
      return out;
    },
  };

  // =========================================================================
  // 2. MAIN APPLICATION LOGIC
  // =========================================================================

  const app = (window.app = window.app || {});

  const CONFIG = {
    defaultPdfUrl: "https://lsparrish.github.io/sciconvert/sample.png",
    aiScale: 2.0,
  };
  const apiKey = "";

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
    editMode: "area",
    history: [],
    historyIndex: -1,
    dragAction: null,
    dragStart: { x: 0, y: 0 },
    initialRect: null,
    initialScale: null,
    canvas: null,
  };

  app.state = state;
  const els = {};

  // --- INITIALIZATION ---

  function loadTemplate() {
    const style = document.createElement("style");
    style.textContent = APP_STYLES;
    document.head.appendChild(style);
    document.body.insertAdjacentHTML("beforeend", APP_STRUCTURE);
    init();
  }

  function init() {
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
    els.selectionBar = document.getElementById("new-selection-action-bar");
    els.layerList = document.getElementById("layer-list");
    els.btnAddLayer = document.getElementById("btn-add-layer");
    els.regionCount = document.getElementById("region-count");
    els.contextActions = document.getElementById("context-actions");
    els.aiStatus = document.getElementById("ai-status");
    els.modeArea = document.getElementById("mode-area");
    els.modeContent = document.getElementById("mode-content");
    els.modeLabel = document.getElementById("mode-label");
    els.btnFitArea = document.getElementById("btn-fit-area");
    els.btnFitContent = document.getElementById("btn-fit-content");
    els.lblX = document.getElementById("lbl-x");
    els.lblY = document.getElementById("lbl-y");
    els.lblW = document.getElementById("lbl-w");
    els.lblH = document.getElementById("lbl-h");
    els.propX = document.getElementById("prop-x");
    els.propY = document.getElementById("prop-y");
    els.propW = document.getElementById("prop-w");
    els.propH = document.getElementById("prop-h");
    els.chkSource = document.getElementById("chk-source");
    els.chkSvg = document.getElementById("chk-svg");
    els.chkGrid = document.getElementById("chk-grid");
    els.debugContainer = document.getElementById("debug-container");
    els.debugImg = document.getElementById("debug-img-source");
    els.debugSvg = document.getElementById("debug-svg-preview");
    els.debugBlueprint = document.getElementById("debug-blueprint");
    els.debugLog = document.getElementById("debug-log");
    els.btnDigitize = document.getElementById("btn-digitize");
    els.btnSplit = document.getElementById("btn-split");

    try {
      loadDefaultImage();
    } catch (e) {
      els.loader.classList.add("hidden");
    }
    setupEventListeners();
    updateHistoryUI();
  }

  // --- CORE LOGIC & AI INTEGRATION ---

  app.createRegion = async function (type, id) {
    const tid = id || state.activeRegionId;
    if (!tid) return;
    const r = getRegion(tid);
    if (!r) return;

    els.aiStatus.classList.remove("hidden");
    els.selectionBar.classList.add("hidden");

    const cw = state.canvas.width;
    const ch = state.canvas.height;
    const pxW = Math.floor(r.rect.w * cw);
    const pxH = Math.floor(r.rect.h * ch);
    const tmp = document.createElement("canvas");
    tmp.width = pxW * 2;
    tmp.height = pxH * 2;
    tmp
      .getContext("2d")
      .drawImage(
        state.canvas,
        r.rect.x * cw,
        r.rect.y * ch,
        pxW,
        pxH,
        0,
        0,
        pxW * 2,
        pxH * 2,
      );
    r.srcCrop = tmp.toDataURL();

    try {
      const bpC = document.createElement("canvas");
      const MAX_BP = 300;
      let bpW = pxW,
        bpH = pxH;
      if (pxW > MAX_BP || pxH > MAX_BP) {
        const ratio = Math.min(MAX_BP / pxW, MAX_BP / pxH);
        bpW = Math.floor(pxW * ratio);
        bpH = Math.floor(pxH * ratio);
      }
      bpC.width = bpW;
      bpC.height = bpH;
      bpC.getContext("2d").drawImage(tmp, 0, 0, bpW, bpH);
      const rlePath = SciTextHelpers.runLengthEncode(
        bpC.getContext("2d").getImageData(0, 0, bpW, bpH),
      );
      r.blueprint = `<svg viewBox="0 0 ${bpW} ${bpH}"><path d="${rlePath}" fill="#00ff00"/></svg>`;

      r.bpDims = { w: bpW, h: bpH };
      r.status = undefined;
      r.scale = { x: 1, y: 1 };
      r.offset = { x: 0, y: 0 };
      r.type = type;

      if (type === "empty") {
        r.svgContent = "";
        r.status = "generated";
      } else {
        r.svgContent = `<text x="50%" y="50%" font-size="${bpH / 5}" text-anchor="middle" fill="#ccc">Processing...</text>`;
        selectRegion(r.id);
        renderRegions();
        await app.generateRegionContent(type, r.id);
      }
      saveState();
      selectRegion(r.id);
    } catch (e) {
      console.error(e);
      r.status = "draft";
    }
    els.aiStatus.classList.add("hidden");
  };

  app.generateRegionContent = async function (type, id) {
    const r = getRegion(id);
    if (!r) return;
    els.aiStatus.classList.remove("hidden");
    els.aiStatus.textContent = `Generating ${type} content...`;

    const cw = state.canvas.width;
    const ch = state.canvas.height;
    const pw = Math.floor(r.rect.w * cw);
    const ph = Math.floor(r.rect.h * ch);
    const tmp = document.createElement("canvas");
    tmp.width = pw * 2;
    tmp.height = ph * 2;
    tmp
      .getContext("2d")
      .drawImage(
        state.canvas,
        r.rect.x * cw,
        r.rect.y * ch,
        pw,
        ph,
        0,
        0,
        pw * 2,
        ph * 2,
      );
    const base64 = tmp.toDataURL("image/png").split(",")[1];

    let prompt = "";
    if (type === "text") {
      const bpC = document.createElement("canvas");
      bpC.width = r.bpDims.w;
      bpC.height = r.bpDims.h;
      bpC
        .getContext("2d")
        .drawImage(
          state.canvas,
          r.rect.x * cw,
          r.rect.y * ch,
          pw,
          ph,
          0,
          0,
          r.bpDims.w,
          r.bpDims.h,
        );
      const rle = SciTextHelpers.runLengthEncode(
        bpC.getContext("2d").getImageData(0, 0, r.bpDims.w, r.bpDims.h),
      );
      prompt = `You are a precision SVG Typesetter.\nINPUTS:\n1. IMAGE: A 2x scale scan.\n2. BLUEPRINT: A 1x scale vector path.\nTASK:\nGenerate SVG <text> elements positioned over the BLUEPRINT.\nViewBox: 0 0 ${r.bpDims.w} ${r.bpDims.h}.\nOutput strictly valid SVG elements.\nBLUEPRINT (Partial):\n${rle.substring(0, 500)}...`;
    } else {
      prompt = `You are a precision SVG Graphic Designer.\nINPUTS:\n1. IMAGE: 2x scan.\nTASK:\nReplicate the figure. Use <image> with href="data:image/png;base64,${base64}" if complex, or vector shapes if simple.\nViewBox: 0 0 ${r.bpDims.w} ${r.bpDims.h}.\n`;
    }

    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: prompt },
                  { inlineData: { mimeType: "image/png", data: base64 } },
                ],
              },
            ],
          }),
        },
      );
      const json = await resp.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("No SVG generated.");

      r.svgContent = text
        .replace(/```svg/g, "")
        .replace(/```/g, "")
        .trim();
      r.status = "generated";
      r.scale = { x: 1, y: 1 };
      r.offset = { x: 0, y: 0 };

      saveState();
      selectRegion(r.id);
      fitContentToArea();
    } catch (e) {
      console.error("AI Error:", e);
      els.aiStatus.textContent = "Error generating content.";
      r.svgContent = `<text x="50%" y="50%" font-size="20" fill="red">Error</text>`;
    } finally {
      setTimeout(() => {
        els.aiStatus.classList.add("hidden");
        els.aiStatus.textContent = "Processing...";
      }, 3000);
      renderRegions();
    }
  };

  function getRegion(id) {
    return state.regions.find((x) => x.id === id);
  }
  app.getRegion = getRegion;

  function getLocalPos(e) {
    const r = els.interactionLayer.getBoundingClientRect();
    const sx = state.canvas.width / r.width;
    const sy = state.canvas.height / r.height;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    els.loader.classList.remove("hidden");
    if (file.type === "application/pdf") {
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
      await new Promise((r) => (img.onload = r));
      state.canvas.width = img.width;
      state.canvas.height = img.height;
      state.baseWidth = img.width;
      state.canvas.getContext("2d").drawImage(img, 0, 0);
    }
    state.regions = [];
    state.history = [];
    renderPage();
    els.loader.classList.add("hidden");
    els.emptyState.classList.add("hidden");
    els.workspace.classList.remove("hidden");
    els.workspace.classList.add("flex");
    saveState(true);
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
      state.pdfDoc = { numPages: 1, isImage: true };
      renderPage();
      els.loader.classList.add("hidden");
      els.emptyState.classList.add("hidden");
      els.workspace.classList.remove("hidden");
      els.workspace.classList.add("flex");
      saveState(true);
      switchTab("overlay");
    };
    img.src = `${CONFIG.defaultPdfUrl}?v=${Date.now()}`;
  }

  // --- RENDERING & INTERACTION ---

  function renderLayerList(r) {
    els.layerList.innerHTML = "";
    if (!r || !r.svgContent) {
      els.layerList.innerHTML =
        '<div class="text-center text-gray-400 text-[10px] mt-4">Select a region to view layers</div>';
      return;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(
      `<svg>${r.svgContent}</svg>`,
      "image/svg+xml",
    );
    const children = Array.from(doc.documentElement.childNodes).filter(
      (n) => n.nodeType === 1,
    );

    if (children.length === 0 && r.svgContent.trim()) {
      createLayerItem(r.svgContent, 0);
    } else if (children.length > 0) {
      children.forEach((child, index) =>
        createLayerItem(child.outerHTML, index),
      );
    } else {
      els.layerList.innerHTML =
        '<div class="text-center text-gray-400 text-[10px] mt-4">No content</div>';
    }
  }

  function createLayerItem(content, index) {
    const div = document.createElement("div");
    div.className =
      "bg-white border border-gray-300 rounded p-2 shadow-sm group relative mb-2";
    let tagName = content.match(/^<([a-z0-9]+)/i)?.[1] || "Element";
    div.innerHTML = `<div class="text-[10px] font-bold text-blue-500 uppercase mb-1 flex justify-between">
            ${tagName} <button class="text-red-500" onclick="app.deleteLayer(${index})">&times;</button>
        </div>`;
    const ta = document.createElement("textarea");
    ta.className =
      "w-full text-[10px] font-mono border border-gray-100 bg-gray-50 rounded p-1 resize-y outline-none h-16";
    ta.value = content;
    ta.oninput = () => {
      const r = getRegion(state.activeRegionId);
      if (r) {
        const allTas = Array.from(els.layerList.querySelectorAll("textarea"));
        r.svgContent = allTas.map((t) => t.value).join("\n");
        renderRegions();
      }
    };
    ta.onblur = () => saveState();
    div.appendChild(ta);
    els.layerList.appendChild(div);
  }

  app.deleteLayer = function (index) {
    const r = getRegion(state.activeRegionId);
    if (!r) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(
      `<svg>${r.svgContent}</svg>`,
      "image/svg+xml",
    );
    const children = Array.from(doc.documentElement.childNodes).filter(
      (n) => n.nodeType === 1,
    );
    if (index >= 0 && index < children.length) children[index].remove();
    r.svgContent = doc.documentElement.innerHTML.trim();
    renderRegions();
    renderLayerList(r);
    saveState();
  };

  function addLayerToRegion() {
    const r = getRegion(state.activeRegionId);
    if (!r) return;
    r.svgContent += `\n<text x="10" y="10" font-size="10" fill="black">New Text</text>`;
    renderRegions();
    renderLayerList(r);
    saveState();
  }

  function mergeAdjacentTextElements(svgString) {
    if (!svgString.includes("<text")) return svgString;
    const parser = new DOMParser();
    const doc = parser.parseFromString(
      `<svg>${svgString}</svg>`,
      "image/svg+xml",
    );
    const svgRoot = doc.querySelector("svg");
    if (!svgRoot) return svgString;
    const textElements = Array.from(svgRoot.querySelectorAll("text"));
    textElements.sort((a, b) => {
      const ay = parseFloat(a.getAttribute("y") || "0");
      const by = parseFloat(b.getAttribute("y") || "0");
      if (Math.abs(ay - by) > 0.5) return ay - by;
      return (
        parseFloat(a.getAttribute("x") || "0") -
        parseFloat(b.getAttribute("x") || "0")
      );
    });
    const mergedElements = [];
    let currentGroup = [];
    const getStyleKey = (el) =>
      (el.getAttribute("font-family") || "") +
      "|" +
      (el.getAttribute("font-size") || "") +
      "|" +
      (el.getAttribute("font-weight") || "") +
      "|" +
      (el.getAttribute("fill") || "");
    for (const textEl of textElements) {
      if (currentGroup.length === 0) {
        currentGroup.push(textEl);
        continue;
      }
      const lastEl = currentGroup[currentGroup.length - 1];
      const currentY = parseFloat(textEl.getAttribute("y") || "0");
      const lastY = parseFloat(lastEl.getAttribute("y") || "0");
      if (
        getStyleKey(textEl) === getStyleKey(lastEl) &&
        Math.abs(currentY - lastY) < 1.0
      )
        currentGroup.push(textEl);
      else {
        mergedElements.push(currentGroup);
        currentGroup = [textEl];
      }
    }
    if (currentGroup.length > 0) mergedElements.push(currentGroup);
    for (const group of mergedElements) {
      if (group.length > 1) {
        const firstEl = group[0];
        let mergedText = firstEl.textContent;
        group.sort(
          (a, b) =>
            parseFloat(a.getAttribute("x")) - parseFloat(b.getAttribute("x")),
        );
        for (let i = 1; i < group.length; i++) {
          mergedText += " " + group[i].textContent;
          group[i].remove();
        }
        firstEl.textContent = mergedText.trim();
      }
    }
    return svgRoot.innerHTML;
  }

  function optimizeActiveRegion() {
    const r = getRegion(state.activeRegionId);
    if (!r || !r.svgContent) return;
    r.svgContent = mergeAdjacentTextElements(r.svgContent);
    renderLayerList(r);
    renderRegions();
    saveState();
  }

  function groupSelectedRegions() {
    const selected = state.regions.filter((r) => state.selectedIds.has(r.id));
    if (selected.length < 2) return;
    const cw = state.canvas.width;
    const ch = state.canvas.height;
    let minX = 1,
      minY = 1,
      maxX = 0,
      maxY = 0;
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
    selectRegion(newRegion.id);
    saveState();
  }

  function handleSplitAction() {
    if (state.splitMode) {
      const r = getRegion(state.splitTargetId);
      if (!r) {
        deselect();
        return;
      }
      if (state.splitSelection.size === 0) {
        deselect();
        return;
      }
      const parser = new DOMParser();
      const doc = parser.parseFromString(
        `<svg>${r.svgContent}</svg>`,
        "image/svg+xml",
      );
      const children = Array.from(doc.documentElement.children);
      const indices = Array.from(state.splitSelection).sort((a, b) => a - b);
      const cw = state.canvas.width;
      const ch = state.canvas.height;
      const newRegions = [];

      indices.forEach((idx) => {
        const child = children[idx];
        newRegions.push({
          id: `r${Date.now()}-${Math.random()}`,
          rect: { ...r.rect },
          bpDims: { ...r.bpDims },
          svgContent: child.outerHTML,
          scale: { x: 1, y: 1 },
          offset: { x: 0, y: 0 },
          status: "optimized",
        });
        child.remove();
      });
      r.svgContent = doc.documentElement.innerHTML.trim();
      if (!r.svgContent)
        state.regions = state.regions.filter((reg) => reg.id !== r.id);
      newRegions.forEach((nr) => state.regions.push(nr));
      deselect();
      saveState();
    } else {
      const r = getRegion(state.activeRegionId);
      if (!r || !r.svgContent) return;
      state.splitMode = true;
      state.splitTargetId = r.id;
      state.splitSelection.clear();
      els.btnSplit.textContent = "Extract";
      els.btnSplit.classList.add("ring-2");
      renderRegions();
    }
  }

  // --- RENDER VISUALS ---

  function renderRegions() {
    const gRegions = els.svgLayer.querySelector("#regions");
    const gHighlights = els.svgLayer.querySelector("#highlights");
    gRegions.innerHTML = "";
    gHighlights.innerHTML = "";
    if (!state.dragAction || state.dragAction === "create")
      els.interactionLayer.innerHTML = "";
    const cw = state.canvas.width;
    const ch = state.canvas.height;

    state.regions.forEach((r) => {
      r.scale = r.scale || { x: 1, y: 1 };
      r.offset = r.offset || { x: 0, y: 0 };
      if (!r.bpDims) r.bpDims = { w: r.rect.w * cw, h: r.rect.h * ch };
      const px = r.rect.x * cw;
      const py = r.rect.y * ch;
      const pw = r.rect.w * cw;
      const ph = r.rect.h * ch;

      if (r.status === "draft") {
        const rect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect",
        );
        rect.setAttribute("x", px);
        rect.setAttribute("y", py);
        rect.setAttribute("width", pw);
        rect.setAttribute("height", ph);
        rect.setAttribute("class", "region-draft");
        gRegions.appendChild(rect);
      } else {
        const svg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg",
        );
        svg.setAttribute("x", px);
        svg.setAttribute("y", py);
        svg.setAttribute("width", pw);
        svg.setAttribute("height", ph);
        svg.setAttribute("viewBox", `0 0 ${r.bpDims.w} ${r.bpDims.h}`);
        svg.setAttribute("preserveAspectRatio", "none");
        svg.setAttribute("id", `svg-region-${r.id}`);
        svg.innerHTML = `<g id="group-${r.id}" transform="translate(${r.offset.x}, ${r.offset.y}) scale(${r.scale.x}, ${r.scale.y})">${r.svgContent}</g>`;
        gRegions.appendChild(svg);
      }

      if (
        r.id === state.activeRegionId &&
        state.selectedIds.size <= 1 &&
        !state.dragAction
      ) {
        if (state.splitMode && state.splitTargetId === r.id)
          renderSplitOverlays(r);
        else renderActiveSelectionControls(r);
      } else if (state.selectedIds.has(r.id)) {
        const rect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect",
        );
        rect.setAttribute("x", px);
        rect.setAttribute("y", py);
        rect.setAttribute("width", pw);
        rect.setAttribute("height", ph);
        rect.setAttribute("class", "region-selected");
        gHighlights.appendChild(rect);
      }
    });
    updateUI();
  }

  function renderActiveSelectionControls(region) {
    if (document.querySelector(`.selection-frame[data-id="${region.id}"]`))
      return;
    const w = state.canvas.width;
    const h = state.canvas.height;
    const ds = state.scaleMultiplier;
    const px = region.rect.x * w * ds;
    const py = region.rect.y * h * ds;
    const pw = region.rect.w * w * ds;
    const ph = region.rect.h * h * ds;

    const frame = document.createElement("div");
    frame.className = "selection-frame";
    frame.id = `frame-${region.id}`;
    frame.style.left = `${px}px`;
    frame.style.top = `${py}px`;
    frame.style.width = `${pw}px`;
    frame.style.height = `${ph}px`;
    frame.dataset.id = region.id;
    frame.dataset.action = "move";

    ["nw", "n", "ne", "e", "se", "s", "sw", "w"].forEach((pos) => {
      const handle = document.createElement("div");
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
    const cw = state.canvas.width;
    els.interactionLayer
      .querySelectorAll(".split-overlay")
      .forEach((el) => el.remove());
    children.forEach((child, idx) => {
      const div = document.createElement("div");
      div.className =
        "absolute border-dashed border-indigo-400 bg-indigo-500/20 hover:bg-indigo-500/40 cursor-pointer";
      if (state.splitSelection.has(idx))
        div.className = "absolute border-red-500 bg-red-500/40";
      div.style.left = "0";
      div.style.top = "0";
      div.style.width = "20px";
      div.style.height = "20px";
      div.dataset.splitIndex = idx;
      div.classList.add("split-overlay");
      els.interactionLayer.appendChild(div);
    });
  }

  function selectRegion(id, multi = false) {
    if (state.splitMode) return;
    if (multi) {
      if (state.selectedIds.has(id)) {
        state.selectedIds.delete(id);
        if (state.activeRegionId === id)
          state.activeRegionId = Array.from(state.selectedIds).pop() || null;
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
    if (r) {
      renderLayerList(r);
      updateUIProperties(r);
      if (r.status === "draft") showCreationBar(r);
      else els.selectionBar.classList.add("hidden");
    } else els.selectionBar.classList.add("hidden");
  }
  app.selectRegion = selectRegion;

  function deselect() {
    if (state.splitMode) {
      state.splitMode = false;
      state.splitTargetId = null;
      state.splitSelection.clear();
      els.btnSplit.textContent = "Split";
      els.btnSplit.classList.remove("ring-2");
    }
    state.activeRegionId = null;
    state.selectedIds.clear();
    renderRegions();
    els.selectionBar.classList.add("hidden");
    els.selectionBox.style.display = "none";
    els.layerList.innerHTML = "";
    els.contextActions.classList.add("disabled-bar");
  }
  app.deselect = deselect;

  // --- UTILS & HELPERS ---
  function updateUI() {
    els.regionCount.textContent = `${state.regions.length}`;
    if (state.activeRegionId)
      els.contextActions.classList.remove("disabled-bar");
  }

  function showCreationBar(r) {
    const rect = els.interactionLayer.getBoundingClientRect();
    const cw = state.canvas.width;
    const ch = state.canvas.height;
    const ratio = rect.width / cw;
    const sx = rect.left + r.rect.x * cw * ratio;
    const sy = rect.top + r.rect.y * ch * ratio + r.rect.h * ch * ratio + 10;
    els.selectionBar.style.left =
      Math.min(window.innerWidth - 250, Math.max(10, sx)) + "px";
    els.selectionBar.style.top = sy + "px";
    els.selectionBar.classList.remove("hidden");
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
    const r = getRegion(state.activeRegionId);
    if (!r) return;
    const cw = state.canvas.width;
    const ch = state.canvas.height;
    if (state.editMode === "area") {
      els.propX.value = (r.rect.x * cw).toFixed(0);
      els.propY.value = (r.rect.y * ch).toFixed(0);
      els.propW.value = (r.rect.w * cw).toFixed(0);
      els.propH.value = (r.rect.h * ch).toFixed(0);
    } else {
      els.propX.value = r.offset.x.toFixed(2);
      els.propY.value = r.offset.y.toFixed(2);
      els.propW.value = r.bpDims.w.toFixed(2);
      els.propH.value = r.bpDims.h.toFixed(2);
    }
  }

  function setupEventListeners() {
    els.interactionLayer.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);

    els.btnZoomIn.onclick = () => setZoom(state.scaleMultiplier + 0.25);
    els.btnZoomOut.onclick = () => setZoom(state.scaleMultiplier - 0.25);
    els.btnUndo.onclick = undo;
    els.btnRedo.onclick = redo;

    document.getElementById("btn-export").onclick = () => {
      const out = SciTextHelpers.composeSVG(
        state.regions,
        state.canvas.width,
        state.canvas.height,
      );
      const url = URL.createObjectURL(
        new Blob([out], { type: "image/svg+xml" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "scitext.svg";
      a.click();
    };
    document.getElementById("btn-clear-all").onclick = () => {
      state.regions = [];
      renderRegions();
      saveState();
    };
    document.getElementById("btn-delete").onclick = () => {
      state.regions = state.regions.filter((r) => !state.selectedIds.has(r.id));
      deselect();
      renderRegions();
      saveState();
    };
    document.getElementById("btn-regen").onclick = () => {
      if (state.activeRegionId)
        app.generateRegionContent(
          getRegion(state.activeRegionId).type,
          state.activeRegionId,
        );
    };
    document.getElementById("btn-group").onclick = groupSelectedRegions;
    document.getElementById("btn-optimize").onclick = optimizeActiveRegion;
    els.btnSplit.onclick = handleSplitAction;
    els.btnAddLayer.onclick = addLayerToRegion;

    [els.propX, els.propY, els.propW, els.propH].forEach((input) => {
      input.addEventListener("input", loadDefaultImage);
    });

    els.modeArea.onclick = () => {
      state.editMode = "area";
      updatePropertyInputs();
    };
    els.modeContent.onclick = () => {
      state.editMode = "content";
      updatePropertyInputs();
    };
    els.btnFitContent.onclick = fitContentToArea;
    els.btnFitArea.onclick = fitAreaToContent;

    els.chkSource.onchange = () =>
      (els.pdfLayer.style.opacity = els.chkSource.checked ? 1 : 0);
    els.chkSvg.onchange = () =>
      (els.svgLayer.style.opacity = els.chkSvg.checked ? 1 : 0);
    els.chkGrid.onchange = () =>
      document
        .getElementById("grid-layer")
        .classList.toggle("hidden", !els.chkGrid.checked);
    els.upload.onchange = handleFileUpload;
    document.getElementById("fullscreen-toggle").onclick = () =>
      document.fullscreenElement
        ? document.exitFullscreen()
        : document.documentElement.requestFullscreen();
    document.getElementById("tab-overlay").onclick = () => switchTab("overlay");
    document.getElementById("tab-debug").onclick = () => switchTab("debug");
  }

  function switchTab(t) {
    els.workspace.classList.toggle("hidden", t !== "overlay");
    els.debugContainer.classList.toggle("hidden", t !== "debug");
    els.debugContainer.classList.toggle("flex", t === "debug");
    document
      .getElementById("tab-overlay")
      .classList.toggle("active", t === "overlay");
    document
      .getElementById("tab-debug")
      .classList.toggle("active", t === "debug");
  }

  function fitContentToArea() {
    const r = getRegion(state.activeRegionId);
    if (!r) return;
    renderLayerList(r);
    renderRegions();
    saveState();
  }

  function fitAreaToContent() {
    const r = getRegion(state.activeRegionId);
    if (!r) return;
    renderRegions();
    saveState();
  }

  // --- EVENT HANDLERS (Brief) ---
  function handleMouseDown(e) {
    if (e.target.classList.contains("split-overlay")) {
      const idx = parseInt(e.target.dataset.splitIndex);
      if (state.splitSelection.has(idx)) state.splitSelection.delete(idx);
      else state.splitSelection.add(idx);
      renderRegions();
      return;
    }
    if (state.splitMode) return;

    if (
      e.button !== 0 ||
      (!e.target.dataset.action &&
        !document
          .elementFromPoint(e.clientX, e.clientY)
          .classList.contains("region-highlight"))
    ) {
      state.dragAction = "create";
      state.dragStart = getLocalPos(e);
      if (!e.shiftKey) deselect();
      els.selectionBox.style.display = "block";
    }
  }
  function handleMouseMove(e) {
    if (!state.dragAction) return;
    const pos = getLocalPos(e);
    if (state.dragAction === "create") {
      const start = state.dragStart;
      const x = Math.min(pos.x, start.x);
      const y = Math.min(pos.y, start.y);
      const w = Math.abs(pos.x - start.x);
      const h = Math.abs(pos.y - start.y);
      const rect = els.interactionLayer.getBoundingClientRect();
      const ratio = rect.width / state.canvas.width;
      els.selectionBox.style.left = x * ratio + "px";
      els.selectionBox.style.top = y * ratio + "px";
      els.selectionBox.style.width = w * ratio + "px";
      els.selectionBox.style.height = h * ratio + "px";
    }
  }
  function handleMouseUp(e) {
    if (state.dragAction === "create") {
      const w = Math.abs(getLocalPos(e).x - state.dragStart.x);
      const h = Math.abs(getLocalPos(e).y - state.dragStart.y);
      if (w > 5 && h > 5) {
        const lx = Math.min(getLocalPos(e).x, state.dragStart.x);
        const ly = Math.min(getLocalPos(e).y, state.dragStart.y);
        const newRegion = {
          id: `r${Date.now()}`,
          rect: {
            x: lx / state.canvas.width,
            y: ly / state.canvas.height,
            w: w / state.canvas.width,
            h: h / state.canvas.height,
          },
          status: "draft",
        };
        state.regions.push(newRegion);
        saveState();
        selectRegion(newRegion.id);
      }
      els.selectionBox.style.display = "none";
    }
    state.dragAction = null;
  }
  function handleKeyDown(e) {
    if (e.key === "Escape") deselect();
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
    }
  }

  function setZoom(m) {
    state.scaleMultiplier = Math.max(0.25, Math.min(5.0, m));
    applyZoom();
  }
  function applyZoom() {
    const nw = state.baseWidth * state.scaleMultiplier;
    const nh = (state.canvas.height / state.canvas.width) * nw;
    els.wrapper.style.width = `${nw}px`;
    els.wrapper.style.height = `${nh}px`;
    els.txtZoomLevel.textContent = `${Math.round(state.scaleMultiplier * 100)}%`;
  }
  function renderPage() {
    els.pdfLayer.innerHTML = "";
    els.pdfLayer.appendChild(state.canvas);
    state.canvas.style.display = "block";
    state.canvas.style.width = "100%";
    state.canvas.style.height = "100%";
    applyZoom();
    els.svgLayer.innerHTML = `<svg id="main-svg" width="${state.canvas.width}" height="${state.canvas.height}" style="width:100%; height:100%;" viewBox="0 0 ${state.canvas.width} ${state.canvas.height}" xmlns="http://www.w3.org/2000/svg"><g id="regions"></g><g id="highlights"></g></svg>`;
    renderRegions();
  }

  // --- HISTORY ---
  function saveState(isInitial) {
    if (state.historyIndex < state.history.length - 1)
      state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(JSON.parse(JSON.stringify(state.regions)));
    state.historyIndex++;
    if (state.history.length > 50) {
      state.history.shift();
      state.historyIndex--;
    }
    updateHistoryUI();
    uiExtensions.forEach((ext) => ext.callback?.());
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
    state.regions = JSON.parse(
      JSON.stringify(state.history[state.historyIndex]),
    );
    deselect();
    renderRegions();
    updateHistoryUI();
  }
  function updateHistoryUI() {
    els.btnUndo.disabled = state.historyIndex <= 0;
    els.btnRedo.disabled = state.historyIndex >= state.history.length - 1;
  }

  // --- EXTENSIONS ---
  const uiExtensions = [];
  app.insertElementBefore = (html, sel, cb) => {
    const t = document.querySelector(sel);
    if (t) {
      t.insertAdjacentHTML("beforebegin", html);
      cb(t.previousElementSibling);
      console.log("didn't need applyUIExtensions");
    } else {
      uiExtensions.push({ html, sel, cb });
      console.log("need applyUIExtensions");
    }
  };
  app.observeState = (cb) => {
    uiExtensions.push({ callback: cb });
    cb();
  };

  function applyUIExtensions() {
    uiExtensions.forEach((ext) => {
      if (ext.applied || !ext.html) return;
      const t = document.querySelector(ext.sel);
      if (t) {
        t.insertAdjacentHTML("beforebegin", ext.html);
        ext.cb(t.previousElementSibling);
        ext.applied = true;
      }
      console.log("applyUIExtensions applied for {ext}");
    });
  }

  app.bootstrap = function () {
    loadTemplate();
    applyUIExtensions();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.app.bootstrap());
  } else {
    window.app.bootstrap();
  }
  return app;
})();
