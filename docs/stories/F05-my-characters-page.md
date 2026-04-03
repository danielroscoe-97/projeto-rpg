# F-05 — Pagina "Meus Personagens" (Cross-Campaign)

**Epic:** F — Player Experience (Area Logada)  
**Prioridade:** Media  
**Estimativa:** 3 SP  
**Dependencia:** W32 (integracao CharacterForm+CharacterCard no PlayerCharacterManager) concluida  
**Arquivos principais:** `components/dashboard/DashboardSidebar.tsx`, `components/character/CharacterCard.tsx`, `app/app/dashboard/characters/page.tsx` (novo), `messages/pt-BR.json`, `messages/en.json`

---

## Resumo

O jogador participa de multiplas campanhas. Hoje, pra ver seus personagens, precisa entrar em cada campanha individualmente. Na mesa, isso e irrelevante — mas fora da mesa, o jogador quer uma visao rapida de todos os personagens que tem. Esta story cria a pagina `/app/dashboard/characters` como hub central de personagens cross-campaign: lista agrupada por campanha, com os mesmos `CharacterCard` ja usados dentro de cada campanha. Click no card leva pra campanha. Sem criacao aqui — criacao e campanha-scoped.

---

## Decisoes de UX

> **D1:** Rota `/app/dashboard/characters` dentro do dashboard layout existente. Sidebar ganha link "Personagens" com icone `Users` entre "Combates" e "Soundboard".
>
> **D2:** Cards agrupados por campanha. Cada grupo tem header com nome da campanha (Cinzel, text-sm, text-muted-foreground). Campanhas ordenadas por `updated_at` do personagem mais recente.
>
> **D3:** Cada card usa `CharacterCard` existente. Click no card navega para `/app/campaigns/[campaign_id]` (pagina da campanha). Sem edicao inline — edicao e dentro da campanha (W32).
>
> **D4:** Estado vazio: ilustracao pixel-art de pergaminho vazio + "Voce ainda nao tem personagens" + CTA "Ver Campanhas" que leva a `/app/dashboard/campaigns`.
>
> **D5:** Sem paginacao — jogador tipico tem 1-5 personagens. Se tiver mais de 20, lazy load futuro (bucket).
>
> **D6:** Loading skeleton com 3 cards placeholder durante fetch inicial.

---

## Contexto Tecnico

### Componentes reutilizaveis

**`components/character/CharacterCard.tsx`** — Card com avatar circular (token_url), nome, raca+classe, nivel, badges HP/AC. Props:

```typescript
interface CharacterCardProps {
  character: PlayerCharacter;
  onClick?: () => void;
  onUploadToken?: () => void;
}
```

Nesta pagina, `onUploadToken` nao sera usado (upload e campanha-scoped). `onClick` navega pra campanha.

### Schema DB

```sql
player_characters {
  id UUID, campaign_id UUID, user_id UUID,
  name TEXT, race TEXT, class TEXT, level INT,
  max_hp INT, current_hp INT, ac INT, spell_save_dc INT,
  notes TEXT, token_url TEXT, dm_notes TEXT,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
}
```

### RLS existente

Players ja podem `SELECT` seus proprios personagens via `user_id = auth.uid()`. Nenhuma nova policy necessaria.

### Query planejada

```typescript
const { data } = await supabase
  .from("player_characters")
  .select("*, campaigns(id, name)")
  .eq("user_id", userId)
  .order("updated_at", { ascending: false });
```

A join com `campaigns` traz o nome da campanha pra agrupar. RLS ja permite — player e membro da campanha.

### Sidebar (DashboardSidebar.tsx)

```typescript
const NAV_ITEMS_DESKTOP = [
  { key: "overview", href: "/app/dashboard", icon: LayoutDashboard },
  { key: "campaigns", href: "/app/dashboard/campaigns", icon: Swords },
  { key: "combats", href: "/app/dashboard/combats", icon: ScrollText },
  // ← novo item "characters" aqui
  { key: "soundboard", href: "/app/dashboard/soundboard", icon: Music },
  { key: "settings", href: "/app/settings", icon: Settings },
];
```

### Layout translations (DashboardLayout)

O `layout.tsx` do dashboard passa um objeto `translations` pro sidebar. Novo campo `characters` precisa ser adicionado ao tipo `SidebarTranslations` e ao fetch de traducoes.

---

## Criterios de Aceite

### Navegacao

1. Link "Personagens" visivel na sidebar desktop entre "Combates" e "Soundboard", com icone `Users` do Lucide.

2. Link "Personagens" visivel na bottom nav mobile (substituir Soundboard — mobile tem espaco limitado, 4 itens max).

3. Clicar no link navega para `/app/dashboard/characters`. Sidebar destaca o item ativo.

4. Pagina acessivel apenas para usuarios autenticados (rota protegida pelo middleware existente).

### Listagem

5. Pagina exibe todos os personagens do usuario logado, agrupados por campanha.

6. Cada grupo tem header com nome da campanha em destaque (font Cinzel, text-sm).

7. Cada personagem renderiza com `CharacterCard`: avatar, nome, raca+classe, nivel, HP/AC badges.

8. Personagens ordenados por `updated_at` descendente dentro de cada grupo.

9. Campanhas ordenadas pelo `updated_at` mais recente entre seus personagens.

### Interacao

10. Click no card navega para `/app/campaigns/[campaign_id]` (pagina da campanha).

11. Sem opcao de criar personagem nesta pagina (criacao e campanha-scoped).

12. Sem opcao de editar ou deletar personagem nesta pagina.

### Estados

13. Estado loading: 3 skeleton cards com animacao pulse.

14. Estado vazio: mensagem "Voce ainda nao tem personagens" + botao "Ver Campanhas" linkando para `/app/dashboard/campaigns`.

15. Estado erro: toast com mensagem de erro + retry button.

### i18n

16. Todas as strings em `messages/pt-BR.json` e `messages/en.json` sob namespace `sidebar` (link) e `characters_page` (pagina).

---

## Abordagem Tecnica

### Passo 1: Criar pagina server component

**`app/app/dashboard/characters/page.tsx`:**

```typescript
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MyCharactersPage } from "@/components/dashboard/MyCharactersPage";

export default async function CharactersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: characters } = await supabase
    .from("player_characters")
    .select("*, campaigns(id, name)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return <MyCharactersPage initialCharacters={characters ?? []} />;
}
```

### Passo 2: Criar client component MyCharactersPage

**`components/dashboard/MyCharactersPage.tsx`:**

```typescript
"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { CharacterCard } from "@/components/character/CharacterCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { PlayerCharacter } from "@/lib/types/database";

interface Campaign {
  id: string;
  name: string;
}

interface CharacterWithCampaign extends PlayerCharacter {
  campaigns: Campaign;
}

interface Props {
  initialCharacters: CharacterWithCampaign[];
}

export function MyCharactersPage({ initialCharacters }: Props) {
  const t = useTranslations("characters_page");
  const router = useRouter();

  // Agrupar por campaign
  const grouped = initialCharacters.reduce<Record<string, {
    campaign: Campaign;
    characters: CharacterWithCampaign[];
  }>>((acc, char) => {
    const key = char.campaigns.id;
    if (!acc[key]) {
      acc[key] = { campaign: char.campaigns, characters: [] };
    }
    acc[key].characters.push(char);
    return acc;
  }, {});

  const groups = Object.values(grouped);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Users className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/app/dashboard/campaigns">{t("view_campaigns")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <h1 className="text-xl font-heading text-foreground">{t("title")}</h1>

      {groups.map(({ campaign, characters }) => (
        <section key={campaign.id} className="space-y-3">
          <h2 className="text-sm font-heading text-muted-foreground tracking-wide">
            {campaign.name}
          </h2>
          <div className="space-y-2">
            {characters.map((char) => (
              <CharacterCard
                key={char.id}
                character={char}
                onClick={() => router.push(`/app/campaigns/${campaign.id}`)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

### Passo 3: Adicionar item na sidebar

**`components/dashboard/DashboardSidebar.tsx`:**

Adicionar `Users` ao import do Lucide. Inserir novo item nos arrays:

```typescript
// Desktop — entre combats e soundboard
{ key: "characters" as const, href: "/app/dashboard/characters", icon: Users },

// Mobile — substituir soundboard (4 itens max)
{ key: "characters" as const, href: "/app/dashboard/characters", icon: Users },
```

### Passo 4: Atualizar tipos da sidebar

**`components/dashboard/DashboardSidebar.tsx`** — adicionar `characters` ao tipo:

```typescript
interface SidebarTranslations {
  // ... existentes ...
  characters: string;
}
```

**`components/dashboard/DashboardLayout.tsx`** — adicionar `characters` ao tipo:

```typescript
interface DashboardLayoutProps {
  translations: {
    // ... existentes ...
    characters: string;
  };
}
```

**`app/app/dashboard/layout.tsx`** — adicionar ao objeto translations:

```typescript
const translations = {
  // ... existentes ...
  characters: t("characters"),
};
```

### Passo 5: Adicionar traducoes

**`messages/pt-BR.json`:**

```json
{
  "sidebar": {
    "characters": "Personagens"
  },
  "characters_page": {
    "title": "Meus Personagens",
    "empty": "Voce ainda nao tem personagens",
    "view_campaigns": "Ver Campanhas",
    "loading": "Carregando personagens..."
  }
}
```

**`messages/en.json`:**

```json
{
  "sidebar": {
    "characters": "Characters"
  },
  "characters_page": {
    "title": "My Characters",
    "empty": "You don't have any characters yet",
    "view_campaigns": "View Campaigns",
    "loading": "Loading characters..."
  }
}
```

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `app/app/dashboard/characters/page.tsx` | **NOVO** — Server component, fetch personagens do user |
| `components/dashboard/MyCharactersPage.tsx` | **NOVO** — Client component, agrupamento + render |
| `components/dashboard/DashboardSidebar.tsx` | Adicionar item "characters" nos arrays desktop + mobile |
| `components/dashboard/DashboardLayout.tsx` | Adicionar `characters` ao tipo translations |
| `app/app/dashboard/layout.tsx` | Adicionar `characters` ao objeto translations |
| `messages/pt-BR.json` | Adicionar keys `sidebar.characters` + `characters_page.*` |
| `messages/en.json` | Adicionar keys `sidebar.characters` + `characters_page.*` |

---

## Plano de Testes

### Testes Manuais

1. **Sidebar link aparece**
   - [ ] Desktop: link "Personagens" visivel entre Combates e Soundboard
   - [ ] Mobile: link "Personagens" visivel na bottom nav
   - [ ] Link ativo quando na pagina `/app/dashboard/characters`

2. **Listagem com personagens**
   - [ ] Criar 2 personagens em campanhas diferentes
   - [ ] Navegar para `/app/dashboard/characters`
   - [ ] Ver 2 grupos com headers de campanha
   - [ ] Cards exibem avatar, nome, raca+classe, HP/AC

3. **Click no card**
   - [ ] Clicar em um card → navega para pagina da campanha

4. **Estado vazio**
   - [ ] Usuario sem personagens → mensagem "Voce ainda nao tem personagens"
   - [ ] Botao "Ver Campanhas" navega para `/app/dashboard/campaigns`

5. **i18n**
   - [ ] Trocar idioma para EN → strings em ingles
   - [ ] Trocar idioma para PT-BR → strings em portugues

### Testes Automatizados

```typescript
// components/dashboard/MyCharactersPage.test.tsx
describe("MyCharactersPage", () => {
  it("renders empty state when no characters", () => {
    render(<MyCharactersPage initialCharacters={[]} />);
    expect(screen.getByText(/nao tem personagens/i)).toBeInTheDocument();
  });

  it("groups characters by campaign", () => {
    const chars = [
      mockCharacter({ campaign: { id: "c1", name: "Mesa 1" } }),
      mockCharacter({ campaign: { id: "c2", name: "Mesa 2" } }),
    ];
    render(<MyCharactersPage initialCharacters={chars} />);
    expect(screen.getByText("Mesa 1")).toBeInTheDocument();
    expect(screen.getByText("Mesa 2")).toBeInTheDocument();
  });

  it("navigates to campaign on card click", async () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
    const chars = [mockCharacter({ campaign: { id: "c1", name: "Mesa 1" } })];
    render(<MyCharactersPage initialCharacters={chars} />);
    await userEvent.click(screen.getByTestId(/character-card/));
    expect(push).toHaveBeenCalledWith("/app/campaigns/c1");
  });
});
```

---

## Notas de Paridade

- **Guest (`/try`):** N/A. Guest nao tem area logada.
- **Anonimo (`/join`):** N/A. Anonimo nao tem dashboard.
- **Autenticado:** Unica surface afetada. Feature Auth-only.

Nenhuma alteracao em componentes de combate. Sem impacto na parity rule.

---

## Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|-------|---------|-----------|
| Join `campaigns(id, name)` falha se player nao e membro | Medio | RLS de `player_characters` ja filtra por `user_id`; join com `campaigns` usa foreign key, nao RLS. Testar com player em 2+ campanhas |
| Sidebar mobile com 5 itens fica apertada | Baixo | Substituir Soundboard por Characters no mobile (Soundboard e feature secundaria pro player) |
| W32 nao concluida — CharacterCard pode mudar | Baixo | CharacterCard ja esta estavel. Se W32 alterar props, ajustar aqui |
| Performance com muitos personagens | Muito Baixo | Player tipico: 1-5 chars. Nao paginar agora, bucket pra futuro |

---

## Definicao de Pronto

- [ ] Rota `/app/dashboard/characters` acessivel e protegida
- [ ] Sidebar desktop e mobile exibem link "Personagens"
- [ ] Personagens agrupados por campanha com `CharacterCard`
- [ ] Click no card navega pra campanha
- [ ] Estado vazio com CTA "Ver Campanhas"
- [ ] Traducoes pt-BR e en adicionadas
- [ ] Teste automatizado MyCharactersPage.test.tsx passando
- [ ] Testes manuais 1-5 validados
- [ ] Build sem erros (`next build` passa)
- [ ] Nenhuma regressao na sidebar existente
