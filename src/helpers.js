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
            
            // Ensure scale and offset are initialized if missing
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
    


    return {
        // Core Utilities
        runLengthEncode,
        compressSVG,
        composeSVG,
        
    };
})();
