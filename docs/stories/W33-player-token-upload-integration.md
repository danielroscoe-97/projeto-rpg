# W3.3 — Integração TokenUpload no Fluxo de Personagem

**Epic:** Player Experience — Área Logada  
**Prioridade:** Alta  
**Estimativa:** 2-3h  
**Tipo:** Integração (componente e Storage já existem)  
**Depende de:** W3.2 (CharacterCard deve estar integrado ao PlayerCharacterManager)

---

## Resumo

`TokenUpload.tsx` em `components/character/` implementa upload para o Supabase Storage bucket `player-avatars`, salva `token_url` no `player_characters`, e tem UI completa (dropzone, drag-and-drop, preview circular). O componente existe e funciona — mas **nunca foi importado** em nenhum lugar.

`CharacterCard.tsx` já exibe o avatar circular se `token_url` existir, mas não tem nenhuma ação de upload. O usuário não tem como fazer upload de token.

O objetivo é adicionar um ponto de entrada para o `TokenUpload` a partir do `CharacterCard` integrado (pós-W3.2).

---

## Contexto

### Estado atual do TokenUpload

**`components/character/TokenUpload.tsx`** — completo:
- Upload para `supabase.storage.from("player-avatars").upload()`
- Caminho: `{user.id}/{characterId}.{ext}` (isolado por usuário)
- RLS configurada (migration 044): usuário só pode upload/delete nos próprios arquivos
- Valida: JPEG, PNG, WebP; max 2MB
- UX: dialog, dropzone, drag-and-drop, preview circular, toast de erro/sucesso
- Após upload: atualiza `player_characters.token_url` no banco

### Estado atual do CharacterCard

**`components/character/CharacterCard.tsx`** — exibe mas não tem ação de upload:
```typescript
// Exibe avatar se token_url existe:
{character.token_url ? (
  <img src={character.token_url} className="w-12 h-12 rounded-full..." />
) : (
  <div className="... bg-background border ...">
    <User className="w-6 h-6 text-muted-foreground/40" />
  </div>
)}
// Nenhum botão/ação de upload disponível
```

---

## Critérios de Aceite

1. No fluxo de gerenciamento de personagens (pós-W3.2), cada personagem tem um botão ou ação "Upload Token" / "Alterar Avatar".

2. Clicar na ação abre o `TokenUpload` dialog para o personagem selecionado.

3. Após upload bem-sucedido, o avatar no `CharacterCard` atualiza imediatamente (sem refresh de página).

4. Personagem sem token mostra placeholder e ação "Adicionar Avatar".

5. Personagem com token mostra avatar e ação "Alterar Avatar".

6. Validações funcionam: arquivo > 2MB → toast de erro; tipo inválido → toast de erro.

7. Parity: Auth-only. Apenas DM logado com campanha. Sem mudança em Guest/Anon.

---

## Abordagem Técnica

### Opção A — Ação no CharacterCard (recomendada)

Adicionar prop `onUploadToken` opcional ao `CharacterCard`:

```typescript
interface CharacterCardProps {
  character: PlayerCharacter;
  onClick?: () => void;
  onUploadToken?: () => void;  // add
}

// No avatar area, adicionar overlay/button:
<div className="relative group">
  {/* Avatar existente */}
  {onUploadToken && (
    <button
      onClick={(e) => { e.stopPropagation(); onUploadToken(); }}
      className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100
                 flex items-center justify-center transition-opacity"
    >
      <Upload className="w-4 h-4 text-white" />
    </button>
  )}
</div>
```

### Opção B — Botão separado no PlayerCharacterManager

Adicionar botão "Avatar" separado por card no `PlayerCharacterManager` sem modificar `CharacterCard`.

**Recomendação:** Opção A — o hover overlay no avatar é o padrão UX esperado para upload de avatar.

### Integração no PlayerCharacterManager (pós-W3.2)

```typescript
import { TokenUpload } from "@/components/character/TokenUpload";

// Estado:
const [tokenUploadChar, setTokenUploadChar] = useState<PlayerCharacter | null>(null);

// No render:
{characters.map((character) => (
  <CharacterCard
    key={character.id}
    character={character}
    onClick={() => openEditForm(character)}
    onUploadToken={() => setTokenUploadChar(character)}
  />
))}

<TokenUpload
  open={!!tokenUploadChar}
  onOpenChange={(open) => { if (!open) setTokenUploadChar(null); }}
  characterId={tokenUploadChar?.id ?? ""}
  characterName={tokenUploadChar?.name ?? ""}
  currentTokenUrl={tokenUploadChar?.token_url ?? null}
  onTokenUpdated={(url) => {
    setCharacters((prev) =>
      prev.map((c) => c.id === tokenUploadChar?.id ? { ...c, token_url: url } : c)
    );
    setTokenUploadChar(null);
  }}
/>
```

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `components/character/CharacterCard.tsx` | Adicionar prop `onUploadToken`, hover overlay no avatar |
| `components/dashboard/PlayerCharacterManager.tsx` | Importar `TokenUpload`, gerenciar estado `tokenUploadChar`, passar `onUploadToken` ao `CharacterCard` |

---

## Plano de Testes

### Testes Manuais (obrigatórios)

1. **Upload inicial (sem token)**
   - [ ] Personagem sem avatar → hover no placeholder → ícone de upload aparece
   - [ ] Clicar → abre TokenUpload dialog
   - [ ] Fazer upload de PNG válido → avatar aparece no card imediatamente

2. **Alterar token existente**
   - [ ] Personagem com avatar → hover → ícone de upload aparece sobre o avatar
   - [ ] Clicar → dialog abre com preview do avatar atual
   - [ ] Enviar novo arquivo → avatar atualiza

3. **Validações**
   - [ ] Arquivo > 2MB → toast "Image must be under 2MB"
   - [ ] Arquivo .gif → toast "Only JPEG, PNG, and WebP"
   - [ ] Upload falha de rede → toast de erro, dialog continua aberto

4. **Persistência**
   - [ ] Refresh da página → avatar ainda aparece (token_url salvo no banco)

5. **Regressão**
   - [ ] Clicar no card (não no avatar) continua abrindo o CharacterForm de edição

---

## Notas de Paridade

- **Guest + Anon:** Sem acesso a personagens persistentes. Sem mudança.
- **Auth (DM logado):** Única surface afetada — `app/app/campaigns/[id]`.

---

## Definição de Pronto

- [ ] `CharacterCard` tem `onUploadToken` prop com hover overlay no avatar
- [ ] `PlayerCharacterManager` importa e integra `TokenUpload`
- [ ] Upload cria/atualiza `token_url` no banco
- [ ] `CharacterCard` atualiza avatar imediatamente após upload (sem reload)
- [ ] Validações de tipo e tamanho funcionam com feedback de toast
- [ ] Testes manuais 1-5 passando
