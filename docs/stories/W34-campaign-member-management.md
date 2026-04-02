# W3.4 — Cadastro de Jogadores na Campanha

**Epic:** Player Experience — Área Logada  
**Prioridade:** Alta  
**Estimativa:** DONE (documentação + QA sign-off)  
**Status:** ✅ Implementado — story criada para rastreabilidade e acceptance

---

## Resumo

Sistema completo de gestão de membros de campanha. DM pode convidar jogadores por email ou link, visualizar a lista de membros, e remover membros. Jogadores recebem convite e aceitam via link único.

---

## Contexto

### Componentes implementados

| Componente | Localização | Função |
|------------|-------------|--------|
| `MembersList` | `components/campaign/MembersList.tsx` | Lista membros com skeleton/empty/error state |
| `MemberCard` | `components/campaign/MemberCard.tsx` | Card individual com avatar, nome, role, ação de remover |
| `InvitePlayerDialog` | `components/campaign/InvitePlayerDialog.tsx` | Dialog de convite via email |
| `InviteMember` | `components/campaign/InviteMember.tsx` | Formulário de convite inline |
| `InviteAcceptClient` | `components/campaign/InviteAcceptClient.tsx` | Página de aceite do convite |

### Integração

`CampaignSections.tsx` integra `MembersList` na sidebar da página de campanha (`app/app/campaigns/[id]`). A seção "Membros" está colapsada por default e mostra count de membros.

### Banco de dados

- Migration `033_campaign_members.sql`: tabela `campaign_members` (campaign_id, user_id, role, status)
- Migration `035_update_rls_for_members.sql`: RLS atualizada
- Migration `036_accept_invite_function.sql`: função de aceite de convite
- Migration `037_campaign_invites_recipient_rls.sql`: RLS de convites

---

## Critérios de Aceite

1. DM abre campanha → seção "Membros" mostra lista de membros cadastrados.

2. DM clica "Convidar Jogador" → dialog abre com campo de email.

3. Email enviado → jogador recebe link de convite → aceita → aparece na lista como membro ativo.

4. DM pode ver role de cada membro (player/dm).

5. DM pode remover membro da campanha (confirmação de segurança).

6. Empty state exibe mensagem clara e botão de convite quando não há membros.

7. Loading skeleton exibido durante fetch de membros.

8. DM auto-inserido como membro role='dm' quando cria campanha (trigger `on_campaign_created`).

9. Parity: Auth-only. Guest e Anon não têm campanhas.

---

## Plano de Testes

### Testes Manuais (obrigatórios)

1. **Fluxo completo de convite**
   - [ ] DM acessa `app/app/campaigns/{id}` → seção Membros
   - [ ] Clicar "Convidar" → preencher email → confirmar
   - [ ] Jogador recebe email com link → acessa → aceita → aparece na lista

2. **Estados da lista**
   - [ ] Campanha sem membros → empty state visível com botão de convite
   - [ ] Carregando → skeleton exibido
   - [ ] Erro de rede → estado de erro adequado

3. **Remover membro**
   - [ ] Clicar "Remover" → confirmação → membro removido da lista sem reload

4. **DM auto-cadastrado**
   - [ ] Criar nova campanha → DM já aparece como membro role='dm'

---

## Notas de Paridade

- **Guest + Anon:** Sem campanhas. Sem mudança.
- **Auth (DM logado):** Única surface afetada. Feature completa neste contexto.

---

## Definição de Pronto

- [x] `MembersList` renderiza membros da campanha
- [x] `InvitePlayerDialog` permite convidar por email
- [x] `CampaignSections` integra `MembersList` na sidebar
- [x] DB: `campaign_members` table + RLS + convite function
- [x] DM auto-adicionado como membro ao criar campanha
- [ ] **QA sign-off:** Testes manuais 1-4 executados e aprovados
