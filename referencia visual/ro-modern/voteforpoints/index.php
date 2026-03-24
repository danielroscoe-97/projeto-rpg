<?php if (!defined('FLUX_ROOT')) exit; ?>

<h2>Votar pelo Servidor</h2>
<p style="color:var(--text-secondary);margin-bottom:2rem">
  Vote a cada 12 horas e ganhe pontos para trocar por itens valiosos na VIP Shop.
</p>

<?php if (!$session->isLoggedIn()): ?>
  <div class="alert alert-error" style="margin-bottom:2rem">
    <i class="fa fa-lock"></i>
    Você precisa <a href="<?php echo $this->url('account','login') ?>">fazer login</a> para votar.
  </div>
<?php endif ?>

<!-- Sites de votação -->
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.25rem;margin-bottom:2rem" class="fade-in">

  <?php if (isset($voteSites) && !empty($voteSites)): ?>
    <?php foreach ($voteSites as $site): ?>
    <div class="card" style="text-align:center">
      <div style="font-size:1.5rem;margin-bottom:.75rem">🗳️</div>
      <h4 style="font-size:.95rem;color:var(--text-primary);margin-bottom:.5rem">
        <?php echo htmlspecialchars($site['name'] ?? 'Site de Votação') ?>
      </h4>
      <p style="font-size:.78rem;color:var(--text-tertiary);margin-bottom:1rem">
        +1 ponto por voto &nbsp;·&nbsp; A cada 12 horas
      </p>
      <a href="<?php echo htmlspecialchars($site['url'] ?? '#') ?>" target="_blank" rel="noopener"
         class="btn-gold" style="width:100%;justify-content:center">
        <i class="fa fa-external-link"></i> Votar Agora
      </a>
    </div>
    <?php endforeach ?>
  <?php else: ?>
    <!-- Fallback com sites placeholder -->
    <div class="card" style="text-align:center">
      <div style="font-size:1.5rem;margin-bottom:.75rem">🗳️</div>
      <h4 style="font-size:.95rem;color:var(--text-primary);margin-bottom:.5rem">Site de Votação 1</h4>
      <p style="font-size:.78rem;color:var(--text-tertiary);margin-bottom:1rem">+1 ponto · A cada 12h</p>
      <span class="btn-outline" style="width:100%;justify-content:center;opacity:.5">
        <i class="fa fa-clock"></i> Disponível em breve
      </span>
    </div>
    <div class="card" style="text-align:center">
      <div style="font-size:1.5rem;margin-bottom:.75rem">🗳️</div>
      <h4 style="font-size:.95rem;color:var(--text-primary);margin-bottom:.5rem">Site de Votação 2</h4>
      <p style="font-size:.78rem;color:var(--text-tertiary);margin-bottom:1rem">+1 ponto · A cada 12h</p>
      <span class="btn-outline" style="width:100%;justify-content:center;opacity:.5">
        <i class="fa fa-clock"></i> Disponível em breve
      </span>
    </div>
    <div class="card" style="text-align:center">
      <div style="font-size:1.5rem;margin-bottom:.75rem">🗳️</div>
      <h4 style="font-size:.95rem;color:var(--text-primary);margin-bottom:.5rem">Site de Votação 3</h4>
      <p style="font-size:.78rem;color:var(--text-tertiary);margin-bottom:1rem">+1 ponto · A cada 12h</p>
      <span class="btn-outline" style="width:100%;justify-content:center;opacity:.5">
        <i class="fa fa-clock"></i> Disponível em breve
      </span>
    </div>
  <?php endif ?>

</div>

<!-- VIP Shop -->
<div class="card fade-in">
  <h4 style="color:var(--accent-gold);margin-bottom:1rem">
    <i class="fa fa-store"></i> VIP Shop — Troque seus pontos
  </h4>
  <table class="ranking-table">
    <thead>
      <tr>
        <th>Item</th>
        <th>Custo</th>
        <th>Descrição</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="rank-name">Ticket VIP</td>
        <td class="rank-level" style="color:var(--accent-gold)">3 pontos</td>
        <td style="color:var(--text-secondary);font-size:.82rem">Ativa VIP: refino +30, buffs melhores, comandos exclusivos</td>
      </tr>
      <tr>
        <td class="rank-name">Ticket Evento</td>
        <td class="rank-level" style="color:var(--accent-gold)">1 ponto</td>
        <td style="color:var(--text-secondary);font-size:.82rem">Moeda para trocas e quests</td>
      </tr>
      <tr>
        <td class="rank-name">Cristal Amplificador</td>
        <td class="rank-level" style="color:var(--accent-gold)">1 ponto</td>
        <td style="color:var(--text-secondary);font-size:.82rem">Usado em encantamentos (resultado aleatório)</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- Comando in-game -->
<div class="card fade-in" style="margin-top:1.5rem;text-align:center">
  <p style="color:var(--text-secondary);font-size:.88rem;margin-bottom:.5rem">
    Você também pode votar diretamente no jogo com o comando:
  </p>
  <div style="display:inline-block;padding:.65rem 1.5rem;background:rgba(255,255,255,0.04);border-radius:var(--radius-sm);font-family:var(--font-mono);font-size:1rem;color:var(--accent-cool)">
    @voto
  </div>
</div>
