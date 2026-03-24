<?php if (!defined('FLUX_ROOT')) exit; ?>

<h2>Ranking de Zeny</h2>
<p style="color:var(--text-secondary);margin-bottom:2rem">
  Os jogadores mais ricos do servidor.
</p>

<!-- Navegação de rankings -->
<div class="ranking-nav fade-in">
  <a href="<?php echo $this->url('ranking') ?>" class="ranking-nav-item">
    <i class="fa fa-trophy"></i> Geral
  </a>
  <a href="<?php echo $this->url('ranking','character') ?>" class="ranking-nav-item">
    <i class="fa fa-user"></i> Personagens
  </a>
  <a href="<?php echo $this->url('ranking','guild') ?>" class="ranking-nav-item">
    <i class="fa fa-shield"></i> Guildas
  </a>
  <a href="<?php echo $this->url('ranking','zeny') ?>" class="ranking-nav-item active">
    <i class="fa fa-coins"></i> Zeny
  </a>
</div>

<div class="card fade-in">
  <?php if (isset($zenyRanking) && !empty($zenyRanking)): ?>
  <table class="ranking-table">
    <thead>
      <tr>
        <th style="width:50px">#</th>
        <th>Nome</th>
        <th>Classe</th>
        <th>Zeny</th>
      </tr>
    </thead>
    <tbody>
      <?php $i = 1; foreach ($zenyRanking as $char): ?>
      <tr>
        <td class="rank-num <?php echo $i <= 3 ? ['', 'gold', 'silver', 'bronze'][$i] : '' ?>">
          <?php if ($i <= 3): ?>
            <i class="fa fa-<?php echo $i === 1 ? 'crown' : 'medal' ?>"></i>
          <?php endif ?>
          <?php echo $i ?>
        </td>
        <td class="rank-name"><?php echo htmlspecialchars($char->name) ?></td>
        <td><?php echo $char->class ?? '—' ?></td>
        <td class="rank-level" style="color:var(--accent-gold)">
          <?php echo number_format($char->zeny ?? 0, 0, ',', '.') ?> z
        </td>
      </tr>
      <?php $i++; endforeach ?>
    </tbody>
  </table>
  <?php else: ?>
  <p style="color:var(--text-tertiary);font-size:.85rem;text-align:center;padding:3rem 0">
    <i class="fa fa-hourglass-half"></i> Nenhum dado de zeny encontrado ainda.
  </p>
  <?php endif ?>
</div>
