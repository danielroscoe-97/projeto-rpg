# F-42 — Convite de Campanha via Link (Join Code)

**Epic:** Dual Role — DM + Player  
**Prioridade:** Alta  
**Estimativa:** 8 SP  
**Dependência:** Migration 039 já aplicada (`campaigns.join_code`, `join_code_active`, `max_players`)  
**Arquivos principais:**
- `components/campaign/InvitePlayerDialog.tsx` (modificar — adicionar aba "Via Link")
- `app/join-campaign/[code]/page.tsx` (novo)
- `app/join-campaign/[code]/actions.ts` (novo)
- `app/api/campaign/[id]/join-link/route.ts` (novo)
- `lib/notifications/campaign-joined.ts` (novo)
- `app/auth/confirm/route.ts` (modificar — suporte a `join_code` param)
- `supabase/migrations/056_join_code_rls.sql` (novo)

---

## Resumo

DM pode gerar um link permanente da campanha (estilo Discord) e compartilhar com jogadores via qualquer canal. Qualquer pessoa com o link faz login/cadastro, cria o personagem (nome obrigatório, HP/AC opcionais), e entra automaticamente na campanha. DM recebe e-mail via Novu notificando quem entrou.

O join_code já existe no banco (migration 039) mas não tem implementação em código.

---

## Decisões de UX

**D1: Uma aba nova em InvitePlayerDialog.**  
O dialog existente fica com duas abas: "Via Link" (nova, padrão) e "Via E-mail" (existente). "Via Link" aparece primeiro por ser o fluxo mais simples.

**D2: Link gerado automaticamente na primeira abertura da aba.**  
Se `join_code` for null, o GET da API gera um na hora. DM não precisa clicar em "Gerar" — o link simplesmente aparece.

**D3: Botão "Renovar Link" com confirmação inline.**  
Invalida o join_code atual e gera um novo. Ao clicar em "Renovar Link", exibe inline: mensagem de aviso + [Confirmar] [Cancelar]. O código antigo só é invalidado após o usuário clicar em "Confirmar". Ação irreversível — não há undo após confirmação.

**D4: Toggle "Desativar Link" sem renovar.**  
DM pode pausar o link sem gerar um novo (ex: campanha cheia temporariamente). Toggle simples: ativo/inativo. Ao reativar, o mesmo código volta a funcionar.

**D5: Personagem com nome obrigatório.**  
Formulário de aceite reutiliza o visual do `InviteAcceptClient` existente: nome (required), HP, AC, DC (todos opcionais). Consistência total com o fluxo de e-mail.

**D6: Player não precisa ter conta — fluxo de cadastro transparente.**  
Se não logado: redireciona para `/auth/sign-up?join_code=[code]`. Após confirmação de e-mail, `/auth/confirm` detecta `join_code` e redireciona de volta para `/join-campaign/[code]`.

---

## Fluxo Completo

### DM (geração do link)

```
InvitePlayerDialog → aba "Via Link"
  → GET /api/campaign/[id]/join-link
    → se join_code IS NULL: gera 8 chars aleatórios, salva, ativa
    → retorna { code, is_active, link }
  → exibe: "pocketdm.app/join-campaign/[code]"
  → botão [📋 Copiar] [🔄 Renovar] [toggle Ativo/Inativo]
```

### Player (aceite — já logado)

```
/join-campaign/[code]
  → service client: SELECT id, name, owner_id FROM campaigns
      WHERE join_code = code AND join_code_active = true
  → se não encontrado → página de erro "Link inválido ou desativado"
  → se usuário já é membro → redireciona para /app/dashboard (silencioso)
  → exibe JoinCampaignClient (formulário de personagem)
  → submit → acceptJoinCodeAction(code, charData)
    → service client: INSERT campaign_members (role=player)
    → service client: INSERT player_characters
    → Novu: notifica DM por e-mail
    → redireciona para /app/dashboard
```

### Player (aceite — não logado)

```
/join-campaign/[code]
  → redirect /auth/sign-up?join_code=[code]

/auth/confirm (após verificação de e-mail)
  → detecta join_code param
  → redirect /join-campaign/[code]  ← volta para o fluxo acima
```

---

## Contexto Técnico

### Migration 056 — RLS para join_code lookup

```sql
-- 056_join_code_rls.sql
-- Permite que qualquer usuário autenticado leia dados básicos
-- de campanha via join_code (para o fluxo de aceite de convite).
-- Sem essa policy, a server action precisaria de service client
-- apenas para validar o código — aqui usamos uma policy mais limpa.

CREATE POLICY "campaigns_readable_by_join_code"
  ON campaigns FOR SELECT
  TO authenticated
  USING (join_code_active = true);
```

> **Nota:** Se a policy acima for muito permissiva para o contexto do projeto,
> usar `createServiceClient()` na server action também é aceitável (padrão já
> estabelecido em `acceptInviteAction`). Decidir na implementação.

---

### API: GET/POST/DELETE /api/campaign/[id]/join-link

**GET** — retorna código atual (ou gera se null)
```ts
// Response
{ data: { code: string, is_active: boolean, link: string } }
```

**PATCH** — toggle `join_code_active` (sem renovar o código)
```ts
// Body: { is_active: boolean }
// Response: { data: { is_active: boolean } }
```

**POST** — regenera: gera novo `join_code`, seta `join_code_active = true`
```ts
// Response: { data: { code: string, link: string } }
```

Todos os endpoints: autenticação obrigatória + ownership check (`owner_id = user.id`).

---

### Server Action: acceptJoinCodeAction

```ts
// app/join-campaign/[code]/actions.ts
interface JoinCampaignData {
  code: string;
  name: string;
  maxHp: number | null;
  currentHp: number | null;
  ac: number | null;
  spellSaveDc: number | null;
}

export async function acceptJoinCodeAction(data: JoinCampaignData): Promise<void>
```

Passos internos:
1. `createClient()` — verifica `auth.getUser()` (requer login)
2. `createServiceClient()` — busca campaign by `join_code = data.code AND join_code_active = true`
3. Se não encontrado → throw "Código inválido"
4. `INSERT campaign_members ON CONFLICT DO NOTHING`
5. `INSERT player_characters` (nome obrigatório; HP/AC default 10 se não fornecidos)
6. `sendCampaignJoinedEmail(...)` — fail-open

---

### Notificação: lib/notifications/campaign-joined.ts

Padrão idêntico ao `lib/notifications/campaign-invite.ts` (Novu).

```ts
interface CampaignJoinedPayload {
  dmEmail: string;
  dmName: string;
  playerName: string;    // nome do personagem criado
  playerEmail: string;   // e-mail da conta do jogador
  campaignName: string;
  campaignUrl: string;   // link para /app/campaigns/[id]
}

export async function sendCampaignJoinedEmail(payload: CampaignJoinedPayload): Promise<boolean>
// Trigger Novu: "campaign-member-joined"
```

---

### Modificação: app/auth/confirm/route.ts

Na função `getRedirectTarget()`, adicionar antes do bloco de invite:

```ts
const joinCode = searchParams.get("join_code");
if (joinCode) {
  return `/join-campaign/${joinCode}`;
}
```

---

### Página: app/join-campaign/[code]/page.tsx

Server component. Reutiliza o visual de `/invite/[token]/page.tsx`.

Condições de erro (cada uma com página de erro clara):
- `join_code_active = false` → "Este link foi desativado pelo Mestre"
- Campanha não encontrada → "Link inválido"
- Usuário já é membro → redirect silencioso para `/app/dashboard`

Quando ok + usuário logado → renderiza `JoinCampaignClient` (novo, baseado em `InviteAcceptClient`).

---

### Componente: JoinCampaignClient

Baseado em `InviteAcceptClient.tsx` com duas diferenças:
1. Chama `acceptJoinCodeAction` em vez de `acceptInviteAction`
2. Não tem `inviteId` (desnecessário)

Props:
```ts
interface JoinCampaignClientProps {
  code: string;
  campaignName: string;
  dmName: string;
}
```

---

### Modificação: InvitePlayerDialog.tsx

Adicionar `Tabs` do shadcn com duas abas: **"Via Link"** e **"Via E-mail"**.

Aba "Via Link":
- Ao abrir: chama GET /api/campaign/[id]/join-link (lazy, só quando aba ativa)
- Exibe a URL completa em Input readonly
- Botão [📋 Copiar] com `navigator.clipboard.writeText`
- Toggle switch "Link ativo" → PATCH /api/campaign/[id]/join-link
- Botão [🔄 Renovar Link] com confirmação: ao clicar, mostra "Tem certeza? Jogadores com o link antigo precisarão do novo." + [Confirmar] [Cancelar] → POST /api/campaign/[id]/join-link

---

## Critérios de Aceitação

- [ ] DM abre InvitePlayerDialog → aba "Via Link" → link gerado automaticamente
- [ ] Botão "Copiar" copia URL para o clipboard e exibe toast "Link copiado!"
- [ ] Toggle "Inativo" desativa o link; `/join-campaign/[code]` mostra erro "Link desativado"
- [ ] "Renovar Link" gera novo código; URL antiga retorna erro; nova URL funciona
- [ ] Player com conta clica no link → cria personagem (nome obrigatório) → entra na campanha → aparece em Membros
- [ ] Player sem conta → fluxo de cadastro → confirma email → volta para o link → cria personagem → entra
- [ ] Se player já é membro → redirect para dashboard sem erro
- [ ] DM recebe e-mail Novu com nome do jogador e link para a campanha (fail-open: se Novu indisponível, join funciona normalmente)
- [ ] `max_players`: se campanha atingiu o limite → erro "Campanha cheia"
- [ ] join_code não vaza em queries públicas (RLS ou service client exclusivamente)

---

## Fora de Escopo

- Aprovação manual do DM para cada jogador (decidido: auto-join)
- Limite de usos por link (decidido: ilimitado, apenas `max_players` limita)
- Notificação in-app para DM (apenas e-mail por ora)
- Link com expiração (decidido: permanente até revogação manual)
