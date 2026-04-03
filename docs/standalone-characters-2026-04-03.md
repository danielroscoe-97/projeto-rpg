# Personagens Independentes de Campanha
**Data:** 2026-04-03  
**Status:** ✅ Completo (pendente: aplicar migration 051 no Supabase)  
**Arquivos alterados:** 9

---

## Contexto

Antes desta feature, `player_characters.campaign_id` era `NOT NULL` — todo personagem obrigatoriamente pertencia a uma campanha. O jogador só via personagens na tela de "Personagens" se já tivesse sido adicionado a uma campanha por um DM.

**Problemas:**
- Empty state da tela de Personagens indicava dependência de campanha ("Ver Campanhas"), confundindo o fluxo
- Jogador não conseguia preparar seu personagem antes de receber um convite
- No momento do convite (link ou join code), o jogador era forçado a criar um personagem do zero — sem aproveitar o que já havia criado

---

## Solução

### Modelo de dados

```
player_characters.campaign_id:
  NULL  → personagem standalone (sem campanha, pertence ao jogador)
  UUID  → personagem vinculado a uma campanha (1:1, não pode estar em duas ao mesmo tempo)
```

Quando o jogador aceita um convite e escolhe um personagem existente, o campo `campaign_id` é preenchido via `UPDATE`. Para "sair" de uma campanha no futuro, basta setar `campaign_id = NULL` novamente.

---

## Migration

**Arquivo:** [supabase/migrations/051_standalone_characters.sql](../supabase/migrations/051_standalone_characters.sql)

```sql
-- Make campaign_id nullable
ALTER TABLE player_characters
  ALTER COLUMN campaign_id DROP NOT NULL;

-- RLS: player pode inserir standalone, atualizar e deletar os próprios personagens
CREATE POLICY player_characters_user_insert ON player_characters
  FOR INSERT WITH CHECK (auth.uid() = user_id AND campaign_id IS NULL);

CREATE POLICY player_characters_user_update ON player_characters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY player_characters_user_delete ON player_characters
  FOR DELETE USING (auth.uid() = user_id);
```

> **Para aplicar:** `supabase db push` ou copiar o SQL no dashboard do Supabase → SQL Editor.

---

## Arquivos Alterados

### 1. Server action — criação standalone
**[app/app/dashboard/characters/actions.ts](../app/app/dashboard/characters/actions.ts)** *(novo)*

`createStandaloneCharacterAction` — insere personagem com `campaign_id = null`. Usa service client (mesmo padrão das outras actions). Chama `revalidatePath` para atualizar a listagem.

Campos: `name` (obrigatório), `race`, `class`, `level`, `max_hp`, `ac`, `spell_save_dc` (todos opcionais).

---

### 2. acceptInviteAction — suporte a personagem existente
**[app/invite/actions.ts](../app/invite/actions.ts)**

Adicionado campo opcional `existingCharacterId`. Quando presente:
- Faz `UPDATE player_characters SET campaign_id = $campaignId WHERE id = $charId AND user_id = $userId AND campaign_id IS NULL`
- O `.is("campaign_id", null)` garante que só personagens standalone possam ser vinculados

Quando ausente: fluxo original de INSERT.

---

### 3. acceptJoinCodeAction — suporte a personagem existente
**[app/join-campaign/[code]/actions.ts](../app/join-campaign/[code]/actions.ts)**

Mesmo padrão do `acceptInviteAction`. O email de notificação para o DM usa o `display_name` do usuário quando é personagem existente (ao invés do nome do personagem novo).

---

### 4. MyCharactersPage — tela de Personagens
**[components/dashboard/MyCharactersPage.tsx](../components/dashboard/MyCharactersPage.tsx)**

Mudanças:
- **Empty state:** botão "Criar Personagem" (era "Ver Campanhas")
- **Com personagens:** botão "Criar Personagem" no header da página
- **Seção "Sem campanha":** exibe personagens standalone antes dos grupos de campanha
- **Dialog de criação:** form com nome (obrigatório), raça, classe, nível, HP, AC, DC — chama `createStandaloneCharacterAction` e faz `router.refresh()` ao concluir

---

### 5. Invite page — busca personagens standalone
**[app/invite/[token]/page.tsx](../app/invite/[token]/page.tsx)**

Adicionada query:
```ts
supabase
  .from("player_characters")
  .select("id, name, race, class, level, max_hp, ac, token_url")
  .eq("user_id", user.id)
  .is("campaign_id", null)
```
Resultado passado como `existingCharacters` ao `InviteAcceptClient`.

---

### 6. InviteAcceptClient — picker de personagens
**[components/campaign/InviteAcceptClient.tsx](../components/campaign/InviteAcceptClient.tsx)**

Dois modos:
- `pick` (padrão quando há personagens): lista de cards clicáveis com seleção visual (borda gold + CheckCircle2), opção "+ Criar personagem novo" no final
- `create` (padrão quando não há personagens): formulário original, com link "← Usar personagem existente" se houver

Botão de submit muda de label conforme o modo: "Entrar com este personagem" ou "Criar e entrar".

---

### 7. Join-campaign page — busca personagens standalone
**[app/join-campaign/[code]/page.tsx](../app/join-campaign/[code]/page.tsx)**

Mesma query de personagens standalone da invite page. Resultado passado ao `JoinCampaignClient`.

---

### 8. JoinCampaignClient — picker de personagens
**[components/campaign/JoinCampaignClient.tsx](../components/campaign/JoinCampaignClient.tsx)**

Idêntico ao `InviteAcceptClient` em comportamento. Aplica-se ao fluxo de join por link público (join code).

---

## Regras de Negócio

| Situação | Comportamento |
|---|---|
| Personagem sem campanha | `campaign_id = NULL`, aparece em "Sem campanha" na tela de Personagens |
| Personagem vinculado | `campaign_id = UUID`, aparece sob o nome da campanha |
| Aceitar convite com personagem existente | `UPDATE campaign_id` — personagem migra para a campanha |
| Personagem já vinculado | Não aparece como opção no picker (filtro `.is("campaign_id", null)`) |
| Sair de campanha (futuro) | `UPDATE campaign_id = NULL` — personagem volta para standalone |

---

## Pendências

- **Aplicar migration 051** no Supabase (CLI não disponível no ambiente de dev)
- **"Sair de campanha"** (setar `campaign_id = NULL`) — deferred, ainda não há UI para isso
- **Editar personagem standalone** — clicar no card não faz nada ainda; edição ficou como backlog
