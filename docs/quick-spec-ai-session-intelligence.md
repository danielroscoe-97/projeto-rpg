# Quick Spec: AI Session Intelligence

> **Horizonte:** 3.4 — Plataforma
> **Prioridade:** P2 — Evolução natural do Oracle AI existente
> **Estimativa:** ~14h (phased across 4 levels)
> **Data:** 2026-03-30

---

## Contexto

O Oracle AI (Google Gemini) já existe em `/api/oracle-ai/` para rules lookup genérico. O DM pergunta sobre regras D&D e recebe respostas. Mas o AI não sabe NADA sobre o combate atual — não sabe quem está lutando, quem tem quais condições, HP de ninguém.

A evolução natural é AI que entende o contexto da sessão e oferece assistência proativa e contextual.

**4 níveis de evolução:**
1. Rules lookup genérico (ATUAL)
2. Context-aware (AI sabe o estado do combate)
3. Proactive suggestions (AI sugere ações)
4. Session recap (AI gera resumo pós-sessão)

---

## Nível 2: Context-Aware Oracle

### Story 2.1: Injetar Combate no System Prompt

**Problema:** O system prompt em `lib/oracle-ai/` não tem informação do combate atual.

**Implementação:**

1. Ao chamar `/api/oracle-ai/`, incluir combat context no body:
```typescript
const response = await fetch('/api/oracle-ai', {
  body: JSON.stringify({
    question: userQuestion,
    context: {
      combatants: combatants.map(c => ({
        name: c.name,
        type: c.is_player ? 'PC' : 'Monster',
        hp_status: getHpStatus(c.current_hp, c.max_hp),
        conditions: c.conditions,
        is_current_turn: index === currentTurnIndex,
      })),
      round: roundNumber,
      encounter_name: encounterName,
    }
  }),
});
```

2. No `/api/oracle-ai/route.ts`, adicionar ao system prompt:
```typescript
const contextBlock = context ? `
## Current Combat State
Round: ${context.round}
Combatants (in initiative order):
${context.combatants.map((c, i) =>
  `${i + 1}. ${c.name} (${c.type}) — ${c.hp_status}${c.conditions.length ? ` [${c.conditions.join(', ')}]` : ''}${c.is_current_turn ? ' ← CURRENT TURN' : ''}`
).join('\n')}

Use this context to give specific, actionable answers about the current combat.
` : '';
```

3. **SEGURANÇA:** Nunca enviar HP numérico de monstros para a API (mesmo server-side). Usar apenas `hp_status` labels.

**AC:**
- [ ] Oracle AI sabe quem está no combate
- [ ] Respostas são contextualizadas ("O Goblin está HEAVY, considere...")
- [ ] HP numérico NUNCA enviado para API externa (anti-metagaming vale até para AI)
- [ ] Se não há combate ativo, funciona como antes (rules lookup genérico)
- [ ] Latência aceitável (context adiciona ~200 tokens ao prompt)

---

### Story 2.2: Perguntas Contextuais Sugeridas

**Implementação:**

1. Baseado no estado do combate, sugerir perguntas relevantes como chips clicáveis:
```typescript
function getSuggestedQuestions(combatants: Combatant[]): string[] {
  const questions: string[] = [];

  // Se algum combatant tem condição
  const withConditions = combatants.filter(c => c.conditions.length > 0);
  if (withConditions.length) {
    questions.push(`What does ${withConditions[0].conditions[0]} do?`);
  }

  // Se algum monstro está CRITICAL
  const critical = combatants.filter(c => !c.is_player && getHpStatus(c.current_hp, c.max_hp) === 'CRITICAL');
  if (critical.length) {
    questions.push(`What happens when a creature reaches 0 HP?`);
  }

  // Se é o turno de um spellcaster
  const currentTurn = combatants[currentTurnIndex];
  if (currentTurn?.spell_save_dc) {
    questions.push(`What spells can ${currentTurn.name} use?`);
  }

  return questions.slice(0, 3); // Max 3 suggestions
}
```

2. Mostrar como chips acima do input do Oracle:
```
[What does Poisoned do?] [What happens at 0 HP?] [Goblin actions?]
```

**AC:**
- [ ] 1-3 perguntas contextuais sugeridas baseadas no estado do combate
- [ ] Chips clicáveis que preenchem o input
- [ ] Sugestões atualizam quando o estado do combate muda
- [ ] Se não há combate, mostrar sugestões genéricas de D&D

---

## Nível 3: Proactive Suggestions

### Story 3.1: Tactical Hints (Opt-in)

> **CUIDADO:** Isto pode violar a filosofia "mesa presencial primeiro" se for intrusivo. DEVE ser opt-in e discreto.

**Implementação:**

1. Setting do DM: "Tactical hints" → Off (default) / Subtle / Active
   - Off: nenhuma sugestão proativa
   - Subtle: ícone pulsante quando há sugestão disponível (DM clica para ver)
   - Active: toast notification com sugestão

2. Sugestões geradas por heurísticas simples (NÃO AI — sem custo de API):
```typescript
function getTacticalHints(state: CombatState): TacticalHint[] {
  const hints: TacticalHint[] = [];

  // Concentração em risco
  const concentrating = state.combatants.filter(c =>
    c.conditions.includes('Concentrating') &&
    getHpStatus(c.current_hp, c.max_hp) === 'HEAVY'
  );
  if (concentrating.length) {
    hints.push({
      type: 'warning',
      message: `${concentrating[0].name} is concentrating and at low HP — consider targeting them`,
    });
  }

  // Combatant esquecido (sem ação há 3+ rounds)
  // Condição prestes a expirar
  // Opportunity attack disponível
  // ...
}
```

3. Sugestões aparecem no painel lateral (não sobre o combate).

**AC:**
- [ ] Setting opt-in (default: Off)
- [ ] Sugestões são heurísticas, não AI (zero custo)
- [ ] NÃO intrusivo — nunca interrompe o fluxo do DM
- [ ] Player NUNCA vê sugestões (DM-only)

---

## Nível 4: Session Recap

### Story 4.1: Geração de Resumo Pós-Sessão

**Implementação:**

1. `combat-log-store.ts` já existe — base de dados para o recap.

2. Ao encerrar combate, oferecer: "Gerar resumo da sessão?"

3. Coletar do log:
   - Combatants que participaram
   - Rounds jogados
   - Dano total dado/recebido por personagem
   - Condições aplicadas
   - Quem derrotou quem
   - Momentos críticos (critical hits, death saves, revives)

4. Enviar para Gemini com prompt:
```
Generate a dramatic 2-3 paragraph narrative recap of this combat encounter.
Write in the style of a D&D session recap blog post.
Include specific character names and key moments.
Tone: epic but concise.

Combat data:
{combatLog}
```

5. Exibir recap em modal pós-combate com opções:
   - Copiar texto (para colar em grupo de WhatsApp)
   - Salvar nas notas da sessão
   - Compartilhar (gerar link público)

**AC:**
- [ ] Recap gerado automaticamente ao encerrar combate
- [ ] Narrativa épica mas precisa (baseada em dados reais do combate)
- [ ] Copiável para compartilhar com grupo
- [ ] Salvável nas session notes
- [ ] Custo controlado (1 chamada Gemini por combate, ~500 tokens)

---

### Story 4.2: Leaderboard de Combate

**Implementação:**

1. `guest-combat-stats.ts` já coleta stats durante o combate.

2. Ao encerrar, mostrar leaderboard:
```
⚔️ Combat Stats — Round 8

🏆 Most Damage: Thorin (87 total)
🛡️ Most Tanked: Lyra (52 absorbed)
🎯 Best Hit: Eldrin — 32 damage (Critical!)
💀 Kills: Thorin (3), Eldrin (2), Lyra (1)
❤️ Heals: Mira (45 HP restored)
```

3. Compartilhável via imagem (canvas render) ou texto.

4. Para o guest mode (/try): leaderboard + CTA "Crie uma conta para salvar suas stats"

**AC:**
- [ ] Leaderboard mostra stats relevantes ao encerrar combate
- [ ] Stats corretos (baseados no combat log)
- [ ] Compartilhável (texto copiável ou imagem)
- [ ] CTA de conversão no guest mode

---

## Rate Limiting e Custos

| Feature | API Calls | Custo estimado |
|---------|-----------|----------------|
| Context-aware oracle | 1 call/pergunta (mesmo de antes) | Sem aumento |
| Suggested questions | 0 calls (heurísticas locais) | Zero |
| Tactical hints | 0 calls (heurísticas locais) | Zero |
| Session recap | 1 call/combate encerrado | ~$0.002/recap |
| Leaderboard | 0 calls (stats locais) | Zero |

**Total incremental:** ~$0.002 por combate (apenas recap). Negligível.
