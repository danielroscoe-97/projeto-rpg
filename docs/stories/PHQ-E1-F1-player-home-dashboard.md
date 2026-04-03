# PHQ-E1-F1 — Player Home: Dashboard Refatorado DM+Player

**Epic:** Player HQ — Companheiro de Mesa (`docs/epic-player-hq.md`)
**Prioridade:** Alta
**Estimativa:** 5 SP
**Dependencia:** `docs/epic-campaign-dual-role.md` (campaign_members implementado)
**Arquivos principais:** `app/(authenticated)/dashboard/page.tsx`, `components/dashboard/PlayerDashboard.tsx` (novo), `components/dashboard/DmDashboard.tsx` (refactor)

---

## Resumo

Hoje o `/dashboard` e exclusivamente DM-centrico: lista campanhas que o usuario POSSUI. Jogadores logados nao tem destino apos o login — o app nao sabe distinguir se a pessoa e mestre ou jogador numa campanha.

Esta story refatora o dashboard para ser **dual-role**: se o usuario e dono de campanhas, ve a secao de DM. Se e membro de campanhas como jogador, ve a secao de Player. Pode ser ambos.

A **Player Home** exibe as campanhas em que o usuario participa como jogador, com cards ricos mostrando o personagem, imagem da campanha (definida pelo DM) e status rapido.

---

## Decisoes de UX

**D1: Secoes separadas no mesmo dashboard.** Nao e um switcher — e uma pagina scrollavel com secao "Minhas Campanhas (Mestre)" e secao "Minhas Campanhas (Jogador)". Se o usuario so tem um papel, so ve a secao relevante. Zero fricao.

**D2: Card de campanha diferente para DM e Player.** Card do DM: foco em "novo combate" e gestao. Card do Player: foco no personagem, imagem da campanha, status de recursos.

**D3: Imagem da campanha no card do Player.** O DM ja pode definir imagem da campanha. O card do jogador exibe essa imagem como background com overlay escuro. Se o DM nao definiu imagem, usa o pattern de fundo padrao com gradiente.

**D4: "Entrar no HQ" como CTA principal.** O card do jogador nao tem "Novo Combate" — tem um botao "Abrir HQ" que leva para `/app/campaign/[id]`. Se houver sessao ativa, mostra badge "Sessao ativa" e CTA alternativo "Entrar na Sessao".

**D5: Ordenacao.** Campanhas com sessao ativa aparecem primeiro. Depois por data da ultima atividade (updated_at do campaign_member ou da campanha).

---

## Contexto Tecnico

### Queries necessarias

```typescript
// Campanhas onde o usuario e DONO (DM)
const { data: dmCampaigns } = await supabase
  .from('campaigns')
  .select('*, active_session:combat_sessions(id, status)')
  .eq('owner_id', userId)
  .order('updated_at', { ascending: false });

// Campanhas onde o usuario e MEMBRO (Player)
const { data: playerCampaigns } = await supabase
  .from('campaign_members')
  .select(`
    *,
    campaign:campaigns(
      id, name, description, cover_image_url, owner_id,
      active_session:combat_sessions(id, status)
    ),
    character:player_characters(
      id, name, race, class, level, max_hp, current_hp, ac
    )
  `)
  .eq('user_id', userId)
  .eq('role', 'player')
  .eq('status', 'active')
  .order('joined_at', { ascending: false });
```

### Componentes novos

- `components/dashboard/PlayerCampaignCard.tsx` — card do jogador com imagem + personagem
- `components/dashboard/PlayerDashboardSection.tsx` — secao "Suas Campanhas (Jogador)"

### Componentes existentes a manter/adaptar

- `components/dashboard/DmDashboard.tsx` (ou equivalente atual) — manter sem regressoes

---

## Criterios de Aceite

### Layout Geral

1. `/app/dashboard` exibe secao DM se usuario possui campanhas.
2. `/app/dashboard` exibe secao Player se usuario e membro de campanhas como jogador.
3. Se usuario e somente DM, layout e identico ao atual (sem regressao).
4. Se usuario e somente Player, ve somente a secao de jogador.
5. Se usuario e DM e Player (em campanhas diferentes), ve ambas as secoes.
6. Secao Player aparece ABAIXO da secao DM se o usuario tem ambos os roles.

### Player Campaign Card

7. Card exibe imagem da campanha como background com overlay escuro semi-transparente.
8. Se campanha nao tem imagem, exibe gradient pattern padrao (fundo escuro da paleta).
9. Card exibe nome da campanha e nome do DM (owner).
10. Card exibe avatar/nome do personagem do jogador nessa campanha.
11. Card exibe Classe + Raca + Nivel do personagem (se preenchidos).
12. Card exibe HP atual/maximo com barra de cor conforme tier (igual ao combate).
13. Se ha sessao ativa na campanha, card exibe badge "Sessao Ativa" em destaque dourado.
14. CTA principal: botao "Abrir HQ" leva para `/app/campaign/[id]`.
15. Se ha sessao ativa, segundo CTA "Entrar na Sessao" leva para o link de combate ativo.

### Ordenacao

16. Cards com sessao ativa aparecem primeiro.
17. Demais cards ordenados por ultima atividade (desc).

### Empty States

18. Se usuario nao e membro de nenhuma campanha como jogador, exibe estado vazio com mensagem: "Voce ainda nao e membro de nenhuma campanha. Peca ao seu Mestre para te convidar."
19. Nao exibe o botao "Nova Campanha" na secao Player.

### Acessibilidade

20. Cards sao navegaveis por teclado (Enter abre o HQ).
21. Imagem de background tem `role="img"` com `aria-label` descritivo.

---

## Abordagem Tecnica

### Passo 1: Server Component com dados paralelos

```typescript
// app/(authenticated)/dashboard/page.tsx
export default async function DashboardPage() {
  const supabase = createServerComponentClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [dmCampaigns, playerMemberships] = await Promise.all([
    fetchDmCampaigns(supabase, user.id),
    fetchPlayerMemberships(supabase, user.id),
  ]);

  return (
    <div className="space-y-8">
      {dmCampaigns.length > 0 && (
        <DmDashboardSection campaigns={dmCampaigns} />
      )}
      {playerMemberships.length > 0 && (
        <PlayerDashboardSection memberships={playerMemberships} />
      )}
      {dmCampaigns.length === 0 && playerMemberships.length === 0 && (
        <EmptyDashboard />
      )}
    </div>
  );
}
```

### Passo 2: PlayerCampaignCard

```typescript
// components/dashboard/PlayerCampaignCard.tsx
interface PlayerCampaignCardProps {
  membership: CampaignMembership & {
    campaign: Campaign & { active_session?: { id: string; status: string }[] };
    character?: PlayerCharacter;
  };
}
```

Background com imagem:
```tsx
<div
  className="relative rounded-lg overflow-hidden border border-border min-h-[160px]"
  style={campaign.cover_image_url
    ? { backgroundImage: `url(${campaign.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined
  }
>
  <div className="absolute inset-0 bg-black/60" />
  <div className="relative z-10 p-4">
    {/* conteudo do card */}
  </div>
</div>
```

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---|---|---|
| `app/(authenticated)/dashboard/page.tsx` | Editar | Adicionar query de player memberships + dual render |
| `components/dashboard/PlayerCampaignCard.tsx` | Criar | Card do jogador com imagem + personagem |
| `components/dashboard/PlayerDashboardSection.tsx` | Criar | Secao "Suas Campanhas (Jogador)" |
| `messages/pt-BR.json` | Editar | Strings: `player_dashboard_title`, `player_dashboard_empty`, `open_hq`, `join_session`, `session_active` |
| `messages/en.json` | Editar | Strings equivalentes em ingles |

---

## Plano de Testes

### Testes Manuais

1. Login como usuario DM-only: ve somente secao DM, layout sem regressao.
2. Login como usuario Player (membro de campanha): ve secao Player com cards.
3. Login como usuario dual-role: ve ambas as secoes.
4. Card sem imagem de campanha: exibe gradient padrao.
5. Card com imagem: imagem visivel com overlay.
6. Campanha com sessao ativa: badge "Sessao Ativa" e CTA "Entrar na Sessao".
7. Personagem sem classe/raca preenchidos: campos omitidos graciosamente.
8. Empty state: usuario sem memberships ve mensagem de convite.

---

## Notas de Paridade

| Modo | Aplica? | Justificativa |
|---|---|---|
| Guest (`/try`) | NAO | Guest nao tem conta |
| Anonimo (`/join`) | NAO | Anonimo nao tem dashboard |
| Autenticado | SIM | Feature Auth-only |

---

## Definicao de Pronto

- [ ] Query de player memberships com join em campaigns + player_characters
- [ ] PlayerCampaignCard renderiza imagem de fundo + overlay + dados do personagem
- [ ] Sessao ativa exibe badge + CTA alternativo
- [ ] Dashboard renderiza secao Player quando existem memberships
- [ ] Zero regressao na secao DM existente
- [ ] Empty state para jogador sem memberships
- [ ] Strings i18n em pt-BR e en
- [ ] Build passa sem erros
