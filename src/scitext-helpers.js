// scitext-helpers.js
// Robust utility functions for SciText Digitizer. Should only include functions unlikely to change.
// lives at https://lsparrish.github.io/sciconvert/src/scitext-helpers.js
// AI instructions: Consider how to ensure bulletproof behavior.

const SciTextHelpers = (function () {
    // --- Geometry & Normalization ---
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

    // --- SVG Content Utilities ---
    function parseSVGContent(content) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<svg>${content}</svg>`, "image/svg+xml");
        return doc.documentElement;
    }

    function serializeSVGElement(el) {
        return new XMLSerializer().serializeToString(el);
    }

    function getContentBBox(groupElement) {
        // Temporarily remove transform to get intrinsic bbox
        const transform = groupElement.getAttribute('transform') || '';
        groupElement.removeAttribute('transform');
        const bbox = groupElement.getBBox();
        if (transform) groupElement.setAttribute('transform', transform);
        return bbox;
    }

    // --- Run-Length Encoding (core digitization helper) ---
    function runLengthEncode(imageData) {
        let path = "";
        const { width, height, data } = imageData;
        for (let y = 0; y < height; y += 2) {
            let startX = -1;
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const isDark = data[idx + 3] > 128 && data[idx] < 128;
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

    // --- Merge adjacent <text> elements (optimization) ---
    function mergeAdjacentTextElements(svgString) {
        if (!svgString.includes('<text')) return svgString;
        const root = parseSVGContent(svgString);
        const texts = Array.from(root.querySelectorAll('text'));

        if (texts.length < 2) return root.innerHTML;

        texts.sort((a, b) => {
            const ay = parseFloat(a.getAttribute('y') || 0);
            const by = parseFloat(b.getAttribute('y') || 0);
            if (Math.abs(ay - by) > 0.5) return ay - by;
            return (parseFloat(a.getAttribute('x') || 0)) - (parseFloat(b.getAttribute('x') || 0));
        });

        const getStyleKey = el => [
            el.getAttribute('font-family') || '',
            el.getAttribute('font-size') || '',
            el.getAttribute('font-weight') || '',
            el.getAttribute('fill') || '',
            el.getAttribute('style') || ''
        ].join('|');

        const groups = [];
        let current = [];

        for (const el of texts) {
            if (!current.length || 
                (Math.abs(parseFloat(el.getAttribute('y') || 0) - parseFloat(current[0].getAttribute('y') || 0)) < 1 &&
                 getStyleKey(el) === getStyleKey(current[0]))) {
                current.push(el);
            } else {
                groups.push(current);
                current = [el];
            }
        }
        if (current.length) groups.push(current);

        for (const group of groups) {
            if (group.length > 1) {
                group.sort((a, b) => parseFloat(a.getAttribute('x') || 0) - parseFloat(b.getAttribute('x') || 0));
                const first = group[0];
                let text = first.textContent;
                for (let i = 1; i < group.length; i++) {
                    text += ' ' + group[i].textContent;
                    group[i].remove();
                }
                first.textContent = text.trim();
            }
        }

        return root.innerHTML;
    }

    // --- Export SVG composer ---
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

    return {
        normalizeRect,
        denormalizeRect,
        parseSVGContent,
        serializeSVGElement,
        getContentBBox,
        runLengthEncode,
        mergeAdjacentTextElements,
        composeSVG
    };
})();
