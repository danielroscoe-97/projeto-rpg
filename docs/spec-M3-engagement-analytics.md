# Spec Sprint M3 — Engagement & Analytics

**Sprint:** M3 — Engagement & Analytics (5-7 dias)
**Objetivo:** Campanhas como plataforma completa com dados e imersão

---

## M3.1 — Dashboard/Analytics por Campanha

### Conceito
Cards de estatísticas no topo da tela de campanha que dão ao mestre uma visão rápida do progresso.

### Métricas exibidas

**Card 1 — Visão Geral:**
- Total de sessões
- Total de combates
- Rounds totais jogados
- Tempo estimado de jogo (rounds × ~30s)

**Card 2 — Por Jogador (tabela):**
| Jogador | Dano total | Kills | KOs | Crits |
|---|---|---|---|---|
| (dados dos combatants) | Σ | count | count | count |

> **Nota:** Crits e dano detalhado não são trackados hoje. V1 mostra dados disponíveis: kills (is_defeated em monstros), KOs (is_defeated em PCs). Dano tracking é feature futura.

**Card 3 — Tendências:**
- Gráfico simples de rounds por combate ao longo do tempo
- Média de combatentes por encounter

### Schema
Nenhuma migration necessária — todos os dados vêm de queries agregadas em tabelas existentes.

### Tecnologia
- Queries no Supabase (server-side para performance)
- Cards usando componentes UI existentes
- Gráfico: `recharts` ou barras CSS simples (evitar lib nova se possível)

### Critérios de Aceite
- [ ] Cards de stats visíveis na tela de campanha
- [ ] Dados corretos (validar com campanha de teste)
- [ ] Performance: < 2s para carregar com 50+ encounters
- [ ] Mobile: cards empilham verticalmente
- [ ] Graceful quando não há dados ("Nenhum combate ainda")

---

## M3.2 — Soundboard por Campanha

### Conceito
O mestre faz upload de efeitos sonoros curtos e os toca durante o combate para imersão.

### Schema
```sql
-- migration: 031_campaign_audio_presets.sql
CREATE TABLE campaign_audio_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- storage path in Supabase Storage
  category TEXT DEFAULT 'sfx' CHECK (category IN ('sfx', 'ambient', 'music')),
  duration_seconds NUMERIC(6,1),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaign_audio_campaign ON campaign_audio_presets(campaign_id);

ALTER TABLE campaign_audio_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DM manages audio presets"
ON campaign_audio_presets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_audio_presets.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);
```

### Storage
- Bucket Supabase Storage: `campaign-audio`
- Limites: 5MB por arquivo, 50 arquivos por campanha
- Formatos aceitos: .mp3, .ogg, .wav
- Path: `{campaign_id}/{preset_id}.{ext}`

### UI — Upload (Tela de Campanha)
- Seção "Efeitos Sonoros" na tela de edição de campanha
- Drag-and-drop ou botão de upload
- Nome editável por preset
- Categorias: SFX, Ambient, Música
- Preview inline (play/pause)
- Delete com confirmação

### UI — Player (Durante Combate)
- Botão "🔊" na toolbar do combate
- Abre mini-player com lista de presets
- Tap para tocar, tap novamente para parar
- Volume control
- Categorias como filtro rápido

### Player View (opcional, V2)
- Audio pode ser transmitido para player view via Realtime
- Requer user gesture para autoplay (limitação de browsers)
- Flag: "Compartilhar áudio com jogadores" por preset

### Limitações
- Autoplay bloqueado em mobile browsers — primeira interação do jogador precisa ser manual
- Streaming para player view adiciona complexidade — considerar como V2

### Critérios de Aceite
- [ ] Upload de arquivos de áudio na campanha
- [ ] Preview funciona
- [ ] Delete funciona
- [ ] Soundboard acessível durante combate
- [ ] Tocar/parar áudio funciona
- [ ] Limites de tamanho/quantidade respeitados
- [ ] Mobile-friendly

---

## M3.3 — Upload de Imagens por Campanha

### Conceito
Permitir upload de imagens de referência (mapas, NPCs, itens) vinculadas à campanha.

### Schema
```sql
-- migration: 032_campaign_images.sql
CREATE TABLE campaign_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT DEFAULT '',
  file_path TEXT NOT NULL,
  thumbnail_path TEXT, -- generated on upload
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaign_images_campaign ON campaign_images(campaign_id);

-- RLS similar ao audio_presets
```

### Storage
- Bucket: `campaign-images`
- Limites: 2MB por imagem, 100 imagens por campanha
- Formatos: .jpg, .png, .webp
- Thumbnail auto-gerado (200px width)

### UI
- Galeria na tela de campanha
- Grid de thumbnails
- Click para ver full-size
- Delete com confirmação
- (Futuro) Compartilhar imagem com player view

### Critérios de Aceite
- [ ] Upload de imagens funciona
- [ ] Galeria com thumbnails
- [ ] View full-size
- [ ] Delete funciona
- [ ] Limites respeitados
- [ ] Mobile: grid responsivo

---

## Dependências entre Sprints

```
M1 (bug fix + dm_notes) ──► M2 (drawer usa dm_notes, campaign notes, history)
                                    │
                                    ▼
                              M3 (analytics usa history data, soundboard + images)
```

Sprint M1 é pré-requisito de M2. Sprint M3 pode ser parcialmente paralelo com M2 (soundboard e imagens são independentes do drawer).

---

## Métricas de Sucesso (pós-implementação)

| Métrica | Target | Como medir |
|---|---|---|
| Bug oracle mobile | 0 reports | QA + analytics de uso mobile |
| Adoção de dm_notes | 30% dos mestres ativos usam | count WHERE dm_notes != '' |
| Notas por campanha | média ≥ 2 | count campaign_notes per campaign |
| Retorno semanal | +15% vs baseline | mestres com sessão em 2+ semanas |
| Soundboard upload | 20% dos mestres Pro | count campaigns with audio presets |

---

*Specs geradas por: PM + Architect + UX Designer (party mode)*
*Próximo passo: Implementar Sprint M1*
