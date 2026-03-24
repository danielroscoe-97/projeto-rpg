<?php if (!defined('FLUX_ROOT')) exit; ?>

<h2>Rankings</h2>
<p style="color:var(--text-secondary);margin-bottom:2rem">
  Os melhores jogadores e guildas do servidor. Atualizado em tempo real.
</p>

<!-- Navegação de rankings -->
<div class="ranking-nav fade-in">
  <a href="<?php echo $this->url('ranking') ?>" class="ranking-nav-item active">
    <i class="fa fa-trophy"></i> Geral
  </a>
  <a href="<?php echo $this->url('ranking','character') ?>" class="ranking-nav-item">
    <i class="fa fa-user"></i> Personagens
  </a>
  <a href="<?php echo $this->url('ranking','guild') ?>" class="ranking-nav-item">
    <i class="fa fa-shield"></i> Guildas
  </a>
  <a href="<?php echo $this->url('ranking','zeny') ?>" class="ranking-nav-item">
    <i class="fa fa-coins"></i> Zeny
  </a>
</div>

<div class="rankings-grid fade-in">

  <!-- Top Personagens -->
  <div class="card">
    <h4 style="color:var(--accent-gold);margin-bottom:1rem;display:flex;align-items:center;gap:.5rem">
      <i class="fa fa-crown" style="font-size:.85rem"></i> Top Personagens
    </h4>
    <?php if (isset($characterRanking) && !empty($characterRanking)): ?>
    <table class="ranking-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Nome</th>
          <th>Classe</th>
          <th>Nível</th>
          <th>Guilda</th>
        </tr>
      </thead>
      <tbody>
        <?php $i = 1; foreach ($characterRanking as $char): ?>
        <tr>
          <td class="rank-num <?php echo $i <= 3 ? ['', 'gold', 'silver', 'bronze'][$i] : '' ?>">
            <?php echo $i ?>
          </td>
          <td class="rank-name"><?php echo htmlspecialchars($char->name) ?></td>
          <td><?php echo $char->class ?? '—' ?></td>
          <td class="rank-level"><?php echo $char->base_level ?>/<?php echo $char->job_level ?></td>
          <td><?php echo htmlspecialchars($char->guild_name ?? '—') ?></td>
        </tr>
        <?php $i++; endforeach ?>
      </tbody>
    </table>
    <?php else: ?>
    <p style="color:var(--text-tertiary);font-size:.85rem;text-align:center;padding:2rem 0">
      <i class="fa fa-hourglass-half"></i> Nenhum personagem encontrado ainda.
    </p>
    <?php endif ?>
  </div>

  <!-- Top Guildas -->
  <div class="card">
    <h4 style="color:var(--accent-gold);margin-bottom:1rem;display:flex;align-items:center;gap:.5rem">
      <i class="fa fa-shield-halved" style="font-size:.85rem"></i> Top Guildas
    </h4>
    <?php if (isset($guildRanking) && !empty($guildRanking)): ?>
    <table class="ranking-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Guilda</th>
          <th>Líder</th>
          <th>Membros</th>
          <th>Nível</th>
        </tr>
      </thead>
      <tbody>
        <?php $i = 1; foreach ($guildRanking as $guild): ?>
        <tr>
          <td class="rank-num <?php echo $i <= 3 ? ['', 'gold', 'silver', 'bronze'][$i] : '' ?>">
            <?php echo $i ?>
          </td>
          <td class="rank-name"><?php echo htmlspecialchars($guild->name) ?></td>
          <td><?php echo htmlspecialchars($guild->master ?? '—') ?></td>
          <td class="rank-level"><?php echo $guild->members ?? '—' ?>/8</td>
          <td class="rank-level"><?php echo $guild->guild_lv ?? '—' ?></td>
        </tr>
        <?php $i++; endforeach ?>
      </tbody>
    </table>
    <?php else: ?>
    <p style="color:var(--text-tertiary);font-size:.85rem;text-align:center;padding:2rem 0">
      <i class="fa fa-hourglass-half"></i> Nenhuma guilda encontrada ainda.
    </p>
    <?php endif ?>
  </div>

</div>
