"""Build data/data.js from the Deadlock API asset dumps.

Usage: python3 tools/build_data.py heroes.json items.json
Sources: https://api.deadlock-api.com/v1/assets/heroes and /v1/assets/items
"""
import json
import sys
from pathlib import Path

heroes_raw = json.load(open(sys.argv[1], encoding="utf-8"))
items_raw = json.load(open(sys.argv[2], encoding="utf-8"))

items = {}
for i in items_raw:
    if i.get("type") != "upgrade" or not i.get("shopable") or i.get("disabled"):
        continue
    key = i["class_name"].removeprefix("upgrade_")
    items[key] = {
        "id": i["id"],
        "name": i["name"],
        "slot": i.get("item_slot_type"),
        "tier": i.get("item_tier"),
        "cost": i.get("cost"),
        "active": bool(i.get("is_active_item")),
        "img": i.get("shop_image_webp") or i.get("image_webp") or i.get("image"),
    }

by_class = {("upgrade_" + k): k for k in items}


def popular(h, phase):
    out = []
    for p in (h.get("popular_items") or {}).get(phase, [])[:6]:
        key = by_class.get(p["class_name"])
        if key:
            out.append({"item": key, "pick": round(p["pick_pct"], 1), "wr": round(p["winrate_pct"], 1)})
    return out


heroes = []
for h in heroes_raw:
    if not h.get("player_selectable") or h.get("disabled") or h.get("in_development"):
        continue
    img = h.get("images", {})
    heroes.append({
        "id": h["id"],
        "name": h["name"],
        "type": h.get("hero_type"),
        "tags": h.get("tags", []),
        "gun": h.get("gun_tag"),
        "color": (h.get("colors") or {}).get("style_hex"),
        "icon": img.get("icon_hero_card_webp") or img.get("icon_hero_card"),
        "art": img.get("icon_hero_card_webp") or img.get("icon_hero_card"),
        "bg": img.get("background_image_webp") or img.get("background_image"),
        "nameImg": img.get("name_image"),
        "role": (h.get("description") or {}).get("role"),
        "playstyle": (h.get("description") or {}).get("playstyle"),
        "lore": (h.get("description") or {}).get("lore"),
        "complexity": h.get("complexity"),
        "model": (h.get("models") or {}).get("hero_select"),
        "small": img.get("icon_image_small_webp") or img.get("icon_image_small"),
        "popular": {ph: popular(h, ph) for ph in ("early_game", "mid_game", "late_game")},
    })

heroes.sort(key=lambda x: x["name"])
out = Path(__file__).resolve().parent.parent / "data" / "data.js"
out.write_text(
    "window.DATA = " + json.dumps({"heroes": heroes, "items": items}, ensure_ascii=False, indent=1) + ";\n",
    encoding="utf-8",
)
print(f"heroes: {len(heroes)}, shop items: {len(items)} -> {out}")
