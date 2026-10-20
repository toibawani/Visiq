import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';
const ROOT='/Users/apple/.cline/worktrees/50a82/Visiq';
const PORT=8143, BASE=`http://127.0.0.1:${PORT}`;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,BASE);let p=decodeURIComponent(u.pathname);if(p.endsWith('/'))p+='index.html';const f=join(ROOT,p);if(!f.startsWith(ROOT)){res.writeHead(403).end();return;}const b=await readFile(f);res.writeHead(200,{'Content-Type':MIME[extname(f)]||'application/octet-stream'});res.end(b);}catch(e){res.writeHead(404).end('nf');}});
await new Promise(r=>server.listen(PORT,'127.0.0.1',r));
const browser=await chromium.launch();
const ctx=await browser.newContext({viewport:{width:1440,height:900}});
const page=await ctx.newPage();
await page.addInitScript(()=>{localStorage.setItem('visiq_session',JSON.stringify({email:'a@b.test',loginTime:Date.now()}));localStorage.setItem('visiq_user_email','a@b.test');});
await page.goto(`${BASE}/index.html`,{waitUntil:'load'});
await page.waitForTimeout(3000);
const info = await page.evaluate(() => {
  const LM='main,nav,footer,header,aside,form,section[aria-label],section[aria-labelledby],[role=main],[role=navigation],[role=region],[role=banner],[role=contentinfo],[role=complementary],[role=form],[role=search]';
  const out=[];
  const walk=(el)=>{
    for(const c of el.children){
      const hasContent=[...c.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())||['IMG','IFRAME','OBJECT','VIDEO','AUDIO','CANVAS','SVG','BUTTON','SELECT','TEXTAREA','INPUT'].includes(c.tagName)||c.getAttribute('aria-label');
      const inLM=!!c.closest(LM);
      const inMainApp=!!c.closest('#main-app');
      if(!inLM && hasContent && inMainApp){
        out.push({tag:c.tagName,id:c.id,cls:(c.className||'').toString().slice(0,50),html:c.outerHTML.slice(0,120)});
      }
      walk(c);
    }
  };
  walk(document.body);
  return out;
});
console.log(JSON.stringify(info,null,1));
await browser.close(); server.close();
