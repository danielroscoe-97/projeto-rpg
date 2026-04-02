# W3.6 — Session History Básico

**Epic:** Player Experience — Área Logada  
**Prioridade:** Média  
**Estimativa:** DONE (documentação + QA sign-off)  
**Status:** ✅ Implementado — story criada para rastreabilidade e acceptance

---

## Resumo

DM acessa o histórico de encontros da campanha: lista paginada de encontros finalizados com data, nome, número de rounds, PCs vs monstros. Cada card é expansível para ver todos os combatentes com HP final, defeats, e resultado.

---

## Contexto

### Componente implementado

**`components/campaign/EncounterHistory.tsx`** — completo:
- Fetch: `encounters` join `sessions` join `combatants` (is_active=false, ordenado por data desc)
- Estados: skeleton loading, error, empty, lista
- Cards: nome do encontro, nome da sessão, data (pt-BR), rounds, PCs vs monstros, resultado
- Cards expansíveis: lista de combatentes com ícone PC/monstro, nome, HP final colorido, defeated
- Paginação: PAGE_SIZE=10, botão "Carregar mais"
- Integrado em `CampaignSections.tsx` na seção "Encontros" (sidebar, colapsado por default)

### Banco de dados

- Tabela `encounters`: id, name, round_number, created_at, is_active, session_id
- Tabela `sessions`: name, campaign_id
- Tabela `combatants`: id, name, is_player, is_defeated, current_hp, max_hp

---

## Critérios de Aceite

1. DM abre página de campanha → seção "Encontros" disponível na sidebar.

2. Expandir seção → lista de encontros finalizados ordenados por data (mais recente primeiro).

3. Cada card mostra: nome do encontro, nome da sessão, data, número de rounds, contagem de PCs vs monstros, resultado (monstros derrotados / PCs caídos).

4. Clicar no card → expande para ver lista de combatentes com HP final.

5. Combatentes mostram: ícone (PC=escudo, monstro=caveira), nome, HP atual/máximo colorido por threshold.

6. Combatentes derrotados aparecem com nome riscado.

7. Paginação: "Carregar mais" aparece quando há mais de 10 encontros.

8. Empty state claro quando não há encontros finalizados ainda.

9. Parity: Auth-only. Guest e Anon não têm campanhas.

---

## Plano de Testes

### Testes Manuais (obrigatórios)

1. **Lista de encontros**
   - [ ] Campanha com encontros finalizados → lista aparece com cards
   - [ ] Ordenação: mais recente no topo

2. **Expand card**
   - [ ] Clicar no card → expande → lista de combatentes com HP colorido
   - [ ] PC caído → nome riscado

3. **Paginação**
   - [ ] Campanha com >10 encontros → botão "Carregar mais" aparece → clicar carrega próxima página

4. **Empty state**
   - [ ] Campanha nova sem encontros → mensagem de empty state

5. **HP Color coding**
   - [ ] HP > 70% → verde; 40-70% → amarelo; 10-40% → laranja; ≤10% → vermelho
   - [ ] HP 0 / is_defeated → vermelho vivo

---

## Notas de Paridade

- **Guest + Anon:** Sem campanhas. Sem mudança.
- **Auth (DM logado):** Única surface. Mostra apenas encontros da própria campanha via session join.

---

## Definição de Pronto

- [x] `EncounterHistory` renderiza encontros finalizados com paginação
- [x] Cards expansíveis com lista de combatentes
- [x] HP colorido por threshold
- [x] Estados: loading skeleton, empty, error
- [x] Integrado em `CampaignSections.tsx`
- [ ] **QA sign-off:** Testes manuais 1-5 executados e aprovados
