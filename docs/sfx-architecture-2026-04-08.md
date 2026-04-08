# SFX Architecture — Player Soundboard Tabs + HoMM3 Expansion

**Data:** 2026-04-08
**Status:** Implementado

---

## Resumo

Expansao do sistema de SFX com 31 novos efeitos sonoros extraidos de Heroes of Might & Magic III + Wilhelm Scream. Reestruturacao do PlayerSoundboard para navegacao por tabs com busca, otimizado para mobile.

---

## Novos SFX Adicionados (31 arquivos)

### Fonte: HoMM3 (Heroes of Might & Magic III)

| Arquivo | Timestamp | Categoria |
|---|---|---|
| `bloodlust.mp3` | 1:11 | magic |
| `bless-homm3.mp3` | 2:51 | magic |
| `reanimation.mp3` | 5:10 | magic |
| `frost-ring.mp3` | 2:41 | magic |
| `disrupting-ray.mp3` | 2:02 | magic |
| `blinding-homm3.mp3` | 1:09 | magic |
| `curse-homm3.mp3` | 1:36 | magic |
| `root-binding.mp3` | 1:06 | magic |
| `lich-death-cloud.mp3` | 1:45 | magic |
| `combat-start-1~8.mp3` | 0:20–1:06 | dramatic (DM-only) |
| `fear-azure-dragon.mp3` | 2:20 | dramatic |
| `high-luck.mp3` | 2:59 | dramatic |
| `high-morale.mp3` | 3:02 | dramatic |
| `negative-luck.mp3` | 0:16 | dramatic |
| `negative-morale.mp3` | 0:18 | dramatic |
| `treasure-chest-homm3.mp3` | 1:23 | interaction |
| `fountain-of-luck.mp3` | 2:13 | interaction |
| `fountain-of-youth.mp3` | 1:26 | interaction |
| `castle-gates.mp3` | 2:09 | interaction |
| `dungeon-enter.mp3` | 1:16 | interaction |
| `quicksand.mp3` | 1:51 | interaction |

### Fonte: Wilhelm Scream

| Arquivo | Categoria |
|---|---|
| `wilhelm-scream.mp3` | dramatic |

---

## Arquitetura: Player Soundboard Tabs

### Antes

- Grid plana com ~145 SFX sem filtro
- Impossivel navegar em mobile (48+ linhas de scroll)

### Depois

4 tabs horizontais com busca inline:

| Tab | Icon | Categories do preset | ~Qtd |
|---|---|---|---|
| **Ataques** | ⚔️ | `attack` + `defense` | ~23 |
| **Magias** | ✨ | `magic` | ~45 |
| **Epico** | 🎭 | `dramatic` + `monster` | ~19 |
| **Mundo** | 🚪 | `interaction` | ~20 |

### Regras de visibilidade

- **Player**: Ve apenas SFX com `dmOnly !== true` (exclui ambient, music, e combat fanfares)
- **DM**: Ve tudo (sem alteracao no DM soundboard)
- **Combat Fanfares (1-8)**: Marcados como `dmOnly: true` — prerrogativa do DM

### Campo novo: `dmOnly?: boolean`

Adicionado a `AudioPreset` em `lib/types/audio.ts`. Quando `true`, o preset nao aparece no `getPlayerSfxPresets()`.

---

## Arquivos Alterados

| Arquivo | Mudanca |
|---|---|
| `lib/types/audio.ts` | `dmOnly?: boolean` no AudioPreset |
| `lib/utils/audio-presets.ts` | 31 novos presets + `getPlayerSfxPresets()` + `dmOnly` nos combat fanfares |
| `components/audio/PlayerSoundboard.tsx` | Tabs + search + usa `getPlayerSfxPresets()` |
| `messages/en.json` | 32 novas traducoes (presets + tabs + search) |
| `messages/pt-BR.json` | 32 novas traducoes (presets + tabs + search) |
| `public/sounds/sfx/` | 31 novos arquivos .mp3 |

---

## Fontes de Audio

| Fonte | Licenca | Uso |
|---|---|---|
| HoMM3 SFX | New World Computing / Ubisoft | Fair use educacional / indie |
| Wilhelm Scream | Dominio publico | Livre |
| Ragnarok Online (existentes) | Gravity Co. | Fair use educacional / indie |
| Kenney.nl (existentes) | CC0 | Livre |
| Kevin MacLeod (musica) | CC-BY 3.0 | Atribuicao obrigatoria |
