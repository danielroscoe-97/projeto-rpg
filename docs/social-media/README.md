# Social Media — Pocket DM

> Infraestrutura interna de gestao de redes sociais. NAO publicar em public/.

## Como Criar um Post

1. **Escolha o tipo** — veja `templates/` para os 6 formatos disponiveis
2. **Copie o template** para `posts/YYYY-MM-DD-slug.md`
3. **Preencha os campos** — cada template tem placeholders claros
4. **Crie o visual** — siga `brand-social-guidelines.md` para cores, fontes e layout
5. **Agende** — horarios recomendados no arquivo da plataforma (`platforms/`)

## Estrutura

```
social-media/
├── README.md                  ← voce esta aqui
├── brand-social-guidelines.md ← regras visuais (cores, fontes, layout)
├── content-pillars.md         ← os 4 pilares de conteudo
├── editorial-calendar.md      ← calendario master + regras
├── templates/                 ← templates por tipo de post
├── platforms/                 ← estrategia por plataforma
├── references/                ← contas de inspiracao
├── calendar/                  ← calendario mensal com posts definidos
└── posts/                     ← posts criados (prontos para publicar)
```

## Frequencia

| Plataforma | Frequencia | Formato |
|---|---|---|
| Instagram | 2x/semana (ter + sex) + 1 reel/mes | Feed + Stories + Reels |
| Facebook | Espelho do Instagram | Feed |
| TikTok | 1 reel/mes (mesmo do IG) + clips extras | Video curto |

## Pilares de Conteudo (resumo)

| Pilar | % | Cor tag |
|---|---|---|
| Dicas de Mesa | 40% | Verde |
| Conteudo SRD (monstros, spells) | 25% | Vermelho |
| Produto (app screenshots) | 20% | Gold |
| Comunidade (memes, enquetes) | 15% | Roxo |

## Workflow Rapido

```
1. Abrir calendar/YYYY-MM.md → ver proximo post agendado
2. Copiar template correspondente → posts/YYYY-MM-DD-slug.md
3. Preencher copy + descrever visual
4. Criar arte (Canva/Figma seguindo brand-social-guidelines.md)
5. Postar no horario recomendado
6. Marcar [x] no calendario
```
