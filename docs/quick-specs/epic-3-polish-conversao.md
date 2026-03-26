# Quick Specs — Épico 3: Polish & Conversão

**Sprint:** UX Audit Sprint 2026-03-26
**Prioridade:** MÉDIA — Melhorar conversão e experiência power-user

---

## Story 3.1 — Migração Guest → Auth (importar localStorage)

**Objetivo:** Mestre que testou no guest mode NÃO perde seu trabalho ao criar conta.

### Fluxo Proposto

```
Guest mode → Cria encontro → Clica "Criar Conta"
→ Sign-up form → Verifica email → Login
→ Dashboard detecta dados guest no localStorage
→ Modal: "Encontramos um encontro salvo! Deseja importar?"
→ Sim → Cria encounter no Supabase com dados do localStorage
→ Redireciona para sessão ativa
→ Limpa localStorage
```

### Implementação

1. **`lib/stores/guest-combat-store.ts`** — Exportar função `getGuestEncounterData()`:
   - Retorna dados do localStorage se existirem
   - Inclui: combatants, encounter_name, round, currentTurn

2. **`components/dashboard/GuestDataImportModal.tsx`** (NOVO):
   - Modal que aparece no dashboard se `localStorage` tem dados guest
   - Mostra preview: "Encontro com X combatentes, round Y"
   - Botões: "Importar" (gold) + "Descartar" (ghost)
   - Importar = criar encounter via Supabase + redirecionar
   - Descartar = limpar localStorage

3. **`app/app/dashboard/page.tsx`**:
   - Renderizar `<GuestDataImportModal>` condicionalmente
   - Checar `localStorage` no client side

4. **`components/guest/GuestUpsellModal.tsx`**:
   - Adicionar mensagem: "Seus dados serão preservados após criar a conta"

### Critérios de Aceite
- [ ] Modal de importação aparece ao acessar dashboard com dados guest
- [ ] Importação cria encounter real no Supabase
- [ ] Dados do localStorage limpos após importação ou descarte
- [ ] Mensagem de preservação no upsell modal

---

## Story 3.2 — Keyboard nav em MonsterSearch/SpellSearch

**Objetivo:** Buscas suportam navegação por teclado (↑↓ Enter Esc).

### Implementação

**Padrão a seguir (baseado no CommandPalette/MonsterSearchPanel):**
```tsx
const [selectedIndex, setSelectedIndex] = useState(-1);

const handleKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
      break;
    case "ArrowUp":
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
      break;
    case "Enter":
      if (selectedIndex >= 0) selectResult(results[selectedIndex]);
      break;
    case "Escape":
      clearSearch();
      break;
  }
};
```

**`components/oracle/MonsterSearch.tsx`:**
1. Adicionar state `selectedIndex`
2. Adicionar `onKeyDown` no input
3. Highlight visual no resultado selecionado: `bg-gold/10`
4. Scroll into view automático
5. `role="listbox"` no container + `role="option"` nos itens + `aria-selected`

**`components/oracle/SpellSearch.tsx`:**
1. Mesmo padrão do MonsterSearch
2. Enter abre spell card/modal

### Critérios de Aceite
- [ ] ↑↓ navega resultados em ambas as buscas
- [ ] Enter seleciona resultado
- [ ] Esc limpa busca
- [ ] Highlight visual no item selecionado
- [ ] ARIA attributes corretos (listbox, option, aria-selected)

---

## Story 3.3 — CTA na seção "Como Funciona" da landing

**Objetivo:** Converter visitantes que leem o workflow de 4 passos.

### Implementação

**`app/page.tsx`:**
1. Após a seção de 4 passos (How It Works), adicionar bloco CTA:
```tsx
<div className="text-center mt-12">
  <Button variant="gold" size="lg" asChild>
    <Link href="/try">
      {t("landing.how_it_works_cta")}  {/* "Começar Agora — é Grátis" */}
    </Link>
  </Button>
  <p className="text-muted-foreground text-sm mt-3">
    {t("landing.no_account_needed")}  {/* "Sem cadastro necessário" */}
  </p>
</div>
```

2. Adicionar chaves i18n em `messages/pt-BR.json` e `messages/en.json`

### Critérios de Aceite
- [ ] Botão CTA visível após seção "Como Funciona"
- [ ] Texto "Sem cadastro necessário" abaixo
- [ ] Link direciona para `/try`
- [ ] i18n completo

---

## Story 3.4 — Unificar texto dos CTAs de signup

**Objetivo:** Uma mensagem consistente em todos os pontos de conversão.

### Estado Atual
| Local | Texto |
|-------|-------|
| Hero | "Salvar minhas campanhas" |
| Navbar | "Criar Conta" |
| Final CTA | "Começar Agora — é Grátis" |
| Guest footer | "Crie sua conta e salve suas campanhas" |

### Proposta
- **CTA principal (botões gold):** "Começar Agora — é Grátis"
- **CTA secundário (links/texto):** "Criar conta gratuita"
- **Hero diferenciado:** "Salvar minhas campanhas" ← pode manter por ser contextual

### Implementação

**`app/page.tsx`:**
1. Navbar: trocar "Criar Conta" → `t("landing.cta_primary")` = "Começar Grátis"
2. Final CTA: manter "Começar Agora — é Grátis"

**`components/guest/GuestCombatClient.tsx`:**
1. Footer: usar `t("guest.footer_create_account")` alinhado com o tom geral

### Critérios de Aceite
- [ ] Máximo 2 variações de CTA text no app inteiro
- [ ] Todas internacionalizadas
- [ ] Tom consistente: grátis + ação clara

---

## Story 3.5 — `prefers-reduced-motion` nos dados CSS flutuantes

**Objetivo:** Animações CSS infinitas respeitam preferência do OS.

### Animações Afetadas (em `globals.css`)

| Animação | Uso | Duração |
|----------|-----|---------|
| `float-drift-1` | Dado D4 | 8s infinite |
| `float-drift-2` | Dado D6 | 10s infinite |
| `float-drift-3` | Dado D8/D10 | 12s infinite |
| `float-drift-4` | Dado D20 | 14s infinite |
| `animate-spin-slow` | Step circles | 12s infinite |
| `float-gentle` | Decorações | 4s infinite |
| `glow-pulse` | Gold pulse | loop |

### Implementação

**`app/globals.css`:**
```css
@media (prefers-reduced-motion: reduce) {
  .float-drift-1,
  .float-drift-2,
  .float-drift-3,
  .float-drift-4,
  .float-gentle,
  .animate-spin-slow {
    animation: none !important;
  }
  .glow-pulse {
    animation: none !important;
  }
}
```

### Critérios de Aceite
- [ ] Dados flutuantes param com `prefers-reduced-motion: reduce`
- [ ] Step circles param de girar
- [ ] Glow pulse para
- [ ] Animations essenciais (flash de dano/cura) NÃO são afetadas (são feedback, não decoração)

---

## Story 3.6 — LinkedText em SpellCard e OracleAICard

**Objetivo:** Cross-references (dice rolls, condition links) em mais superfícies.

### Estado Atual
- `LinkedText` usado APENAS em `MonsterStatBlock.tsx` para descriptions
- SpellCard renderiza descrições como texto plano
- OracleAICard renderiza Markdown mas sem parsing de dice/conditions

### Implementação

**`components/oracle/SpellCard.tsx`:**
1. Importar `LinkedText` de `@/components/oracle/LinkedText`
2. Substituir renderização de `spell.desc` por `<LinkedText text={spell.desc} />`
3. Idem para `spell.higher_level` se existir

**`components/oracle/OracleAICard.tsx`:**
1. Após parsing Markdown, aplicar `LinkedText` nos segmentos de texto
2. Ou: criar wrapper `LinkedMarkdown` que combina Markdown + LinkedText
3. Prioridade menor — Markdown já é rico, LinkedText é bonus

### Critérios de Aceite
- [ ] SpellCard mostra dice rolls clicáveis (ex: "2d6" → roll automático)
- [ ] SpellCard mostra condition links clicáveis (ex: "prone" → abre card)
- [ ] OracleAICard mantém Markdown + adiciona LinkedText onde possível
- [ ] Nenhuma regressão no MonsterStatBlock
