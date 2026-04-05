# Hotfix: Invite Bug + Migration Audit — 2026-04-05

## Problema Reportado

DM não conseguia convidar jogadores nem gerar link de convite para campanha. Dialog mostrava "Não foi possível gerar o link de convite."

## Root Causes

### 1. Migrations fantasma (SQL não executou mas foi marcada como aplicada)

`supabase db push` registrou as migrations em `supabase_migrations.schema_migrations`, mas o SQL de ALTER TABLE / CREATE TABLE não executou de fato. Causa raiz desconhecida (possivelmente timeout ou erro silencioso no push).

**Migrations afetadas e corrigidas manualmente via `supabase db query --linked`:**

| Migration | Conteúdo | Impacto |
|-----------|----------|---------|
| 036 | `accept_campaign_invite()` function | Aceitar convite por email não funcionaria |
| 037 | `campaign_invites_recipient_select` RLS policy | Jogadores não veriam convites pendentes |
| 038 | `race`, `class`, `level` em `player_characters` | Player view não carregaria personagem |
| 039 | `join_code`, `join_code_active`, `max_players` em `campaigns` | **Bug principal** — geração de link falhava com `column does not exist` |
| 041 | Tabela `analytics_daily` | Dashboard analytics não funcionaria |
| 044 | `notes`, `token_url` em `player_characters` | Notas e avatar de personagem não salvariam |
| 047 | Tabela `player_push_subscriptions` | Push notifications para jogadores não funcionariam |

### 2. Email de convite não enviado (fire-and-forget em serverless)

`sendCampaignInviteEmail()` era chamado sem `await` no handler do POST `/api/campaign/[id]/invites`. O Vercel mata funções serverless assim que o response é enviado, então o fetch para a API do Resend nunca completava.

**Evidência:** Vercel logs mostravam External APIs sem chamada para `api.resend.com`.

**Fix:** Adicionado `await` antes de `sendCampaignInviteEmail()`.

## Commits

- `a4f5f4a` — fix(invite): apply missing DB migration + improve error observability
- `[hash]` — fix(invite): crown d20 logo in email + serif font for brand headings
- `[hash]` — debug(invite): add logging to diagnose email send failures
- `[hash]` — fix(invite): await email send — Vercel kills function before fire-and-forget completes

## Melhorias de Observabilidade

- `captureError` com contexto de auth e DB no join-link API
- `console.error` no InvitePlayerDialog para debugging no browser
- `console.log` no campaign-invite para confirmar envio no Vercel logs
- Display name do DM atualizado no DB (`danielroscoe97` → `Daniel Roscoe`)

## Audit Completo do Schema

Após corrigir as migrations, verificação completa confirmou:
- **52 tabelas** — todas presentes
- **32 funções** — todas presentes
- **95+ indexes** — todos presentes
- **Colunas críticas** — todas verificadas via `information_schema.columns`

## Problemas Potenciais (Baixo Risco)

| Arquivo | Pattern | Risco |
|---------|---------|-------|
| `lib/analytics/track-server.ts` | `void admin.from().insert()` fire-and-forget | Analytics perdidos se função morre antes. Aceitável por não ser crítico. |
| `app/api/dm-audio/route.ts` | `.catch(() => {})` em storage cleanup | Erros de deleção silenciados, mas tem `await`. Pode gerar arquivos órfãos. |
| `app/api/player-audio/route.ts` | `.catch(() => {})` em storage cleanup | Mesmo padrão acima. |

## Lição Aprendida

1. **`supabase db push` não é confiável** — migrations podem ser marcadas como aplicadas sem executar. Sempre verificar schema real após push.
2. **Nunca fire-and-forget em serverless** — Vercel mata a função após response. Qualquer side-effect assíncrono DEVE ser `await`ed.
3. **Fail-open sem logging é invisível** — `sendCampaignInviteEmail` retornava `false` sem ninguém saber. Sempre logar falhas mesmo em fail-open.
