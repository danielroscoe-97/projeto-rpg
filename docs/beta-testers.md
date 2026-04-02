# Beta Testers — Contas Reais

> **Objetivo:** Monitorar persistência, testar features novas, e garantir que migrations não quebrem dados reais.
> **Regra:** NUNCA rodar scripts destrutivos ou seeds nessas contas. Sem senhas neste doc.
> **Atualizado em:** 2026-04-02

---

## Campanha Ativa

| Campo | Valor |
|-------|-------|
| **Nome** | Curse of Strahd |
| **ID** | `21c99bcc-4081-4f87-a53a-f67fffa86347` |
| **DM** | Lucas Galuppo (`lucasgaluppo17@gmail.com`) |
| **Criada em** | 2026-04-01 |

---

## Beta Testers

### DM

| Email | Display Name | UUID | Role | Desde |
|-------|-------------|------|------|-------|
| `lucasgaluppo17@gmail.com` | lucasgaluppo17 | `414dd199-e6b8-4199-b23e-ebac11e7d1de` | DM | 2026-03-30 |

### Players

| Email | Display Name | UUID | Role | Desde |
|-------|-------------|------|------|-------|
| `luccaguedes.andrade@gmail.com` | luccaguedes.andrade | `198a2e06-b662-4bdf-9beb-b76f9d8a0450` | Player | 2026-03-26 |
| `victorcastelloes@gmail.com` | victorcastelloes | `05c55434-e6ca-44df-a506-bee0755db622` | Player | 2026-04-01 |
| `danielroscoe97@gmail.com` | danielroscoe97 | `0e489319-551d-4fde-ba04-5c44dea10886` | Player | 2026-03-24 |

---

## Queries Uteis

```sql
-- Ver todas as campanhas dos beta testers
SELECT c.id, c.name, c.owner_id, u.email
FROM campaigns c
JOIN users u ON u.id = c.owner_id
WHERE c.owner_id IN (
  '414dd199-e6b8-4199-b23e-ebac11e7d1de',  -- galuppo (DM)
  '198a2e06-b662-4bdf-9beb-b76f9d8a0450',  -- lucca
  '05c55434-e6ca-44df-a506-bee0755db622',   -- victor
  '0e489319-551d-4fde-ba04-5c44dea10886'    -- dani
);

-- Ver personagens dos beta testers na campanha
SELECT pc.name, pc.current_hp, pc.max_hp, pc.ac, u.email
FROM player_characters pc
LEFT JOIN users u ON u.id = pc.user_id
WHERE pc.campaign_id = '21c99bcc-4081-4f87-a53a-f67fffa86347';

-- Verificar integridade pos-migration
SELECT u.email, u.display_name, u.created_at
FROM users u
WHERE u.id IN (
  '414dd199-e6b8-4199-b23e-ebac11e7d1de',
  '198a2e06-b662-4bdf-9beb-b76f9d8a0450',
  '05c55434-e6ca-44df-a506-bee0755db622',
  '0e489319-551d-4fde-ba04-5c44dea10886'
);
```
