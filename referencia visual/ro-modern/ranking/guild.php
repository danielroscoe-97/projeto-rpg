<?php if (!defined('FLUX_ROOT')) exit; ?>

<h2>Ranking de Guildas</h2>
<p style="color:var(--text-secondary);margin-bottom:2rem">
  As guildas mais poderosas do servidor. Máximo de 8 membros por clã.
</p>

<!-- Navegação de rankings -->
<div class="ranking-nav fade-in">
  <a href="<?php echo $this->url('ranking') ?>" class="ranking-nav-item">
    <i class="fa fa-trophy"></i> Geral
  </a>
  <a href="<?php echo $this->url('ranking','character') ?>" class="ranking-nav-item">
    <i class="fa fa-user"></i> Personagens
  </a>
  <a href="<?php echo $this->url('ranking','guild') ?>" class="ranking-nav-item active">
    <i class="fa fa-shield"></i> Guildas
  </a>
  <a href="<?php echo $this->url('ranking','zeny') ?>" class="ranking-nav-item">
    <i class="fa fa-coins"></i> Zeny
  </a>
</div>

<div class="card fade-in">
  <?php if (isset($guildRanking) && !empty($guildRanking)): ?>
  <table class="ranking-table">
    <thead>
      <tr>
        <th style="width:50px">#</th>
        <th>Guilda</th>
        <th>Líder</th>
        <th>Nível</th>
        <th>Membros</th>
        <th>Média Lv</th>
        <th>Castelos</th>
      </tr>
    </thead>
    <tbody>
      <?php $i = 1; foreach ($guildRanking as $guild): ?>
      <tr>
        <td class="rank-num <?php echo $i <= 3 ? ['', 'gold', 'silver', 'bronze'][$i] : '' ?>">
          <?php if ($i <= 3): ?>
            <i class="fa fa-<?php echo $i === 1 ? 'crown' : 'medal' ?>"></i>
          <?php endif ?>
          <?php echo $i ?>
        </td>
        <td class="rank-name"><?php echo htmlspecialchars($guild->name) ?></td>
        <td><?php echo htmlspecialchars($guild->master ?? '—') ?></td>
        <td class="rank-level"><?php echo $guild->guild_lv ?? '—' ?></td>
        <td class="rank-level"><?php echo $guild->members ?? '—' ?>/8</td>
        <td class="rank-level"><?php echo $guild->average_lv ?? '—' ?></td>
        <td class="rank-level"><?php echo $guild->castles ?? 0 ?></td>
      </tr>
      <?php $i++; endforeach ?>
    </tbody>
  </table>
  <?php else: ?>
  <p style="color:var(--text-tertiary);font-size:.85rem;text-align:center;padding:3rem 0">
    <i class="fa fa-hourglass-half"></i> Nenhuma guilda encontrada ainda.
  </p>
  <?php endif ?>
</div>
