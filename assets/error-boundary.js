// Device-only error boundary + ring buffer. No telemetry endpoint exists.
(function () {
    'use strict';

    const KEY = 'visiq-error-log';
    const MAX = 40;

    function load() {
        try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
        catch (e) { return []; }
    }

    function save(list) {
        localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
    }

    function record(entry) {
        const list = load();
        list.push(entry);
        save(list);
    }

    function showFallback(message) {
        if (document.getElementById('visiq-error-fallback')) return;
        const el = document.createElement('div');
        el.id = 'visiq-error-fallback';
        el.setAttribute('role', 'alert');
        el.style.cssText = 'position:fixed;inset:0;z-index:10000;background:#07090f;color:#f1f5f9;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;';
        el.innerHTML = `
            <div style="max-width:420px;border:1px solid #283150;border-radius:12px;padding:28px;background:#0f1117;">
                <h1 style="font-size:1.15rem;margin:0 0 10px;">Something broke in this view</h1>
                <p style="color:#94a3b8;font-size:0.9rem;line-height:1.5;margin:0 0 16px;">The rest of the tab may still work. This message is stored on this device only — VISIQ has no error reporting server.</p>
                <pre style="white-space:pre-wrap;font-size:0.75rem;color:#e8a04c;margin:0 0 16px;">${String(message).slice(0, 400)}</pre>
                <button type="button" id="visiq-error-reload" style="padding:8px 14px;cursor:pointer;">Reload page</button>
            </div>`;
        document.body.appendChild(el);
        document.getElementById('visiq-error-reload').onclick = () => location.reload();
    }

    window.addEventListener('error', (e) => {
        record({
            t: Date.now(),
            type: 'error',
            msg: e.message || String(e.error),
            src: e.filename || '',
            line: e.lineno || 0,
        });
        if (e.error) showFallback(e.message);
    });

    window.addEventListener('unhandledrejection', (e) => {
        const msg = e.reason && e.reason.message ? e.reason.message : String(e.reason);
        record({ t: Date.now(), type: 'rejection', msg, src: '', line: 0 });
    });

    window.VisiqErrors = {
        list: load,
        clear() { save([]); },
        renderPanel(container) {
            if (!container) return;
            const rows = load();
            const wrap = document.createElement('div');
            wrap.className = 'visiq-error-log';
            wrap.innerHTML = `<h3>Local error log</h3>
                <p style="font-size:0.8rem;color:var(--text-muted);">Stored in localStorage on this browser. Not sent anywhere.</p>
                <button type="button" class="fluid-btn" id="visiq-clear-errors">Clear log</button>
                <ol style="font-family:var(--font-mono);font-size:0.72rem;line-height:1.45;margin-top:12px;padding-left:18px;color:var(--text-secondary);">
                    ${rows.length ? rows.map(r => `<li>${new Date(r.t).toISOString()} — ${r.type}: ${r.msg}</li>`).join('') : '<li>No errors recorded yet.</li>'}
                </ol>`;
            container.appendChild(wrap);
            wrap.querySelector('#visiq-clear-errors').addEventListener('click', () => {
                window.VisiqErrors.clear();
                wrap.querySelector('ol').innerHTML = '<li>No errors recorded yet.</li>';
            });
        }
    };
})();
