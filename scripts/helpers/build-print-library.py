"""Compose original, image-based printed props from attributed source artwork."""
import hashlib
import json
import random
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/print-library"
CATALOG = json.loads(subprocess.run(
    ["node", "--input-type=module", "-e",
     "import {printCatalog} from './src/client/environments/shared/print-catalog.js'; console.log(JSON.stringify(printCatalog));"],
    cwd=ROOT, check=True, capture_output=True, text=True,
).stdout)
SOURCES = {}
for path in [
    ROOT / "public/print-library/sources.json",
    ROOT / "public/outdoors/detail-assets/manifest.json",
    ROOT / "public/outdoors/generated/manifest.json",
]:
    for item in json.loads(path.read_text())["assets"]:
        if item.get("image"):
            SOURCES[item["id"]] = item
FONT = "/System/Library/Fonts/Supplemental/Georgia.ttf"
SANS = "/System/Library/Fonts/Supplemental/Arial.ttf"
RESULTS = []


def paper(size, seed):
    rng = random.Random(seed)
    base = Image.new("RGB", size, (231, 222, 199))
    draw = ImageDraw.Draw(base)
    w, h = size
    for _ in range(w * h // 110):
        x, y = rng.randrange(w), rng.randrange(h)
        shade = rng.choice([(222, 210, 186), (238, 230, 210), (213, 202, 180)])
        draw.line((x, y, x + rng.randrange(1, 4), y), fill=shade)
    for inset in range(18):
        shade = 195 + inset
        draw.rectangle((inset, inset, w - inset - 1, h - inset - 1),
                       outline=(shade + 12, shade + 4, shade - 13))
    for _ in range(12):
        x = rng.choice([rng.randrange(8, 28), w - rng.randrange(8, 28)])
        y = rng.randrange(30, h - 30)
        draw.line((x, y, x + rng.randrange(-6, 7), y + rng.randrange(8, 28)), fill=(191, 178, 150), width=1)
    return base


def text(draw, wording, y, width, size, ink, serif=True):
    font = ImageFont.truetype(FONT if serif else SANS, size)
    while draw.textbbox((0, 0), wording, font=font)[2] > width * .84:
        size -= 1
        font = ImageFont.truetype(FONT if serif else SANS, size)
    draw.text((width / 2, y), wording, font=font, fill=ink, anchor="mt")


def art(source_id):
    entry = SOURCES[source_id]
    return Image.open(ROOT / entry["image"].lstrip("/")).convert("RGB")


def place_art(image, source_id, box):
    artwork = ImageOps.contain(art(source_id), (box[2] - box[0], box[3] - box[1]))
    image.paste(artwork, (box[0] + (box[2] - box[0] - artwork.width) // 2,
                          box[1] + (box[3] - box[1] - artwork.height) // 2))


def save(image, name, recipe, kind):
    destination = OUT / f"{name}.jpg"
    image.save(destination, quality=93, subsampling=0)
    RESULTS.append({
        "id": name, "kind": kind, "image": f"/public/print-library/{name}.jpg",
        "title": recipe["title"], "sourceId": recipe["source"],
        "sourceImage": SOURCES[recipe["source"]]["image"],
        "sourceUrl": SOURCES[recipe["source"]].get("source", "https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst"),
        "sourceAuthor": SOURCES[recipe["source"]].get("author", f"Generated with {SOURCES[recipe['source']].get('model', 'OpenAI image generation')}"),
        "sourceLicense": SOURCES[recipe["source"]].get("license", "AI-generated original artwork"),
        "dimensions": list(image.size),
        "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
        "note": "Original fictional print layout for Atlas, incorporating the attributed source image. "
                "Typography, cropping, paper grain and handling wear were composed locally; no new image-generation API was used.",
    })


def designed_print(recipe, kind, size):
    w, h = size
    image = paper(size, f"{kind}/{recipe['id']}")
    draw = ImageDraw.Draw(image)
    ink = recipe["ink"]
    if recipe.get("facsimile") and kind == "book-front":
        place_art(image, recipe["source"], (16, 16, w - 16, h - 16))
    else:
        text(draw, recipe["title"], int(h * .065), w, max(22, int(w * .065)), ink)
        text(draw, recipe["subtitle"], int(h * .145), w, max(12, int(w * .026)), ink, False)
        draw.line((w * .12, h * .195, w * .88, h * .195), fill=ink, width=max(1, w // 380))
        place_art(image, recipe["source"], (int(w * .10), int(h * .23), int(w * .90), int(h * .85)))
        text(draw, "A COLLECTED STUDY" if kind.startswith("book") else "SMALL COLLECTION",
             int(h * .905), w, max(10, int(w * .022)), ink, False)
    return image


OUT.mkdir(parents=True, exist_ok=True)
for recipe in CATALOG["books"]:
    image = designed_print(recipe, "book-front", (768, 1152))
    save(image, f"book-{recipe['id']}-front", recipe, "book-cover")
    back = paper((768, 1152), f"back/{recipe['id']}")
    place_art(back, recipe["source"], (170, 140, 598, 830))
    draw = ImageDraw.Draw(back)
    text(draw, recipe["title"], 930, 768, 34, recipe["ink"])
    text(draw, "NOTES · PLATES · OBSERVATIONS", 1010, 768, 20, recipe["ink"], False)
    save(back, f"book-{recipe['id']}-back", recipe, "book-back")
    spine = paper((128, 1152), f"spine/{recipe['id']}")
    spine = Image.blend(Image.new("RGB", spine.size, recipe["ink"]), spine, .12)
    strip = Image.new("RGBA", (850, 100), (0, 0, 0, 0))
    sd = ImageDraw.Draw(strip)
    text(sd, recipe["title"], 22, 850, 42, "#e9ddbc")
    strip = strip.rotate(-90, expand=True)
    spine.paste(strip, (14, 160), strip)
    place_art(spine, recipe["source"], (20, 920, 108, 1070))
    draw = ImageDraw.Draw(spine)
    for y in [56, 72, 1100, 1115]:
        draw.line((16, y, 112, y), fill="#cbb991", width=2)
    save(spine, f"book-{recipe['id']}-spine", recipe, "book-spine")
    for side in ["left", "right"]:
        page = paper((768, 1152), f"page/{recipe['id']}/{side}")
        draw = ImageDraw.Draw(page)
        text(draw, recipe["title"], 65, 768, 31, recipe["ink"])
        if side == "left":
            place_art(page, recipe["source"], (65, 155, 703, 995))
        else:
            place_art(page, recipe["source"], (135, 155, 633, 715))
            font = ImageFont.truetype(FONT, 22)
            lines = [
                "Close observation begins with ordinary things:",
                "the edge of a leaf, the grain of a surface,",
                "the shape of a vessel and the light around it.",
                "",
                "These collected plates leave room for notes,",
                "comparisons and discoveries made along the way.",
            ]
            for n, line in enumerate(lines):
                draw.text((76, 800 + n * 34), line, fill=recipe["ink"], font=font)
        text(draw, "24" if side == "left" else "25", 1080, 768, 20, recipe["ink"])
        save(page, f"book-{recipe['id']}-page-{side}", recipe, "illustrated-page")

for recipe in CATALOG["labels"]:
    image = designed_print(recipe, "label", (384, 512))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((12, 12, 371, 499), radius=18, outline=recipe["ink"], width=2)
    save(image, f"label-{recipe['id']}", recipe, "container-label")
    drawer = paper((640, 256), f"drawer/{recipe['id']}")
    place_art(drawer, recipe["source"], (16, 14, 195, 242))
    draw = ImageDraw.Draw(drawer)
    draw.text((225, 68), recipe["title"], font=ImageFont.truetype(FONT, 31), fill=recipe["ink"])
    draw.text((226, 132), "COLLECTION", font=ImageFont.truetype(SANS, 18), fill=recipe["ink"])
    draw.line((225, 170, 586, 170), fill=recipe["ink"], width=2)
    save(drawer, f"drawer-{recipe['id']}", recipe, "drawer-label")
for recipe in CATALOG["posters"]:
    save(designed_print(recipe, "poster", (768, 1152)), f"poster-{recipe['id']}", recipe, "wall-print")
for recipe in CATALOG["records"]:
    save(designed_print(recipe, "record", (768, 768)), f"record-{recipe['id']}", recipe, "record-sleeve")
    spine = paper((64, 1536), f"record-spine/{recipe['id']}")
    spine = Image.blend(Image.new("RGB", spine.size, recipe["ink"]), spine, .12)
    strip = Image.new("RGBA", (1250, 50), (0, 0, 0, 0))
    text(ImageDraw.Draw(strip), recipe["title"], 5, 1250, 35, "#e9ddbc", False)
    strip = strip.rotate(-90, expand=True)
    spine.paste(strip, (7, 105), strip)
    place_art(spine, recipe["source"], (8, 1350, 56, 1480))
    save(spine, f"record-spine-{recipe['id']}", recipe, "record-spine")

(OUT / "manifest.json").write_text(json.dumps({
    "kind": "image-based-print-library",
    "note": "Original fictional layouts using real source artwork; not replicas of historical book covers, modern brands or actual businesses.",
    "assets": RESULTS,
}, ensure_ascii=False, indent=2) + "\n")
print(f"Published {len(RESULTS)} image-based print assets.")
