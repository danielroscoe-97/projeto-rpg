<?php if (!defined('FLUX_ROOT')) exit; ?>

<h2 class="section-heading" style="margin-top:1rem">Informações do <span>Servidor</span></h2>
<div class="ro-divider"><img src="yanis/img/poring.gif" alt="~"></div>
<p class="section-subtitle">Tudo que você precisa saber sobre o <?php echo htmlspecialchars(Flux::config('SiteTitle')) ?></p>

<!-- Cards rápidos (espelho da homepage) -->
<div class="info-grid">
  <div class="info-card fade-in">
    <span class="info-card-icon">🎯</span>
    <div class="info-card-label">Level Máximo</div>
    <div class="info-card-value">999 / 255</div>
    <div class="info-card-sub">Base / Classe · Atributos até 700</div>
  </div>
  <div class="info-card fade-in delay-1">
    <span class="info-card-icon">🎴</span>
    <div class="info-card-label">Drops de Cards</div>
    <div class="info-card-value">100%</div>
    <div class="info-card-sub">Normal, MVP e Mini-Boss garantidos</div>
  </div>
  <div class="info-card fade-in delay-2">
    <span class="info-card-icon">⚒️</span>
    <div class="info-card-label">Refino Gratuito</div>
    <div class="info-card-value">+20 / +30</div>
    <div class="info-card-sub">Normal / VIP · sem quebra</div>
  </div>
  <div class="info-card fade-in delay-3">
    <span class="info-card-icon">⚔️</span>
    <div class="info-card-label">ASPD</div>
    <div class="info-card-value">197</div>
    <div class="info-card-sub">Pre-Renovação · Transclasses</div>
  </div>
</div>

<!-- Tabelas detalhadas -->
<div class="info-section-grid" style="margin-top:2.5rem">

  <div class="info-table-card fade-in">
    <div class="info-table-header"><i class="fa fa-server"></i> Informações Gerais</div>
    <table>
      <tr><td>Localização</td><td>São Paulo, SP 🇧🇷</td></tr>
      <tr><td>Fuso Horário</td><td>GMT -3</td></tr>
      <tr><td>Proteção</td><td><span class="status-active">Gepard Shield 3.0</span></td></tr>
      <tr><td>Idioma</td><td>Português</td></tr>
      <tr><td>Mecânica</td><td>Pre-Renewal (Custom)</td></tr>
      <tr><td>Episódio</td><td>Transclasses 2-1 / 2-2</td></tr>
      <tr><td>3rd / 4th Classes</td><td><span class="status-inactive">Desativadas</span></td></tr>
    </table>
  </div>

  <div class="info-table-card fade-in delay-1">
    <div class="info-table-header"><i class="fa fa-gamepad"></i> Mecânicas de Jogo</div>
    <table>
      <tr><td>Level Base Max</td><td style="font-family:var(--font-mono);color:var(--accent-gold)">999</td></tr>
      <tr><td>Level Classe Max</td><td style="font-family:var(--font-mono);color:var(--accent-gold)">255</td></tr>
      <tr><td>Atributo Max</td><td style="font-family:var(--font-mono)">700</td></tr>
      <tr><td>ASPD Max</td><td style="font-family:var(--font-mono)">197</td></tr>
      <tr><td>Membros por Guilda</td><td style="font-family:var(--font-mono)">8</td></tr>
      <tr><td>Cards Drop</td><td><span class="status-active">100% garantido</span></td></tr>
      <tr><td>Refino</td><td>Gratuito · +20 / +30 VIP</td></tr>
    </table>
  </div>

  <div class="info-table-card fade-in delay-2">
    <div class="info-table-header"><i class="fa fa-star"></i> Sistemas Ativos</div>
    <table>
      <tr><td>Pack Iniciante</td><td><span class="status-active">Ativo</span></td></tr>
      <tr><td>Pack Semanal</td><td><span class="status-active">Ativo</span></td></tr>
      <tr><td>Batalha Campal</td><td><span class="status-active">Ativo</span> · 20:00</td></tr>
      <tr><td>Guerra do Emperium</td><td><span class="status-active">Ativo</span></td></tr>
      <tr><td>Quests</td><td><span class="status-active">Ativo</span></td></tr>
      <tr><td>Eventos Automáticos</td><td><span class="status-active">11+ eventos</span></td></tr>
      <tr><td>Sistema VIP</td><td><span class="status-active">Ativo</span></td></tr>
    </table>
  </div>

  <div class="info-table-card fade-in delay-3">
    <div class="info-table-header"><i class="fa fa-terminal"></i> Comandos Custom</div>
    <table>
      <tr><td style="font-family:var(--font-mono);color:var(--accent-cool)">@joinbg</td><td>Entrar na Batalha Campal</td></tr>
      <tr><td style="font-family:var(--font-mono);color:var(--accent-cool)">@eventos</td><td>Teleportar para eventos</td></tr>
      <tr><td style="font-family:var(--font-mono);color:var(--accent-cool)">@autopot</td><td>Cura automática (on/off)</td></tr>
      <tr><td style="font-family:var(--font-mono);color:var(--accent-cool)">@buff</td><td>Buff instantâneo (CD: 10s)</td></tr>
      <tr><td style="font-family:var(--font-mono);color:var(--accent-cool)">@status</td><td>Ver atributos e defesas</td></tr>
      <tr><td style="font-family:var(--font-mono);color:var(--accent-cool)">@voto</td><td>Votar e ganhar pontos</td></tr>
      <tr><td style="font-family:var(--font-mono);color:var(--accent-cool)">@zeny</td><td>Receber Zeny</td></tr>
    </table>
  </div>

</div>

<!-- Custom & Eventos -->
<div style="margin-top:2rem">
  <div class="info-table-card fade-in">
    <div class="info-table-header"><i class="fa fa-calendar-days"></i> Custom &amp; Eventos</div>
    <table>
      <tr><td>Eventos</td><td>Dice, Taro, Sortudo, Aquaring Premiado, Disguise, Rinha de Galo, Corrida Animal, Rei da Selva, Devil Square Elemental</td></tr>
      <tr><td>Premiação Diária</td><td><span class="status-active">Ativo</span></td></tr>
      <tr><td>Voto por Pontos</td><td><span class="status-active">Ativo</span></td></tr>
      <tr><td>Presença</td><td><span class="status-active">Ativo</span></td></tr>
      <tr><td>Premiação PvP</td><td><span class="status-active">Ativo</span></td></tr>
    </table>
  </div>
</div>
