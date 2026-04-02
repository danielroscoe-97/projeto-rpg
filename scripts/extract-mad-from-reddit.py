#!/usr/bin/env python3
"""
MAD Reddit Extractor
Fetches Monster a Day monsters from Reddit posts -> Homebrewery.
Covers the ~700 monsters NOT in the PDF compendiums.

Usage:
    python scripts/extract-mad-from-reddit.py              # full run (writes monsters-mad-reddit.json)
    python scripts/extract-mad-from-reddit.py --limit 10  # test with 10 monsters
    python scripts/extract-mad-from-reddit.py --merge      # merge result into monsters-mad.json
    python scripts/extract-mad-from-reddit.py --no-cache   # re-fetch even if cached
    python scripts/extract-mad-from-reddit.py --dry-run    # fetch/parse only, no file writes

Dependencies: pip install requests openpyxl
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Optional

try:
    import requests
    import openpyxl
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Install with: pip install requests openpyxl")
    sys.exit(1)

# ─── Paths ────────────────────────────────────────────────────────────────────

SCRIPT_DIR   = Path(__file__).parent
ROOT_DIR     = SCRIPT_DIR.parent
MAD_DIR      = ROOT_DIR / "monster a day - nao apagar"
EXCEL_PATH   = MAD_DIR / "Monster a Day Index.xlsx"
OUTPUT_JSON  = ROOT_DIR / "public" / "srd" / "monsters-mad.json"
REDDIT_JSON  = ROOT_DIR / "public" / "srd" / "monsters-mad-reddit.json"
CACHE_DIR    = SCRIPT_DIR / ".mad-cache"
FAIL_LOG     = SCRIPT_DIR / ".mad-cache" / "failures.json"

# ─── Config ───────────────────────────────────────────────────────────────────

DELAY_REDDIT      = 2.0   # seconds between Reddit requests (be polite)
DELAY_HOMEBREWERY = 1.5   # seconds between Homebrewery requests
REQUEST_TIMEOUT   = 20    # seconds

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

XP_BY_CR = {
    "0": 10, "1/8": 25, "1/4": 50, "1/2": 100,
    "1": 200, "2": 450, "3": 700, "4": 1100, "5": 1800,
    "6": 2300, "7": 2900, "8": 3900, "9": 5000, "10": 5900,
    "11": 7200, "12": 8400, "13": 10000, "14": 11500, "15": 13000,
    "16": 15000, "17": 18000, "18": 20000, "19": 22000, "20": 25000,
    "21": 33000, "22": 41000, "23": 50000, "24": 62000, "25": 75000,
    "26": 90000, "27": 105000, "28": 120000, "29": 135000, "30": 155000,
}

# ─── Cache ────────────────────────────────────────────────────────────────────

def cache_get(subdir: str, key: str) -> Optional[str]:
    safe_key = re.sub(r'[^\w-]', '_', key)[:80]
    path = CACHE_DIR / subdir / f"{safe_key}.txt"
    if path.exists():
        return path.read_text(encoding='utf-8')
    return None

def cache_set(subdir: str, key: str, content: str):
    safe_key = re.sub(r'[^\w-]', '_', key)[:80]
    path = CACHE_DIR / subdir / f"{safe_key}.txt"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8')

# ─── Excel Reader ─────────────────────────────────────────────────────────────

def cr_decimal_to_str(val) -> str:
    try:
        f = float(val)
    except (ValueError, TypeError):
        return "0"
    if f == 0.125: return "1/8"
    if f == 0.25:  return "1/4"
    if f == 0.5:   return "1/2"
    if f == int(f): return str(int(f))
    return str(f)

def load_excel_index(path: Path) -> dict:
    """Load monster metadata from Excel. Returns dict keyed by name.lower()."""
    wb = openpyxl.load_workbook(str(path), data_only=True)
    ws = wb["Monster a Day Index"]
    index = {}
    for row in ws.iter_rows(min_row=1, values_only=True):
        if not row or not row[0]:
            continue
        name = str(row[0]).strip()
        if not name:
            continue
        creature_type = str(row[1]).strip().lower() if row[1] else "monstrosity"
        size          = str(row[2]).strip().capitalize() if row[2] else "Medium"
        cr_str        = cr_decimal_to_str(row[4] if len(row) > 4 else None)
        day_id        = str(row[5]).strip() if len(row) > 5 and row[5] else None
        reddit_url    = str(row[6]).strip() if len(row) > 6 and row[6] else None
        if not reddit_url or not reddit_url.startswith("http"):
            reddit_url = None
        author = str(row[8]).strip() if len(row) > 8 and row[8] else None
        if author and author.lower() in ('none', 'n/a', ''):
            author = None
        key = name.lower().strip()
        index[key] = {
            "name": name,
            "day_id": day_id,
            "cr": cr_str,
            "reddit_url": reddit_url,
            "author": author,
            "creature_type": creature_type,
            "size": size,
        }
    print(f"  Excel index: {len(index)} entries loaded")
    return index

# ─── Reddit Fetcher ───────────────────────────────────────────────────────────

def reddit_cache_key(url: str) -> str:
    m = re.search(r'/comments/([a-z0-9]+)', url)
    if m:
        return m.group(1)
    return re.sub(r'[^\w]', '_', url)[-60:]

def fetch_reddit_post(url: str, session: requests.Session, use_cache: bool) -> Optional[dict]:
    """Fetch Reddit post JSON. Returns raw Reddit JSON list or None."""
    key = reddit_cache_key(url)
    if use_cache:
        cached = cache_get("reddit", key)
        if cached:
            try:
                return json.loads(cached)
            except Exception:
                pass

    clean_url = url.strip().rstrip('/').split('?')[0]
    json_url  = f"{clean_url}.json"
    try:
        resp = session.get(json_url, timeout=REQUEST_TIMEOUT, headers={
            **HEADERS, "Accept": "application/json",
        })
        if resp.status_code == 429:
            print("    [rate limited] sleeping 60s...")
            time.sleep(60)
            resp = session.get(json_url, timeout=REQUEST_TIMEOUT)
        if resp.status_code != 200:
            return None
        data = resp.json()
        cache_set("reddit", key, json.dumps(data))
        return data
    except Exception as e:
        print(f"    [reddit error] {e}")
        return None

def extract_homebrewery_links(post_data) -> list:
    """Return all Homebrewery URLs found in the Reddit post body and URL field."""
    text_to_search = ""
    try:
        if isinstance(post_data, list) and post_data:
            children = post_data[0].get('data', {}).get('children', [])
            if children:
                p = children[0].get('data', {})
                text_to_search = (p.get('selftext', '') or '') + '\n' + (p.get('url', '') or '')
                # Also check if post body has HTML encoded version
                selftext_html = p.get('selftext_html', '') or ''
                if selftext_html:
                    text_to_search += '\n' + selftext_html
    except Exception:
        pass

    pattern = r'https?://homebrewery\.naturalcrit\.com/(?:share|brew)/([A-Za-z0-9_-]+)'
    links = []
    for m in re.finditer(pattern, text_to_search):
        full = m.group(0).rstrip(')')  # strip trailing ) from markdown links
        if full not in links:
            links.append(full)
    return links

# ─── Homebrewery Fetcher ─────────────────────────────────────────────────────

def extract_brew_id(url: str) -> Optional[str]:
    m = re.search(r'homebrewery\.naturalcrit\.com/(?:share|brew)/([A-Za-z0-9_-]+)', url)
    return m.group(1) if m else None

def fetch_homebrewery_text(brew_id: str, session: requests.Session, use_cache: bool) -> Optional[str]:
    """Fetch the raw Homebrewery markdown text. Tries multiple strategies."""
    if use_cache:
        cached = cache_get("homebrewery", brew_id)
        if cached and len(cached) > 50:
            return cached

    # Strategy 1: direct API endpoint (works on some Homebrewery versions)
    for api_url in [
        f"https://homebrewery.naturalcrit.com/api/homebrew/{brew_id}",
        f"https://homebrewery.naturalcrit.com/api/brew/{brew_id}",
    ]:
        try:
            resp = session.get(api_url, timeout=REQUEST_TIMEOUT, headers={
                **HEADERS, "Accept": "application/json",
            })
            if resp.status_code == 200:
                try:
                    data = resp.json()
                    text = data.get('text') or data.get('body') or data.get('brew', {}).get('text', '')
                    if text and len(text) > 50:
                        cache_set("homebrewery", brew_id, text)
                        return text
                except Exception:
                    pass
        except Exception:
            pass

    # Strategy 2: scrape the share page HTML
    share_url = f"https://homebrewery.naturalcrit.com/share/{brew_id}"
    try:
        resp = session.get(share_url, timeout=REQUEST_TIMEOUT, headers={
            **HEADERS, "Accept": "text/html,application/xhtml+xml,*/*",
        })
        if resp.status_code == 200:
            text = extract_text_from_html(resp.text)
            if text and len(text) > 50:
                cache_set("homebrewery", brew_id, text)
                return text
    except Exception as e:
        print(f"    [homebrewery error] {e}")

    return None

def unescape_json_string(s: str) -> str:
    """Unescape a JSON string value (handles \\n, \\t, \\u, etc.)."""
    try:
        return json.loads(f'"{s}"')
    except Exception:
        return s.replace('\\n', '\n').replace('\\t', '\t').replace('\\"', '"')

def extract_json_after(html: str, prefix: str) -> Optional[dict]:
    """Extract a JSON object that starts right after `prefix` in html."""
    idx = html.find(prefix)
    if idx == -1:
        return None
    start = idx + len(prefix)
    # Find the opening brace
    brace_idx = html.find('{', start)
    if brace_idx == -1:
        return None
    depth, i = 0, brace_idx
    while i < len(html):
        if html[i] == '{':
            depth += 1
        elif html[i] == '}':
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(html[brace_idx:i+1])
                except Exception:
                    return None
        i += 1
    return None

def extract_text_from_html(html: str) -> Optional[str]:
    """Extract brew markdown from Homebrewery page HTML using multiple strategies."""

    # Strategy A: start_app({...brew:{text:...}...}) — Homebrewery V3 current format
    data = extract_json_after(html, 'start_app(')
    if data:
        brew = data.get('brew', {})
        text = brew.get('text') or brew.get('body', '')
        if text and len(text) > 50:
            return text

    # Strategy B2: __NEXT_DATA__ (Next.js SSR)
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
    if m:
        try:
            nd = json.loads(m.group(1))
            # Navigate common paths
            for path in [
                ['props', 'pageProps', 'brew', 'text'],
                ['props', 'pageProps', 'brew', 'body'],
                ['props', 'brew', 'text'],
            ]:
                node = nd
                for key in path:
                    if isinstance(node, dict):
                        node = node.get(key)
                    else:
                        node = None
                        break
                if node and isinstance(node, str) and len(node) > 50:
                    return node
        except Exception:
            pass

    # Strategy B: window.BREW = {...}
    m = re.search(r'window\.BREW\s*=\s*(\{.*?\});', html, re.DOTALL)
    if m:
        try:
            data = json.loads(m.group(1))
            text = data.get('text') or data.get('body', '')
            if text and len(text) > 50:
                return text
        except Exception:
            pass

    # Strategy C: "text":"..." JSON field (large string value)
    m = re.search(r'"text"\s*:\s*"((?:[^"\\]|\\.){{100,}})"', html, re.DOTALL)
    if m:
        try:
            text = unescape_json_string(m.group(1))
            if len(text) > 50:
                return text
        except Exception:
            pass

    # Strategy D: data-text attribute
    m = re.search(r'data-text="([^"]{100,})"', html)
    if m:
        try:
            return unescape_json_string(m.group(1))
        except Exception:
            pass

    # Strategy E: extract visible text from .page div (rendered HTML fallback)
    page_m = re.search(r'<(?:div|section)[^>]*class="[^"]*page[^"]*"[^>]*>(.*?)</(?:div|section)>', html, re.DOTALL)
    if page_m:
        raw = page_m.group(1)
        text = re.sub(r'<[^>]+>', ' ', raw)
        text = re.sub(r'\s+', ' ', text).strip()
        if len(text) > 100:
            return text

    return None

# ─── Homebrewery Markdown Parser ─────────────────────────────────────────────

def extract_blockquote_blocks(text: str) -> list:
    """
    Extract blockquote stat blocks (lines starting with '>').
    Allows up to 1 blank line between blockquote lines (common in MAD brews
    where the ability score table and skills section have a blank line gap).
    Returns a list of normalized (> stripped) text blocks.
    """
    blocks = []
    current = []
    gap_count = 0  # consecutive non-> non-blank lines seen

    for line in text.split('\n'):
        stripped = line.strip()
        if stripped.startswith('>'):
            # Strip "> " or ">" prefix
            clean = re.sub(r'^>\s?', '', stripped)
            current.append(clean)
            gap_count = 0
        elif not stripped and current and gap_count == 0:
            # Allow ONE blank line inside a blockquote run (then keep going)
            gap_count += 1
        else:
            # Non-blockquote, non-blank line: end of this block
            if current:
                block_text = '\n'.join(current)
                if re.search(r'Armor Class|Hit Points', block_text, re.IGNORECASE):
                    blocks.append(block_text)
            current = []
            gap_count = 0

    if current:
        block_text = '\n'.join(current)
        if re.search(r'Armor Class|Hit Points', block_text, re.IGNORECASE):
            blocks.append(block_text)

    return blocks

def normalize_stat_block(text: str) -> str:
    """
    Normalize a stat block text for consistent parsing.
    Strips blockquote prefixes, list markers, and markdown bold/italic,
    so that every field becomes: 'Field Value'
    """
    lines = []
    for line in text.split('\n'):
        # Strip blockquote prefix
        line = re.sub(r'^>\s?', '', line)
        # Strip list item prefix "- " at start of line
        line = re.sub(r'^\s*-\s+', '', line.strip())
        # Strip leading underscores (horizontal rules: ___)
        if re.match(r'^_+$', line.strip()):
            continue
        # Strip markdown bold/italic from the LINE (not inline in descriptions)
        # Only strip surrounding **Field** — keep ** inside descriptions
        line = re.sub(r'^\*\*([^*]+)\*\*', r'\1', line)
        lines.append(line)
    return '\n'.join(lines)

def parse_homebrewery_monsters(text: str) -> list:
    """Parse all monster stat blocks from Homebrewery markdown. Returns list of dicts."""
    monsters = []

    # Strategy 1: blockquote blocks "___\n> ## Name\n> ..."  (most common MAD format)
    bq_blocks = extract_blockquote_blocks(text)
    for block in bq_blocks:
        m = parse_hb_stat_block(block)
        if m and m.get('hit_points', 0) > 0:
            monsters.append(m)

    # Strategy 2: {{monster...}} blocks (V3 newer format)
    if not monsters:
        block_re = re.compile(r'\{\{monster[^}]*\}(.*?)\}\}', re.DOTALL | re.IGNORECASE)
        for block in block_re.findall(text):
            m = parse_hb_stat_block(block)
            if m and m.get('hit_points', 0) > 0:
                monsters.append(m)

    # Strategy 3: whole text as stat block (bare brews)
    if not monsters:
        m = parse_hb_stat_block(text)
        if m and m.get('hit_points', 0) > 0:
            monsters.append(m)

    return monsters

def clean_md(text: str) -> str:
    """Strip markdown formatting (bold/italic stars, underscores)."""
    text = re.sub(r'\*+', '', text)
    text = re.sub(r'_{2,}', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def parse_ability_table(text: str) -> dict:
    """
    Parse the D&D ability score pipe table.
    Handles both:
      |STR|DEX|CON|INT|WIS|CHA|
      |:---:|:---:|:---:|:---:|:---:|:---:|
      |22 (+6)|10 (+0)|20 (+5)|10 (+0)|2 (-4)|2 (-4)|
    and column-reordered variants.
    """
    scores = {}
    ABBRS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

    # Find the header row and values row
    header_re = re.compile(r'\|(' + r'|'.join(ABBRS) + r')\|([^\n]+)', re.IGNORECASE)
    hm = header_re.search(text)
    if not hm:
        return scores

    full_header_line = '|' + hm.group(1) + '|' + hm.group(2)
    header_cells = [c.strip().upper() for c in full_header_line.split('|') if c.strip()]
    # Filter to valid ability score headers only
    headers = [c for c in header_cells if c in ABBRS]
    if len(headers) < 6:
        return scores

    # Find the values row (skipping the separator row of dashes/colons)
    # Look for the first row after the header that has numbers
    pos = hm.end()
    remaining = text[pos:]

    # Skip the separator row (|:---:|...)
    val_block = re.search(r'\n[|\s:−\-]+\n(\|[^\n]+)', remaining)
    if not val_block:
        # Try without separator
        val_block = re.search(r'\n(\|[^\n]+)', remaining)
    if not val_block:
        return scores

    vals_str = val_block.group(1)
    vals_raw = [v.strip() for v in vals_str.split('|') if v.strip()]
    # Extract integer from "22 (+6)" or just "22"
    parsed_vals = []
    for v in vals_raw:
        nm = re.search(r'(\d+)', v)
        if nm:
            parsed_vals.append(int(nm.group(1)))

    if len(parsed_vals) >= 6 and len(headers) >= 6:
        for hdr, val in zip(headers[:6], parsed_vals[:6]):
            scores[hdr.lower()] = val

    return scores


def parse_hb_stat_block(block: str) -> Optional[dict]:
    """
    Parse a single Homebrewery monster stat block.
    Accepts both blockquote-stripped text and raw markdown.
    """
    if not block or len(block.strip()) < 50:
        return None

    # Normalize: strip list prefixes and lone horizontal-rule lines
    norm_lines = []
    for line in block.split('\n'):
        l = line.strip()
        l = re.sub(r'^>\s?', '', l)          # strip residual > prefix
        l = re.sub(r'^\s*-\s+', '', l)       # strip "- " list marker
        if re.match(r'^_{2,}$', l):           # skip ___ separators
            continue
        norm_lines.append(l)
    nb = '\n'.join(norm_lines)   # normalized block

    result = {
        'name': None,
        'size': 'Medium',
        'type': 'monstrosity',
        'alignment': None,
        'armor_class': 0,
        'hit_points': 0,
        'hp_formula': None,
        'speed': {},
        'str': 10, 'dex': 10, 'con': 10, 'int': 10, 'wis': 10, 'cha': 10,
        'saving_throws': None,
        'skills': None,
        'damage_vulnerabilities': None,
        'damage_resistances': None,
        'damage_immunities': None,
        'condition_immunities': None,
        'senses': None,
        'languages': None,
        'cr': '0',
        'xp': None,
        'special_abilities': [],
        'actions': [],
        'reactions': [],
        'legendary_actions': [],
    }

    # ── Name ─────────────────────────────────────────────────────────────────
    name_m = re.search(r'^#{1,3}\s+(.+)$', nb, re.MULTILINE)
    if name_m:
        result['name'] = clean_md(name_m.group(1)).strip()
    else:
        for line in nb.split('\n'):
            line = line.strip()
            if line and not re.match(r'^[*|_{#>]', line):
                result['name'] = clean_md(line)
                break

    if not result['name'] or len(result['name']) < 2:
        return None

    # ── Size + Type + Alignment ───────────────────────────────────────────────
    # Matches both "*Large aberration, chaotic evil*" and plain "Large aberration, chaotic evil"
    size_m = re.search(
        r'\*{0,2}\s*(Tiny|Small|Medium|Large|Huge|Gargantuan)\s+([\w\s/()+]+?)(?:,\s*(.+?))?\s*\*{0,2}(?:\n|$)',
        nb, re.IGNORECASE | re.MULTILINE
    )
    if size_m:
        result['size']      = size_m.group(1).capitalize()
        result['type']      = size_m.group(2).strip().rstrip('*').strip().lower()
        result['alignment'] = size_m.group(3).strip().rstrip('*').strip() if size_m.group(3) else None

    # ── Armor Class ───────────────────────────────────────────────────────────
    # Handles: "Armor Class 17", "**Armor Class** 17", "**Armor Class** :: 17"
    ac_m = re.search(r'Armor Class\s*\*{0,2}\s*(?::{1,2}\s*)?(\d+)', nb, re.IGNORECASE)
    if ac_m:
        result['armor_class'] = int(ac_m.group(1))

    # ── Hit Points ────────────────────────────────────────────────────────────
    hp_m = re.search(r'Hit Points\s*\*{0,2}\s*(?::{1,2}\s*)?(\d+)\s*\(([^)]+)\)', nb, re.IGNORECASE)
    if hp_m:
        result['hit_points'] = int(hp_m.group(1))
        result['hp_formula'] = hp_m.group(2).strip()
    else:
        hp_m2 = re.search(r'Hit Points\s*\*{0,2}\s*(?::{1,2}\s*)?(\d+)', nb, re.IGNORECASE)
        if hp_m2:
            result['hit_points'] = int(hp_m2.group(1))

    # ── Speed ─────────────────────────────────────────────────────────────────
    speed_m = re.search(r'Speed\s*\*{0,2}\s*(?::{1,2}\s*)?(.+?)(?:\n|$)', nb, re.IGNORECASE)
    if speed_m:
        spd = speed_m.group(1).strip()
        speeds = {}
        wm = re.match(r'^(\d+)\s*ft\.?', spd)
        if wm:
            speeds['walk'] = f"{wm.group(1)} ft."
        for label in ['fly', 'swim', 'burrow', 'climb']:
            sm = re.search(rf'\b{label}\s+(\d+)\s*ft\.?', spd, re.IGNORECASE)
            if sm:
                speeds[label] = f"{sm.group(1)} ft."
        result['speed'] = speeds if speeds else {'walk': spd}

    # ── Ability Scores (pipe table) ───────────────────────────────────────────
    ability_scores = parse_ability_table(nb)
    for key, val in ability_scores.items():
        result[key] = val

    # ── Saving Throws ─────────────────────────────────────────────────────────
    st_m = re.search(r'Saving Throws\s*\*{0,2}\s*(?::{1,2}\s*)?(.+?)(?:\n|$)', nb, re.IGNORECASE)
    if st_m:
        saves = {}
        for abbr, key in [('Str','str'),('Dex','dex'),('Con','con'),('Int','int'),('Wis','wis'),('Cha','cha')]:
            sm = re.search(rf'\b{abbr}\b\s*([+\-]\d+)', st_m.group(1), re.IGNORECASE)
            if sm:
                saves[key] = int(sm.group(1))
        if saves:
            result['saving_throws'] = saves

    # ── Skills ────────────────────────────────────────────────────────────────
    sk_m = re.search(r'Skills\s*\*{0,2}\s*(?::{1,2}\s*)?(.+?)(?:\n|$)', nb, re.IGNORECASE)
    if sk_m:
        skills = {}
        for sk in ['Acrobatics','Animal Handling','Arcana','Athletics','Deception',
                   'History','Insight','Intimidation','Investigation','Medicine',
                   'Nature','Perception','Performance','Persuasion','Religion',
                   'Sleight of Hand','Stealth','Survival']:
            sm = re.search(rf'\b{sk}\b\s*([+\-]\d+)', sk_m.group(1), re.IGNORECASE)
            if sm:
                skills[sk.lower()] = int(sm.group(1))
        if skills:
            result['skills'] = skills

    # ── Damage / Condition / Senses / Languages ───────────────────────────────
    for field, label in [
        ('damage_vulnerabilities', r'Damage Vulnerabilit\w+'),
        ('damage_resistances',     r'Damage Resistances?'),
        ('damage_immunities',      r'Damage Immunities?'),
        ('condition_immunities',   r'Condition Immunities?'),
        ('senses',                 r'Senses?'),
        ('languages',              r'Languages?'),
    ]:
        m = re.search(rf'{label}\s*\*{{0,2}}\s*(?::{{1,2}})?\s*(.+?)(?:\n|$)', nb, re.IGNORECASE)
        if m:
            result[field] = clean_md(m.group(1))

    # ── Challenge Rating ─────────────────────────────────────────────────────
    cr_m = re.search(
        r'Challenge\s*\*{0,2}\s*(?::{1,2}\s*)?([\d/]+)\s*\(([0-9,]+)\s*XP\)',
        nb, re.IGNORECASE
    )
    if cr_m:
        result['cr'] = cr_m.group(1).strip()
        result['xp'] = int(cr_m.group(2).replace(',', ''))
    else:
        cr_m2 = re.search(r'Challenge\s*\*{0,2}\s*(?::{1,2}\s*)?([\d/]+)', nb, re.IGNORECASE)
        if cr_m2:
            result['cr'] = cr_m2.group(1).strip()

    # ── Actions / Reactions / Legendary Actions ──────────────────────────────
    result['actions']           = parse_hb_section(nb, 'Actions')
    result['reactions']         = parse_hb_section(nb, 'Reactions')
    result['legendary_actions'] = parse_hb_section(nb, 'Legendary Actions')
    result['special_abilities'] = parse_hb_traits(nb)

    return result

def parse_hb_section(text: str, section_name: str) -> list:
    """Extract action items from a ### Section header in Homebrewery markdown."""
    # Match ### Actions (or just "Actions" on its own line)
    pattern = rf'(?:###\s*{section_name}|^{section_name})\s*\n(.*?)(?=###|\Z)'
    m = re.search(pattern, text, re.DOTALL | re.IGNORECASE | re.MULTILINE)
    if not m:
        return []
    section_text = m.group(1).strip()
    return _parse_action_items(section_text)

def parse_hb_traits(text: str) -> list:
    """Extract special traits: the block between Challenge line and ### Actions."""
    cr_to_actions = re.search(
        r'(?:Challenge|CR)\s+[\d/]+[^\n]*\n(.*?)(?=###\s*Actions|\Z)',
        text, re.DOTALL | re.IGNORECASE
    )
    if not cr_to_actions:
        return []
    return _parse_action_items(cr_to_actions.group(1).strip())

def _parse_action_items(section_text: str) -> list:
    """Parse ***Name.*** Description items from a section block."""
    if not section_text:
        return []

    items = []
    # Split on lines starting with bold/italic item names: ***Name.*** or **Name.**
    parts = re.split(r'\n(?=\*{2,3}[A-Z])', section_text)
    for part in parts:
        part = part.strip()
        if not part:
            continue
        # Match ***Name (qualifier).*** Description
        item_m = re.match(
            r'^\*{2,3}([^*\n]{1,80}(?:\s*\([^)]{1,50}\))?)\.\*{2,3}\s*(.+)$',
            part, re.DOTALL
        )
        if item_m:
            name = clean_md(item_m.group(1))
            desc = clean_md(item_m.group(2))
            desc = re.sub(r'\s+', ' ', desc)
            if name and desc and len(desc) > 5:
                items.append({'name': name, 'desc': desc})
    return items

# ─── Monster Builder ──────────────────────────────────────────────────────────

def build_monster_id(name: str, day_id: Optional[str]) -> str:
    slug   = re.sub(r'[^a-z0-9]+', '-', name.lower().strip()).strip('-')
    prefix = re.sub(r'[^0-9]', '', day_id) or '0' if day_id else '0'
    return f"mad-{prefix}-{slug}"

def build_monster(excel_data: dict, hb_stats: dict) -> dict:
    """Merge Excel metadata and Homebrewery stats into the final monster object."""
    name   = excel_data['name']
    day_id = excel_data.get('day_id')
    # HB stat block is authoritative for CR; Excel fallback only when HB has no CR
    hb_cr  = hb_stats.get('cr', '0')
    cr     = hb_cr if hb_cr != '0' else excel_data.get('cr', '0')
    xp     = hb_stats.get('xp') or XP_BY_CR.get(cr)
    return {
        'id':                     build_monster_id(name, day_id),
        'name':                   name,
        'cr':                     cr,
        'type':                   excel_data['creature_type'] or hb_stats.get('type', 'monstrosity'),
        'hit_points':             hb_stats.get('hit_points', 0),
        'armor_class':            hb_stats.get('armor_class', 0),
        'ruleset_version':        '2014',
        'source':                 'MAD',
        'is_srd':                 False,
        'token_url':              None,
        'fallback_token_url':     None,
        'size':                   excel_data['size'] or hb_stats.get('size', 'Medium'),
        'alignment':              hb_stats.get('alignment'),
        'hp_formula':             hb_stats.get('hp_formula'),
        'speed':                  hb_stats.get('speed', {}),
        'str':                    hb_stats.get('str', 10),
        'dex':                    hb_stats.get('dex', 10),
        'con':                    hb_stats.get('con', 10),
        'int':                    hb_stats.get('int', 10),
        'wis':                    hb_stats.get('wis', 10),
        'cha':                    hb_stats.get('cha', 10),
        'saving_throws':          hb_stats.get('saving_throws'),
        'skills':                 hb_stats.get('skills'),
        'damage_vulnerabilities': hb_stats.get('damage_vulnerabilities'),
        'damage_resistances':     hb_stats.get('damage_resistances'),
        'damage_immunities':      hb_stats.get('damage_immunities'),
        'condition_immunities':   hb_stats.get('condition_immunities'),
        'senses':                 hb_stats.get('senses'),
        'languages':              hb_stats.get('languages'),
        'xp':                     xp,
        'special_abilities':      hb_stats.get('special_abilities', []),
        'actions':                hb_stats.get('actions', []),
        'reactions':              hb_stats.get('reactions', []),
        'legendary_actions':      hb_stats.get('legendary_actions', []),
        'monster_a_day_url':      excel_data.get('reddit_url'),
        'monster_a_day_author':   excel_data.get('author'),
        'monster_a_day_day_id':   day_id,
        'monster_a_day_notes':    None,
    }

def find_best_match(target_name: str, candidates: list) -> Optional[dict]:
    """Find the candidate whose name best matches target_name."""
    if not candidates:
        return None
    target = target_name.lower().strip()
    for c in candidates:
        if (c.get('name') or '').lower().strip() == target:
            return c
    # Fuzzy word overlap
    t_words = set(target.split())
    best_score, best = 0.0, None
    for c in candidates:
        c_words = set((c.get('name') or '').lower().split())
        union = t_words | c_words
        score = len(t_words & c_words) / len(union) if union else 0
        if score > best_score:
            best_score, best = score, c
    return best if best_score > 0.25 else candidates[0]

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Extract MAD monsters from Reddit -> Homebrewery")
    parser.add_argument('--limit',    type=int, default=0,    help='Process only first N missing monsters')
    parser.add_argument('--merge',    action='store_true',    help='Merge results into monsters-mad.json')
    parser.add_argument('--no-cache', action='store_true',    help='Re-fetch even if cached')
    parser.add_argument('--dry-run',  action='store_true',    help='Parse only, do not write files')
    args = parser.parse_args()
    use_cache = not args.no_cache

    print("=== MAD Reddit Extractor ===\n")

    # 1. Load Excel
    print("1. Loading Excel index...")
    if not EXCEL_PATH.exists():
        print(f"ERROR: Excel not found: {EXCEL_PATH}")
        sys.exit(1)
    excel_index = load_excel_index(EXCEL_PATH)

    # 2. Load existing monsters-mad.json to find what's missing
    print("\n2. Loading existing monsters-mad.json...")
    existing = []
    if OUTPUT_JSON.exists():
        with open(OUTPUT_JSON, encoding='utf-8') as f:
            existing = json.load(f)
    existing_names = {m['name'].lower().strip() for m in existing}
    print(f"  Already extracted: {len(existing)} monsters")

    # 3. Identify missing
    missing = {
        k: v for k, v in excel_index.items()
        if k not in existing_names and v.get('reddit_url')
    }
    print(f"\n3. Missing monsters with Reddit URLs: {len(missing)}")
    if args.limit:
        missing = dict(list(missing.items())[:args.limit])
        print(f"   (limited to {args.limit} for this run)")
    if not missing:
        print("   Nothing to process!")
        return

    # 4. Process
    print(f"\n4. Fetching {len(missing)} monsters...\n")
    session = requests.Session()
    session.headers.update(HEADERS)

    new_monsters = []
    failures = []
    stats = dict(no_hb_link=0, reddit_fail=0, hb_fail=0, parse_fail=0, invalid_stats=0, success=0)
    seen_brew_ids = {}  # brew_id -> monster name (avoid re-fetching same brew)

    for i, (name_key, exc) in enumerate(missing.items(), 1):
        name   = exc['name']
        day_id = exc.get('day_id', '?')
        prefix = f"  [{i:4d}/{len(missing)}] {name} ({day_id})"
        print(prefix)

        # ── Reddit ────────────────────────────────────────────────────────────
        time.sleep(DELAY_REDDIT)
        post_data = fetch_reddit_post(exc['reddit_url'], session, use_cache)
        if not post_data:
            print(f"    -> FAIL: Reddit fetch")
            stats['reddit_fail'] += 1
            failures.append({'name': name, 'day_id': day_id, 'reason': 'reddit_fetch_failed', 'url': exc['reddit_url']})
            continue

        hb_links = extract_homebrewery_links(post_data)
        if not hb_links:
            print(f"    -> SKIP: no Homebrewery link")
            stats['no_hb_link'] += 1
            failures.append({'name': name, 'day_id': day_id, 'reason': 'no_homebrewery_link', 'url': exc['reddit_url']})
            continue

        # ── Homebrewery ───────────────────────────────────────────────────────
        extracted = False
        for hb_url in hb_links:
            brew_id = extract_brew_id(hb_url)
            if not brew_id:
                continue

            # If we've seen this brew before, reuse cached content
            if brew_id not in seen_brew_ids:
                time.sleep(DELAY_HOMEBREWERY)
                seen_brew_ids[brew_id] = name

            hb_text = fetch_homebrewery_text(brew_id, session, use_cache)
            if not hb_text:
                print(f"    -> FAIL: Homebrewery fetch ({brew_id})")
                stats['hb_fail'] += 1
                failures.append({'name': name, 'day_id': day_id, 'reason': 'homebrewery_fetch_failed', 'brew_id': brew_id})
                continue

            parsed = parse_homebrewery_monsters(hb_text)
            if not parsed:
                print(f"    -> FAIL: no stat block parsed (brew {brew_id})")
                stats['parse_fail'] += 1
                failures.append({'name': name, 'day_id': day_id, 'reason': 'parse_failed', 'brew_id': brew_id})
                continue

            best = find_best_match(name, parsed)
            if not best:
                best = parsed[0]

            hp = best.get('hit_points', 0)
            ac = best.get('armor_class', 0)
            if hp == 0 or ac == 0:
                print(f"    -> FAIL: invalid stats HP={hp} AC={ac}")
                stats['invalid_stats'] += 1
                failures.append({'name': name, 'day_id': day_id, 'reason': 'invalid_stats', 'hp': hp, 'ac': ac})
                continue

            monster = build_monster(exc, best)
            new_monsters.append(monster)
            stats['success'] += 1
            n_actions = len(best.get('actions', []))
            print(f"    -> OK  HP={hp} AC={ac} CR={best['cr']} actions={n_actions}")
            extracted = True
            break  # first valid Homebrewery link is enough

        if not extracted and not hb_links:
            pass  # already counted

    # 5. Save failure log
    FAIL_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(FAIL_LOG, 'w', encoding='utf-8') as f:
        json.dump(failures, f, ensure_ascii=False, indent=2)

    # 6. QA Report
    total = len(missing)
    print(f"\n{'='*40}")
    print(f"=== QA Report ===")
    print(f"  Processed:          {total}")
    print(f"  Success:            {stats['success']}  ({stats['success']*100//max(total,1)}%)")
    print(f"  No HB link:         {stats['no_hb_link']}")
    print(f"  Reddit fetch fail:  {stats['reddit_fail']}")
    print(f"  HB fetch fail:      {stats['hb_fail']}")
    print(f"  Parse failed:       {stats['parse_fail']}")
    print(f"  Invalid stats:      {stats['invalid_stats']}")
    print(f"  Failure log:        {FAIL_LOG}")

    if new_monsters:
        print(f"\nSample extracted:")
        for m in new_monsters[:8]:
            print(f"  {m['name']:32s} CR {m['cr']:4s}  HP {m['hit_points']:3d}  AC {m['armor_class']:2d}")

    if args.dry_run or not new_monsters:
        print("\n[dry-run or no results] Nothing written.")
        return

    # 7. Write output
    if args.merge:
        combined = existing + new_monsters
        # Sort by day_id numeric part
        combined.sort(key=lambda m: int(re.sub(r'\D', '', m.get('monster_a_day_day_id') or '0') or '0'))
        with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
            json.dump(combined, f, ensure_ascii=False, indent=2)
        size_kb = os.path.getsize(OUTPUT_JSON) / 1024
        print(f"\nMerged -> {OUTPUT_JSON}")
        print(f"  Total: {len(combined)} monsters  ({size_kb:.1f} KB)")
    else:
        with open(REDDIT_JSON, 'w', encoding='utf-8') as f:
            json.dump(new_monsters, f, ensure_ascii=False, indent=2)
        size_kb = os.path.getsize(REDDIT_JSON) / 1024
        print(f"\nOutput -> {REDDIT_JSON}")
        print(f"  New monsters: {len(new_monsters)}  ({size_kb:.1f} KB)")
        print(f"\nRun with --merge to combine into monsters-mad.json")

if __name__ == '__main__':
    main()
