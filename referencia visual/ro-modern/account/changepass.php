<?php if (!defined('FLUX_ROOT')) exit; ?>

<div class="auth-container">
  <div class="auth-card fade-in">

    <div class="auth-header">
      <div class="auth-icon"><i class="fa fa-key"></i></div>
      <h2>Alterar Senha</h2>
      <p>Digite sua senha atual e a nova senha desejada.</p>
    </div>

    <?php if (isset($errorMessage) && $errorMessage): ?>
      <div class="alert alert-error">
        <i class="fa fa-circle-exclamation"></i>
        <?php echo htmlspecialchars($errorMessage) ?>
      </div>
    <?php endif ?>

    <form action="<?php echo $this->url('account','changepass') ?>" method="post" class="auth-form">

      <div class="form-group">
        <label for="old_password">
          <i class="fa fa-lock"></i> Senha Atual
        </label>
        <input type="password" name="old_password" id="old_password"
               placeholder="Sua senha atual"
               autocomplete="current-password" required>
      </div>

      <div class="form-group">
        <label for="new_password">
          <i class="fa fa-lock"></i> Nova Senha
        </label>
        <input type="password" name="new_password" id="new_password"
               placeholder="Mínimo 6 caracteres"
               autocomplete="new-password" required>
      </div>

      <div class="form-group">
        <label for="confirm_password">
          <i class="fa fa-lock"></i> Confirmar Nova Senha
        </label>
        <input type="password" name="confirm_password" id="confirm_password"
               placeholder="Repita a nova senha"
               autocomplete="new-password" required>
      </div>

      <button type="submit" class="btn-gold auth-submit">
        <i class="fa fa-check"></i> Alterar Senha
      </button>
    </form>

    <div class="auth-links">
      <p><a href="<?php echo $this->url('account','view') ?>"><i class="fa fa-arrow-left"></i> Voltar para Minha Conta</a></p>
    </div>

  </div>
</div>
