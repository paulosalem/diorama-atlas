import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const readJson = async (path) =>
  JSON.parse(await readFile(new URL(path, root), "utf8"));
async function optionalJson(path) {
  try {
    return await readJson(path);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return null;
  }
}
const [
  earth,
  riad,
  interiors,
  outdoors,
  photographs,
  details,
  generated,
  printSources,
  printLibrary,
  audio,
  previews,
  narration,
  domusPhotographs,
  gerPhotographs,
] = await Promise.all([
  readJson("public/earth/credits.json"),
  readJson("public/riad/materials/manifest.json"),
  readJson("public/interiors/materials/manifest.json"),
  readJson("public/outdoors/materials/manifest.json"),
  readJson("public/outdoors/references.json"),
  optionalJson("public/outdoors/detail-assets/manifest.json"),
  optionalJson("public/outdoors/generated/manifest.json"),
  optionalJson("public/print-library/sources.json"),
  optionalJson("public/print-library/manifest.json"),
  readJson("public/audio/manifest.json"),
  readJson("public/previews/credits.json"),
  readJson("public/narration/manifest.json"),
  readJson("public/domus/references.json"),
  readJson("public/ger/references.json"),
]);
const title = (value) =>
  value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const cc0 = "https://creativecommons.org/publicdomain/zero/1.0/";
const entries = [
  {
    category: "Earth imagery",
    title: earth.title,
    author: earth.credit,
    source: earth.source,
    license: "NASA image-use guidelines",
    licenseUrl: "https://www.nasa.gov/nasa-brand-center/images-and-media/",
    note: "Earth texture; geographic orientation is described in the source manifest.",
  },
  {
    category: "Software",
    title: "Three.js",
    author: "Three.js authors",
    source: "https://threejs.org/",
    license: "MIT",
    licenseUrl: "https://github.com/mrdoob/three.js/blob/dev/LICENSE",
    note: "Real-time rendering, geometry, controls and post-processing.",
  },
  {
    category: "Generated concepts",
    title: "Historical interior concept imagery",
    author: "OpenAI image generation",
    source: "https://developers.openai.com/api/docs/guides/image-generation",
    license: "AI-generated concept imagery",
    note: "Earlier preview collections included generated concept imagery. This is historical provenance, not a description of current previews: all current interior and outdoor thumbnails, including the riad, are actual local 3D renders. Documentary style photographs are credited separately.",
  },
  {
    category: "Rendered previews",
    title: "Interior preview renders",
    author: "Diorama Atlas — local Three.js rendering",
    source: "/public/previews/credits.json",
    license:
      "Atlas-rendered imagery; constituent asset rights credited separately",
    usedBy: previews.rendered.map((preview) => preview.scene),
    note: `${previews.rendered.length} actual canvas captures, including the riad. Browser viewport ${previews.viewport.width} × ${previews.viewport.height}; cropped image dimensions, hashes and capture settings are recorded in the linked manifest. These are not generated reference photographs.`,
  },
];
for (const asset of [...riad, interiors])
  entries.push({
    category: "Scanned materials",
    title: title(asset.asset),
    author: "Poly Haven contributors — individual authors on the source page",
    source: asset.source,
    license: asset.license,
    licenseUrl: cc0,
    note: "Locally stored material maps used by the atlas environments.",
  });
for (const asset of outdoors.materials)
  entries.push({
    category: "Scanned materials",
    title: title(asset.assetId),
    author: Array.isArray(asset.author)
      ? asset.author.join("; ")
      : asset.author,
    source: asset.url,
    license: outdoors.license,
    licenseUrl: outdoors.licenseUrl,
    note: `${asset.resolution} photographic surface maps; generic material samples, not scans of the imagined settings.`,
  });
entries.push({
  category: "Lighting",
  title: title(outdoors.sky.assetId),
  author: outdoors.sky.author,
  source: outdoors.sky.url,
  license: outdoors.license,
  licenseUrl: outdoors.licenseUrl,
  note: "Locally stored outdoor HDR environment.",
});
for (const scene of [...photographs, ...domusPhotographs, ...gerPhotographs])
  for (const photo of scene.references)
    entries.push({
      category: "Style-reference photography",
      title: photo.label,
      author: photo.author,
      source: photo.url,
      license: photo.license,
      licenseUrl: photo.licenseUrl,
      date: photo.date,
      image: photo.image,
      usedBy: [scene.sceneId],
      note:
        "Real source photograph used to study a regional tradition, not a photograph of the fictional environment. " +
        photo.note,
    });
for (const asset of details?.assets ?? [])
  entries.push({
    category:
      asset.kind === "photographic-foliage"
        ? "Photographic foliage"
        : asset.kind === "hdri"
          ? "Lighting"
          : asset.kind === "3d-model"
            ? "3D models"
            : asset.kind === "texture" || asset.files
              ? "Scanned materials"
              : "Printed artwork",
    title: asset.title ?? title(asset.id),
    author: asset.author,
    source: asset.source,
    license: asset.license,
    licenseUrl: asset.licenseUrl,
    image: asset.image,
    date: asset.date,
    note: [asset.credit, asset.note].filter(Boolean).join(" · "),
  });
for (const asset of generated?.assets ?? [])
  entries.push({
    category: "Generated artwork",
    title: title(asset.id),
    author: `Generated with ${asset.model} (OpenAI)`,
    source:
      "https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst",
    license: "AI-generated original artwork",
    image: asset.image,
    date: asset.generatedAt.slice(0, 10),
    note: `${asset.note} Generation model, prompt, quality, usage and image hash are recorded in the local manifest.`,
  });
for (const asset of printSources?.assets ?? [])
  entries.push({
    category: "Printed artwork",
    title: asset.title,
    author: asset.author,
    source: asset.source,
    license: asset.license,
    licenseUrl: asset.licenseUrl,
    image: asset.image,
    note: asset.note,
  });
if (printLibrary?.assets?.length)
  entries.push({
    category: "Atlas print design",
    title: "Book jackets, labels, illustrated pages and wall prints",
    author: "Atlas — original typography and layout",
    source: "/public/print-library/manifest.json",
    license: "Original layouts incorporating the credited source artworks",
    note: `${printLibrary.assets.length} local image textures, with source attribution and image hashes in the linked manifest. Layouts were composed locally; no additional image-generation API calls were used.`,
  });
for (const asset of audio.assets)
  entries.push({
    category: asset.kind === "music" ? "Music" : "Recorded ambience",
    title: asset.title,
    author: asset.creator,
    source: asset.sourceUrl,
    license: asset.license,
    licenseUrl: asset.licenseUrl,
    audioId: asset.id,
    audio: asset.file,
    sha256: asset.sha256,
    attribution: asset.attribution,
    edits: asset.edits,
    licenseEvidence: asset.licenseEvidence,
    sourceMetadata: asset.sourceMetadata,
    provenance: "/public/audio/manifest.json",
    note: `${asset.description} ${asset.attribution} Processing history, source rights and verified file hashes are retained in the audio manifest.`,
  });
for (const asset of narration.assets)
  entries.push({
    category: "AI-generated narration",
    title: asset.title,
    author: asset.creator,
    source: asset.sourceUrl,
    license:
      "Original Atlas narration; generated voice subject to OpenAI terms",
    licenseUrl: asset.termsUrl,
    termsUrl: asset.termsUrl,
    narrationId: asset.id,
    audio: asset.file,
    sha256: asset.sha256,
    model: asset.model,
    voice: asset.voice,
    text: asset.text,
    locale: asset.locale,
    view: asset.view,
    disclosure: asset.disclosure,
    generatedAt: asset.generatedAt,
    usedBy: [asset.scene],
    provenance: "/public/narration/manifest.json",
    note: `${asset.disclosure} Generated with ${asset.model}, voice ${asset.voice}, for ${asset.locale}. Original Atlas narration, not a human field recording. No Creative Commons or public-domain grant is asserted; see the linked OpenAI terms for generated output.`,
  });
for (const entry of entries) {
  if (!entry.title || !entry.author || !entry.source || !entry.license)
    throw new Error(
      `Incomplete attribution for ${entry.title ?? "unnamed asset"}`,
    );
  if (
    !/^https:\/\//.test(entry.source) &&
    !/^\/public\/[a-z0-9/_-]+\.json$/.test(entry.source)
  )
    throw new Error(`Invalid source URL for ${entry.title}`);
  if (entry.licenseUrl && !entry.licenseUrl.startsWith("https://"))
    throw new Error(`Invalid license URL for ${entry.title}`);
  if (entry.image && !entry.image.startsWith("/public/"))
    throw new Error(`Invalid local image path for ${entry.title}`);
  if (
    entry.audioId &&
    (!/^\/public\/audio\/[a-z0-9/-]+\.mp3$/.test(entry.audio) ||
      !/^[a-f0-9]{64}$/.test(entry.sha256) ||
      !entry.attribution ||
      !Array.isArray(entry.edits) ||
      !entry.edits.length ||
      !/^\/public\/audio\/licenses\/[a-z0-9-]+\.txt$/.test(
        entry.licenseEvidence,
      ))
  )
    throw new Error(`Incomplete audio provenance for ${entry.title}`);
  if (
    entry.narrationId &&
    (!/^\/public\/narration\/[a-zA-Z0-9-]+\.mp3$/.test(entry.audio) ||
      !/^[a-f0-9]{64}$/.test(entry.sha256) ||
      !entry.model ||
      !entry.voice ||
      !entry.text ||
      !entry.disclosure ||
      !Number.isFinite(Date.parse(entry.generatedAt)) ||
      !entry.termsUrl?.startsWith("https://openai.com/policies/"))
  )
    throw new Error(`Incomplete narration provenance for ${entry.title}`);
}
const unique = new Map();
for (const entry of entries) {
  const key = `${entry.category}/${entry.source}/${entry.audioId ?? entry.narrationId ?? (entry.category === "Generated artwork" ? entry.image : "")}`;
  const previous = unique.get(key);
  if (previous)
    previous.usedBy = [
      ...new Set([...(previous.usedBy ?? []), ...(entry.usedBy ?? [])]),
    ];
  else unique.set(key, entry);
}
const credits = {
  title: "Atlas — imagined places, real traditions",
  description:
    "Original fictional settings informed by regional architecture, materials and everyday life. Map markers indicate regions of inspiration, not the addresses of these imagined places.",
  entries: [...unique.values()],
};
const previous = await optionalJson("public/credits.json");
if (
  previous &&
  JSON.stringify([previous.title, previous.description, previous.entries]) ===
    JSON.stringify([credits.title, credits.description, credits.entries])
) {
  console.log(`Attribution is current: ${unique.size} entries.`);
} else {
  await writeFile(
    new URL("public/credits.json", root),
    JSON.stringify(
      {
        ...credits,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Published ${unique.size} attribution entries in public/credits.json`,
  );
}
