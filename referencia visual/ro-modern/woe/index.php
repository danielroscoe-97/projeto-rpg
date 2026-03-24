<?php if (!defined('FLUX_ROOT')) exit; ?>

<h2>Guerra do Emperium</h2>
<p style="color:var(--text-secondary);margin-bottom:2rem">
  Programação semanal da WoE. Máximo de 8 membros por guilda — foco em habilidade e estratégia.
</p>

<div class="woe-full-grid fade-in">

  <!-- Quarta-feira -->
  <div class="woe-full-card">
    <div class="woe-full-day">Quarta-feira</div>
    <div class="woe-full-time">20:00 — 21:00</div>
    <div class="woe-full-castle">
      <i class="fa fa-chess-rook" style="color:var(--accent-gold);margin-right:.35rem"></i>
      Aldebaran
    </div>
    <div class="woe-full-details">
      <span><i class="fa fa-users"></i> Máx. 8 membros</span>
      <span><i class="fa fa-clock"></i> 1 hora</span>
    </div>
    <?php if (isset($woeData['wednesday'])): ?>
    <div class="woe-holder">
      <i class="fa fa-crown" style="color:var(--accent-gold)"></i>
      Dominante: <strong><?php echo htmlspecialchars($woeData['wednesday']['guild'] ?? '—') ?></strong>
    </div>
    <?php endif ?>
  </div>

  <!-- Sexta-feira -->
  <div class="woe-full-card woe-next">
    <div class="woe-badge-next">Próxima WoE</div>
    <div class="woe-full-day">Sexta-feira</div>
    <div class="woe-full-time">21:00 — 22:00</div>
    <div class="woe-full-castle">
      <i class="fa fa-chess-rook" style="color:var(--accent-gold);margin-right:.35rem"></i>
      Prontera
    </div>
    <div class="woe-full-details">
      <span><i class="fa fa-users"></i> Máx. 8 membros</span>
      <span><i class="fa fa-clock"></i> 1 hora</span>
    </div>
    <?php if (isset($woeData['friday'])): ?>
    <div class="woe-holder">
      <i class="fa fa-crown" style="color:var(--accent-gold)"></i>
      Dominante: <strong><?php echo htmlspecialchars($woeData['friday']['guild'] ?? '—') ?></strong>
    </div>
    <?php endif ?>
  </div>

  <!-- Sábado -->
  <div class="woe-full-card">
    <div class="woe-full-day">Sábado</div>
    <div class="woe-full-time">20:00 — 21:00</div>
    <div class="woe-full-castle">
      <i class="fa fa-chess-rook" style="color:var(--accent-gold);margin-right:.35rem"></i>
      Geffen
    </div>
    <div class="woe-full-details">
      <span><i class="fa fa-users"></i> Máx. 8 membros</span>
      <span><i class="fa fa-clock"></i> 1 hora</span>
    </div>
    <?php if (isset($woeData['saturday'])): ?>
    <div class="woe-holder">
      <i class="fa fa-crown" style="color:var(--accent-gold)"></i>
      Dominante: <strong><?php echo htmlspecialchars($woeData['saturday']['guild'] ?? '—') ?></strong>
    </div>
    <?php endif ?>
  </div>

</div>

<!-- Batalha Campal -->
<div class="card fade-in" style="margin-top:2rem;text-align:center;border-color:rgba(212,168,83,0.25)">
  <div style="font-size:2rem;margin-bottom:.75rem">⚔️</div>
  <h4 style="color:var(--accent-gold);margin-bottom:.5rem">Batalha Campal (BG)</h4>
  <p style="color:var(--text-secondary);font-size:.88rem;margin-bottom:.75rem">
    Diária — <strong style="font-family:var(--font-mono);color:var(--text-primary)">20:00 às 20:30</strong>
  </p>
  <p style="color:var(--text-secondary);font-size:.82rem;margin-bottom:1rem">
    🏅 Vitória: <strong style="color:var(--accent-gold)">40</strong> Moedas Gloriosas &nbsp;·&nbsp;
    Derrota: <strong>20</strong> Moedas Gloriosas
  </p>
  <div style="display:inline-block;padding:.5rem 1rem;background:rgba(255,255,255,0.04);border-radius:var(--radius-sm);font-family:var(--font-mono);font-size:.85rem;color:var(--accent-cool)">
    @joinbg
  </div>
</div>
