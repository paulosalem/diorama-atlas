"""Build labelled inspection sheets without changing the original captures."""

import argparse
import json
import math
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True, help="capture.json")
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--views", default=".", help="View-key regular expression")
    parser.add_argument("--columns", type=int, default=2)
    parser.add_argument("--rows", type=int, default=3)
    parser.add_argument("--tile-width", type=int, default=800)
    args = parser.parse_args()
    if min(args.columns, args.rows, args.tile_width) < 1:
        parser.error("Sheet dimensions must be positive.")
    manifest = json.loads(args.input.read_text())
    pattern = re.compile(args.views)
    args.output_dir.mkdir(parents=True, exist_ok=False)
    font = ImageFont.load_default(size=17)
    tile_height = round(args.tile_width * 0.7)
    capacity = args.columns * args.rows
    index = []
    for scene in manifest["scenes"]:
        views = [view for view in scene["views"] if pattern.search(view["key"])]
        for start in range(0, len(views), capacity):
            batch = views[start : start + capacity]
            sheet = Image.new(
                "RGB",
                (
                    args.columns * args.tile_width,
                    math.ceil(len(batch) / args.columns) * tile_height,
                ),
                "#edf0e9",
            )
            draw = ImageDraw.Draw(sheet)
            for number, view in enumerate(batch):
                x = (number % args.columns) * args.tile_width
                y = (number // args.columns) * tile_height
                with Image.open(args.input.parent / view["file"]) as source:
                    image = ImageOps.contain(
                        source.convert("RGB"),
                        (args.tile_width - 12, tile_height - 45),
                        Image.Resampling.LANCZOS,
                    )
                sheet.paste(
                    image,
                    (
                        x + (args.tile_width - image.width) // 2,
                        y + 34 + (tile_height - 42 - image.height) // 2,
                    ),
                )
                draw.text((x + 8, y + 7), view["key"], font=font, fill="#19231e")
            name = f"{scene['id']}-{start // capacity + 1:02d}.jpg"
            sheet.save(args.output_dir / name, quality=92)
            index.append(
                {
                    "scene": scene["id"],
                    "file": name,
                    "views": [view["key"] for view in batch],
                }
            )
    (args.output_dir / "index.json").write_text(json.dumps(index, indent=2) + "\n")
    print(json.dumps({"sheets": len(index), "output": str(args.output_dir)}))


if __name__ == "__main__":
    main()
