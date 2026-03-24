<?php if (!defined('FLUX_ROOT')) exit; ?>

<div class="auth-container">
  <div class="auth-card fade-in">

    <!-- Cabeçalho -->
    <div class="auth-header">
      <div class="auth-icon"><i class="fa fa-shield-halved"></i></div>
      <h2>Entrar</h2>
      <p>Acesse sua conta para gerenciar personagens, rankings e mais.</p>
    </div>

    <!-- Mensagens de erro -->
    <?php if (isset($errorMessage) && $errorMessage): ?>
      <div class="alert alert-error">
        <i class="fa fa-circle-exclamation"></i>
        <?php echo htmlspecialchars($errorMessage) ?>
      </div>
    <?php endif ?>

    <!-- Formulário de login -->
    <form action="<?php echo $this->url('account','login') ?>" method="post" class="auth-form">
      <div class="form-group">
        <label for="login_userid">
          <i class="fa fa-user"></i> Usuário
        </label>
        <input type="text" name="login_userid" id="login_userid"
               value="<?php echo htmlspecialchars($params->get('login_userid') ?? '') ?>"
               placeholder="Seu nome de usuário"
               autocomplete="username" required>
      </div>

      <div class="form-group">
        <label for="login_user_pass">
          <i class="fa fa-lock"></i> Senha
        </label>
        <input type="password" name="login_user_pass" id="login_user_pass"
               placeholder="Sua senha"
               autocomplete="current-password" required>
      </div>

      <button type="submit" class="btn-gold auth-submit">
        <i class="fa fa-right-to-bracket"></i> Entrar
      </button>
    </form>

    <!-- Links auxiliares -->
    <div class="auth-links">
      <p>Ainda não tem conta? <a href="<?php echo $this->url('account','create') ?>">Criar conta gratuita</a></p>
    </div>

  </div>
</div>
