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


raw_by_class = {i["class_name"]: i for i in items_raw}


def prop_value(props, name):
    v = (props or {}).get(name) or {}
    raw = v.get("value")
    if raw in (None, "", "0", "0.0", 0):
        return None
    s = str(raw)
    post = v.get("postfix") or ""
    return s if (not post or s.endswith(post)) else s + post


def ability_entry(cls):
    a = raw_by_class.get(cls)
    if not a:
        return None
    props = a.get("properties") or {}
    sections = (a.get("tooltip_details") or {}).get("info_sections") or []
    names = []
    for sec in sections[:1]:
        for blk in sec.get("properties_block") or []:
            names += [p.get("important_property") for p in blk.get("properties") or [] if p.get("important_property")]
        names += sec.get("basic_properties") or []
    tiles = []
    for n in names[:6]:
        label = (props.get(n) or {}).get("label")
        val = prop_value(props, n)
        if label and val:
            tiles.append({"prop": n, "label": label, "value": val})
    d = a.get("description") or {}
    return {
        "id": a["id"], "name": a["name"], "img": a.get("image_webp") or a.get("image"),
        "desc": d.get("desc"), "cooldown": prop_value(props, "AbilityCooldown"),
        "tiles": tiles, "tiers": [d.get("t1_desc"), d.get("t2_desc"), d.get("t3_desc")],
    }


def hero_stats(h):
    w = raw_by_class.get((h.get("items") or {}).get("weapon_primary")) or {}
    wi = w.get("weapon_info") or {}
    ss = h.get("starting_stats") or {}
    g = lambda k: (ss.get(k) or {}).get("value")
    return {
        "dps": wi.get("damage_per_second"), "bulletDamage": wi.get("bullet_damage"), "bps": wi.get("bullets_per_second"),
        "ammo": wi.get("clip_size"), "reload": wi.get("reload_duration"), "lightMelee": g("light_melee_damage"),
        "heavyMelee": g("heavy_melee_damage"), "health": g("max_health"), "regen": g("base_health_regen"),
        "moveSpeed": g("max_move_speed"), "sprint": g("sprint_speed"), "stamina": g("stamina"), "gunName": w.get("name"),
    }


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
        "code": (h.get("class_name") or "").removeprefix("hero_"),
        "abilities": [e for e in (ability_entry((h.get("items") or {}).get(f"signature{n}")) for n in (1, 2, 3, 4)) if e],
        "stats": hero_stats(h),
        "small": img.get("icon_image_small_webp") or img.get("icon_image_small"),
        "popular": {ph: popular(h, ph) for ph in ("early_game", "mid_game", "late_game")},
    })

heroes.sort(key=lambda x: x["name"])
out = Path(__file__).resolve().parent.parent / "data" / "data.js"
out.write_text(
    "window.DATA = " + json.dumps({"heroes": heroes, "items": items}, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)
print(f"heroes: {len(heroes)}, shop items: {len(items)} -> {out}")
