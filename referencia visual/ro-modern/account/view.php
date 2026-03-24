<?php if (!defined('FLUX_ROOT')) exit; ?>

<h2>Minha Conta</h2>

<?php if (!$session->isLoggedIn()): ?>
  <div class="alert alert-error">
    <i class="fa fa-lock"></i>
    Você precisa <a href="<?php echo $this->url('account','login') ?>">fazer login</a> para acessar esta página.
  </div>
<?php else: ?>

<div class="account-grid fade-in">

  <!-- Card principal da conta -->
  <div class="card account-main-card">
    <div class="account-avatar">
      <i class="fa fa-user-circle"></i>
    </div>
    <div class="account-info">
      <h3 style="color:var(--accent-gold);font-family:var(--font-display);margin-bottom:.25rem">
        <?php echo htmlspecialchars($session->account->userid) ?>
      </h3>
      <p style="font-size:.82rem;color:var(--text-tertiary)">
        ID: <?php echo $session->account->account_id ?>
        &nbsp;·&nbsp;
        <?php echo htmlspecialchars($session->account->email) ?>
      </p>
    </div>
  </div>

  <!-- Informações da conta -->
  <div class="card">
    <h4 style="color:var(--accent-gold);margin-bottom:1rem">
      <i class="fa fa-info-circle"></i> Informações
    </h4>
    <table>
      <tbody>
        <tr>
          <td>Usuário</td>
          <td><?php echo htmlspecialchars($session->account->userid) ?></td>
        </tr>
        <tr>
          <td>E-mail</td>
          <td><?php echo htmlspecialchars($session->account->email) ?></td>
        </tr>
        <tr>
          <td>Sexo</td>
          <td><?php echo $session->account->sex === 'M' ? 'Masculino' : 'Feminino' ?></td>
        </tr>
        <tr>
          <td>Grupo</td>
          <td><?php echo $session->account->group_id ?></td>
        </tr>
        <tr>
          <td>Última conexão</td>
          <td><?php echo $session->account->lastlogin ?? 'N/A' ?></td>
        </tr>
        <tr>
          <td>Estado</td>
          <td>
            <?php if ($session->account->state == 0): ?>
              <strong style="color:#2dd4bf">Ativa</strong>
            <?php else: ?>
              <strong style="color:var(--accent-warm)">Bloqueada</strong>
            <?php endif ?>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Ações rápidas -->
  <div class="card">
    <h4 style="color:var(--accent-gold);margin-bottom:1rem">
      <i class="fa fa-bolt"></i> Ações Rápidas
    </h4>
    <div class="account-actions">
      <a href="<?php echo $this->url('account','changepass') ?>" class="btn-outline" style="width:100%;justify-content:center;margin-bottom:.5rem">
        <i class="fa fa-key"></i> Alterar Senha
      </a>
      <a href="<?php echo $this->url('account','changesex') ?>" class="btn-outline" style="width:100%;justify-content:center;margin-bottom:.5rem">
        <i class="fa fa-venus-mars"></i> Alterar Sexo
      </a>
      <a href="<?php echo $this->url('account','changeemail') ?>" class="btn-outline" style="width:100%;justify-content:center;margin-bottom:.5rem">
        <i class="fa fa-envelope"></i> Alterar E-mail
      </a>
      <a href="<?php echo $this->url('donate') ?>" class="btn-gold" style="width:100%;justify-content:center;margin-top:.5rem">
        <i class="fa fa-gem"></i> Doação
      </a>
    </div>
  </div>

</div>

<!-- Lista de personagens -->
<?php if (isset($characters) && !empty($characters)): ?>
<div class="card fade-in" style="margin-top:1.5rem">
  <h4 style="color:var(--accent-gold);margin-bottom:1rem">
    <i class="fa fa-users"></i> Personagens
  </h4>
  <table>
    <thead>
      <tr>
        <th>Nome</th>
        <th>Classe</th>
        <th>Base Lv</th>
        <th>Job Lv</th>
        <th>Guilda</th>
      </tr>
    </thead>
    <tbody>
      <?php foreach ($characters as $char): ?>
      <tr>
        <td class="rank-name"><?php echo htmlspecialchars($char->name) ?></td>
        <td><?php echo $char->class ?? 'N/A' ?></td>
        <td style="font-family:var(--font-mono)"><?php echo $char->base_level ?></td>
        <td style="font-family:var(--font-mono)"><?php echo $char->job_level ?></td>
        <td><?php echo htmlspecialchars($char->guild_name ?? '—') ?></td>
      </tr>
      <?php endforeach ?>
    </tbody>
  </table>
</div>
<?php endif ?>

<?php endif ?>
