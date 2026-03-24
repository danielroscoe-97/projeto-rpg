<?php if (!defined('FLUX_ROOT'))
  exit; ?>
<!DOCTYPE html>
<html lang="pt-BR">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description"
    content="<?php echo htmlspecialchars(Flux::config('SiteTitle')) ?> — Servidor Ragnarok Online High-Rate Custom">
  <?php if (isset($metaRefresh)): ?>
    <meta http-equiv="refresh"
      content="<?php echo $metaRefresh['seconds'] ?>; URL=<?php echo $metaRefresh['location'] ?>">
  <?php endif ?>
  <title>
    <?php echo htmlspecialchars(Flux::config('SiteTitle')) ?><?php if (isset($title))
         echo ' — ' . htmlspecialchars($title) ?>
    </title>

    <!-- Google Fonts: Cinzel + Plus Jakarta Sans + JetBrains Mono -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
      href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap"
      rel="stylesheet">

    <!-- Font Awesome 6 (ícones) -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

    <!-- CSS do tema -->
    <link rel="stylesheet" href="<?php echo $this->themePath('css/theme.css') ?>">

  <!-- Favicon -->
  <link rel="icon" type="image/x-icon" href="./favicon.ico">
</head>

<body>

  <!-- ── PRELOADER (inspirado Projeto Yufa) ── -->
  <div class="preloader" id="preloader" style="display:none !important">
    <div class="preloader-text">Conectando a Midgard...</div>
  </div>

  <!-- ── PORING MASCOTE ── -->
  <img src="yanis/img/poring.gif" alt="Poring" class="poring-mascot" title="Poring te dá boas-vindas!">

  <!-- ── NAVBAR ── -->
  <nav class="navbar-modern" id="navbar">

    <!-- Logo -->
    <a href="<?php echo $this->url('main') ?>" class="navbar-logo">
      <img src="yanis/img/logo.png" onerror="this.style.display='none'"
        alt="<?php echo htmlspecialchars(Flux::config('SiteTitle')) ?>">
      <span class="navbar-logo-name"><?php echo htmlspecialchars(Flux::config('SiteTitle')) ?></span>
    </a>

    <!-- Links desktop -->
    <ul class="navbar-links">
      <li><a href="<?php echo $this->url('main') ?>" class="<?php echo ($params->get('module') === 'main' && $params->get('action') === 'index') ? 'active' : '' ?>">
          <img src="ro-modern/images/icons/ico1.png" class="nav-icon" alt="">Início</a></li>
      <li><a href="#download">
          <img src="ro-modern/images/icons/ico3.png" class="nav-icon" alt="">Download</a></li>
      <li><a href="#server-info">
          <img src="ro-modern/images/icons/ico6.png" class="nav-icon" alt="">Informações</a></li>
      <li><a href="#donate">
          <img src="ro-modern/images/icons/ico5.png" class="nav-icon" alt="">Doação</a></li>
      <li><a href="<?php echo $this->url('main', 'rules') ?>">
          <img src="ro-modern/images/icons/ico2.png" class="nav-icon" alt="">Regras</a></li>
      <li><a href="https://discord.gg/eZQnnXE2AX" target="_blank" rel="noopener">
          <img src="ro-modern/images/icons/ico4.png" class="nav-icon" alt="">Discord</a></li>
      <li><a href="https://wiki.libertyro.net" target="_blank" rel="noopener">
          <span class="nav-icon">ℹ️</span>Wiki</a></li>
    </ul>

    <!-- Server time (estilo yanis) -->
    <div class="navbar-server-time">
      <i class="fa fa-clock" style="margin-right:.25rem;font-size:.65rem"></i>
      <span id="server-time">00:00:00</span>
    </div>

    <!-- CTA desktop -->
    <?php
      $_isHome = ($params->get('module') === 'main' && $params->get('action') === 'index');
    ?>
    <div class="navbar-cta">
      <?php if (!$session->isLoggedIn()): ?>
        <a href="<?php echo $_isHome ? '#login-section' : $this->url('account', 'login') ?>" class="btn-outline">
          <i class="fa fa-user"></i> Entrar
        </a>
        <a href="<?php echo $_isHome ? '#register-section' : $this->url('account', 'create') ?>" class="btn-gold">
          Criar Conta
        </a>
      <?php else: ?>
        <a href="<?php echo $this->url('account', 'view') ?>" class="btn-outline">
          <i class="fa fa-user"></i> <?php echo htmlspecialchars($session->account->userid ?? 'Painel') ?>
        </a>
        <a href="<?php echo $this->url('account', 'logout') ?>" class="btn-gold">Sair</a>
      <?php endif ?>
    </div>

    <!-- Hamburger mobile -->
    <button class="navbar-hamburger" id="hamburger" aria-label="Menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </nav>

  <!-- Menu mobile drawer -->
  <div class="navbar-mobile" id="mobile-menu">
    <ul>
      <li><a href="<?php echo $this->url('main') ?>">Início</a></li>
      <li><a href="#download">Download</a></li>
      <li><a href="#server-info">Informações</a></li>
      <li><a href="<?php echo $this->url('donate') ?>">Doação</a></li>
      <li><a href="<?php echo $this->url('main', 'rules') ?>">Regras</a></li>
      <li><a href="https://discord.gg/eZQnnXE2AX" target="_blank" rel="noopener">Discord</a></li>
      <li><a href="https://wiki.libertyro.net" target="_blank" rel="noopener">Wiki</a></li>
    </ul>
    <div class="mobile-cta">
      <a href="<?php echo $_isHome ? '#login-section' : $this->url('account', 'login') ?>" class="btn-outline"
        style="flex:1;justify-content:center">Entrar</a>
      <a href="<?php echo $_isHome ? '#register-section' : $this->url('account', 'create') ?>" class="btn-gold"
        style="flex:1;justify-content:center">Criar Conta</a>
    </div>
  </div>

  <?php
  /* ── Prepara dados de status do servidor ── */
  $_online = false;
  $_players = 0;
  if (isset($serverStatus)) {
    foreach ($serverStatus as $psName => $gameServers) {
      foreach ($gameServers as $sName => $gs) {
        $_online = $gs['mapServerUp'] ?? false;
        $_players = $gs['playersOnline'] ?? 0;
      }
    }
  } elseif (isset($gameServer)) {
    $_online = $maponline ?? false;
    $_players = $gameServer['playersOnline'] ?? 0;
  }
  $statusHtml = $_online
    ? '<span class="status-dot online"></span><span style="color:#2dd4bf">On</span>'
    : '<span class="status-dot offline"></span><span style="color:var(--accent-warm)">Off</span>';
  ?>

  <?php if ($params->get('module') === 'main' && $params->get('action') === 'index'): ?>
    <!-- ── HERO (apenas na homepage) ── -->
    <section class="hero" id="hero">
      <div class="hero-bg" style="background-image:url('yanis/img/main-bg.jpg')"></div>
      <img src="yanis/img/magic-circle.png" class="hero-magic-circle" alt="">
      <div class="hero-fog"></div>
      <div class="hero-content">

        <!-- Logo flutuante -->
        <img class="hero-logo" src="yanis/img/logo.png" onerror="this.style.display='none'"
          alt="<?php echo htmlspecialchars(Flux::config('SiteTitle')) ?>">

        <!-- Título em Cinzel -->
        <h1 class="hero-title">Bem Vindo ao Liberty!</h1>
        <p class="hero-tagline">Full PvP &nbsp;·&nbsp; High-Rate &nbsp;·&nbsp; Pre-Renovação</p>

        <!-- CTAs principais -->
        <div class="hero-ctas">
          <a href="<?php echo $this->url('account', 'create') ?>" class="btn-gold">
            <i class="fa fa-user-plus"></i> Criar Conta
          </a>
          <a href="<?php echo $this->url('main', 'download') ?>" class="btn-outline">
            <i class="fa fa-download"></i> Download
          </a>
        </div>

        <!-- Stats rápidos -->
        <div class="hero-stats">
          <div class="hero-stat">
            <span class="hero-stat-value"><?php echo number_format($_players) ?></span>
            <span class="hero-stat-label">Online agora</span>
          </div>
          <div class="hero-stat">
            <span class="hero-stat-value">999 / 255</span>
            <span class="hero-stat-label">Level máximo</span>
          </div>
          <div class="hero-stat">
            <span class="hero-stat-value"><?php echo $statusHtml ?></span>
            <span class="hero-stat-label">Status</span>
          </div>
        </div>
      </div>

      <!-- Seta de scroll -->
      <div class="hero-scroll" onclick="document.getElementById('download').scrollIntoView({behavior:'smooth'})"
        title="Rolar para baixo">
        <i class="fa fa-chevron-down"></i>
      </div>
    </section>

  <?php else: ?>
    <!-- Espaçador para páginas internas -->
    <div style="height:var(--nav-height)"></div>
  <?php endif ?>

  <!-- ── ABERTURA DO CONTEÚDO PRINCIPAL ── -->
  <?php if ($params->get('module') !== 'main' || $params->get('action') !== 'index'): ?>
    <main class="page-content">
      <?php if ($msg = $session->getMessage()): ?>
        <p style="color:var(--accent-warm);margin-bottom:1rem"><?php echo htmlspecialchars($msg) ?></p>
      <?php endif ?>
    <?php else: ?>
      <main>
      <?php endif ?>