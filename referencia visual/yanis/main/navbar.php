<?php if (!defined('FLUX_ROOT')) exit; ?>

<div class="position-relative">
	<div class="smoke position-absolute d-none d-sm-block"></div>
</div>

<header id="header" class="fixed-top">
	<div class="px-4 d-flex align-items-center">	
		<a id="play-pause-button" title="Música"><img class="px-3 not-playing" id="music-sign" src="<?php echo $this->themePath('img/music-stop.png') ?>" /></a> 
<?php /* <a href="<?php echo $this->url('main'); ?>" class="logo"><img src="<?php echo $this->themePath('img/logo.png') ?>" alt="" class="img-fluid pe-4" /></a> */ ?>
		<nav id="navbar" class="navbar">
			<ul>
				<li>
					<a class="nav-link scrollto" href="<?php echo $this->url('main'); ?>">Inicio</a>
				</li>
				<li>
					<a class="nav-link scrollto" href="<?php echo $this->url('main','download'); ?>">Download</a>
				</li>						
				<li>
					<a class="nav-link scrollto" href="<?php echo $this->url('main','info'); ?>">Informações</a>
				</li>
				<li>
					<a class="nav-link scrollto" href="https://discord.gg/eZQnnXE2AX" target="_blank">Discord</a>
				</li>
				<li>
					<a class="nav-link scrollto" href="<?php echo $this->url('donate'); ?>">Donate</a>
				</li>
                <li>
	                <a class="nav-link scrollto" href="<?php echo $this->url('voteforpoints'); ?>">Votar</a> 
                </li>
			</ul>
			<i class="bi bi-list mobile-nav-toggle">&nbsp;</i>
		</nav>
	
		<div class="ms-auto d-none d-lg-block">
			<?php if (!$session->isLoggedIn()): ?>
				<a href="<?php echo $this->url('account','login'); ?>" class="text-white" title="Entrar ou Criar Conta"><?php echo htmlspecialchars(Flux::message('LoginTitle')) ?> <img src="<?php echo $this->themePath('img/login-icon.png') ?>" class="ms-3" /></a>
			<?php else:?>		
				<a href="<?php echo $this->url('account','view'); ?>" title="Ver Conta"><img src="<?php echo $this->themePath('img/login-icon2.png') ?>" class="me-2" /><?php echo htmlspecialchars($session->account->userid) ?></a> | <a href=<?php echo $this->url('account','logout'); ?>> <?php echo htmlspecialchars(Flux::message('LogoutTitle')) ?></a> 
			<?php endif ?>
		</div>
		<div class="px-4 server-time">	
			<span id="t-hours">0</span>:<span id="t-minutes">0</span>:<span id="t-seconds">0</span> <span id="t-ampm"></span>
		</div>
	</div>
</header>

<section id="hero" class="d-flex">
	<div class="main-bg">
		<div class="char-render">
			<div class="col-lg-3 mx-auto text-center text-white center-intro" data-aos="fade-up" data-aos-delay="200">
				<img src="<?php echo $this->themePath('img/logo.png'); ?>" alt="" class="img-fluid" />
				<div class="server-status">
					<span class="text-label">Jogadores Online:</span> <span style="color: #06f59d"><?php echo $gameServer['playersOnline'] ?></span> 
					<span class="status-label ms-3">Status:</span> <?php if ( $maponline ) { echo $online; } else { echo $offline; } ?> 
				</div>
			</div>
		</div>
	</div>
</section>

<div class="scroll-arrow">
	<img src="<?php echo $this->themePath('img/arrow_mouse.png'); ?>" />
</div>