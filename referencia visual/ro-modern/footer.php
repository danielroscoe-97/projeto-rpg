<?php if (!defined('FLUX_ROOT')) exit; ?>
</main><!-- /main -->

<!-- ── FOOTER ── -->
<footer class="footer">
  <div class="container">
    <div class="footer-inner">

      <!-- Marca -->
      <div>
        <div class="footer-brand-name"><?php echo htmlspecialchars(Flux::config('SiteTitle')) ?></div>
        <p class="footer-brand-desc">
          Servidor Ragnarok Online High-Rate com gameplay customizado,
          eventos frequentes e comunidade ativa. Venha jogar!
        </p>
        <div class="footer-socials">
          <a href="https://discord.gg/Liberty" target="_blank" rel="noopener" class="social-btn" title="Discord">
            <i class="fab fa-discord"></i>
          </a>
          <a href="https://www.youtube.com/@DanYgg_Adv" target="_blank" rel="noopener" class="social-btn" title="YouTube">
            <i class="fab fa-youtube"></i>
          </a>
          <!-- PLACEHOLDER: adicionar outros links reais se houver -->
          <a href="#" class="social-btn" title="Facebook"><i class="fab fa-facebook-f"></i></a>
          <a href="#" class="social-btn" title="Instagram"><i class="fab fa-instagram"></i></a>
        </div>
      </div>

      <!-- Navegação -->
      <div class="footer-col">
        <h4>Navegação</h4>
        <ul>
          <li><a href="<?php echo $this->url('main') ?>">Início</a></li>
          <li><a href="<?php echo $this->url('main','download') ?>">Download</a></li>
          <li><a href="<?php echo $this->url('main','info') ?>">Informações</a></li>
          <li><a href="<?php echo $this->url('donate') ?>">Doação</a></li>
          <li><a href="<?php echo $this->url('main','rules') ?>">Regras</a></li>
        </ul>
      </div>

      <!-- Wiki -->
      <div class="footer-col">
        <h4>Wiki</h4>
        <ul>
          <li><a href="https://wiki.libertyro.net" target="_blank" rel="noopener">Guia Iniciante</a></li>
          <li><a href="https://wiki.libertyro.net" target="_blank" rel="noopener">Classes &amp; PvP</a></li>
          <li><a href="https://wiki.libertyro.net" target="_blank" rel="noopener">Economia</a></li>
          <li><a href="https://wiki.libertyro.net" target="_blank" rel="noopener">Catálogo de Itens</a></li>
        </ul>
      </div>

      <!-- Legal -->
      <div class="footer-col">
        <h4>Legal</h4>
        <ul>
          <li><a href="<?php echo $this->url('service','tos') ?>">Termos de Serviço</a></li>
          <li><a href="<?php echo $this->url('main','rules') ?>">Regras</a></li>
        </ul>
        <h4 style="margin-top:1.5rem">Suporte</h4>
        <ul>
          <li><a href="https://discord.gg/eZQnnXE2AX" target="_blank" rel="noopener">Discord</a></li>
        </ul>
      </div>

    </div>

    <!-- Copyright -->
    <div class="footer-bottom">
      <p style="margin-bottom:.25rem">
        Copyright &copy; <script>document.write(new Date().getFullYear())</script>
        <?php echo htmlspecialchars(Flux::config('SiteTitle')) ?>.
        Todos os direitos reservados.
      </p>
      <p style="font-size:.68rem;color:var(--text-tertiary)">
        Ragnarok Online &trade; é propriedade da Gravity Co., Ltd. &amp; Lee Myoungjin.
        <br>Este servidor não possui afiliação com a Gravity.
      </p>
    </div>
  </div>
</footer>

<!-- ── DISCORD FLOAT ── -->
<a href="https://discord.gg/Liberty" target="_blank" rel="noopener"
   class="discord-float" title="Entre no nosso Discord!">
  <i class="fab fa-discord"></i>
</a>

<!-- ── MODAL DOAÇÃO IN-GAME ── -->
<div id="donateModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(4,4,8,0.85);backdrop-filter:blur(4px);z-index:9999;align-items:center;justify-content:center;opacity:0;transition:opacity 0.3s;padding:1.5rem">
  <div class="modal-content card" style="max-width:560px;width:100%;transform:translateY(20px);transition:transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);position:relative;padding:2.5rem;text-align:center;box-shadow:0 20px 40px rgba(0,0,0,0.4);border:1px solid rgba(212,168,83,0.3)">
    <button onclick="closeDonateModal()" style="position:absolute;top:1rem;right:1rem;background:none;border:none;color:var(--text-tertiary);font-size:1.5rem;cursor:pointer;padding:0.5rem;line-height:1">
      <i class="fa fa-times"></i>
    </button>
    
    <div style="font-size:3.5rem;color:var(--accent-gold);margin-bottom:1rem;filter:drop-shadow(0 0 10px rgba(212,168,83,0.3))">
      <i class="fa fa-heart"></i>
    </div>
    
    <h3 style="font-family:var(--font-display);font-size:1.6rem;color:var(--text-primary);margin-bottom:1.25rem">
      Obrigado por querer ajudar o <span style="color:var(--accent-gold)">Liberty</span>!
    </h3>
    
    <div style="background:rgba(0,0,0,0.2);border-radius:var(--radius);padding:1.25rem;text-align:left;margin-bottom:1.5rem;border-left:3px solid var(--accent-gold)">
      <p style="color:var(--text-secondary);line-height:1.6;font-size:.9rem;margin-bottom:1rem">
        As doações são feitas <strong>exclusivamente dentro do jogo</strong>. Procure o NPC de doação na <strong>Sala de Donates</strong>.
      </p>
      <ul style="color:var(--text-secondary);line-height:1.6;font-size:.85rem;list-style:none;padding:0;margin:0">
        <li style="margin-bottom:.5rem"><i class="fa fa-caret-right" style="color:var(--accent-gold);margin-right:5px"></i> Toda doação te dará <strong>20% de bônus</strong> do valor doado.</li>
        <li style="margin-bottom:.5rem"><i class="fa fa-caret-right" style="color:var(--accent-gold);margin-right:5px"></i> A cada <strong>R$ 100</strong> você terá direito a um set visual da promoção (rotativo e não acumulativo).</li>
        <li><i class="fa fa-caret-right" style="color:var(--accent-gold);margin-right:5px"></i> A cada <strong>R$ 500</strong> (acumulativo) você terá direito a um visual exclusivo permanente. <span style="font-size:0.75rem;opacity:0.8">(Cores diferentes são considerados visuais diferentes, procure a staff).</span></li>
      </ul>
    </div>
    
    <button onclick="closeDonateModal()" class="btn-gold" style="width:100%;justify-content:center;font-size:1.05rem">
      Entendido
    </button>
  </div>
</div>

<script>
function showDonateModal(e) {
  if (e) e.preventDefault();
  const modal = document.getElementById('donateModal');
  modal.style.display = 'flex';
  // Fast reflow
  void modal.offsetWidth;
  modal.style.opacity = '1';
  modal.querySelector('.modal-content').style.transform = 'translateY(0)';
}

function closeDonateModal() {
  const modal = document.getElementById('donateModal');
  modal.style.opacity = '0';
  modal.querySelector('.modal-content').style.transform = 'translateY(20px)';
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
}

// Fechar ao clicar fora do card
window.addEventListener('click', (e) => {
  const modal = document.getElementById('donateModal');
  if (e.target === modal) closeDonateModal();
});
</script>

<!-- ── ARTE DE PERSONAGENS (ATMOSFERA) ── -->
<div class="footer-renders">
  <img src="ro-modern/images/slide_1_img.png" class="render-left" alt="">
  <img src="ro-modern/images/slide_2_img.png" class="render-right" alt="">
</div>

<!-- ── SCRIPTS ── -->
<script src="<?php echo $this->themePath('js/app.js') ?>"></script>
<script src="<?php echo $this->themePath('js/intersect.js') ?>"></script>
</body>
</html>
