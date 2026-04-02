# Monster a Day — Extração de Monstros do PDF

Guia para adicionar novos monstros do [r/monsteraday](https://www.reddit.com/r/monsteraday) ao compendium.

## Visão Geral

Os monstros ficam em `public/srd/monsters-mad.json` e são carregados automaticamente pelo app. O script `scripts/extract-mad-monsters.py` lê os PDFs + Excel da pasta de fontes e gera esse JSON.

```
monster a day - nao apagar/   ← fontes (gitignored, NUNCA apagar)
  ├── Monster a Day Index.xlsx
  ├── Monster a Day Compendium V2.pdf
  └── Monster a Day Compendium - UPGRADED.pdf

public/srd/monsters-mad.json  ← saída (commitada no git)
scripts/extract-mad-monsters.py ← script de extração
```

---

## Pré-requisitos

Python 3.9+ com as dependências:

```bash
pip install PyMuPDF openpyxl
```

---

## Como Rodar

```bash
python scripts/extract-mad-monsters.py
```

O script imprime um relatório de QA no terminal:

```
=== Monster a Day Extractor ===

1. Loading Excel index...
  Excel index: 758 entries loaded

2. Parsing PDFs...
  PDF: Monster a Day Compendium V2.pdf — 218826 chars extracted
  PDF: 64 stat blocks parsed
  ...

=== QA Report ===
  Excel entries:       758
  Full stat blocks:    61
  Skipped (no stats):  697
  Output monsters:     61

Sample monsters:
  Dream Eater       CR 10   HP 133 AC 17 actions=True
  Brood Butcher     CR 9    HP 184 AC 14 actions=True
  ...

Output written: public/srd/monsters-mad.json
File size: 170.4 KB
```

Depois commitar o JSON gerado:

```bash
git add public/srd/monsters-mad.json
git commit -m "feat(compendium): update MAD monsters (N monstros)"
git push
```

---

## Quando Rodar Novamente

- Quando a comunidade lançar uma nova versão do compendium PDF
- Quando o índice Excel for atualizado com novos monstros
- Quando quiser corrigir dados de monstros específicos

---

## Como Funciona (Fluxo Interno)

### 1. Excel Index (`Monster a Day Index.xlsx`)
- Sheet: `Monster a Day Index` (não a ativa `Form Responses 1`)
- Sem header row — dados começam na linha 1
- Colunas relevantes:

| Coluna | Conteúdo |
|--------|----------|
| A (0) | Nome do monstro |
| B (1) | Tipo (Aberration, Beast...) |
| C (2) | Tamanho (Medium, Large...) |
| D (3) | CR — **pode ser datetime** (Excel converte "1/4" → data) |
| E (4) | CR decimal — **usar este** (0.25 para 1/4, 0.5 para 1/2) |
| F (5) | Day ID (ex: "A165") |
| G (6) | URL do Reddit — link direto para o post |
| I (8) | Autor/Creator |

> **Atenção:** A coluna D é parseda pelo Excel como data para frações (1/4 → 4 de janeiro). Sempre usar a coluna E.

### 2. PDFs — Dois formatos diferentes

**V2 (`Monster a Day Compendium V2.pdf`)**
- Nomes em Title Case: `Dream Eater`
- Ability scores em uma linha: `21 (+5) 20 (+5) 19 (+4) ...`
- Seções: `Actions`, `Legendary Actions` (Title Case)

**UPGRADED (`Monster a Day Compendium - UPGRADED.pdf`)**
- Nomes em ALL CAPS: `DREAM EATER`
- Ability scores cada um em linha própria, ordem não-padrão:
  ```
  STR    DEX    CON
  21     7      18
  INT    WIS    CHA
  14     14     8
  ```
- Seções: `ACTIONS`, `REACTIONS` (ALL CAPS)
- OCR artifacts: `I6d12` em vez de `16d12`, `8{-1}` em vez de `8(-1)`

O script tenta V2 primeiro; usa UPGRADED como fallback para cobrir monstros que não estão no V2.

### 3. Critério de Inclusão

Um monstro **só é incluído** se:
- Tem stat block completo parseado em algum dos PDFs
- `hit_points > 0`
- `armor_class > 0`

Monstros que aparecem apenas no índice Excel (sem stat block nos PDFs) são ignorados.

### 4. Saída — Estrutura do JSON

Cada monstro segue exatamente a interface `SrdMonster` com campos extras:

```json
{
  "id": "mad-165-avolakia",
  "name": "Avolakia",
  "cr": "9",
  "type": "aberration",
  "hit_points": 184,
  "armor_class": 14,
  "ruleset_version": "2014",
  "source": "MAD",
  "is_srd": false,
  "size": "Large",
  "alignment": "chaotic evil",
  "hp_formula": "16d12 + 80",
  "speed": { "walk": "40 ft." },
  "str": 23, "dex": 7, "con": 18, "int": 8, "wis": 14, "cha": 10,
  "actions": [
    { "name": "Multiattack", "desc": "The butcher makes two claw attacks." },
    { "name": "Claw", "desc": "Melee Weapon Attack: +10 to hit..." }
  ],
  "special_abilities": [...],
  "reactions": [],
  "legendary_actions": [],
  "monster_a_day_url": "https://www.reddit.com/r/monsteraday/comments/...",
  "monster_a_day_author": "StoneStrix",
  "monster_a_day_day_id": "A165",
  "monster_a_day_notes": null
}
```

---

## Como os Monstros Aparecem no App

- **Compendium**: aparecem na lista com badge laranja "Monster a Day" no lugar do badge de versão
- **Token**: emoji da criatura com borda laranja e badge `r/` (sem imagem — sem direitos de uso)
- **Ficha**: idêntica à ficha SRD; dados clicáveis, saving throws, ability checks — tudo funcional
- **Footer da ficha**: link para o post original no Reddit

Os monstros são carregados em `srd-store.ts` na Phase 3 (idle time) — nunca bloqueiam o carregamento principal.

O filtro `useSrdContentFilter` permite MAD monsters independente da feature flag `show_non_srd_content` (que controla conteúdo WotC não-SRD).

---

## Troubleshooting

**"Excel index: 0 entries loaded"**
→ Verifique se o arquivo está em `monster a day - nao apagar/Monster a Day Index.xlsx`
→ O script usa a sheet `Monster a Day Index`, não a sheet ativa

**"PDF not found"**
→ Os PDFs devem estar em `monster a day - nao apagar/`
→ A pasta é gitignored — restaure manualmente se necessário

**Monstro com HP/AC = 0 após extração**
→ O stat block no PDF não foi parseado — o regex não reconheceu o formato
→ Pode ser um monstro com layout muito diferente dos demais

**Ability scores todos 10**
→ Acontece em alguns monstros do UPGRADED PDF com layout de coluna não-padrão
→ Não bloqueia a funcionalidade (dados ainda roláveis), mas pode ser corrigido manualmente no JSON
