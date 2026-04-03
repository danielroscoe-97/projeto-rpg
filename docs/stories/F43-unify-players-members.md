# F-43 — Unificação das Seções "Jogadores" e "Membros" na Tela de Campanha

**Epic:** Dual Role — DM + Player  
**Prioridade:** Média  
**Estimativa:** 5 SP  
**Dependência:** Nenhuma (refactor puro de componentes existentes)  
**Arquivos principais:**
- `app/app/campaigns/[id]/CampaignSections.tsx` (modificar — remover seção "Membros", enriquecer seção "Jogadores")
- `components/dashboard/PlayerCharacterManager.tsx` (modificar — receber e exibir dados de membros vinculados)
- `components/campaign/MembersList.tsx` (remover da tela de detalhes de campanha)
- `components/campaign/MemberCard.tsx` (manter — reutilizar lógica de remoção)
- `app/app/campaigns/[id]/page.tsx` (verificar — dados já chegam em paralelo, sem mudança de query)

---

## Resumo

A tela de detalhes de campanha (visão DM) exibe hoje duas seções separadas:

- **"Jogadores"** (coluna principal) — lista personagens de `player_characters`, gerenciada por `PlayerCharacterManager`. Suporta adicionar manualmente, editar, remover, fazer upload de token e escrever notas do DM.
- **"Membros"** (sidebar) — lista contas autenticadas de `campaign_members`, gerenciada por `MembersList`. Mostra nome, e-mail, papel (DM/player) e botão de remoção.

O problema: quando um jogador aceita convite, ele aparece **em ambas as seções** com informações fragmentadas. O DM vê o mesmo jogador duas vezes com dados complementares mas separados. A seção "Membros" não tem as fichas de personagem; a seção "Jogadores" não mostra o e-mail ou conta vinculada.

Esta story unifica as duas numa única seção **"Jogadores & Membros"**, apresentando uma visão consolidada por jogador: ficha de personagem + status de conta, numa lista unificada que elimina a duplicidade percebida.

---

## Modelo de Dados — Relação entre as Tabelas

```
player_characters               campaign_members
─────────────────               ────────────────
id (PK)                         id (PK)
campaign_id                     campaign_id
user_id (nullable, FK → users)  user_id (FK → users)   ← campo de ligação
name                            role (dm | player)
max_hp / current_hp             status (active | ...)
ac                              display_name (via join)
...                             email (via join)
```

**Casos possíveis após unificação:**

| Caso | player_characters | campaign_members | Tipo visual |
|------|------------------|-----------------|-------------|
| A | Existe (`user_id` = null) | Não existe | Personagem manual (sem conta) |
| B | Existe (`user_id` preenchido) | Existe (mesmo `user_id`) | Jogador com conta vinculada |
| C | Não existe | Existe (`role = player`) | Membro sem personagem criado |
| D | Não existe | Existe (`role = dm`) | DM (exibir somente na seção de membros/info) |

O caso D (DM como membro) não deve aparecer como personagem jogável. Pode aparecer como nota informacional "DM da campanha" no final da lista, ou ser omitido da lista de personagens.

---

## Decisões de UX

**D1: Uma única seção "Jogadores" na coluna principal.**  
Eliminar a seção "Membros" da sidebar. Toda a informação de membros é absorvida pela seção "Jogadores". A sidebar mantém apenas Encontros, Missões e Mapa Mental.

**D2: Card unificado por jogador mostra ficha + badge de conta.**  
O `CharacterCard` existente continua sendo o elemento central. Quando o personagem tem `user_id` vinculado a um `campaign_member`, exibir abaixo do card um "badge de conta" compacto com:
- Ícone de usuário + nome de exibição ou e-mail truncado
- Badge de papel: "Player" (verde) ou, se necessário, indicador de membro sem personagem
- Botão de remover membro (apenas se for membro autenticado, com o mesmo padrão de confirmação do `AlertDialog`)

**D3: Jogadores manuais (caso A) sem badge de conta.**  
Personagens adicionados manualmente pelo DM (sem `user_id`) mostram apenas a ficha — sem badge de conta. Opcionalmente, exibir um label discreto "Adicionado manualmente" ou simplesmente ausência de badge (silêncio visual). Preferência: silêncio visual (não poluir o card).

**D4: Membros sem personagem (caso C) exibidos como cards vazios.**  
Se um `campaign_member` com `role = player` não possui `player_characters` associado, exibir um card simplificado com: avatar de iniciais, nome/e-mail, badge "Player" e botão de remover. Sem stats de HP/AC (não existem). Adicionar label "Sem personagem" em texto pequeno.

**D5: Botão "Convidar Jogador" permanece no header da seção.**  
O `InvitePlayerDialog` existente é mantido no topo da seção unificada, ao lado do botão "Adicionar manualmente". Os dois CTAs existem lado a lado, separando os dois fluxos de entrada.

**D6: Ordem de exibição.**  
Primeiro os personagens com conta vinculada (ordenados por `joined_at` do membro), depois os personagens manuais (ordenados por `created_at`), por último membros sem personagem. Dentro de cada grupo, ordem alfabética por nome.

**D7: Remoção de membro com personagem é uma operação dupla.**  
Ao remover um `campaign_member` que possui `player_characters` vinculado, o sistema deve perguntar: "Remover apenas o acesso à conta, ou remover também o personagem?" — dois botões no dialog de confirmação. Isso evita perda acidental de dados de personagem que o DM criou manualmente.

---

## Arquitetura Técnica

### Novo tipo de dado: `UnifiedPlayerEntry`

Criar em `lib/types/campaign-membership.ts`:

```ts
// Representa uma linha na lista unificada de jogadores da campanha.
// Pode ter personagem, membro, ou ambos.
export interface UnifiedPlayerEntry {
  // Identificador único para React key (preferência: character.id ?? member.id)
  key: string;

  // Dados do personagem (pode ser null para membros sem personagem)
  character: PlayerCharacter | null;

  // Dados do membro autenticado (pode ser null para personagens manuais)
  member: CampaignMemberWithUser | null;

  // Tipo derivado para lógica de renderização
  entryType: "character_only" | "linked" | "member_only";
}
```

### Função de merge: `mergePlayersAndMembers`

Criar em `lib/utils/merge-players-members.ts`:

```ts
export function mergePlayersAndMembers(
  characters: PlayerCharacter[],
  members: CampaignMemberWithUser[]
): UnifiedPlayerEntry[]
```

Lógica:
1. Para cada `character` com `user_id != null`: buscar `member` com mesmo `user_id` → gerar entrada `"linked"`
2. Para cada `character` com `user_id == null`: gerar entrada `"character_only"`
3. Para cada `member` com `role = "player"` que não foi vinculado em (1): gerar entrada `"member_only"`
4. Membros com `role = "dm"` são omitidos da lista

Ordenação: `"linked"` primeiro → `"character_only"` → `"member_only"`, alphabético dentro de cada grupo.

### Modificação: `PlayerCharacterManager`

Passar `initialMembers: CampaignMemberWithUser[]` como nova prop (opcional, default `[]`).

Internamente, usar `mergePlayersAndMembers` para construir a lista renderizada.

Para cada `UnifiedPlayerEntry`:
- `"linked"` ou `"character_only"`: renderizar `CharacterCard` existente + DM notes
- `"member_only"`: renderizar novo `MemberOnlyCard` (card simplificado sem stats)

Adicionar badge de conta abaixo do `CharacterCard` quando `entry.member != null`:
```tsx
{entry.member && (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-background/50 rounded-md text-xs">
    <User className="w-3 h-3 text-muted-foreground" />
    <span className="text-muted-foreground truncate">
      {entry.member.display_name ?? entry.member.email.split("@")[0]}
    </span>
    <span className="text-[10px] text-emerald-400 ml-auto">Conta vinculada</span>
  </div>
)}
```

Ao remover um entry do tipo `"linked"`, exibir dialog com duas opções (D7).

### Modificação: `CampaignSections`

- Remover `<Section icon={UserPlus} title={t("section_members")}>` da sidebar
- Passar `initialMembers` para `PlayerCharacterManager`
- Ajustar i18n: renomear `section_players` → "Jogadores" (já é o label correto)

### Remoção gradual

`MembersList.tsx` e `MemberCard.tsx` não são deletados imediatamente. São mantidos sem uso na tela de campanha, mas podem ser reutilizados em contextos futuros (ex: página de configurações da campanha). Remover as importações de `CampaignSections.tsx`.

### Sem mudanças de query no server

`page.tsx` já carrega `player_characters` e `getCampaignMembers(id)` em paralelo. Nenhuma nova query necessária — apenas os dados já carregados chegam como props para `CampaignSections` e, em seguida, para `PlayerCharacterManager`.

### Ação de remoção de membro com personagem

Criar nova server action `removeMemberAndCharacterAction` em `lib/actions/invite-actions.ts`:

```ts
export async function removeMemberAndCharacterAction(
  campaignId: string,
  userId: string,
  alsoRemoveCharacter: boolean
): Promise<void>
```

- Se `alsoRemoveCharacter = true`: deleta `player_characters` onde `campaign_id = campaignId AND user_id = userId`
- Sempre deleta `campaign_members` onde `campaign_id = campaignId AND user_id = userId`

---

## Critérios de Aceitação

- [ ] A seção "Membros" não aparece mais na sidebar da tela de campanha (visão DM)
- [ ] A seção "Jogadores" exibe todos os personagens (com e sem conta vinculada)
- [ ] Jogadores que aceitaram convite aparecem com badge "Conta vinculada" e nome/e-mail abaixo do card de personagem
- [ ] Personagens adicionados manualmente pelo DM (sem conta) não exibem badge de conta
- [ ] Membros autenticados sem personagem aparecem como card simplificado com label "Sem personagem"
- [ ] Botão "Convidar Jogador" e botão "Adicionar manualmente" coexistem no header da seção
- [ ] Remover um membro que tem personagem exibe dialog com as opções "Remover apenas acesso" e "Remover acesso e personagem"
- [ ] Remover um membro sem personagem funciona igual ao comportamento atual de `MemberCard` (confirmação + toast)
- [ ] O DM (como `campaign_member` com `role = "dm"`) não aparece na lista de jogadores
- [ ] A lista segue a ordem: vinculados → manuais → sem personagem
- [ ] `mergePlayersAndMembers` tem cobertura de unit test para os 4 casos (A, B, C, D)

---

## Fora de Escopo

- Edição de dados do membro autenticado (e-mail, nome de exibição) — Auth-only, fora desta story
- Histórico de atividade por jogador na campanha
- Filtros ou busca dentro da lista de jogadores
- Paginação (campanhas raramente têm mais de 8 jogadores)
- Notificação ao jogador quando é removido da campanha
- Visualização do personagem pelo próprio jogador (já existe em `PlayerCampaignView`)
- Deletar `MembersList.tsx` e `MemberCard.tsx` do repositório (manter para eventual reúso)
