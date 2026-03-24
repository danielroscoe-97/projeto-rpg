<?php if (!defined('FLUX_ROOT')) exit; ?>

<div class="auth-container">
  <div class="auth-card fade-in" style="max-width:520px">

    <!-- Cabeçalho -->
    <div class="auth-header">
      <div class="auth-icon"><i class="fa fa-user-plus"></i></div>
      <h2>Criar Conta</h2>
      <p>Registre-se gratuitamente e comece a jogar imediatamente.<br>
         <small style="color:var(--accent-gold)">Você receberá um Pack Iniciante com equipamentos high-end!</small></p>
    </div>

    <!-- Mensagens de erro -->
    <?php if (isset($errorMessage) && $errorMessage): ?>
      <div class="alert alert-error">
        <i class="fa fa-circle-exclamation"></i>
        <?php echo htmlspecialchars($errorMessage) ?>
      </div>
    <?php endif ?>

    <!-- Formulário de registro -->
    <form action="<?php echo $this->url('account','create') ?>" method="post" class="auth-form">

      <div class="form-row">
        <div class="form-group">
          <label for="userid">
            <i class="fa fa-user"></i> Usuário
          </label>
          <input type="text" name="userid" id="userid"
                 value="<?php echo htmlspecialchars($params->get('userid') ?? '') ?>"
                 placeholder="4-23 caracteres"
                 autocomplete="username" required>
        </div>

        <div class="form-group">
          <label for="gender">
            <i class="fa fa-venus-mars"></i> Gênero
          </label>
          <select name="gender" id="gender">
            <option value="M" <?php echo ($params->get('gender') === 'M') ? 'selected' : '' ?>>Masculino</option>
            <option value="F" <?php echo ($params->get('gender') === 'F') ? 'selected' : '' ?>>Feminino</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label for="email">
          <i class="fa fa-envelope"></i> E-mail
        </label>
        <input type="email" name="email" id="email"
               value="<?php echo htmlspecialchars($params->get('email') ?? '') ?>"
               placeholder="seu@email.com"
               autocomplete="email" required>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="user_pass">
            <i class="fa fa-lock"></i> Senha
          </label>
          <input type="password" name="user_pass" id="user_pass"
                 placeholder="Mínimo 6 caracteres"
                 autocomplete="new-password" required>
        </div>

        <div class="form-group">
          <label for="confirm_pass">
            <i class="fa fa-lock"></i> Confirmar Senha
          </label>
          <input type="password" name="confirm_pass" id="confirm_pass"
                 placeholder="Repita a senha"
                 autocomplete="new-password" required>
        </div>
      </div>

      <?php if (Flux::config('EnableCaptcha')): ?>
      <div class="form-group">
        <label>Verificação</label>
        <div class="captcha-wrap">
          <img src="<?php echo $this->url('captcha') ?>" alt="Captcha">
          <input type="text" name="security_code" placeholder="Código da imagem" required>
        </div>
      </div>
      <?php endif ?>

      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" name="agree_terms" required>
          <span>Li e concordo com os <a href="<?php echo $this->url('service','tos') ?>" target="_blank">Termos de Serviço</a></span>
        </label>
      </div>

      <button type="submit" class="btn-gold auth-submit">
        <i class="fa fa-user-plus"></i> Criar Conta
      </button>
    </form>

    <!-- Links auxiliares -->
    <div class="auth-links">
      <p>Já tem uma conta? <a href="<?php echo $this->url('account','login') ?>">Faça login</a></p>
    </div>

  </div>
</div>
