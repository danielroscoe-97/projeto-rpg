<?php if (!defined('FLUX_ROOT')) exit; ?>

<h2 class="section-heading" style="margin-top:1rem">Apoie o <span>Servidor</span></h2>
<div class="section-divider"></div>
<p class="section-subtitle">
  R$&nbsp;1,00 = 1.000 ROPs &nbsp;<strong style="color:var(--accent-gold)">+20% de bônus fixo</strong>&nbsp;·&nbsp;
  R$100 acumulados = bônus especial &nbsp;·&nbsp; R$500 = bônus premium
</p>

<?php if (!$session->isLoggedIn()): ?>
  <div class="alert alert-info" style="margin-bottom:2rem;max-width:600px;margin-left:auto;margin-right:auto">
    <i class="fa fa-circle-info"></i>
    <a href="<?php echo $this->url('account','login') ?>">Faça login</a> ou
    <a href="<?php echo $this->url('account','create') ?>">crie sua conta</a> para realizar doações.
  </div>
<?php endif ?>

<!-- Pacotes de doação (espelho da homepage) -->
<div class="donation-grid">

  <div class="donation-card fade-in">
    <div class="donation-card-art-wrap">
      <img src="ro-modern/images/donate.png" alt="" class="donation-card-art" loading="lazy">
    </div>
    <div class="donation-name">Iniciante</div>
    <div class="donation-price">R$ 30<span>/único</span></div>
    <ul class="donation-features">
      <li>36.000 ROPs <small>(+20%)</small></li>
      <li>Acesso à Cash Shop</li>
      <li>Sets de equipamentos</li>
    </ul>
    <a href="#" onclick="showDonateModal(event)" class="btn-outline"
       style="width:100%;justify-content:center">Apoiar</a>
  </div>

  <div class="donation-card featured fade-in delay-2">
    <div class="donation-card-art-wrap size-md">
      <img src="ro-modern/images/donate2.png" alt="" class="donation-card-art" loading="lazy">
    </div>
    <div class="donation-name">Aventureiro</div>
    <div class="donation-price">R$ 100<span>/único</span></div>
    <ul class="donation-features">
      <li>120.000 ROPs <small>(+20%)</small></li>
      <li><strong style="color:var(--accent-gold)">Bônus especial R$100</strong></li>
      <li>2× Sets de equipamentos</li>
      <li>Suporte prioritário</li>
    </ul>
    <a href="#" onclick="showDonateModal(event)" class="btn-gold"
       style="width:100%;justify-content:center">Apoiar</a>
  </div>

  <div class="donation-card fade-in delay-4">
    <div class="donation-card-art-wrap size-lg">
      <img src="ro-modern/images/donate3.png" alt="" class="donation-card-art" loading="lazy">
    </div>
    <div class="donation-name">Lendário</div>
    <div class="donation-price">R$ 500<span>/único</span></div>
    <ul class="donation-features">
      <li>600.000 ROPs <small>(+20%)</small></li>
      <li><strong style="color:var(--accent-gold)">Bônus premium R$500</strong></li>
      <li>Visual Exclusivo Customizável</li>
      <li>Reconhecimento</li>
    </ul>
    <a href="#" onclick="showDonateModal(event)" class="btn-outline"
       style="width:100%;justify-content:center">Apoiar</a>
  </div>

</div>

<!-- Como funciona -->
<div class="card fade-in" style="margin-top:2rem;text-align:center">
  <h4 style="color:var(--accent-gold);margin-bottom:.75rem">
    <i class="fa fa-circle-info"></i> Como funciona?
  </h4>
  <p style="color:var(--text-secondary);line-height:1.6;font-size:.95rem;max-width:800px;margin:1rem auto 0">
    As doações são feitas <strong>exclusivamente dentro do jogo</strong>. Procure o NPC de doação na <strong>Sala de Donates</strong>.
    <br>Toda doação te dará 20% de bônus do valor doado, a cada 100 reais te dará direito a um set visual da promoção (rotativo e não acumulativo). A cada 500 reais (acumulativo) você terá direito a um visual exclusivo, onde nenhum outro jogador poderá ter (cores diferentes são considerados visuais diferentes, procure a administração para receber os visuais).
  </p>
</div>
