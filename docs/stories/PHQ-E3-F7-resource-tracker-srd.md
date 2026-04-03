# PHQ-E3-F7 — Resource Tracker: Autocomplete do SRD para Recursos de Classe

**Epic:** Player HQ — Companheiro de Mesa (`docs/epic-player-hq.md`)
**Prioridade:** Media
**Estimativa:** 5 SP
**Dependencia:** PHQ-E3-F6 (AddResourceTrackerDialog existe)
**Arquivos principais:** `components/player-hq/AddResourceTrackerDialog.tsx` (editar), `lib/data/srd-class-resources.ts` (novo), `lib/data/srd-resources-index.json` (novo)

---

## Resumo

Quando o jogador vai adicionar um tracker, ele pode nao saber exatamente quantos usos tem Wild Shape (depende do nivel de Druid) ou Action Surge. Esta story adiciona um **autocomplete com dados pre-populados do SRD** no campo de nome do tracker.

O jogador digita "wild" → ve a opcao "Wild Shape (Druid)" com descricao curta → seleciona → os campos de maximo e reset type sao pre-preenchidos automaticamente baseados no nivel do personagem.

**Importante:** esses valores sao sugestoes, nao regras. O jogador pode sempre alterar depois de selecionar. O PocketDM nao impoe a mecanica — apenas acelera o setup.

---

## Decisoes de UX

**D1: Autocomplete como dropdown sobre o input.** Campo de nome vira um combobox: digitar filtra opcoes do SRD em tempo real (client-side, sem rede). Opcao selecionada pre-preenche os outros campos.

**D2: Categorias no dropdown.** Opcoes agrupadas por categoria: "Metamagica", "Ki", "Rage", "Channel Divinity", etc. Facilita navegar sem saber o nome exato.

**D3: Dados por nivel quando possivel.** Recursos que escalam com nivel (Ki Points = nivel do Monk, Sorcery Points = nivel do Sorcerer) usam o `level` do personagem para pre-preencher o maximo. Se nivel nao informado, pre-preenche com o valor no nivel 1 e mostra nota: "Ajuste conforme seu nivel".

**D4: "Usar como esta" sempre disponivel.** Se o jogador digitou um nome que nao esta no SRD, botao "Usar como esta" aparece no dropdown. Cria tracker manual com o nome digitado.

**D5: Indicador de fonte.** Opcoes do SRD tem badge "SRD" verde. Trackers criados a partir do SRD tem `source = 'srd'` e `srd_ref` preenchido no banco — util para futuras atualizacoes automaticas.

**D6: Sem dependencia de rede.** O index do SRD e um arquivo JSON local bundlado com o app. Zero latencia no autocomplete.

---

## Contexto Tecnico

### Estrutura do SRD Resources Index

```typescript
// lib/data/srd-resources-index.json
[
  {
    "id": "wild_shape",
    "name": "Wild Shape",
    "class": "Druid",
    "category": "Transformacao",
    "description": "Transforma em besta. Recupera no Short ou Long Rest.",
    "reset_type": "short_rest",
    "uses_by_level": {
      "2": 2, "3": 2, "4": 2, "5": 2, "6": 2,
      "7": 2, "8": 2, "default": 2
    }
  },
  {
    "id": "action_surge",
    "name": "Action Surge",
    "class": "Fighter",
    "category": "Combate",
    "description": "Ganha uma acao adicional. Recupera no Short ou Long Rest.",
    "reset_type": "short_rest",
    "uses_by_level": {
      "1": 1, "17": 2, "default": 1
    }
  },
  {
    "id": "ki_points",
    "name": "Ki Points",
    "class": "Monk",
    "category": "Ki",
    "description": "Pontos de Ki. Recuperam no Short ou Long Rest.",
    "reset_type": "short_rest",
    "uses_by_level": "= level" // especial: usa o nivel do personagem
  },
  {
    "id": "sorcery_points",
    "name": "Sorcery Points",
    "class": "Sorcerer",
    "category": "Metamagica",
    "description": "Pontos de feiticaria. Recuperam no Long Rest.",
    "reset_type": "long_rest",
    "uses_by_level": "= level"
  },
  {
    "id": "channel_divinity",
    "name": "Channel Divinity",
    "class": "Cleric/Paladin",
    "category": "Divino",
    "description": "Canaliza poder divino. Recupera no Short ou Long Rest.",
    "reset_type": "short_rest",
    "uses_by_level": {
      "1": 1, "6": 2, "18": 3, "default": 1
    }
  },
  {
    "id": "bardic_inspiration",
    "name": "Bardic Inspiration",
    "class": "Bard",
    "category": "Inspiracao",
    "description": "Concede dado de inspiracao a aliados.",
    "reset_type": "long_rest",
    "uses_by_level": "= charisma_modifier" // baseado em CHA
  },
  {
    "id": "rage",
    "name": "Rage",
    "class": "Barbarian",
    "category": "Combate",
    "description": "Entra em furia. Recupera no Long Rest.",
    "reset_type": "long_rest",
    "uses_by_level": {
      "1": 2, "3": 3, "6": 4, "12": 5, "17": 6, "20": 9999, "default": 2
    }
  },
  {
    "id": "arcane_recovery",
    "name": "Arcane Recovery",
    "class": "Wizard",
    "category": "Arcano",
    "description": "Recupera spell slots. Uma vez por Short Rest.",
    "reset_type": "short_rest",
    "uses_by_level": { "default": 1 }
  },
  {
    "id": "second_wind",
    "name": "Second Wind",
    "class": "Fighter",
    "category": "Combate",
    "description": "Recupera HP como acao bonus. Short Rest.",
    "reset_type": "short_rest",
    "uses_by_level": { "default": 1 }
  },
  {
    "id": "cunning_action",
    "name": "Sneak Attack",
    "class": "Rogue",
    "category": "Combate",
    "description": "Dano extra por turno. Uso por turno — reset manual.",
    "reset_type": "manual",
    "uses_by_level": { "default": 1 }
  },
  {
    "id": "lay_on_hands",
    "name": "Lay on Hands",
    "class": "Paladin",
    "category": "Cura",
    "description": "Pool de HP para curar. Long Rest.",
    "reset_type": "long_rest",
    "uses_by_level": "= level * 5"
  }
]
```

### Funcao de pre-preenchimento

```typescript
// lib/data/srd-class-resources.ts
export function getPrefilledValues(
  srdResource: SrdResource,
  characterLevel?: number,
  chaModifier?: number
): { maxUses: number; resetType: ResetType } {
  let maxUses = 1;

  if (srdResource.uses_by_level === '= level') {
    maxUses = characterLevel ?? 1;
  } else if (srdResource.uses_by_level === '= level * 5') {
    maxUses = (characterLevel ?? 1) * 5;
  } else if (srdResource.uses_by_level === '= charisma_modifier') {
    maxUses = Math.max(1, chaModifier ?? 1);
  } else if (typeof srdResource.uses_by_level === 'object') {
    const level = characterLevel ?? 1;
    const keys = Object.keys(srdResource.uses_by_level)
      .filter(k => k !== 'default')
      .map(Number)
      .sort((a, b) => a - b);
    const applicableLevel = keys.filter(k => k <= level).pop();
    maxUses = applicableLevel
      ? srdResource.uses_by_level[applicableLevel]
      : srdResource.uses_by_level['default'];
  }

  return { maxUses, resetType: srdResource.reset_type };
}
```

### Filtragem client-side

```typescript
export function searchSrdResources(query: string): SrdResource[] {
  const q = query.toLowerCase().trim();
  if (!q) return SRD_RESOURCES;
  return SRD_RESOURCES.filter(r =>
    r.name.toLowerCase().includes(q) ||
    r.class.toLowerCase().includes(q) ||
    r.category.toLowerCase().includes(q) ||
    r.description.toLowerCase().includes(q)
  );
}
```

---

## Criterios de Aceite

### Autocomplete

1. Campo "Nome" no AddResourceTrackerDialog tem comportamento de combobox.
2. Ao digitar >= 1 caractere, dropdown aparece com opcoes filtradas do SRD.
3. Opcoes agrupadas por categoria.
4. Cada opcao exibe: nome do recurso + classe + descricao curta + badge "SRD".
5. Se nenhuma opcao encontrada: opcao "Usar como esta: [texto digitado]" aparece.
6. Selecionar opcao do SRD: pre-preenche maximo e reset type automaticamente.
7. Pre-preenchimento usa nivel do personagem quando disponivel.
8. Se nivel nao disponivel: usa valor default e exibe nota "Ajuste conforme seu nivel".

### Pre-preenchimento

9. Wild Shape + Druid nivel 5: pre-preenche max=2, reset=Short Rest.
10. Ki Points + Monk nivel 7: pre-preenche max=7, reset=Short Rest.
11. Rage + Barbarian nivel 6: pre-preenche max=4, reset=Long Rest.
12. Todos os valores pre-preenchidos sao editaveis pelo usuario antes de confirmar.

### Rastreabilidade

13. Trackers criados via SRD tem `source='srd'` e `srd_ref` no banco.
14. Trackers manuais tem `source='manual'` e `srd_ref=null`.

### Performance

15. Filtragem e client-side, sem chamada de rede.
16. Dropdown aparece em < 50ms apos digitar.

---

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---|---|---|
| `lib/data/srd-resources-index.json` | Criar | Index JSON de recursos SRD (todos acima + mais) |
| `lib/data/srd-class-resources.ts` | Criar | Funcoes de busca + pre-preenchimento |
| `components/player-hq/AddResourceTrackerDialog.tsx` | Editar | Transformar campo nome em combobox |
| `components/player-hq/SrdResourceOption.tsx` | Criar | Item do dropdown com badge SRD |

---

## Definicao de Pronto

- [ ] JSON de recursos SRD com >= 15 entradas representativas das classes principais
- [ ] Busca client-side instantanea
- [ ] Pre-preenchimento por nivel funcionando para recursos que escalam
- [ ] Trackers SRD com `source` e `srd_ref` corretos no banco
- [ ] "Usar como esta" para nomes nao encontrados
- [ ] Build sem erros
