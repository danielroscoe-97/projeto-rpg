# Figma Rebuild Script — Ready to Execute

**Status:** pronto pra rodar assim que Figma Starter rate-limit destravar (ou Dani fizer upgrade)
**Alvo:** `uBJPn1qZEPCV2LLK82QnOi` — https://www.figma.com/design/uBJPn1qZEPCV2LLK82QnOi

## Ordem de execução (4 calls de `use_figma`)

1. **Call A:** Rebuild W0b + W1 com SVGs Lucide gold (substitui os atuais com emojis)
2. **Call B:** Build W4 (Player Minha Jornada)
3. **Call C:** Build W2 (Rodar combate)
4. **Call D:** Build W5 (Preparar mobile 390)

## Regras aplicadas (feedback Dani 2026-04-21)

**SVG Lucide dourado (#D4A853) substitui emoji em:**
- Sidebar nav (13 ícones: Hammer, Swords, BookOpen, CalendarDays, ScrollText, UserCircle, MapPin, Flag, FileText, Network, Music)
- Topbar (Search, Bell)
- Botões funcionais (Pencil/Edit, Plus/Add, X/Close, Play)
- Meta-info em cards (Calendar, Clock, MapPin em linha de sessão)
- Status de checklist (CheckCircle verde vs Circle muted)
- Ícones de tipo de entidade em activity feed + quick add (UserCircle, FileText, ScrollText, Swords)

**Emojis preservados (narrativa / celebração / cultura RPG):**
- 🎉 "Campanha criada!" (W0b welcome banner)
- 🎯 "Grupo persegue o dragão..." (W1 hero gancho)
- ⚡ "Adicionar rápido:" (W1 quick-add prefix)

## Triagem detalhada por wireframe

### W0b
| Elemento | Antes (emoji) | Depois (SVG gold) |
|---|---|---|
| Logo dot | (cor plana) | SVG `swords` em BG dentro do dot dourado |
| Topbar search | 🔍 | SVG `search` muted |
| Topbar bell | 🔔 | SVG `bell` gold |
| Sidebar Preparar | 🛠 | SVG `hammer` gold (ativo) / muted (inativo) |
| Sidebar Rodar | ⚔️ | SVG `swords` |
| Sidebar Recap | 📖 | SVG `book` |
| Sidebar 8 surfaces | 📅📜👤📍🚩📝🕸🎵 | `calendar` `scrollIcon` `user` `pin` `flag` `file` `network` `music` |
| Step 1 CTA "Convidar por link" | — | SVG `mail` gold + label |
| Step 2 CTA "Agendar" | 📅 | SVG `calendar` preto (em botão gold primário) |
| Step 3 CTAs "+NPC" etc | — | SVG `plus` gold + ícone do tipo (user/pin/flag/scrollIcon) |
| Tour icon | 🎬 | SVG `play` (cor INFO azul) |
| Tour skip "Pular ×" | × | SVG `x` muted |
| Welcome "🎉 Campanha criada!" | 🎉 | **MANTÉM** — narrativo |

### W1
| Elemento | Antes | Depois |
|---|---|---|
| Topbar meta badge | (cor gold) | SVG `clock` gold + "Sess. 12 em 2 dias" |
| Hero header | — | SVG `calendar` gold + "PRÓXIMA SESSÃO" |
| Hero edit btn | ✎ | SVG `pencil` muted |
| Hero meta 📅 ⏱ 📍 | emojis | SVG `calendar` `clock` `pin` (todos gold) |
| Hero gancho 🎯 | 🎯 | **MANTÉM** — narrativo |
| Checklist ✅ | ✅ | SVG `check` (circle + check) verde SUCCESS |
| Checklist ⬜ | ⬜ | SVG `circleIcon` muted |
| Quick-add ⚡ | ⚡ | **MANTÉM** — narrativo |
| Quick-add CTAs "+Encontro" etc | — | SVG `plus` + ícone do tipo (swords/user/file/scrollIcon) em cor semântica |
| Activity 👤📝📜 | emojis | SVG `user` `file` `scrollIcon` gold |

## Código completo (Call A — rebuild W0b + W1)

```javascript
// Ver `figma-rebuild-script-call-A.js` — código completo (48k)
// Salva em variável acima; quando destravar, basta invocar use_figma com esse code.
```

## O que fazer quando destravar

1. Invocar `use_figma` com code da Call A → rebuild W0b + W1
2. Verificar screenshot de ambos
3. Se OK, invocar Call B (W4), Call C (W2), Call D (W5) em sequência
4. Se Figma ainda limitado, fazer 1 call a cada hora até completar os 5

## Info diagnóstica

- **Primeiro rate limit hit:** depois de ~9 calls (whoami + create_new_file + 3× use_figma + 4× get_screenshot)
- **Segundo hit:** tentativa de rebuild (1 call, ainda bloqueado)
- **Hipótese:** Starter plan tem cota diária estreita (possivelmente 10–20 calls/dia)
- **Solução definitiva:** upgrade para Professional/Organization dá cota generosa
- **Solução paliativa:** esperar reset (geralmente 24h no Starter)

## Upgrade link

https://www.figma.com/files/team/1302702006537018755/all-projects?upgrade=mcp_rate_limit_paywall
