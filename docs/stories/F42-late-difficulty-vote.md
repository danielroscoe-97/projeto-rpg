# F-42 — Votação Tardia de Dificuldade (Player Campaign Home)

**Epic:** Post-Combat Analytics  
**Prioridade:** Média  
**Estimativa:** 5 SP  
**Dependência:** F-15 (difficulty poll — já implementado), campaign_members  
**Modo de acesso:** Auth-only (campaign member com role=player)

---

## Resumo

Hoje a enquete de dificuldade só pode ser votada durante o combate, em tempo real. Se o jogador desconectar, sair da tab, ou simplesmente não votar na hora, o voto é perdido. A mesa perde dado de balanceamento.

Esta feature permite que jogadores votem **até 7 dias após o combate**, diretamente na Player Campaign Home. Cada encounter finalizado que o jogador não votou aparece com um CTA na seção Combat History. Após votar, o resultado aparece inline (média do grupo + distribuição).

**Filosofia:** Dado de balanceamento é ouro. Quanto mais votos coletados, melhor o DM pode calibrar encontros futuros. Não penalizar quem não votou na hora.

---

## Decisões de UX

**D1 — Localização:** Na seção "Combat History" do `PlayerCampaignView`, cada encounter não-votado mostra um botão "Avaliar" à direita. Encounters já votados mostram a nota do jogador (ícone + valor).

**D2 — Inline expand:** Ao clicar em "Avaliar", a row expande para mostrar os 5 botões de dificuldade (mesmos do `DifficultyPoll`). Sem modal, sem navegação. Vote e collapse.

**D3 — TTL de 7 dias:** Encounters com `updated_at` > 7 dias atrás não mostram CTA de voto. A row volta ao estado simples (nome + rounds).

**D4 — Resultado pós-voto:** Após votar, a row mostra a média atual do grupo e o ícone de dificuldade mais próximo. O jogador vê que contribuiu.

**D5 — Recalculo de média:** O voto tardio atualiza `difficulty_rating` e `difficulty_votes` na tabela `encounters`. A média é recalculada como weighted average: `(old_avg * old_count + new_vote) / (old_count + 1)`.

---

## Modelo de Dados

### Nova tabela: `encounter_votes`

```sql
CREATE TABLE encounter_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote SMALLINT NOT NULL CHECK (vote BETWEEN 1 AND 5),
  voted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(encounter_id, user_id)  -- um voto por jogador por encounter
);

CREATE INDEX idx_encounter_votes_encounter ON encounter_votes(encounter_id);
CREATE INDEX idx_encounter_votes_user ON encounter_votes(user_id);
```

### Migração de dados existentes

Votos em tempo real que hoje só atualizam `encounters.difficulty_rating` e `encounters.difficulty_votes` **continuam funcionando** — a tabela `encounter_votes` é aditiva. O DM broadcast durante a sessão continua gravando a média na `encounters`, e novos votos tardios adicionam rows em `encounter_votes` + recalculam.

### RPC: `cast_late_vote`

```sql
CREATE FUNCTION cast_late_vote(
  p_encounter_id UUID,
  p_vote SMALLINT
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_campaign_id UUID;
  v_new_avg NUMERIC(2,1);
  v_new_count INTEGER;
BEGIN
  -- Verificar que o user é membro da campanha do encounter
  SELECT c.id INTO v_campaign_id
  FROM encounters e
  JOIN sessions s ON s.id = e.session_id
  JOIN campaigns c ON c.id = s.campaign_id
  JOIN campaign_members cm ON cm.campaign_id = c.id AND cm.user_id = v_user_id
  WHERE e.id = p_encounter_id AND cm.role = 'player' AND cm.status = 'active';

  IF v_campaign_id IS NULL THEN
    RAISE EXCEPTION 'Not a member of this campaign';
  END IF;

  -- Inserir voto (UPSERT — permite mudar voto)
  INSERT INTO encounter_votes (encounter_id, user_id, vote)
  VALUES (p_encounter_id, v_user_id, p_vote)
  ON CONFLICT (encounter_id, user_id) DO UPDATE SET vote = p_vote, voted_at = now();

  -- Recalcular média considerando TODOS os votos (realtime + tardios)
  SELECT AVG(vote), COUNT(*) INTO v_new_avg, v_new_count
  FROM encounter_votes WHERE encounter_id = p_encounter_id;

  -- Atualizar encounters com nova média
  UPDATE encounters
  SET difficulty_rating = v_new_avg, difficulty_votes = v_new_count
  WHERE id = p_encounter_id;

  RETURN jsonb_build_object('avg', v_new_avg, 'count', v_new_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Migração de votos realtime para `encounter_votes`

Para unificar, o fluxo em `CombatSessionClient.handleDismissAll` deve também gravar votos individuais em `encounter_votes` ao salvar a média. Isso garante que:
- Votos realtime estão na tabela de votos individuais
- Recalculo tardio usa todos os votos como fonte de verdade

**Problema:** votos realtime chegam por broadcast com `player_name` (não `user_id`). Para jogadores autenticados via `/invite`, precisamos mapear nome → user_id via `session_tokens` ou `campaign_members`. Para anônimos, o voto individual não é persistível (sem user_id estável) — só a média agregada é mantida.

---

## Arquivos Impactados

| Arquivo | Mudança |
|---------|---------|
| `supabase/migrations/055_encounter_votes.sql` | Nova tabela + RPC |
| `components/campaign/PlayerCampaignView.tsx` | Expandir Combat History rows com voto inline |
| `components/combat/InlineDifficultyVote.tsx` | Novo componente — 5 botões inline para votar |
| `app/app/campaigns/[id]/page.tsx` | Fetch votos do jogador + TTL check |
| `lib/supabase/encounter.ts` | Helper `castLateVote()` e `getPlayerVotes()` |
| `components/session/CombatSessionClient.tsx` | Gravar votos individuais em `encounter_votes` ao salvar |

---

## Checklist de Acesso (CLAUDE.md rule)

- [x] **Guest** — N/A (guest não tem campanha)
- [x] **Anônimo** — N/A (anônimo não tem user_id persistente nem campaign home)
- [x] **Autenticado** — Implementar aqui (player auth com campaign membership)

---

## Anti-Patterns

```
// ❌ NUNCA permitir voto tardio para quem não é membro da campanha
// ❌ NUNCA permitir DM votar na própria enquete (já excluído no cálculo)
// ❌ NUNCA mostrar CTA de voto para encounters > 7 dias
// ❌ NUNCA abrir modal para votar — inline expand only
```

---

## Dados para Balanceamento Futuro

Com `encounter_votes` + dados existentes em `encounters` (rounds, combatants), o DM terá:

| Dado | Fonte | Uso |
|------|-------|-----|
| Dificuldade média | `encounters.difficulty_rating` | Calibrar CRs |
| Distribuição de votos | `encounter_votes` | Detectar divergência (2 acharam fácil, 2 acharam hard) |
| Rounds por encounter | `encounters.round_number` | Correlação rounds × dificuldade percebida |
| Votos por encounter | `encounters.difficulty_votes` | Taxa de participação |
| Timestamp do voto | `encounter_votes.voted_at` | Recência do feedback (voto imediato vs tardio) |
