# QA — Floating Cards: Lock Position + Bring to Front

**Feature:** Lock card position (🔒/🔓) e Bring to front (⬆️)
**Data:** 2026-03-28
**Componentes:** FloatingCardContainer, MonsterStatBlock, SpellCard, ConditionCard, OracleAICard
**Store:** pinned-cards-store.ts

---

## Resumo das mudanças

1. **Lock Position (🔒/🔓)**: Trava o card flutuante na posição atual. Card travado não pode ser arrastado.
2. **Bring to Front (⬆️)**: Traz o card para frente (z-index mais alto). Substitui o antigo botão 📌.
3. Ambos os botões têm tooltips descritivos ao passar o mouse.

---

## Cenários de Teste

### T1 — Toolbar renderiza corretamente (Desktop, Logado)

**Pré-condição:** Logado, na tela de Compêndio ou Combate
**Passos:**
1. Abrir qualquer monstro no Compêndio (ex: buscar "Goblin")
2. Clicar no botão "Pin" do card para abrir como card flutuante
3. Verificar toolbar do card flutuante

**Resultado esperado:**
- Toolbar tem 4 botões nesta ordem: 🔓 (lock) → ⬆️ (front) → − (minimize) → × (close)
- Hover no 🔓 mostra tooltip "Travar posição"
- Hover no ⬆️ mostra tooltip "Trazer para frente"

---

### T2 — Lock impede arrastar (Desktop, Logado)

**Pré-condição:** Card flutuante aberto
**Passos:**
1. Arrastar o card para uma posição qualquer — deve funcionar
2. Clicar no botão 🔓 (Lock)
3. Verificar que o ícone muda para 🔒
4. Verificar que o tooltip muda para "Desbloquear posição"
5. Tentar arrastar o card — NÃO deve mover
6. Clicar no 🔒 novamente — deve voltar para 🔓
7. Tentar arrastar — deve funcionar novamente

**Resultado esperado:** Card travado não se move. Ao destravar, volta a ser arrastável.

---

### T3 — Bring to Front funciona com múltiplos cards (Desktop, Logado)

**Pré-condição:** 2+ cards flutuantes abertos (ex: Goblin + Fireball)
**Passos:**
1. Abrir um card de monstro (Goblin) e um de magia (Fireball)
2. Clicar no card do Goblin (ele fica por baixo)
3. Clicar no botão ⬆️ do Goblin
4. Verificar que o Goblin agora está NA FRENTE do Fireball

**Resultado esperado:** Card sobe no z-index e fica visível por cima dos outros.

---

### T4 — Lock persiste na session (Desktop, Logado)

**Pré-condição:** Card flutuante aberto
**Passos:**
1. Travar o card (🔓 → 🔒)
2. Recarregar a página (F5)
3. Verificar que o card reaparece travado (ícone 🔒)

**Resultado esperado:** Estado de lock persiste via sessionStorage.

---

### T5 — Todos os tipos de card têm os botões (Desktop, Logado)

**Passos:**
1. Abrir card de **monstro** (via Compêndio > Monstros)
2. Abrir card de **magia** (via Compêndio > Magias)
3. Abrir card de **condição** (via Compêndio > Condições)
4. Abrir card de **item** (via Compêndio > Itens)
5. Abrir card do **Oráculo AI** (via Command Palette > pergunta)

**Resultado esperado:** Todos os 5 tipos mostram 🔓 e ⬆️ com tooltips corretos.

---

### T6 — Mobile overlay não mostra lock/focus (Mobile)

**Pré-condição:** Viewport mobile (< 1024px)
**Passos:**
1. Abrir um card de monstro no mobile
2. Verificar que aparece em overlay fullscreen
3. Verificar que NÃO mostra botões de lock/focus (lock/focus só fazem sentido em drag desktop)

**Resultado esperado:** Mobile mostra apenas botão × de fechar.

---

### T7 — Combate deslogado (/try) (Desktop, Deslogado)

**Pré-condição:** Sem login, acessar /try
**Passos:**
1. Adicionar um monstro ao combate
2. Iniciar combate
3. Clicar no monstro para abrir a ficha
4. Verificar toolbar com 🔓 e ⬆️

**Resultado esperado:** Botões funcionam identicamente ao modo logado.

---

## Playwright E2E Prompt

Use o prompt abaixo para gerar testes E2E automatizados:

```
Crie testes Playwright para a feature "Floating Card Lock & Focus" seguindo estes cenários:

### Setup
- Base URL: http://localhost:3000
- Para testes logados: usar credenciais de teste (veja reference_test_credentials.md)
- Para testes deslogados: acessar /try diretamente

### Cenários E2E

#### P1: Card toolbar buttons exist (logged)
1. Login
2. Navegar para /app/compendium?tab=monsters
3. Buscar "Goblin" e clicar para abrir
4. Clicar no botão Pin para criar card flutuante
5. Verificar data-testid="floating-card-*" existe
6. Dentro do card, verificar que existem botões com:
   - aria-label="Lock card position"
   - aria-label="Bring card to front"
   - aria-label="Minimize card"
   - aria-label="Close card"

#### P2: Lock prevents drag (logged)
1. Login + abrir card flutuante de monstro
2. Capturar posição inicial do card (getBoundingClientRect)
3. Arrastar o card 100px para direita — verificar que posição mudou
4. Clicar no botão com aria-label="Lock card position"
5. Verificar que o botão agora tem aria-label="Unlock card position"
6. Tentar arrastar o card 100px — verificar que posição NÃO mudou
7. Clicar no botão com aria-label="Unlock card position"
8. Arrastar novamente — verificar que posição mudou

#### P3: Bring to front with multiple cards (logged)
1. Login + abrir 2 cards flutuantes (Goblin + Fireball)
2. Capturar z-index do card Goblin
3. Clicar no botão ⬆️ do card Fireball
4. Verificar que z-index do Fireball > z-index anterior do Goblin

#### P4: Spell card has buttons (logged)
1. Login + navegar para /app/compendium?tab=spells
2. Buscar "Fireball" e pinnar
3. Verificar data-testid="spell-lock-btn" e "spell-focus-btn" existem

#### P5: Condition card has buttons (logged)
1. Login + navegar para /app/compendium?tab=conditions
2. Pinnar condição "Blinded"
3. Verificar data-testid="condition-lock-btn" e "condition-focus-btn" existem

#### P6: Guest combat has buttons (unlogged)
1. Acessar /try (sem login)
2. Adicionar monstro "Goblin" ao combate
3. Iniciar combate
4. Clicar no monstro para abrir ficha flutuante
5. Verificar que botões de lock e focus existem no card

### Seletores importantes
- Container: [data-testid="floating-cards-container"]
- Card: [data-testid^="floating-card-"]
- Lock btn: button[aria-label="Lock card position"] ou button[aria-label="Unlock card position"]
- Focus btn: button[aria-label="Bring card to front"]
- Minimize: button[aria-label="Minimize card"]
- Close: button[aria-label="Close card"]
```
