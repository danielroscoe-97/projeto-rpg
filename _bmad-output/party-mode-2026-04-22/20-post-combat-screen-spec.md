# Post-Combat Screen — Spec (Sprint 2 A6)

**Decidido:** 2026-04-23 party-mode (Sally + Piper + Dani)
**Substitui:** banner/toast simples mencionado em decision #43 — escala pra **tela nova / modal full-screen**
**Escopo:** Sprint 2 story A6. Lands behind `NEXT_PUBLIC_PLAYER_HQ_V2=true`.

## Resumo

Após fim de combate, **não há auto-redirect**. Uma tela dedicada (ou modal full-screen) mostra o estado pós-combate do personagem e dá CTAs explícitos. Player clica pra prosseguir.

## Decisões travadas

| Dimensão | Decisão |
|---|---|
| **Anchor** | Tela nova (rota `/app/campaigns/{campaignId}/combat/{combatId}/outcome`) OU modal full-screen (a implementar decide — recomendo modal pra MVP por ser menos routing) |
| **Auto-dismiss** | NÃO. Fica na tela até click explícito. |
| **Tom visual** | Gold + neutral (matches brand). SEM destructive/celebration shouts. |
| **Sequência** | Combat → **Post-Combat Screen** → Recap (quando aplicável) → Herói (`/sheet?tab=heroi`) |
| **State persistence** | HP, spell slots, conditions restantes VISÍVEIS. Valores reais do estado final do combate. |
| **Nos 3 modos?** | Auth sim. Anon sim. **Guest mantém `/app/dashboard` redirect** (decision #43 — sem campaign_id seeded). |

## Anatomia da tela

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚔ Combate encerrado · Round 5                       [× fechar] │   ← gold/40 border bottom
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ESTADO PÓS-COMBATE                                             │
│                                                                 │
│  ┌─ Você ──────────────────────────────┐                       │
│  │ Capa Barsavi · Half-Elf Clérigo/Sorcerer Nv10                │
│  │ HP: 45/88 MODERATE ▓▓▓▓▓▓▓░░░░░░░                            │
│  │ Spell Slots: I ●●○○ · II ●●●○○ · III ●●○                    │
│  │ Condições: ○ Abençoar (9min) · ○ Escudo da fé (8min)        │
│  │ Inspiração: 0 (usada durante combate)                       │
│  └──────────────────────────────────────┘                       │
│                                                                 │
│  ┌─ Party (quando disponível) ──────────┐                       │
│  │ Vithor  HP 62/72 LIGHT    · sem conc │                       │
│  │ Amadarvigo HP 8/60 CRITICAL · prone  │                       │
│  └──────────────────────────────────────┘                       │
│                                                                 │
│  AÇÕES                                                          │
│                                                                 │
│  [💤 Descanso Curto agora]                                      │   ← Player: resets HD, slots 0-level
│  [📖 Ver recap completo →]                                      │   ← Mestre + Player: navega pro recap
│  [⚔ Voltar pra ficha (Herói)]                                   │   ← Default: /sheet?tab=heroi
│                                                                 │
│  ───────── (Mestre adicional) ─────────                         │
│  [💤💤 Iniciar descanso longo pro grupo]                        │   ← Mestre only
│  [⏭ Encerrar sessão]                                             │   ← Mestre only                       │                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Tokens

- Container: `bg-bg-elevated` + `border border-gold/40 rounded-xl`
- Heading gold: `text-gold font-semibold text-lg`
- HP bar: reutiliza tokens de `formatHpPct()` + `HP_STATUS_STYLES`
- Buttons:
  - Primary (Voltar pra ficha): `bg-gold text-bg hover:bg-gold/90`
  - Secondary (Descanso curto, Recap): `border border-gold/60 text-gold hover:bg-gold/10`
  - Tertiary (fechar, Mestre adicional): `text-muted-foreground hover:text-foreground`
- Sem animação de entrada agressiva (evita "feeling" de alert). Fade-in 200ms ease-out.

## Comportamento nos 3 modos

### Auth (`/invite` ou campaign member)
- Tela aparece ao `combat:ended` broadcast
- Todas CTAs ativas
- "Voltar pra ficha" → `/app/campaigns/{id}/sheet?tab=heroi` (quando flag ON; `/app/dashboard` quando flag OFF — backwards compat)
- Recap: preserva fluxo atual (RecapCtaCard existente)

### Anon (`/join/[token]`)
- Mesma tela
- "Voltar pra ficha" → `RecapCtaCard` com `redirectTo=/app/campaigns/{id}/sheet?tab=heroi` (pra após signup)
- "Descanso curto" disabled + tooltip "Crie conta pra salvar resto"

### Guest (`/try`)
- **NÃO mostra a tela nova** (decision #43)
- Mantém fluxo atual: combat end → `/app/dashboard`
- Rationale: sem `campaign_id` seeded, não há `/sheet` coerente pra navegar

## Sequence diagram (Auth)

```
Player em /combat → Mestre clica "Encerrar Combate"
    ↓ broadcast combat:ended
Player recebe broadcast → PostCombatScreen abre (modal full-screen)
    ↓ (player decide)
    ├─ [Voltar pra ficha] → navigate /sheet?tab=heroi (flag ON) | /dashboard (flag OFF)
    ├─ [Ver recap] → /app/campaigns/{id}/recap/{sessionId}
    ├─ [Descanso curto] → applyShortRest(characterId) + modal fecha + navigate /sheet?tab=heroi
    ├─ [× fechar] → navigate /sheet?tab=heroi (default)
    └─ (Mestre only)
        ├─ [Descanso longo pro grupo] → applyLongRest(campaign) + broadcast + modal fecha
        └─ [Encerrar sessão] → endSession(campaignId) + navigate /app/campaigns/{id}
```

## Novos arquivos

| Path | Responsabilidade |
|---|---|
| `components/player-hq/v2/PostCombatBanner.tsx` | Component que renderiza a tela (misnamed — é uma tela/modal, não banner; manter nome pra compat com plan) |
| `lib/hooks/usePostCombatState.ts` | Hook que escuta `combat:ended` broadcast + resolve que tela mostrar por modo (Auth/Anon/Guest) |
| `lib/hooks/useShortRest.ts` *(Sprint 3+)* | Se short-rest logic ainda não existe dedicated |

## E2E specs (Track B Sprint 2)

| Spec | Mode | Checa |
|---|---|---|
| `post-combat-redirect-heroi-auth.spec.ts` | Auth | Tela aparece, "Voltar" leva a `/sheet?tab=heroi` com flag ON |
| `post-combat-redirect-heroi-anon.spec.ts` | Anon | Tela aparece, CTA leva a `RecapCtaCard` com redirectTo correto |
| `post-combat-redirect-heroi-guest.spec.ts` | Guest | Tela **NÃO aparece**, mantém redirect pra dashboard |
| `post-combat-screen-no-auto-dismiss.spec.ts` | Auth | Após 30s sem click, tela ainda está visível |
| `post-combat-screen-state-preserved.spec.ts` | Auth | HP/slots/conditions exibidos batem com estado final do combate |

## Anti-patterns

- ❌ Auto-redirect timer (violou decisão)
- ❌ Toast bottom-right (não é anchor decidido)
- ❌ Re-usar RecapCtaCard como host da PostCombat — são surfaces distintas
- ❌ Mostrar pra Guest (viola decision #43)
- ❌ Red/celebration colors (gold+neutral decidido)

## Follow-ups pós-MVP

- Loot summary (se combat gerou XP/gold)
- Comparison com estado pre-combat (delta HP, slots spent)
- Party consensus button ("Todos descansar?")
- Auto-generate recap template a partir dos eventos de combate
