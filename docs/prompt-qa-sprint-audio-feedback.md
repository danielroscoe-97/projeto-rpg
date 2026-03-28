# Prompt: QA E2E — Sprint Audio Feedback (3 Sprints + Áudio)

Cole este prompt numa nova janela do Claude Code para rodar os testes E2E.

---

## Contexto

Foram implementadas 13 stories em 3 sprints + substituição completa de áudio:

### Sprint 1 — Paridade /try + Fluidez
- **B1:** Golden glow no MonsterGroupHeader quando é turno do grupo
- **F2/F3:** Multi-target (aplicar em mais alvos) no combate guest /try
- **F1:** Auto-roll de iniciativa para grupos de monstros
- **U3:** Auto-scroll para combatente ativo ao avançar turno
- **U1:** Histórico de dados: newest-first, sem auto-scroll, pill preview
- **U2:** Advantage/Disadvantage label no histórico
- **B3:** Fix texto LP "sem conta necessária" → "sem cadastro para eles"

### Sprint 2 — Visual + Imersão
- **F4:** Barra visual de HP temporário (roxa) no CombatantRow
- **U4:** Tooltip "Barreira Anti-Metagame" no alias
- **U5:** Alias editável no setup (ícone Shield + campo inline)

### Sprint 3 — Conversão
- **F6:** Timer de combate (⏱ MM:SS) no guest combat
- **F5:** Leaderboard com stats ao finalizar combate /try
- **Stats tracker:** Dano, cura, kills por combatente

### Áudio
- 10 SFX reais substituíram placeholders idênticos
- 6 ambient loops novos (dungeon, rain, tavern, forest, ocean, creek)
- Ambient sounds fazem loop automático

## Arquivos de Teste a Criar

Criar **um arquivo** de teste Playwright: `e2e/journeys/j16-sprint-audio-feedback.spec.ts`

## Roteiro de Testes

### Bloco 1: Combate Guest /try — Setup & Paridade (5 testes)

```
T1.1 — Auto-roll iniciativa grupo
  1. Navegar para /try
  2. Buscar "Goblin" no monster search
  3. Clicar no botão de grupo (qty 2)
  4. Verificar que ambos Goblins têm iniciativa != null
  5. Verificar que ambos têm o mesmo valor de iniciativa

T1.2 — Alias editável no setup
  1. No setup /try, após adicionar um monstro (não grupo)
  2. Localizar o ícone Shield (🛡️) ao lado do display_name
  3. Clicar no ícone → campo de edição aparece
  4. Digitar "Criatura Misteriosa" → blur
  5. Verificar que o display_name foi atualizado

T1.3 — Multi-target no combate guest
  1. Adicionar 3 combatentes manuais (Guerreiro, Mago, Goblin) com init/hp/ac
  2. Clicar "Iniciar Combate"
  3. No primeiro combatente, abrir HpAdjuster (clicar no HP)
  4. Verificar que seção "Aplicar em mais alvos" existe [data-testid="hp-multi-target-toggle"]
  5. Expandir, selecionar todos, aplicar 5 de dano
  6. Verificar que todos os combatentes receberam dano

T1.4 — Auto-scroll ao avançar turno
  1. No combate ativo (reusa T1.3), clicar "Próximo Turno" [data-testid="next-turn-btn"]
  2. Verificar que o combatente com aria-current="true" mudou
  3. (Validação visual — scroll é difícil de testar em headless, mas verificar que o turno avançou)

T1.5 — Timer de combate
  1. No combate ativo guest, verificar que [data-testid="combat-timer"] existe
  2. Verificar que contém texto no formato "⏱ X:XX"
  3. Esperar 2 segundos
  4. Verificar que o timer avançou
```

### Bloco 2: Histórico de Dados (3 testes)

```
T2.1 — Dice history pill preview
  1. No combate ativo, rolar um dado (clicar em ataque de monstro na ficha, ou simular CustomEvent)
  2. Verificar que a pill [class*="dice-history-pill"] mostra o valor da rolagem
  3. Verificar que a pill tem classe "dice-history-pill-preview"

T2.2 — Newest-first order
  1. Abrir o painel de histórico (clicar na pill)
  2. Rolar dois dados em sequência
  3. Verificar que a primeira entrada (topo) é a mais recente

T2.3 — Sem auto-scroll
  1. Com painel aberto e vários rolls, verificar que scrollTop está em 0 (topo)
  2. (Verifica que não scrollou para baixo)
```

### Bloco 3: HP Visual (2 testes)

```
T3.1 — Barra de HP temporário (roxa)
  1. No combate ativo, abrir HpAdjuster de um combatente
  2. Selecionar modo "Temp" [data-testid="hp-mode-temp"]
  3. Digitar "10" e aplicar
  4. Verificar que [data-testid^="temp-hp-bar-"] existe e é visível

T3.2 — Grupo golden glow (combate logado)
  1. Login como DM
  2. Criar sessão com grupo de 2 Goblins
  3. Iniciar combate
  4. Quando for o turno do grupo, verificar que [data-testid^="monster-group-"] tem classe "border-gold"
```

### Bloco 4: Leaderboard /try (2 testes)

```
T4.1 — Leaderboard aparece ao finalizar combate com dano
  1. No combate guest /try, aplicar dano em pelo menos 1 combatente
  2. Clicar "Encerrar Combate" [data-testid="end-encounter-btn"]
  3. Verificar que [data-testid="combat-leaderboard"] aparece
  4. Verificar que mostra rankings de dano
  5. Verificar que tem botão de fechar [data-testid="leaderboard-close-btn"]

T4.2 — Leaderboard NÃO aparece se nenhum dano foi aplicado
  1. Criar combate guest com 2 combatentes
  2. Clicar "Encerrar Combate" sem aplicar nenhum dano
  3. Verificar que volta direto para setup (sem leaderboard)
```

### Bloco 5: Áudio (3 testes)

```
T5.1 — Arquivos de áudio SFX são reais (não placeholders)
  1. Fazer fetch de /sounds/sfx/sword-hit.mp3
  2. Verificar que response.ok === true
  3. Verificar que Content-Length > 5000 (placeholders tinham 4387 bytes)
  4. Repetir para fireball.mp3, healing.mp3

T5.2 — Arquivos de áudio ambient existem
  1. Fazer fetch de /sounds/ambient/dungeon.mp3
  2. Verificar que response.ok === true
  3. Verificar que Content-Length > 100000 (ambient são ~470KB)
  4. Repetir para rain.mp3, tavern.mp3

T5.3 — Presets de áudio incluem ambient
  1. Navegar para uma página com PlayerSoundboard (player view)
  2. OU: verificar via evaluate() que audio-presets tem 16 items
  3. Verificar que existem presets com category "ambient"
```

### Bloco 6: Landing Page (1 teste)

```
T6.1 — Texto corrigido no "Como Funciona"
  1. Navegar para / (landing page)
  2. Scrollar até seção "como-funciona"
  3. Verificar que NÃO contém "sem conta necessária"
  4. Verificar que contém "sem cadastro para eles"
```

## Regras de Implementação

### Ambiente
```bash
# Rodar contra produção
E2E_DM_EMAIL="danielroscoe97@gmail.com" E2E_DM_PASSWORD="Eusei123*"
BASE_URL=https://www.pocketdm.com.br
```

### Convenções
- Use `data-testid` selectors sempre que possível
- Use `expect(locator).toBeVisible({ timeout: 10_000 })` — NUNCA `.isVisible()`
- Timeout padrão de teste: 60 seconds (`test.setTimeout(60_000)`)
- Para combate guest, usar /try diretamente (sem login)
- Para combate logado (T3.2), usar `loginAsDM(page)` helper

### Padrão de Setup Guest Combat
```typescript
async function setupGuestCombat(page: Page, combatants: Array<{name: string, hp: string, ac: string, init: string}>) {
  await page.goto("/try");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator('[data-testid="add-row"]')).toBeVisible({ timeout: 10_000 });

  for (const c of combatants) {
    await page.fill('[data-testid="add-row-init"]', c.init);
    await page.fill('[data-testid="add-row-name"]', c.name);
    await page.fill('[data-testid="add-row-hp"]', c.hp);
    await page.fill('[data-testid="add-row-ac"]', c.ac);
    await page.click('[data-testid="add-row-btn"]');
    await page.waitForTimeout(300);
  }

  await page.click('[data-testid="start-combat-btn"]');
  await expect(page.locator('[data-testid="active-combat"]')).toBeVisible({ timeout: 10_000 });
}
```

### Padrão de Monster Search + Group Add
```typescript
async function addMonsterGroup(page: Page, monsterName: string) {
  // Type in monster search
  const searchInput = page.locator('[data-testid="monster-search-input"]');
  await searchInput.fill(monsterName);
  await page.waitForTimeout(500);

  // Click group button (qty selector)
  // The monster search results show a group button with qty input
  const groupBtn = page.locator('[data-testid^="monster-group-btn-"]').first();
  await groupBtn.click();
  await page.waitForTimeout(300);
}
```

### Como Rodar

```bash
# Rodar todos os testes do novo arquivo
E2E_DM_EMAIL="danielroscoe97@gmail.com" E2E_DM_PASSWORD="Eusei123*" \
  npx playwright test e2e/journeys/j16-sprint-audio-feedback.spec.ts \
  --project=chromium --reporter=list

# Rodar um bloco específico
E2E_DM_EMAIL="danielroscoe97@gmail.com" E2E_DM_PASSWORD="Eusei123*" \
  npx playwright test e2e/journeys/j16-sprint-audio-feedback.spec.ts \
  --project=chromium --reporter=list -g "Guest Combat Setup"

# Rodar com browser visível (debug)
E2E_DM_EMAIL="danielroscoe97@gmail.com" E2E_DM_PASSWORD="Eusei123*" \
  npx playwright test e2e/journeys/j16-sprint-audio-feedback.spec.ts \
  --project=chromium --reporter=list --headed
```

## Estrutura do Arquivo de Teste

```typescript
import { test, expect, type Page } from "@playwright/test";

// Helper: setup guest combat
async function setupGuestCombat(page: Page, combatants: {...}[]) { ... }

test.describe("J16 — Sprint Audio Feedback", () => {
  test.setTimeout(60_000);

  test.describe("Bloco 1: Guest /try — Setup & Paridade", () => {
    test("T1.1 — Auto-roll iniciativa grupo", async ({ page }) => { ... });
    test("T1.2 — Alias editável no setup", async ({ page }) => { ... });
    test("T1.3 — Multi-target no combate guest", async ({ page }) => { ... });
    test("T1.4 — Auto-scroll ao avançar turno", async ({ page }) => { ... });
    test("T1.5 — Timer de combate", async ({ page }) => { ... });
  });

  test.describe("Bloco 2: Histórico de Dados", () => { ... });
  test.describe("Bloco 3: HP Visual", () => { ... });
  test.describe("Bloco 4: Leaderboard /try", () => { ... });
  test.describe("Bloco 5: Áudio", () => { ... });
  test.describe("Bloco 6: Landing Page", () => { ... });
});
```

## Critérios de Sucesso

- **Mínimo:** 12/16 testes passando (75%)
- **Ideal:** 16/16 (100%)
- **Bloqueadores:** T1.3 (multi-target) e T4.1 (leaderboard) são os mais críticos — validam as features de conversão
- T3.2 (golden glow logado) pode falhar se a conta de teste não tiver sessão ativa — skip se necessário
- T5.3 (presets ambient) pode precisar de evaluate() se não houver acesso direto ao soundboard

## Notas Importantes

- Os testes de áudio (T5.x) verificam apenas que os arquivos **existem e têm tamanho correto** — não testam playback (limitação de headless browser)
- O auto-scroll (T1.4) é difícil de validar em headless — verificar apenas que o turno avançou corretamente
- O leaderboard (T4.1) depende de ter aplicado dano antes de encerrar — se dano não for trackado corretamente, vai falhar
- Dice history (T2.x) pode precisar de CustomEvent dispatch se não houver dado rolável na UI de combate guest
