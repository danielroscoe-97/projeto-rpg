#!/usr/bin/env python3
"""
Extract Monster a Day monsters from PDF + Excel into public/srd/monsters-mad.json
Usage: python scripts/extract-mad-monsters.py
"""

import json
import re
import sys
import os

try:
    import fitz  # PyMuPDF
    import openpyxl
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Install with: pip install PyMuPDF openpyxl")
    sys.exit(1)

# ─── Paths ───────────────────────────────────────────────────────────────────

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
MAD_DIR = os.path.join(ROOT_DIR, "monster a day - nao apagar")
OUTPUT_PATH = os.path.join(ROOT_DIR, "public", "srd", "monsters-mad.json")

PDF_V2 = os.path.join(MAD_DIR, "Monster a Day Compendium V2.pdf")
PDF_UPGRADED = os.path.join(MAD_DIR, "Monster a Day Compendium - UPGRADED.pdf")
EXCEL_PATH = os.path.join(MAD_DIR, "Monster a Day Index.xlsx")

REDDIT_BASE = "https://www.reddit.com/r/monsteraday"

# ─── OCR Cleanup ─────────────────────────────────────────────────────────────

def fix_ocr_formula(text):
    """Fix common OCR artifacts in HP/dice formulas like '16d12+80'."""
    if not text:
        return text
    # Replace I or l at start of number with 1
    text = re.sub(r'\b[Il](\d)', r'1\1', text)
    # Replace O with 0 when surrounded by digits
    text = re.sub(r'(\d)[O](\d)', r'\g<1>0\g<2>', text)
    # Fix 'Id' -> '1d' (capital I before d)
    text = re.sub(r'\bI(d\d)', r'1\1', text)
    # Fix 'l d' -> '1d' (lowercase l before d)
    text = re.sub(r'\bl(d\d)', r'1\1', text)
    # Remove spaces in formulas: '1 d 6' -> '1d6'
    text = re.sub(r'(\d)\s+d\s+(\d)', r'\1d\2', text)
    text = re.sub(r'(\d)d\s+(\d)', r'\1d\2', text)
    return text.strip()

def fix_ocr_dice_in_text(text):
    """Fix OCR dice roll artifacts inside action description text."""
    if not text:
        return text
    # Fix I/l -> 1 before 'd' in dice notation
    text = re.sub(r'\b([Il])d(\d+)', r'1d\2', text)
    # Fix common misreads: 'Sd6' -> '5d6', 'Bd8' -> '8d8'
    text = re.sub(r'\b([BSGO])d(\d+)', lambda m: str({'B':'8','S':'5','G':'6','O':'0'}.get(m.group(1), m.group(1))) + 'd' + m.group(2), text)
    # Fix 'Id20' -> '1d20'
    text = re.sub(r'\bId(\d+)', r'1d\1', text)
    return text

def clean_text(text):
    """General text cleanup after PDF extraction."""
    if not text:
        return ""
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove soft hyphens and zero-width chars
    text = text.replace('\xad', '').replace('\u200b', '')
    return text.strip()

# ─── Excel Index Reader ───────────────────────────────────────────────────────

def cr_decimal_to_str(val):
    """Convert CR decimal float to display string."""
    try:
        cr_val = float(val)
    except (ValueError, TypeError):
        return "0"
    if cr_val == 0.125:
        return "1/8"
    elif cr_val == 0.25:
        return "1/4"
    elif cr_val == 0.5:
        return "1/2"
    elif cr_val == int(cr_val):
        return str(int(cr_val))
    else:
        return str(cr_val)

def load_excel_index(path):
    """
    Returns dict: name_lower -> {name, day_id, cr, reddit_url, author, type_size}

    Sheet: "Monster a Day Index" (NOT the active sheet which is "Form Responses 1")
    No header row — data starts at row 1.
    Columns (0-indexed):
      0=Name, 1=Type, 2=Size,
      3=CR (Excel may parse as datetime for fractions like 1/4),
      4=CR decimal (reliable float, e.g. 0.25),
      5=DayID (e.g. "A165"),
      6=Reddit URL (full URL),
      7=Notes/Special,
      8=Author/Creator
    """
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb["Monster a Day Index"]
    index = {}

    for row in ws.iter_rows(min_row=1, values_only=True):
        if not row or not row[0]:
            continue
        name = str(row[0]).strip()
        if not name:
            continue

        # Type (col 1) and Size (col 2)
        creature_type = str(row[1]).strip().lower() if row[1] else "monstrosity"
        size = str(row[2]).strip().capitalize() if row[2] else "Medium"

        # CR: use col 4 (E) which is always a reliable decimal
        cr_raw = row[4] if len(row) > 4 else None
        cr_str = cr_decimal_to_str(cr_raw)

        # Day ID (col 5)
        day_id = str(row[5]).strip() if len(row) > 5 and row[5] else None

        # Reddit URL (col 6) — already a full URL
        reddit_url = str(row[6]).strip() if len(row) > 6 and row[6] else None
        if not reddit_url or not reddit_url.startswith("http"):
            # Fallback: search URL
            name_slug = name.lower().replace(' ', '+')
            reddit_url = f"{REDDIT_BASE}/search/?q={name_slug}&restrict_sr=1"

        # Author (col 8)
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

# ─── PDF Stat Block Parser ────────────────────────────────────────────────────

def extract_stat_blocks_from_pdf(pdf_path):
    """
    Parse PDF and extract monster stat blocks.
    Returns dict: name_lower -> stat block dict
    """
    if not os.path.exists(pdf_path):
        print(f"  PDF not found: {pdf_path}")
        return {}

    doc = fitz.open(pdf_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text() + "\n"
    doc.close()

    print(f"  PDF: {os.path.basename(pdf_path)} — {len(full_text)} chars extracted")

    monsters = {}
    # Split on monster name headers — look for lines that are ALL CAPS or Title Case followed by stat block structure
    # Monster names appear as bold headers followed by "Small/Medium/Large/Huge/Gargantuan/Tiny <type>"
    blocks = re.split(
        r'\n(?=[A-Z][A-Za-z\'\-\s]{2,40}\n(?:Tiny|Small|Medium|Large|Huge|Gargantuan))',
        full_text
    )

    for block in blocks:
        parsed = parse_stat_block(block)
        if parsed:
            key = parsed['name'].lower().strip()
            monsters[key] = parsed

    print(f"  PDF: {len(monsters)} stat blocks parsed")
    return monsters

def parse_stat_block(block):
    """Parse a single monster stat block text block. Returns dict or None."""
    lines = [l.strip() for l in block.strip().split('\n') if l.strip()]
    if len(lines) < 5:
        return None

    # First line = monster name
    name = lines[0]
    # Filter out obvious non-names
    if len(name) < 2 or len(name) > 60:
        return None
    if re.search(r'^\d+$', name):
        return None
    if name.lower() in ('actions', 'reactions', 'legendary actions', 'traits', 'lair actions'):
        return None

    # Second line should be "Size Type, Alignment" or "Size Type"
    if len(lines) < 2:
        return None
    size_line = lines[1]
    size_match = re.match(
        r'^(Tiny|Small|Medium|Large|Huge|Gargantuan)\s+([\w\s]+?)(?:,\s*(.+))?$',
        size_line, re.IGNORECASE
    )
    if not size_match:
        return None

    size = size_match.group(1).capitalize()
    creature_type = size_match.group(2).strip().lower()
    alignment = size_match.group(3).strip() if size_match.group(3) else None

    result = {
        'name': name,
        'size': size,
        'type': creature_type,
        'alignment': alignment,
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

    full_block = '\n'.join(lines)

    # AC
    ac_match = re.search(r'Armor Class\s+(\d+)', full_block, re.IGNORECASE)
    if ac_match:
        result['armor_class'] = int(ac_match.group(1))

    # HP
    hp_match = re.search(r'Hit Points\s+(\d+)\s*\(([^)]+)\)', full_block, re.IGNORECASE)
    if hp_match:
        result['hit_points'] = int(hp_match.group(1))
        result['hp_formula'] = fix_ocr_formula(hp_match.group(2))
    else:
        hp_match2 = re.search(r'Hit Points\s+(\d+)', full_block, re.IGNORECASE)
        if hp_match2:
            result['hit_points'] = int(hp_match2.group(1))

    # Speed
    speed_match = re.search(r'Speed\s+(.+?)(?:\n|$)', full_block, re.IGNORECASE)
    if speed_match:
        speed_text = speed_match.group(1).strip()
        speeds = {}
        # Parse "30 ft., fly 60 ft., swim 30 ft." etc.
        walk_m = re.match(r'^(\d+)\s*ft\.?', speed_text)
        if walk_m:
            speeds['walk'] = f"{walk_m.group(1)} ft."
        for special in ['fly', 'swim', 'burrow', 'climb', 'hover']:
            sm = re.search(rf'{special}\s+(\d+)\s*ft\.?', speed_text, re.IGNORECASE)
            if sm:
                speeds[special] = f"{sm.group(1)} ft."
        result['speed'] = speeds if speeds else {'walk': speed_text}

    # Ability scores — two strategies:
    # Strategy A (V2 format): all headers on one line, all values on next line
    # Strategy B (UPGRADED format): each header on its own line directly above its value
    ABILITY_MAP = [('STR','str'), ('DEX','dex'), ('CON','con'), ('INT','int'), ('WIS','wis'), ('CHA','cha')]
    scores_found = False

    # Strategy A: "STR DEX CON INT WIS CHA\nN (+M) N (+M) ..." (any header order, inline values)
    inline_headers = re.search(
        r'(STR|DEX|CON|INT|WIS|CHA)(?:\s+(STR|DEX|CON|INT|WIS|CHA)){5}\s*\n\s*'
        r'(\d+)\s*[\(\{][^)\}\n]+[\)\}]\s+'
        r'(\d+)\s*[\(\{][^)\}\n]+[\)\}]\s+'
        r'(\d+)\s*[\(\{][^)\}\n]+[\)\}]\s+'
        r'(\d+)\s*[\(\{][^)\}\n]+[\)\}]\s+'
        r'(\d+)\s*[\(\{][^)\}\n]+[\)\}]\s+'
        r'(\d+)\s*[\(\{][^)\}\n]+[\)\}]',
        full_block, re.IGNORECASE
    )
    if inline_headers:
        headers = [inline_headers.group(i).lower() for i in range(1, 7)]
        vals = [int(inline_headers.group(i)) for i in range(3, 9)]
        for hdr, val in zip(headers, vals):
            result[hdr] = val
        scores_found = True

    # Strategy B: each "ABILITY\nN" pair — handles any column order, lenient about modifier format
    if not scores_found:
        for abbr, key in ABILITY_MAP:
            m = re.search(rf'\b{abbr}\b\s*\n\s*(\d+)', full_block, re.IGNORECASE)
            if m:
                result[key] = int(m.group(1))
                scores_found = True  # at least one found

    # Saving throws
    st_match = re.search(r'Saving Throws\s+(.+?)(?:\n|$)', full_block, re.IGNORECASE)
    if st_match:
        st_text = st_match.group(1)
        saves = {}
        for abbr, full in [('Str','str'),('Dex','dex'),('Con','con'),('Int','int'),('Wis','wis'),('Cha','cha')]:
            m = re.search(rf'{abbr}\s*([+-]\d+)', st_text)
            if m:
                saves[full] = int(m.group(1))
        if saves:
            result['saving_throws'] = saves

    # Skills
    sk_match = re.search(r'Skills\s+(.+?)(?:\n|$)', full_block, re.IGNORECASE)
    if sk_match:
        sk_text = sk_match.group(1)
        skills = {}
        for sk in ['Acrobatics','Animal Handling','Arcana','Athletics','Deception',
                   'History','Insight','Intimidation','Investigation','Medicine',
                   'Nature','Perception','Performance','Persuasion','Religion',
                   'Sleight of Hand','Stealth','Survival']:
            m = re.search(rf'{sk}\s*([+-]\d+)', sk_text, re.IGNORECASE)
            if m:
                skills[sk.lower()] = int(m.group(1))
        if skills:
            result['skills'] = skills

    # Resistances / Immunities / Vulnerabilities
    for field, pattern in [
        ('damage_vulnerabilities', r'Damage Vulnerabilities\s+(.+?)(?:\n|$)'),
        ('damage_resistances', r'Damage Resistances\s+(.+?)(?:\n|$)'),
        ('damage_immunities', r'Damage Immunities\s+(.+?)(?:\n|$)'),
        ('condition_immunities', r'Condition Immunities\s+(.+?)(?:\n|$)'),
        ('senses', r'Senses\s+(.+?)(?:\n|$)'),
        ('languages', r'Languages\s+(.+?)(?:\n|$)'),
    ]:
        m = re.search(pattern, full_block, re.IGNORECASE)
        if m:
            result[field] = clean_text(m.group(1))

    # CR and XP
    cr_match = re.search(r'Challenge\s+([\d/]+)\s*\(([0-9,]+)\s*XP\)', full_block, re.IGNORECASE)
    if cr_match:
        result['cr'] = cr_match.group(1).strip()
        result['xp'] = int(cr_match.group(2).replace(',', ''))
    else:
        cr_match2 = re.search(r'Challenge\s+([\d/]+)', full_block, re.IGNORECASE)
        if cr_match2:
            result['cr'] = cr_match2.group(1).strip()

    # Actions, Reactions, Legendary Actions
    result['actions'] = parse_section(full_block, 'Actions')
    result['reactions'] = parse_section(full_block, 'Reactions')
    result['legendary_actions'] = parse_section(full_block, 'Legendary Actions')

    # Traits: try explicit "Traits" section first; fallback to content between CR and Actions
    traits = parse_section(full_block, 'Traits')
    if not traits:
        # Extract content between CR line and first Actions/ACTIONS header as traits
        cr_to_actions = re.search(
            r'Challenge\s+[\d/]+[^\n]*\n(.*?)(?=\n(?:Actions|Bonus Actions)|\Z)',
            full_block, re.DOTALL | re.IGNORECASE
        )
        if cr_to_actions:
            trait_block = cr_to_actions.group(1).strip()
            if trait_block:
                # Parse trait items (Name. Description) from this block
                parts = re.split(r'\n(?=[A-Z][^\n]{0,80}\.)', trait_block)
                for part in parts:
                    part = part.strip()
                    if not part:
                        continue
                    item_m = re.match(
                        r'^([A-Za-z][^\n.]{1,60}(?:\s*\([^)]{1,50}\))?)\.\s*(.+)$',
                        part, re.DOTALL
                    )
                    if item_m:
                        tname = clean_text(item_m.group(1))
                        tdesc = fix_ocr_dice_in_text(clean_text(item_m.group(2)))
                        if '/r/' in tname or 'credit' in tname.lower():
                            continue
                        if tname and tdesc and len(tdesc) > 5:
                            traits.append({'name': tname, 'desc': tdesc})
    result['special_abilities'] = traits

    return result

SECTION_HEADERS = r'(?:Actions|Reactions|Legendary Actions|Bonus Actions|Lair Actions|Traits)'

def parse_section(text, section_name):
    """Extract named action items from a section."""
    # Use \Z (absolute end of string) to handle sections with no following section header
    pattern = rf'{section_name}\s*\n(.*?)(?=\n{SECTION_HEADERS}|\Z)'
    m = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    if not m:
        return []

    section_text = m.group(1).strip()
    if not section_text:
        return []

    items = []

    # Each item starts with a Title Case name (or ALL CAPS in upgraded PDF) followed by '.'
    # Split on newlines before a capitalized word followed eventually by '.'
    parts = re.split(r'\n(?=[A-Z][^\n]{0,80}\.)', section_text)
    for part in parts:
        part = part.strip()
        if not part:
            continue
        # Skip lines that are obviously not action items (like "The monster can take..." flavor text)
        if part.lower().startswith('the ') and '.' not in part[:40]:
            continue
        # Match "Name. Desc" or "Name (qualifier). Desc"
        item_m = re.match(
            r'^([A-Za-z][^\n.]{1,60}(?:\s*\([^)]{1,50}\))?)\.\s*(.+)$',
            part, re.DOTALL
        )
        if item_m:
            item_name = clean_text(item_m.group(1))
            item_desc = fix_ocr_dice_in_text(clean_text(item_m.group(2)))
            # Skip attribution lines like "Created by X - /r/monster"
            if '/r/' in item_name or 'credit' in item_name.lower():
                continue
            if item_name and item_desc and len(item_desc) > 5:
                items.append({'name': item_name, 'desc': item_desc})

    return items

# ─── Main Merge Logic ─────────────────────────────────────────────────────────

XP_BY_CR = {
    "0": 10, "1/8": 25, "1/4": 50, "1/2": 100, "1": 200, "2": 450,
    "3": 700, "4": 1100, "5": 1800, "6": 2300, "7": 2900, "8": 3900,
    "9": 5000, "10": 5900, "11": 7200, "12": 8400, "13": 10000, "14": 11500,
    "15": 13000, "16": 15000, "17": 18000, "18": 20000, "19": 22000, "20": 25000,
}

def build_monster_id(name, day_id):
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower().strip()).strip('-')
    prefix = re.sub(r'[^0-9]', '', day_id) if day_id else '0'
    return f"mad-{prefix}-{slug}"

def build_final_monsters(excel_index, pdf_monsters_v2, pdf_monsters_upgraded):
    """Merge data from Excel + both PDFs. V2 wins over UPGRADED."""
    final = []
    stats_full = 0
    stats_excel_only = 0

    for name_key, excel_data in excel_index.items():
        # Find stat block: V2 first, then UPGRADED
        stat_block = pdf_monsters_v2.get(name_key) or pdf_monsters_upgraded.get(name_key)

        if stat_block is None:
            stats_excel_only += 1
            continue  # Skip monsters without a full stat block

        # Validate: must have real HP and AC
        hp = stat_block.get('hit_points', 0)
        ac = stat_block.get('armor_class', 0)
        if hp == 0 or ac == 0:
            stats_excel_only += 1
            continue

        # Merge: Excel wins on metadata, PDF wins on stats
        cr = excel_data['cr'] if excel_data['cr'] != '0' else stat_block.get('cr', '0')
        xp = XP_BY_CR.get(cr)

        monster = {
            'id': build_monster_id(excel_data['name'], excel_data['day_id']),
            'name': excel_data['name'],
            'cr': cr,
            'type': excel_data['creature_type'] or stat_block.get('type', 'monstrosity'),
            'hit_points': hp,
            'armor_class': ac,
            'ruleset_version': '2014',  # MAD is 5e compatible
            'source': 'MAD',
            'is_srd': False,
            'token_url': None,
            'fallback_token_url': None,
            # Full stat block
            'size': excel_data['size'] or stat_block.get('size', 'Medium'),
            'alignment': stat_block.get('alignment'),
            'hp_formula': stat_block.get('hp_formula'),
            'speed': stat_block.get('speed', {}),
            'str': stat_block.get('str', 10),
            'dex': stat_block.get('dex', 10),
            'con': stat_block.get('con', 10),
            'int': stat_block.get('int', 10),
            'wis': stat_block.get('wis', 10),
            'cha': stat_block.get('cha', 10),
            'saving_throws': stat_block.get('saving_throws'),
            'skills': stat_block.get('skills'),
            'damage_vulnerabilities': stat_block.get('damage_vulnerabilities'),
            'damage_resistances': stat_block.get('damage_resistances'),
            'damage_immunities': stat_block.get('damage_immunities'),
            'condition_immunities': stat_block.get('condition_immunities'),
            'senses': stat_block.get('senses'),
            'languages': stat_block.get('languages'),
            'xp': xp,
            'special_abilities': stat_block.get('special_abilities') or [],
            'actions': stat_block.get('actions') or [],
            'reactions': stat_block.get('reactions') or [],
            'legendary_actions': stat_block.get('legendary_actions') or [],
            # MAD-specific
            'monster_a_day_url': excel_data['reddit_url'],
            'monster_a_day_author': excel_data['author'],
            'monster_a_day_day_id': excel_data['day_id'],
            'monster_a_day_notes': None,
        }
        final.append(monster)
        stats_full += 1

    return final, stats_full, stats_excel_only

# ─── Entry Point ──────────────────────────────────────────────────────────────

def main():
    print("=== Monster a Day Extractor ===\n")

    # Verify source files
    for path in [EXCEL_PATH]:
        if not os.path.exists(path):
            print(f"ERROR: Required file not found: {path}")
            sys.exit(1)

    print("1. Loading Excel index...")
    excel_index = load_excel_index(EXCEL_PATH)

    print("\n2. Parsing PDFs...")
    pdf_monsters_v2 = extract_stat_blocks_from_pdf(PDF_V2)
    pdf_monsters_upgraded = extract_stat_blocks_from_pdf(PDF_UPGRADED)

    print("\n3. Merging data...")
    final_monsters, stats_full, stats_skipped = build_final_monsters(
        excel_index, pdf_monsters_v2, pdf_monsters_upgraded
    )

    print(f"\n=== QA Report ===")
    print(f"  Excel entries:       {len(excel_index)}")
    print(f"  Full stat blocks:    {stats_full}")
    print(f"  Skipped (no stats):  {stats_skipped}")
    print(f"  Output monsters:     {len(final_monsters)}")

    if final_monsters:
        print("\nSample monsters:")
        for m in final_monsters[:5]:
            has_actions = len(m.get('actions', [])) > 0
            print(f"  {m['name']:30s} CR {m['cr']:4s} HP {m['hit_points']:3d} AC {m['armor_class']:2d} actions={has_actions}")

        # Validate dice formulas
        bad_formulas = []
        for m in final_monsters:
            f = m.get('hp_formula', '')
            if f and not re.match(r'^\d+d\d+', f):
                bad_formulas.append(f"  {m['name']}: '{f}'")
        if bad_formulas:
            print(f"\nWARNING: {len(bad_formulas)} suspicious hp_formula values:")
            for bf in bad_formulas[:10]:
                print(bf)

    # Write output
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(final_monsters, f, ensure_ascii=False, indent=2)

    print(f"\nOutput written: {OUTPUT_PATH}")
    print(f"File size: {os.path.getsize(OUTPUT_PATH) / 1024:.1f} KB")

if __name__ == '__main__':
    main()
