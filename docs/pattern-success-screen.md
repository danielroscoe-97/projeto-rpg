# Pattern: Success Screen com XP Reward Bar

> Padrão visual para telas de sucesso, conclusão de fluxo e loading de progresso em todo o Pocket DM.

## Quando Usar

- **Conclusão de wizard/fluxo** (criar campanha, criar personagem, importar dados)
- **Ação importante completada** (encontro finalizado, convite aceito, primeiro login)
- **Telas de loading com progresso** (importação, sincronização, geração de conteúdo)

## Anatomia do Componente

```
┌─────────────────────────────────────┐
│         [Logo Pocket DM]            │  ← Logo com glow + spring animation
│        TITULO DA AÇÃO!              │  ← CardTitle, fade-in
│   Descrição do que aconteceu.       │  ← CardDescription, fade-in
│                                     │
│  ┌─ Contribuição para comunidade ─┐ │
│  │                        +25 XP  │ │  ← XpRewardRow, slide-in da esquerda
│  └────────────────────────────────┘ │
│  ┌─ Rank de Mestre ──────────────┐ │
│  │                        +50 XP  │ │  ← XpRewardRow, staggered delay
│  └────────────────────────────────┘ │
│                                     │
│  Mestre Nv. 1            75/200 XP  │  ← Label + counter
│  [████████░░░░░░░░░░░░░░░░░░░░░░]  │  ← Barra XP animada com shimmer
│                                     │
│  [CTA Primário]  [CTA Secundário]   │  ← Buttons gold + goldOutline
└─────────────────────────────────────┘
```

## Elementos Obrigatórios

### 1. Logo com Glow (Header)

```tsx
<motion.div
  initial={{ scale: 0, rotate: -20 }}
  animate={{ scale: 1, rotate: 0 }}
  transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.1 }}
  className="relative mx-auto mb-3 w-20 h-20"
>
  <div className="absolute inset-0 rounded-full bg-gold/20 blur-xl animate-pulse pointer-events-none" />
  <img
    src="/art/brand/logo-icon.svg"
    alt="Pocket DM"
    width={80}
    height={80}
    className="relative drop-shadow-[0_0_24px_rgba(212,168,83,0.5)]"
  />
</motion.div>
```

**Regras:**
- Logo sempre 80x80 no success screen
- Glow `bg-gold/20 blur-xl` com `animate-pulse`
- Spring animation com `rotate: -20` → `0` para dar "bounce" de entrada
- **Sempre** `pointer-events-none` no glow overlay

### 2. XP Reward Rows (Content)

```tsx
function XpRewardRow({ label, points, delay }: {
  label: string;
  points: number;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.04] border border-gold/10"
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <motion.span
        initial={{ opacity: 0, y: 8, scale: 0.6 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: delay + 0.3, type: "spring", stiffness: 300, damping: 15 }}
        className="text-sm font-bold text-gold"
      >
        +{points} XP
      </motion.span>
    </motion.div>
  );
}
```

**Regras:**
- Cada row entra com `slide-in` da esquerda (`x: -12 → 0`)
- O valor "+XP" tem spring bounce separado com `delay + 0.3s`
- Stagger entre rows: **+0.3s** entre cada um
- Background: `bg-white/[0.04]` com `border-gold/10`

### 3. Barra de XP Animada

```tsx
<div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden relative">
  <motion.div
    initial={{ width: "5%" }}
    animate={{ width: "37.5%" }}
    transition={{ delay: 1.2, duration: 1.2, ease: "easeOut" }}
    className="h-full rounded-full bg-gradient-to-r from-gold/70 via-gold to-amber-400 relative"
  >
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-sweep" />
  </motion.div>
</div>
```

**Regras:**
- Altura: `h-2.5` (10px)
- Background track: `bg-white/[0.06]`
- Fill gradient: `from-gold/70 via-gold to-amber-400`
- Shimmer: usa `animate-shimmer-sweep` (definido em `tailwind.config.ts`)
- Começa em 5% e anima até o valor target com `easeOut`
- Delay de `1.2s` para entrar depois dos reward rows

## Timeline de Animações

| Tempo  | Elemento                    | Animação                        |
|--------|-----------------------------|---------------------------------|
| 0.1s   | Logo                        | Spring scale 0→1 + rotate       |
| 0.3s   | Título + descrição          | Fade-in + slide-up              |
| 0.5s   | Container XP               | Fade-in                         |
| 0.7s   | 1o Reward Row               | Slide-in esquerda               |
| 1.0s   | 1o "+XP"                   | Spring bounce                   |
| 1.0s   | 2o Reward Row               | Slide-in esquerda               |
| 1.2s   | Barra XP começa a encher   | Width 5% → target% (1.2s)      |
| 1.3s   | 2o "+XP"                   | Spring bounce                   |
| 1.4s   | Counter "75/200 XP"        | Fade-in                         |

**Regra de ouro**: Cada elemento entra **depois** do anterior ter iniciado sua animação. Nunca tudo de uma vez.

## Variações por Contexto

### Success Screen (Wizard concluído)
- Usa todos os elementos acima
- CTAs: `gold` (primário) + `goldOutline` (secundário)
- Botões como `<Link>` com `asChild` (nunca `onClick` + `router.push`)

### Loading com Progresso (Importação, sync)
- Omitir reward rows
- Barra XP em loop com `animate-pulse` no container
- Texto do counter muda conforme progresso real
- Logo com animação de rotate contínua ao invés de spring

### Micro-celebration (Ação inline)
- Omitir logo e barra XP
- Apenas 1 reward row inline com "+XP" bounce
- Usar dentro de toast ou card existente

## Referência de Implementação

- **Implementação completa**: `components/dashboard/OnboardingWizard.tsx` (step "done")
- **Componente XpRewardRow**: mesmo arquivo, função extraída
- **Logo asset**: `/art/brand/logo-icon.svg`
- **Shimmer animation**: `tailwind.config.ts` → `shimmer-sweep`
- **i18n keys**: `onboarding.xp_community_contribution`, `onboarding.xp_dm_rank`, `onboarding.xp_dm_level`

## Checklist para Novo Success Screen

- [ ] Logo 80x80 com glow + spring animation
- [ ] Título em `CardTitle` ou `h3` com `text-gold`
- [ ] Reward rows com stagger de 0.3s
- [ ] Barra XP com gradient gold + shimmer
- [ ] Timeline respeitando a sequência (nunca tudo simultâneo)
- [ ] CTAs como `<Link asChild>` (nunca `onClick` + `router.push`)
- [ ] i18n keys para todos os textos
- [ ] `pointer-events-none` em overlays de glow/blur
