"""Natural Earth -> hf/tex/masks.png (R = Sahara, G = Amazon basin, B = USA). Edit REGIONS to bake other regions.
Needs: pip install pillow ; Natural Earth GeoJSON (public domain) in NE_DIR."""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
NE_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r"D:\Youtube_Projects\_assets\natural_earth")
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("hf/tex/masks.png")
W, H = 4096, 2048
px = lambda lon, lat: ((lon + 180) / 360 * W, (90 - lat) / 180 * H)
def polys(g): return [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
def draw(geoms):
    im = Image.new("L", (W, H), 0); d = ImageDraw.Draw(im)
    for g in geoms:
        for poly in polys(g):
            d.polygon([px(*p[:2]) for p in poly[0]], fill=255)
            for hole in poly[1:]: d.polygon([px(*p[:2]) for p in hole], fill=0)
    return im.filter(ImageFilter.GaussianBlur(2))
R = json.load(open(NE_DIR / "ne_50m_geography_regions_polys.geojson", encoding="utf-8"))
C = json.load(open(NE_DIR / "ne_50m_admin_0_countries.geojson", encoding="utf-8"))
name = lambda f: f["properties"].get("name") or f["properties"].get("NAME")
sahara = [f["geometry"] for f in R["features"] if name(f) == "SAHARA"]
amazon = [f["geometry"] for f in R["features"] if name(f) == "AMAZON BASIN"]
usa = [f["geometry"] for f in C["features"] if f["properties"]["NAME"] == "United States of America"]
Image.merge("RGB", (draw(sahara), draw(amazon), draw(usa))).save(OUT, optimize=True); print("saved", OUT)
