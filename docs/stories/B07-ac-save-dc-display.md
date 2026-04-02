# B.07 — Mostrar AC e Save DC na Tela de Combate

**Tipo:** Melhoria de UX / Paridade de informacao  
**Prioridade:** Media  
**Estimativa:** 3 pontos  
**Componente:** Player Combat View (initiative board + bottom bar) + Sanitizacao de broadcast

---

## Resumo

Na visao do jogador, o AC (Armor Class) so aparece para o proprio personagem na `PlayerBottomBar` (mobile). O Spell Save DC esta completamente ausente da visao do jogador. Na sanitizacao de broadcast (`lib/realtime/broadcast.ts:109`), o `spell_save_dc` e removido dos monstros (anti-metagaming correto), mas tambem nao e exibido para o proprio personagem do jogador. Aliados precisam ver o AC uns dos outros no board de iniciativa para coordenar taticas (ex: decidir quem proteger), mas DC e informacao pessoal e nao deve ser exposta para outros jogadores.

---

## Contexto e Problema

### Situacao atual

| Dado | Proprio personagem (PlayerBottomBar) | Proprio personagem (InitiativeBoard) | Aliados (jogadores) | Monstros |
|---|---|---|---|---|
| **AC** | Exibido (Shield icon + numero) | Nao exibido | Nao exibido | Oculto (correto) |
| **Spell Save DC** | Nao exibido | Nao exibido | N/A | Oculto (correto) |

### Situacao desejada

| Dado | Proprio personagem (PlayerBottomBar) | Proprio personagem (InitiativeBoard) | Aliados (jogadores) | Monstros |
|---|---|---|---|---|
| **AC** | Exibido | Exibido | Nao exibido (pessoal) | Oculto (anti-metagaming) |
| **Spell Save DC** | Exibido | Exibido | Nao exibido (pessoal) | Oculto (anti-metagaming) |

**Regra de visibilidade:** Cada jogador ve apenas seus proprios AC e DC. O DM ve tudo. Aliados nao expoem AC/DC entre si — essa e informacao pessoal de cada personagem.

### Fluxo de dados

1. O DM cria combatentes com AC e `spell_save_dc` no `GuestCombatClient` (Zustand store local).
2. Ao transmitir via broadcast, `sanitizeCombatant()` em `broadcast.ts:91-118`:
   - **Jogadores (is_player=true):** Mantém AC e `spell_save_dc` — dados passam intactos.
   - **Monstros (is_player=false):** Remove `ac` e `spell_save_dc` na linha 109 (destructuring).
3. O endpoint de estado (`sanitize-combatants.ts:29-45`):
   - **Jogadores:** Retorna todos os campos (incluindo AC), mas **nao inclui `spell_save_dc`** explicitamente no `RawCombatantRow`.
   - **Monstros:** Remove `ac` via destructuring na linha 37.
4. O `PlayerInitiativeBoard` recebe combatantes via props com interface `PlayerCombatant` — essa interface tem `ac?: number` mas **nao tem `spell_save_dc`**.

### Problemas identificados

1. `PlayerBottomBar` exibe AC mas **nao exibe** `spell_save_dc` — nem a interface aceita esse campo.
2. `PlayerInitiativeBoard` nao exibe AC para aliados no board de iniciativa — apenas para o proprio personagem no card destacado (e mesmo assim, nao mostra).
3. A interface `PlayerCombatant` (linha 27-44 de `PlayerInitiativeBoard.tsx`) nao inclui `spell_save_dc`.
4. `sanitizeCombatantsForPlayer` em `sanitize-combatants.ts` nao inclui `spell_save_dc` no retorno de jogadores (embora o campo exista no DB).

---

## Decisoes de UX (Party Mode 2026-04-02)

| Decisao | Resolucao |
|---------|-----------|
| **Mobile layout** | Dois chips `AC 16` `DC 14` a esquerda do End Turn, `text-xs`, bg `bg-muted/50 rounded px-1.5` |
| **Desktop layout** | Abaixo do nome: `AC 16 · DC 14` em `text-sm text-muted-foreground` |
| **Sem DC** | Chip/texto oculto (nao mostra "DC —"). Se `spell_save_dc` e null, renderiza apenas AC. |
| **Mudanca mid-combat** | Flash `text-amber-400` por 1.5s via CSS transition, sem layout shift |

---

## Criterios de Aceite

1. **Proprio personagem mostra AC e Spell Save DC na PlayerBottomBar (mobile).** O AC ja aparece; adicionar o Spell Save DC ao lado do AC, com icone visual distinto (`Zap` do lucide-react). Layout: dois chips `AC 16` `DC 14` a esquerda do botao End Turn, em `text-xs` com `bg-muted/50 rounded px-1.5`. Quando `spell_save_dc` e null, ocultar o chip DC (nao mostrar "DC —").

2. **Proprio personagem mostra AC e Spell Save DC no card destacado do InitiativeBoard (desktop).** O card "Own Character" (linhas 422-551) deve exibir ambos os valores abaixo do nome no formato `AC 16 · DC 14` em `text-sm text-muted-foreground`. Se DC e null, mostra apenas `AC 16` sem separador.

3. **Aliados NAO mostram AC nem Spell Save DC.** Esses dados sao pessoais — cada jogador ve apenas os proprios valores. O DM ve tudo via GuestCombatClient (sem mudanca).

4. **Animacao de mudanca mid-combat.** Quando AC ou DC mudam durante o combate (bencao, maldicao), o valor recebe flash `text-amber-400` por 1.5s via CSS transition (`transition-colors duration-[1500ms]`). Sem layout shift — apenas a cor do texto muda.

5. **Monstros continuam com AC e DC ocultos.** A sanitizacao existente em `broadcast.ts:109` e `sanitize-combatants.ts:37` ja remove esses campos de monstros. Nenhuma mudanca necessaria nessa logica.

6. **DM view (Guest combat) continua mostrando tudo.** O `GuestCombatClient` usa Zustand store local com todos os dados — nao e afetado por sanitizacao. Verificar que nao houve regressao.

7. **`spell_save_dc` adicionado ao fluxo de dados do jogador.** A interface `PlayerCombatant` deve incluir `spell_save_dc?: number | null`. A sanitizacao de broadcast ja passa esse campo para jogadores (broadcast.ts:103), mas o endpoint de estado (`sanitize-combatants.ts`) e a interface precisam ser atualizados.

---

## Abordagem Tecnica

### 1. Atualizar interface `PlayerCombatant`

Em `components/player/PlayerInitiativeBoard.tsx`, adicionar campo:

```typescript
interface PlayerCombatant {
  // ... campos existentes
  spell_save_dc?: number | null;
}
```

### 2. Atualizar `PlayerBottomBar` para exibir Save DC

Em `components/player/PlayerBottomBar.tsx`:

- Adicionar `spell_save_dc?: number | null` na interface `PlayerBottomBarProps.character`.
- Renderizar ao lado do AC existente (linhas 136-143), com icone distinto:

```tsx
{character.spell_save_dc != null && (
  <div className="flex items-center gap-0.5 shrink-0 text-muted-foreground">
    <Zap className="w-3.5 h-3.5" aria-hidden="true" />
    <span className="text-foreground text-sm font-mono font-semibold">
      {character.spell_save_dc}
    </span>
  </div>
)}
```

### 3. Exibir AC e DC no card "Own Character" (desktop)

Em `PlayerInitiativeBoard.tsx`, no bloco do card destacado (linhas 460-470), adicionar abaixo do nome:

```tsx
<div className="flex items-center gap-3 text-muted-foreground text-sm">
  {pc.ac != null && (
    <div className="flex items-center gap-1">
      <Shield className="w-3.5 h-3.5" />
      <span className="text-foreground font-mono font-semibold">{pc.ac}</span>
    </div>
  )}
  {pc.spell_save_dc != null && (
    <div className="flex items-center gap-1">
      <Zap className="w-3.5 h-3.5" />
      <span className="text-foreground font-mono font-semibold">{pc.spell_save_dc}</span>
    </div>
  )}
</div>
```

### 4. Sanitizacao: nao expor AC/DC de aliados

O broadcast ja remove AC e spell_save_dc de monstros (linha 109 de broadcast.ts). Para jogadores aliados, os dados chegam no payload mas NAO devem ser renderizados na UI — a restricao e no componente, nao na sanitizacao. Os dados de AC/DC de jogadores chegam no broadcast pois sao usados para o proprio jogador identificar os seus valores; simplesmente nao exibir para `!isOwnChar`.

### 5. Atualizar sanitizacao do endpoint de estado

Em `lib/utils/sanitize-combatants.ts`, garantir que o campo `spell_save_dc` seja incluido no retorno de jogadores. Atualizar `RawCombatantRow` para incluir o campo se nao existir no schema.

### 6. Passar `spell_save_dc` na montagem do PlayerBottomBar

Em `PlayerInitiativeBoard.tsx` linhas 760-772, adicionar `spell_save_dc` ao objeto `character` passado para `PlayerBottomBar`.

---

## Arquivos a Modificar

| Arquivo | Tipo de Mudanca |
|---|---|
| `components/player/PlayerBottomBar.tsx` | Adicionar `spell_save_dc` na interface + renderizar ao lado do AC |
| `components/player/PlayerInitiativeBoard.tsx` | Adicionar `spell_save_dc` na interface `PlayerCombatant`, exibir AC+DC no card proprio, AC de aliados no board |
| `lib/utils/sanitize-combatants.ts` | Garantir que `spell_save_dc` esta incluido para jogadores no endpoint de estado |
| `lib/realtime/broadcast.ts` | Verificar que `spell_save_dc` ja passa para jogadores (ja esta na linha 103 — confirmar apenas) |

---

## Plano de Testes

### Testes manuais (obrigatorios)

1. **Proprio personagem — mobile (PlayerBottomBar)**
   - [ ] AC aparece com icone Shield + numero
   - [ ] Save DC aparece com icone distinto + numero (quando presente)
   - [ ] Quando `spell_save_dc` e null, nenhum badge DC aparece
   - [ ] Layout nao quebra com ambos valores + botao End Turn

2. **Proprio personagem — desktop (card destacado)**
   - [ ] AC e DC aparecem no card "Own Character"
   - [ ] Valores atualizam em real-time quando DM altera stats

3. **Aliados no board de iniciativa**
   - [ ] AC de outros jogadores NAO aparece (verificar que nao renderiza mesmo que dado esteja no payload)
   - [ ] Save DC de outros jogadores NAO aparece
   - [ ] Layout sem regressao para combatentes aliados

4. **Monstros (anti-metagaming)**
   - [ ] Monstros NAO mostram AC no board do jogador
   - [ ] Monstros NAO mostram Save DC no board do jogador
   - [ ] Monstros continuam mostrando apenas hp_status badge

5. **DM view (regressao)**
   - [ ] GuestCombatClient continua mostrando todos os stats normalmente
   - [ ] Editar AC/DC via inline edit funciona como antes

### Testes automatizados (recomendados)

- **Unit test** para `sanitizeCombatantsForPlayer` — verificar que jogadores incluem `spell_save_dc` e monstros nao
- **Unit test** para `sanitizeCombatant` em broadcast.ts — verificar que jogadores mantem `spell_save_dc`
- Atualizar testes existentes de `sanitize-combatants.test.ts` se necessario

---

## Notas de Paridade

- **Guest (DM):** Ja mostra AC e DC para todos os combatentes via Zustand store local. Nenhuma mudanca necessaria.
- **Player view:** Precisa de atualizacao nos componentes de UI e na interface de dados para exibir AC (aliados) e DC (proprio personagem).
- **Broadcast sanitization:** Ja esta correto — jogadores recebem AC e `spell_save_dc` via broadcast (linha 103 de `broadcast.ts`). Monstros tem esses campos removidos (linha 109).
- **Endpoint de estado (`sanitize-combatants.ts`):** Precisa confirmar que `spell_save_dc` faz parte da query e do retorno para jogadores.

---

## Definition of Done

- [ ] PlayerBottomBar exibe Shield + AC e icone + Save DC para o proprio personagem
- [ ] Card "Own Character" no desktop exibe AC e DC
- [ ] Board de iniciativa NAO exibe AC nem DC de aliados
- [ ] Cada jogador ve apenas seus proprios AC e DC
- [ ] Monstros continuam sem AC/DC visivel para jogadores
- [ ] DM view sem regressao
- [ ] Interface `PlayerCombatant` atualizada com `spell_save_dc`
- [ ] Testes manuais 1-5 passando
