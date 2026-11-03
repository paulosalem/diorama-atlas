import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { outdoorScenes } from "../src/client/catalog/outdoor-catalog.js";

const directory = process.argv[2];
if (!directory || process.argv.length !== 3)
  throw new Error(
    "Usage: node scripts/build-realism-report.mjs REVIEW_DIRECTORY",
  );
const root = resolve(directory);
const passes = await Promise.all(
  [1, 2, 3].map(async (pass) =>
    JSON.parse(
      await readFile(resolve(root, `pass-${pass}/results.json`), "utf8"),
    ),
  ),
);
const sceneIds = Object.keys(passes[0].settings ?? {}).sort();
if (
  !sceneIds.length ||
  passes.some(
    (review) =>
      JSON.stringify(Object.keys(review.settings ?? {}).sort()) !==
      JSON.stringify(sceneIds),
  )
)
  throw new Error(
    "Every inspection pass must cover the same nonempty set of settings.",
  );
const scenes = sceneIds.map((id) => {
  const scene = outdoorScenes.find((scene) => scene.id === id);
  if (!scene) throw new Error(`Unknown reviewed setting: ${id}`);
  return scene;
});
const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
const summaries = scenes.map((scene) => ({
  id: scene.id,
  title: scene.title,
  passes: passes.map((review, index) => {
    const result = review.settings[scene.id];
    if (!result || Object.keys(result.rubric).length !== 10)
      throw new Error(
        `Incomplete review matrix for ${scene.id}, pass ${index + 1}`,
      );
    for (const item of Object.values(result.rubric))
      if (!["pass", "fail", "blocked"].includes(item.verdict))
        throw new Error("Invalid visual-review verdict.");
    if (result.rubric["complete-inspection"].verdict !== "pass")
      throw new Error(
        `Inspection coverage is incomplete for ${scene.id}, pass ${index + 1}`,
      );
    if (
      result.overallPhotographicRead !==
      result.rubric["photographic-read"].verdict
    )
      throw new Error(
        `Photographic verdicts disagree for ${scene.id}, pass ${index + 1}`,
      );
    const arrival = result.viewInventory.presetWides[0];
    if (!/^screens\/[a-z0-9_-]+\.png$/.test(arrival))
      throw new Error(`Invalid evidence path for ${scene.id}`);
    return {
      pass: index + 1,
      photographicRead: result.overallPhotographicRead,
      passedCriteria: Object.values(result.rubric).filter(
        (item) => item.verdict === "pass",
      ).length,
      reason: result.overallReason,
      arrival,
    };
  }),
}));
const photographic = summaries.filter(
  (scene) => scene.passes[2].photographicRead === "pass",
).length;
const inspections = summaries.length * passes.length;
const criterionJudgements = inspections * 10;
let repair = null;
try {
  repair = JSON.parse(
    await readFile(resolve(root, "post-review-repair.json"), "utf8"),
  );
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const repairNote = repair
  ? '<p class="notice">A bench-support artifact reported in pass 3 was subsequently repaired and checked. Original review verdicts are preserved. <a href="post-review-repair/index.html">See the targeted repair evidence.</a></p>'
  : "";
const rows = summaries
  .map(
    (scene) =>
      `<tr><th><a href="/?scene=${scene.id}&inspect=1">${escape(scene.title)}</a></th>${scene.passes
        .map(
          (pass) =>
            `<td><span class="verdict ${pass.photographicRead}">${escape(pass.photographicRead)}</span><small>${pass.passedCriteria}/10 criteria passed</small></td>`,
        )
        .join("")}</tr>`,
  )
  .join("");
const details = summaries
  .map(
    (scene) =>
      `<article><h2>${escape(scene.title)}</h2><div class="comparisons">${scene.passes
        .map(
          (pass) =>
            `<section><h3>Pass ${pass.pass}</h3><a href="pass-${pass.pass}/${escape(pass.arrival)}"><img loading="lazy" src="pass-${pass.pass}/${escape(pass.arrival)}" alt="${escape(scene.title)}, inspection pass ${pass.pass}"></a><p>${escape(pass.reason)}</p><a class="report-link" href="pass-${pass.pass}/report.md">Full findings and evidence</a></section>`,
        )
        .join("")}</div></article>`,
  )
  .join("");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Atlas · Three realism inspections</title><style>
*{box-sizing:border-box}body{margin:0;background:#142126;color:#eae5d8;font:14px system-ui,sans-serif}main{max-width:1450px;margin:auto;padding:42px 28px 70px}h1{font:normal 40px Georgia,serif;margin:20px 0}h2{font:normal 28px Georgia,serif}h3{font-size:12px;font-weight:500;color:#d3be93}p{line-height:1.8;color:#bbc8c4;max-width:1000px}a{color:#d8c294;text-underline-offset:3px}table{width:100%;border-collapse:collapse;margin:30px 0 55px}th,td{text-align:left;border-bottom:1px solid #ffffff1c;padding:14px 10px}th{font-weight:500}small{display:block;color:#9cafa9;margin-top:5px;font-size:10px}.verdict{font-size:11px;text-transform:uppercase;letter-spacing:.06em}.pass{color:#a3c7a4}.fail{color:#e6af91}.blocked{color:#d9c87f}.notice{padding:18px 22px;border:1px solid #bca57b55;background:#29302d;border-radius:9px}.comparisons{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}article{margin-top:50px}img{width:100%;display:block;border-radius:7px}section p{font-size:12px}.report-link{font-size:11px}@media(max-width:700px){.comparisons{grid-template-columns:1fr}main{padding:25px 16px}h1{font-size:32px}th,td{padding:10px 5px;font-size:11px}}
</style></head><body><main><a href="/outputs/outdoor-review/index.html">Return to the outdoor collection</a><h1>Three complete realism inspections.</h1><p>${summaries.length} settings were independently reinspected in each pass: <strong>${inspections} setting inspections and ${criterionJudgements} criterion judgements</strong>, using fresh renders from immutable app snapshots. Changes were made between passes. Functional checks are separate from the visual photographic-read judgement.</p><p class="notice"><strong>Final photographic-read result: ${photographic}/${summaries.length} pass.</strong> ${photographic === summaries.length ? "All settings met this review criterion." : "The remaining settings must not be described as photographically indistinguishable. Their precise remaining limitations are recorded below."}</p><table><thead><tr><th>Imagined setting</th><th>Pass 1</th><th>Pass 2</th><th>Pass 3</th></tr></thead><tbody>${rows}</tbody></table>${details}</main></body></html>`;
await mkdir(dirname(resolve(root, "index.html")), { recursive: true });
await writeFile(
  resolve(root, "index.html"),
  html.replace("<table>", `${repairNote}<table>`),
);
await writeFile(
  resolve(root, "summary.json"),
  JSON.stringify(
    {
      inspections,
      criterionJudgements,
      finalPhotographicPasses: photographic,
      settings: summaries,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Published three-pass review: ${photographic}/${summaries.length} meet the final photographic-read criterion.`,
);
