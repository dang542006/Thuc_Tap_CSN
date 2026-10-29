import json
from pathlib import Path
from urllib.parse import urlparse

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
UPLOADS = ROOT / "backend" / "uploads" / "catalog"
MANIFEST = ROOT / "docs" / "product-image-sources.json"
OUTPUT = ROOT / "docs" / "product-catalog-image-contact-sheet-2026-10-29.jpg"
items = json.loads(MANIFEST.read_text(encoding="utf-8"))

columns, cell_w, cell_h, pad = 5, 250, 292, 8
rows = (len(items) + columns - 1) // columns
sheet = Image.new("RGB", (columns * cell_w, rows * cell_h), "#f0f2f3")
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("arial.ttf", 12)
    small = ImageFont.truetype("arial.ttf", 10)
except OSError:
    font = ImageFont.load_default()
    small = font

kind_labels = {
    "product-photo": "PHOTO — model verified",
    "official-product-render": "OFFICIAL RENDER — not a photo",
    "retailer-product-image": "RETAILER IMAGE — photo/render",
    "original-illustration": "VECTOR ILLUSTRATION",
    "unverified-photo": "UNVERIFIED PHOTO — model/source pending",
    "missing-image": "MISSING IMAGE — fallback expected",
}
kind_colors = {
    "product-photo": "#245c3d",
    "official-product-render": "#785b1f",
    "retailer-product-image": "#315b82",
    "original-illustration": "#a33a2f",
    "unverified-photo": "#a33a2f",
    "missing-image": "#a33a2f",
}

for index, item in enumerate(items):
    x, y = (index % columns) * cell_w, (index // columns) * cell_h
    draw.rounded_rectangle((x + 3, y + 3, x + cell_w - 4, y + cell_h - 4), 6, fill="white", outline="#d9dfe1")
    image_path = UPLOADS / item["imageFile"] if item.get("imageFile") else None
    try:
        if image_path is None:
            raise FileNotFoundError("No mapped product image")
        image = Image.open(image_path).convert("RGBA")
        image.thumbnail((cell_w - 2 * pad, 190))
        px = x + (cell_w - image.width) // 2
        py = y + 9 + (190 - image.height) // 2
        tile = Image.new("RGBA", image.size, "white")
        tile.alpha_composite(image)
        sheet.paste(tile.convert("RGB"), (px, py))
    except Exception:
        draw.text((x + pad, y + 20), "IMAGE MISSING / INVALID", fill="#a33a2f", font=font)

    label_y = y + 203
    draw.text((x + pad, label_y), item["slug"][:34], fill="#192229", font=font)
    draw.text((x + pad, label_y + 22), kind_labels.get(item.get("kind"), item.get("kind", "unknown").upper()),
              fill=kind_colors.get(item.get("kind"), "#53606a"), font=small)
    source = item.get("sourcePage") or "source not verified"
    domain = urlparse(source).netloc if source.startswith("http") else source
    draw.text((x + pad, label_y + 40), domain[:36], fill="#69747a", font=small)
    draw.text((x + pad, label_y + 58), (item.get("imageFile") or "No image / fallback")[:36], fill="#69747a", font=small)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
sheet.save(OUTPUT, quality=90, optimize=True)
print(f"Saved {OUTPUT} ({len(items)} catalog image records)")
