import { readFile, writeFile } from "node:fs/promises";
import { linkGalleryToApp } from "./helpers/gallery-links.mjs";

const root = new URL("../outputs/patina/", import.meta.url);
const appUrl = process.env.ATLAS_URL ?? "http://127.0.0.1:4183";
const before = JSON.parse(
  await readFile(new URL("before/capture.json", root), "utf8"),
);
const after = JSON.parse(
  await readFile(new URL("after/capture.json", root), "utf8"),
);
if (before.scenes.length !== after.scenes.length)
  throw new Error("The before/after atlas captures are incomplete.");
const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
const cards = after.scenes
  .map((scene) => {
    const original = before.scenes.find((entry) => entry.id === scene.id);
    if (
      !original ||
      scene.views.some((view) => !original.views.includes(view)) ||
      !(scene.patina.materials > 0)
    )
      throw new Error(`Missing comparison evidence for ${scene.id}`);
    const view = scene.views[0],
      image = `${scene.id}--${view}.png`;
    return `<article data-scene="${escape(scene.id)}"><header><h2>${escape(scene.title)}</h2><select aria-label="Viewpoint for ${escape(scene.title)}">${scene.views.map((key) => `<option value="${escape(key)}">${escape(key.replaceAll("-", " "))}</option>`).join("")}</select></header><div class="comparison"><img class="after" src="after/${image}" loading="lazy" alt="${escape(scene.title)} with natural variation and patina"><img class="before" src="before/${image}" loading="lazy" alt="${escape(scene.title)} before the surface update"><div class="divider"></div><span class="label old">Before</span><span class="label new">After</span><input type="range" min="0" max="100" value="50" aria-label="Before and after comparison for ${escape(scene.title)}"></div><footer><span>${escape(Object.keys(scene.patina.profiles).join(" · "))}</span><a href="/?scene=${scene.id}&inspect=1&view=${view}">Explore the place ↗</a></footer></article>`;
  })
  .join("\n");
await writeFile(
  new URL("index.html", root),
  linkGalleryToApp(
    `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Atlas · Surfaces with a history</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#132126;color:#eae5d8;font:14px system-ui,sans-serif}main{max-width:1500px;margin:auto;padding:38px 24px 70px}h1{font:normal clamp(32px,5vw,48px) Georgia;margin:20px 0}p{max-width:840px;line-height:1.8;color:#bbc7c2}.eyebrow{font-size:10px;letter-spacing:.2em;color:#d1bb92}a{color:#d8c294;text-decoration:none}a:hover{text-decoration:underline}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(540px,100%),1fr));gap:28px;margin-top:35px}article{background:#1b2c30;border:1px solid #ffffff13;border-radius:12px;overflow:hidden}header{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:16px 18px}h2{font:normal 23px Georgia;margin:0}select{max-width:150px;background:#142126;border:1px solid #ffffff28;border-radius:6px;color:#d9d5c7;padding:7px;font:11px system-ui}.comparison{position:relative;--split:50%}.comparison img{display:block;width:100%}.before{position:absolute;inset:0;clip-path:inset(0 calc(100% - var(--split)) 0 0)}.divider{position:absolute;top:0;bottom:0;left:var(--split);border-left:1px solid #f8f1d8b0;pointer-events:none}.label{position:absolute;top:12px;padding:5px 9px;border-radius:4px;background:#101b21c9;color:#eee8d4;font-size:10px;pointer-events:none}.old{left:12px}.new{right:12px}input[type=range]{position:absolute;left:3%;bottom:9px;width:94%;accent-color:#d6be8b;cursor:ew-resize}footer{display:flex;justify-content:space-between;gap:14px;padding:14px 18px;font-size:10px;color:#aebcb4}a:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #e4c992;outline-offset:3px}
</style></head><body><main><a href="/">Return to the world</a><p class="eyebrow">ATLAS / SURFACE STUDIES</p><h1>Surfaces with a history.</h1><p>Natural colour and grain variation, occasional fractures, handling wear and uneven weathering across all ${after.scenes.length} places. The laying patterns remain deliberate; the materials no longer repeat as identical copies. Clear materials, foliage and printed artwork are protected.</p><p>Move each divider to compare actual before-and-after renders, or enter a place to look around.</p><div class="grid">${cards}</div></main>
<script>
for(const article of document.querySelectorAll('article')){
  const comparison=article.querySelector('.comparison');
  article.querySelector('input').addEventListener('input',event=>comparison.style.setProperty('--split',event.target.value+'%'));
  article.querySelector('select').addEventListener('change',event=>{
    const file=article.dataset.scene+'--'+event.target.value+'.png';
    article.querySelector('.before').src='before/'+file;
    article.querySelector('.after').src='after/'+file;
    article.querySelector('footer a').href=${JSON.stringify(new URL("/", appUrl).href)}+'?scene='+encodeURIComponent(article.dataset.scene)+'&inspect=1&view='+encodeURIComponent(event.target.value);
  });
}
</script></body></html>`,
    appUrl,
  ),
);
console.log(
  `Published before/after surface comparisons for ${after.scenes.length} places.`,
);
