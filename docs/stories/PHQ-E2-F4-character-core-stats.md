# PHQ-E2-F4 — Character Sheet: Core Stats (AC, Iniciativa, Speed, Inspiration)

**Epic:** Player HQ — Companheiro de Mesa (`docs/epic-player-hq.md`)
**Prioridade:** Media
**Estimativa:** 3 SP
**Dependencia:** PHQ-E2-F3 (CharacterStatusPanel existe), migration 056
**Arquivos principais:** `components/player-hq/CharacterCoreStats.tsx` (novo), `components/player-hq/CharacterAttributeGrid.tsx` (novo), `components/player-hq/CharacterEditSheet.tsx` (novo)

---

## Resumo

Alem do HP, o jogador precisa acessar rapidamente AC, iniciativa, speed e inspiracao durante a sessao. Esses valores mudam raramente mas sao consultados frequentemente ("qual sua AC?", "voce tem inspiracao?").

Alem dos stats volateis, esta story adiciona a edicao dos dados basicos do personagem: atributos (STR/DEX/CON/INT/WIS/CHA), raca, classe, background — dados semi-permanentes que o jogador configura uma vez e raramente altera.

**Filosofia:** esses dados sao opcionais. O jogador pode ter uma ficha de papel com todos os atributos e usar o PocketDM APENAS para HP e trackers. Nenhum campo e obrigatorio alem do nome.

---

## Decisoes de UX

**D1: Stats em linha, nao em coluna.** AC, Iniciativa e Speed ficam em uma linha horizontal de 3 cards compactos logo abaixo do HP. Cada card: icone + valor + label pequeno. Dimensao maxima 80px x 80px.

**D2: Inspiracao como toggle de destaque.** Token de Inspiracao e um botao circular grande e luminoso (dourado quando ativo, cinza quando inativo). Tap alterna. Posicionado ao lado dos 3 cards de stat.

**D3: Atributos colapsados por padrao.** A grade de atributos (STR/DEX/etc.) fica em um accordion colapsado com label "Atributos". Se nenhum atributo foi preenchido, mostra "Toque para adicionar atributos". Ao expandir, mostra os 6 atributos com modificadores calculados automaticamente.

**D4: Modificadores automaticos.** Se o jogador preencheu o valor base (ex: STR 16), o modificador (+3) e calculado automaticamente: `floor((score - 10) / 2)`. Exibido em verde se positivo, vermelho se negativo, cinza se zero.

**D5: Edicao via sheet lateral.** Para editar raca, classe, background, atributos completos — botao "Editar Personagem" abre uma sheet/drawer lateral (nao modal) com formulario completo. Nao bloqueia a visualizacao do HP.

**D6: Dados de identidade no topo do HQ.** Nome do personagem, Raca, Classe e Nivel ficam no header da pagina do Player HQ (visivel em todas as abas). Nivel mostra um badge "Nivel X".

---

## Contexto Tecnico

### Calculo de modificadores

```typescript
export function getModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}
```

### Iniciativa calculada vs. manual

O jogador pode informar o bonus de iniciativa diretamente (campo `initiative_bonus`) ou deixar em branco — nesse caso o app calcula a partir do modificador de DEX se disponivel.

```typescript
function getInitiativeBonus(character: PlayerCharacter): number | null {
  if (character.initiative_bonus !== null) return character.initiative_bonus;
  if (character.dex !== null) return getModifier(character.dex);
  return null;
}
```

### Campos do formulario de edicao

```typescript
interface CharacterEditForm {
  // Identidade
  name: string;
  race?: string;
  subrace?: string;
  class?: string;
  subclass?: string;
  background?: string;
  alignment?: string;
  level?: number;

  // Stats de combate
  max_hp: number;
  ac?: number;
  initiative_bonus?: number; // override do DEX modifier
  speed?: number;

  // Atributos
  str?: number; dex?: number; con?: number;
  int_score?: number; wis?: number; cha?: number;

  // Flavor
  traits?: {
    personality?: string;
    ideal?: string;
    bond?: string;
    flaw?: string;
  };

  // Moedas
  currency?: { cp: number; sp: number; ep: number; gp: number; pp: number; };
}
```

---

## Criterios de Aceite

### Stats em Linha

1. Tres cards compactos exibidos em linha: AC, Iniciativa, Speed.
2. Cada card mostra: icone SVG + valor numerico + label.
3. Valor nulo ("—") exibido graciosamente se campo nao preenchido.
4. Cards sao clicaveis para edicao rapida inline (tap abre input numerico).
5. Edicao salva com debounce de 500ms.

### Inspiracao

6. Token de inspiracao exibido como botao circular ao lado dos cards de stat.
7. Estado ativo: dourado/luminoso com efeito de brilho (box-shadow dourado).
8. Estado inativo: cinza/apagado.
9. Tap alterna e salva imediatamente no banco.
10. Haptic feedback (`navigator.vibrate([100])`) ao ganhar inspiracao.

### Atributos (accordion)

11. Secao "Atributos" colapsada por padrao.
12. Ao expandir, mostra os 6 atributos em grade 2x3 ou 3x2.
13. Cada atributo: abreviacao (STR, DEX...) + valor base + modificador calculado.
14. Modificador positivo em verde, negativo em vermelho, zero em cinza.
15. Clique em qualquer atributo abre edicao inline.

### Formulario de Edicao (Sheet Lateral)

16. Botao "Editar Personagem" no header do Player HQ.
17. Ao clicar, abre drawer lateral (nao modal) com scroll interno.
18. Formulario tem secoes: Identidade, Stats, Atributos, Moedas, Flavor.
19. Todos os campos opcionais exceto Nome e HP max.
20. Salvar fecha o drawer e reflete as alteracoes imediatamente.
21. Cancelar descarta alteracoes nao salvas (confirmacao se ha mudancas).

### Header do Player HQ

22. Nome do personagem exibido no header da pagina em destaque.
23. Raca + Classe + Nivel exibidos em linha menor abaixo do nome.
24. Nivel exibido como badge: "Nivel 5".
25. Se campos nao preenchidos, exibe somente o nome.

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---|---|---|
| `components/player-hq/CharacterCoreStats.tsx` | Criar | Linha de AC, Iniciativa, Speed + Inspiracao |
| `components/player-hq/CharacterAttributeGrid.tsx` | Criar | Accordion com 6 atributos + modificadores |
| `components/player-hq/CharacterEditSheet.tsx` | Criar | Drawer de edicao completa do personagem |
| `components/player-hq/PlayerHqHeader.tsx` | Criar | Header com nome + raca + classe + nivel |
| `lib/utils/character-calcs.ts` | Criar | getModifier, formatModifier, getInitiativeBonus |
| `app/(authenticated)/campaign/[id]/page.tsx` | Editar | Integrar CharacterCoreStats e CharacterAttributeGrid |
| `messages/pt-BR.json` | Editar | Strings: atributos, stats, inspiracao |
| `messages/en.json` | Editar | Strings equivalentes |

---

## Plano de Testes

1. AC = 16, Iniciativa = +3, Speed = 30: exibidos nos cards compactos.
2. Campo vazio: exibe "—" sem quebrar o layout.
3. Tap em AC: input inline aparece, edita, salva.
4. Tap em Inspiracao: alterna visualmente e salva.
5. STR = 16: atributo exibe "16 / +3" em verde.
6. DEX = 8: atributo exibe "8 / -1" em vermelho.
7. Botao "Editar Personagem": abre drawer lateral.
8. Drawer: preencher raca e classe, salvar — header atualiza.
9. Drawer: cancelar com mudancas — confirmacao de descarte.
10. Iniciativa sem valor manual mas com DEX preenchido: calcula do DEX.

---

## Notas de Paridade

| Modo | Aplica? | Justificativa |
|---|---|---|
| Guest | NAO | Auth-only |
| Anonimo | NAO | Auth-only |
| Autenticado | SIM | Player HQ |

---

## Definicao de Pronto

- [ ] Cards de AC, Iniciativa, Speed em linha com edicao inline
- [ ] Token de Inspiracao com toggle visual + haptic
- [ ] Accordion de atributos com modificadores calculados
- [ ] Drawer de edicao completa do personagem
- [ ] Header do Player HQ com nome + raca + classe + nivel
- [ ] Todos campos opcionais, graceful com nulls
- [ ] Build sem erros
