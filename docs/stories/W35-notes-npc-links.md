# W3.5 — Ligar Notas com NPCs

**Epic:** Player Experience — Área Logada  
**Prioridade:** Média  
**Estimativa:** DONE (documentação + QA sign-off)  
**Status:** ✅ Implementado — story criada para rastreabilidade e acceptance

---

## Resumo

DM pode vincular notas de campanha a NPCs específicos usando um seletor de tags. O vínculo é bidirecional — a nota mostra os NPCs vinculados, e o NPC (via `NpcList`) mostra as notas vinculadas. Membros da campanha veem os vínculos de notas marcadas como `is_shared=true`.

---

## Contexto

### Componentes implementados

| Componente / Serviço | Localização | Função |
|---------------------|-------------|--------|
| `NpcTagSelector` | `components/campaign/NpcTagSelector.tsx` | Seletor de tags de NPCs para vincular a uma nota |
| `note-npc-links.ts` | `lib/supabase/note-npc-links.ts` | CRUD: getNoteNpcLinks, linkNoteToNpc, unlinkNoteFromNpc, getCampaignNoteNpcLinks |
| `CampaignNotes.tsx` | integra NpcTagSelector em modo edição | DM vê seletor, membros veem chips read-only |

### Integração em CampaignNotes

```typescript
// CampaignNotes.tsx:591 — DM (isOwner)
<NpcTagSelector
  availableNpcs={campaignNpcs}
  linkedNpcIds={linksByNote.get(note.id) ?? []}
  onLink={(npcId) => handleLinkNpc(note.id, npcId)}
  onUnlink={(npcId) => handleUnlinkNpc(note.id, npcId)}
/>

// Membros (read-only) — chips roxos para NPCs vinculados
{(linksByNote.get(note.id) ?? []).map((npcId) => (
  <span className="... text-purple-400 ...">{npc.name}</span>
))}
```

### Banco de dados

- Migration `043_campaign_npcs.sql`: tabela `campaign_npcs`
- Migration `045_note_npc_links.sql`: tabela `note_npc_links` (note_id, npc_id, UNIQUE)
- RLS: owner pode gerenciar, membros podem ler links de notas compartilhadas
- Tests: `lib/supabase/__tests__/note-npc-links.test.ts`

---

## Critérios de Aceite

1. DM abre uma nota em edição → seletor de NPCs aparece se a campanha tem NPCs cadastrados.

2. DM clica em um NPC no seletor → vínculo criado → chip do NPC aparece na nota.

3. DM clica para desvincular → vínculo removido → chip desaparece.

4. Membro da campanha vendo nota `is_shared=true` → vê chips read-only dos NPCs vinculados.

5. Nota sem NPCs vinculados não mostra seção de NPCs.

6. Campanha sem NPCs cadastrados não mostra o seletor (condição `campaignNpcs.length > 0`).

7. Vínculo persiste: recarregar página → vínculos preservados.

8. Parity: Auth-only. Feature de campanha logada.

---

## Plano de Testes

### Testes Manuais (obrigatórios)

1. **Vincular NPC a nota**
   - [ ] Campanha com NPCs cadastrados → abrir nota
   - [ ] Seletor de NPCs aparece → selecionar um NPC
   - [ ] Chip do NPC aparece na nota

2. **Desvincular NPC**
   - [ ] NPC vinculado → clicar para remover → chip desaparece

3. **Membro vê vínculos**
   - [ ] Nota marcada como `is_shared=true` → logar como membro → ver chips read-only

4. **Persistência**
   - [ ] Vincular → reload → vínculos ainda presentes

5. **Campanha sem NPCs**
   - [ ] Seletor não aparece se não há NPCs

---

## Notas de Paridade

- **Guest + Anon:** Sem campanhas, sem notas persistentes. Sem mudança.
- **Auth (DM logado):** Feature completa. Membros têm acesso read-only a vínculos de notas compartilhadas.

---

## Definição de Pronto

- [x] `note_npc_links` table + RLS criadas
- [x] `note-npc-links.ts` service com CRUD completo
- [x] `NpcTagSelector` integrado em `CampaignNotes` para owners
- [x] Read-only chips para membros
- [x] Unit tests para service layer
- [ ] **QA sign-off:** Testes manuais 1-5 executados e aprovados
