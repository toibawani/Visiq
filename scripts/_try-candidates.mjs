import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const AXE = require.resolve('axe-core/axe.min.js');
const ROOT = resolve('/Users/apple/.cline/worktrees/50a82/Visiq');
const PORT = 8140, BASE = `http://127.0.0.1:${PORT}`;
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.woff2':'font/woff2', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp' };
const server = createServer(async (req,res)=>{ try{ const u=new URL(req.url,BASE); let p=decodeURIComponent(u.pathname); if(p.endsWith('/'))p+='index.html'; const f=join(ROOT,p); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} const b=await readFile(f); res.writeHead(200,{'Content-Type':MIME[extname(f)]||'application/octet-stream'}); res.end(b);}catch(e){res.writeHead(404).end('nf');} });
await new Promise(r=>server.listen(PORT,'127.0.0.1',r));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1440,height:900} });
const page = await ctx.newPage();
await page.addInitScript(()=>{ localStorage.setItem('visiq_session', JSON.stringify({email:'a@b.test',loginTime:Date.now()})); localStorage.setItem('visiq_user_email','a@b.test'); });
await page.goto(`${BASE}/index.html`, { waitUntil:'load' });
await page.waitForTimeout(4000);

const axeSrc = await readFile(AXE,'utf8');

// Apply the candidate patch
await page.evaluate((patchSrc) => { (0,eval)(patchSrc); }, await readFile('/tmp/probe-candidates.js','utf8'));

await page.addScriptTag({ content: axeSrc });
const res = await page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}, resultTypes:['violations'] });
    return r.violations.map(v=>({ id:v.id, impact:v.impact, n:v.nodes.length, sample:v.nodes.slice(0,2).map(x=>({t:x.target,h:(x.html||'').slice(0,110)})) }));
});
console.log(JSON.stringify(res,null,1));
await browser.close(); server.close();
