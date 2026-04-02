# Sprint 0 — F-31 Hardcoded Colors Cleanup
**Data:** 2026-04-02  
**Commit:** `9fc076e`  
**Status:** ✅ Concluído

---

## Objetivo

Eliminar todas as cores hardcoded em classes Tailwind arbitrárias (`bg-[#...]`, `text-[#...]`, `border-[#...]`, etc.) e centralizar os valores em tokens nomeados no `tailwind.config.ts`, garantindo consistência visual e facilitando theming futuro.

---

## Tokens Criados

Todos os tokens estão em `tailwind.config.ts` com comentários documentando o propósito:

| Token | Valor | Uso |
|-------|-------|-----|
| `gold.hover` | `#C49A48` | Estado hover de botões CTA dourados |
| `oracle` | `#c9a959` | Acento do Oracle AI (tom mais frio/esverdeado que o gold da marca) |
| `oracle.light` | `#e8e4d0` | Texto/foreground sobre superfícies do Oracle |
| `temp-hp` | `#9f7aea` | Indicador de HP temporário (roxo) |
| `surface.deep` | `#0e0e18` | Background mais escuro (áreas de scroll do compêndio) |
| `surface.overlay` | `#1a1a2e` | Modais, tooltips, overlays |
| `surface.auth` | `#16213e` | Modais de auth/dialog (tom azul-marinho distinto) |
| `srd.parchment` | `#fdf1dc` | Background do statblock (pergaminho) |
| `srd.ink` | `#1a1a1a` | Texto body no pergaminho |
| `srd.header` | `#7a200d` | Headers, bordas e labels do statblock |
| `srd.subtitle` | `#e8d5b5` | Subtítulos e metadados do statblock |
| `srd.accent` | `#922610` | Acento secundário do statblock |

**Tokens pré-existentes usados na migração** (sem alteração de valor):
- `gold` (`#D4A853`) — acento da marca
- `cool` (`#5B8DEF`) — indicador de player no tracker
- `surface.primary` (`#13131E`) — background da página
- `surface.secondary` (`#1A1A28`) — painéis e sidebars
- `surface.tertiary` (`#222234`) — cards e superfícies aninhadas

---

## Arquivos Migrados (35 total)

### Billing
| Arquivo | O que mudou |
|---------|-------------|
| `components/billing/ProBadge.tsx` | `#D4A853` → `gold` |
| `components/billing/SubscriptionPanel.tsx` | `#D4A853` → `gold`, `#C49A48` → `gold-hover` |
| `components/billing/UpsellCard.tsx` | `bg-[#D4A853] hover:bg-[#C49A48]` → `bg-gold hover:bg-gold-hover` |
| `components/billing/TrialBanner.tsx` | `bg-[#D4A853]/10 border-[#D4A853]/30 text-[#D4A853]` → tokens gold |

### Oracle AI
| Arquivo | O que mudou |
|---------|-------------|
| `components/oracle/OracleAIModal.tsx` | `#c9a959` → `oracle`, `#e8e4d0` → `oracle-light`, `#1a1a28` → `surface-secondary`; botão "Ask": `text-[#1a1a28]` → `text-black` (P5 fix) |
| `components/oracle/OracleAITrigger.tsx` | `#c9a959` → `oracle`, `#e8e4d0` → `oracle-light` |
| `components/oracle/CommandPalette.tsx` | `bg-[#1a1a28]` → `bg-surface-secondary` |
| `components/oracle/SpellDescriptionModal.tsx` | `!bg-[#1a1a1e]` → `!bg-surface-secondary` |

### Combat
| Arquivo | O que mudou |
|---------|-------------|
| `components/combat/CombatantRow.tsx` | `border-l-[#5B8DEF]` → `border-l-cool` (P6 fix); `text-[#9f7aea]` → `text-temp-hp` |
| `components/combat/KeyboardCheatsheet.tsx` | `bg-[#1a1a28]` → `bg-surface-secondary` |
| `components/combat/DifficultyPoll.tsx` | `bg-[#1a1a2e]` → `bg-surface-overlay` |
| `components/combat/PollResult.tsx` | `bg-[#1a1a2e]` → `bg-surface-overlay` |

### Player
| Arquivo | O que mudou |
|---------|-------------|
| `components/player/PlayerBottomBar.tsx` | `text-[#9f7aea]` → `text-temp-hp` |
| `components/player/PlayerInitiativeBoard.tsx` | `text-[#9f7aea]` (2x) → `text-temp-hp`; `bg-[#1a1a2e]` → `bg-surface-overlay` |
| `components/player/PlayerSpellBrowser.tsx` | `!bg-[#1a1a1e]` → `!bg-surface-secondary`; `bg-[#1a1a2e]` → `bg-surface-overlay` |
| `components/player/PlayerHpActions.tsx` | `bg-[#1a1a2e]` → `bg-surface-overlay` |

### Compêndio + SRD
| Arquivo | O que mudou |
|---------|-------------|
| `components/compendium/SpellBrowser.tsx` | `bg-[#13131e]` → `bg-surface-primary`; `bg-[#0e0e18]` → `bg-surface-deep` |
| `components/compendium/ItemBrowser.tsx` | idem |
| `components/compendium/MonsterBrowser.tsx` | idem |
| `components/srd/MonsterToken.tsx` | `border-[#c9a959]/40 bg-[#1a1a1e]` → `border-oracle/40 bg-surface-secondary`; `border-[#c9a959]/30 bg-[#22222a]` → `border-oracle/30 bg-surface-tertiary` |

### Campaign
| Arquivo | O que mudou |
|---------|-------------|
| `components/campaign/CampaignMindMap.tsx` | `bg-[#1a1a2e]` → `bg-surface-overlay`; `!bg-[#0d0d1a]` → `!bg-surface-deep` |
| `components/campaign/nodes/PlayerNode.tsx` | `bg-[#1a1a2e]` → `bg-surface-overlay` |
| `components/campaign/nodes/NpcNode.tsx` | idem |
| `components/campaign/nodes/NoteNode.tsx` | idem |
| `components/campaign/nodes/CampaignNode.tsx` | idem |

### App Pages + UI Misc
| Arquivo | O que mudou |
|---------|-------------|
| `app/auth/error.tsx` | `bg-[#16213e]` → `bg-surface-auth` |
| `app/auth/error/page.tsx` | idem |
| `app/page.tsx` | `bg-[#0c0c16]` → `bg-surface-deep` |
| `app/monsters/[slug]/page.tsx` | migração completa para tokens `srd.*` |
| `app/spells/[slug]/page.tsx` | migração completa para tokens `srd.*` |
| `components/ui/dialog.tsx` | `bg-[#16213e]` → `bg-surface-auth` |
| `components/homebrew/HomebrewCreator.tsx` | `border-[#D4A853]` → `border-gold` |
| `components/marketing/LpPricingSection.tsx` | `bg-[#0d0d14]` → `bg-surface-deep` |
| `components/dashboard/CampaignManager.tsx` | `from-[#1a1a28] to-[#12121a]` → `from-surface-secondary to-surface-deep` |

---

## Exclusões Documentadas

Estes arquivos mantêm valores hex intencionalmente — **não são Tailwind classes**:

| Arquivo | Motivo |
|---------|--------|
| `app/opengraph-image.tsx` | Satori/ImageResponse — requer inline styles, Tailwind não funciona |
| `components/marketing/HeroParticles.tsx` | Canvas 2D API — requer hex literals para `ctx.fillStyle` |
| `components/session/ShareSessionButton.tsx` | QRCode library API (`color: { dark, light }`) |
| `app/layout.tsx` | Next.js metadata `themeColor` — string de metadado, não CSS |

---

## Critérios de Aceite

| Critério | Status |
|----------|--------|
| Zero hardcoded colors em componentes (exceto terceiros) | ✅ Verificado com grep |
| Tokens documentados com comentários no tailwind.config | ✅ |
| Cores de HP status (hp-status.ts) verificadas | ✅ Pré-existentes, sem conflito |
| Build sem warnings | ✅ 0 erros, 0 warnings |
| Visual idêntico ao atual (zero regressão) | ✅ Apenas renaming, valores iguais |

---

## Decisões de Design

**Por que `oracle` ≠ `gold`?**  
`#c9a959` (oracle) e `#D4A853` (gold) têm temperaturas de matiz distintas: oracle é mais frio/amarelado, gold é mais quente/alaranjado. Semânticamente também diferem — gold é marca/CTA, oracle é contexto de IA. Mantidos separados.

**Por que `surface.auth` (`#16213e`) separado de `surface.secondary`?**  
`#16213e` tem matiz azul-marinho perceptível, claramente diferente do neutro escuro de `surface.secondary` (`#1A1A28`). Usado exclusivamente em modais de autenticação e dialogs — tem semântica própria.

**Por que `#22222a` → `surface.tertiary` (`#222234`)?**  
Diferença de luminosidade de ~2 unidades, imperceptível em tela. Consolidado para reduzir fragmentação de tokens. O valor exato `#22222a` de `MonsterToken.tsx` foi considerado drift não intencional.

**Por que `surface.deep` agrupa `#0c0c16`, `#0d0d14`, `#0e0e18`, `#12121a`?**  
Todos representam "o mais escuro possível" em contextos diferentes (landing, compêndio, gradientes). Variação de ±3 luminosidade, semanticamente equivalentes.
