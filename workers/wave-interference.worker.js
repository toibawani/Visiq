// ===== WAVE INTERFERENCE WORKER =====
// Offloads the interference-field pixel computation to a background thread.
// Receives a grid of (x,y) samples and returns packed RGBA values.
//
// Contract: postMessage({ type:'init', width, height, downscale })
//           postMessage({ type:'compute', s1x, s1y, s2x, s2y, k, omegaTime, phaseRad, width, height, downscale })
//           => { type:'computed', pixels: Uint8ClampedArray, width, height, downscale }

let state = null;

self.addEventListener('message', (e) => {
    const msg = e.data;
    if (msg.type === 'init') {
        state = { width: msg.width, height: msg.height, downscale: msg.downscale || 4 };
        postMessage({ type: 'ready' });
    } else if (msg.type === 'compute') {
        if (!state) { postMessage({ type: 'ready' }); return; }
        const { s1x, s1y, s2x, s2y, k, omegaTime, phaseRad, width, height, downscale } = msg;
        const scale = downscale;
        const gw = Math.ceil(width / scale);
        const gh = Math.ceil(height / scale);
        const rgba = new Uint8ClampedArray(gw * gh * 4);

        for (let gy = 0; gy < gh; gy++) {
            const y = gy * scale;
            const rowOffset = gy * gw * 4;
            for (let gx = 0; gx < gw; gx++) {
                const x = gx * scale;
                const dx1 = x - s1x;
                const dy1 = y - s1y;
                const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
                const dx2 = x - s2x;
                const dy2 = y - s2y;
                const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                const a1 = Math.sin(k * d1 - omegaTime);
                const a2 = Math.sin(k * d2 - omegaTime + phaseRad);
                const netAmp = (a1 + a2) * 0.5;

                let r, g, b, a;
                if (netAmp > 0) {
                    const t = netAmp;
                    r = Math.round(7  + (45  - 7)  * t);
                    g = Math.round(9  + (212 - 9)  * t);
                    b = Math.round(15 + (191 - 15) * t);
                    a = Math.round(140 + 115 * t);
                } else {
                    const t = -netAmp;
                    r = Math.round(7  + (124 - 7)  * t);
                    g = Math.round(9  + (106 - 9)  * t);
                    b = Math.round(15 + (247 - 15) * t);
                    a = Math.round(140 + 115 * t);
                }

                const idx = rowOffset + gx * 4;
                rgba[idx]     = r;
                rgba[idx + 1] = g;
                rgba[idx + 2] = b;
                rgba[idx + 3] = a;
            }
        }

        postMessage({ type: 'computed', pixels: rgba.buffer, width: gw, height: gh, downscale: scale, transfer: [rgba.buffer] });
    }
});