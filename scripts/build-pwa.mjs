import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
async function files(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await files(p)));
    else out.push(p);
  }
  return out;
}
const entries = (await files("dist"))
  .filter((p) => !p.endsWith("sw.js") && !p.includes(".well-known"))
  .sort();
const hash = createHash("sha256");
for (const p of entries) {
  hash.update(p);
  hash.update(await fs.readFile(p));
}
const cache = "ronda-static-" + hash.digest("hex").slice(0, 16),
  urls = entries.map(
    (p) => "/" + path.relative("dist", p).replaceAll("\\", "/"),
  );
const sw = `// Generated from the complete build; save data stays in localStorage.
const CACHE=${JSON.stringify(cache)}, ASSETS=${JSON.stringify(urls)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ronda-static-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/.well-known/'))return;
 if(event.request.mode==='navigate'&&(url.pathname==='/'||url.pathname==='/index.html')){
  event.respondWith(caches.open(CACHE).then(cache=>cache.match('/index.html')).then(cached=>cached||fetch(event.request)));return;
 }
 if(ASSETS.includes(url.pathname))event.respondWith(caches.open(CACHE).then(cache=>cache.match(url.pathname)).then(cached=>cached||fetch(event.request)));
});
`;
await fs.writeFile("dist/sw.js", sw);
console.log(`PWA: ${urls.length} local assets, cache ${cache}.`);
