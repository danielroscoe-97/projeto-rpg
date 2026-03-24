<?php if (!defined('FLUX_ROOT')) exit; ?>
</div>

	<div class="footer">
		<div class="content-container container d-flex flex-wrap">
			<div class="col-xxl-11 col-lg-12 mx-auto row">
				<div class="col-xxl-5 col-lg-5 col-10 mx-auto">
					<div class="text-center credits mt-8 mb-8 mb-lg-0">
                        <?php /* <img src="<?php echo $this->themePath('img/logo.png') ?>" width="180px" class="px-4" /> 
                        */ ?>
						<img src="<?php echo $this->themePath('img/Gepard.png') ?>" width="130px" /></a>						
						<a href="https://discord.gg/eZQnnXE2AX" title="&lt;b&gt;Discord&lt;/b&gt;" target="_blank">
						<img src="<?php echo $this->themePath('img/Discord.png') ?>" /></a>								
					</div>
				</div>
				<div class="col-xxl-5 col-lg-5 col-10 mx-auto">
					<nav class="nav flex-column flex-lg-row mb-4 text-center">
						<a class="nav-link" href="<?php echo $this->url('main','rules'); ?>">Regras</a> 
						<a class="nav-link" href="<?php echo $this->url('service','tos'); ?>">Termos de Serviço</a> 
					</nav>
					<p class="text-center text-white text-lg-start">
						Copyright &copy; <script>document.write(new Date().getFullYear())</script> LibertyRO. Todos os direitos reservados LibertyRO.
					</p>
					<p class="text-center text-lg-start">
						Todas as marcas registradas aqui mencionadas são de propriedade de seus respectivos proprietários.
					</p>
				</div>
			</div>
		</div>
	</div>
	<div id="preloader"></div>
	<a href="#" class="back-to-top d-flex align-items-center justify-content-center">&nbsp;<i class="bi bi-arrow-up-short">&nbsp;</i></a> 
	<script src="<?php echo $this->themePath('vendor/aos/aos.js') ?>"></script>
	<script src="<?php echo $this->themePath('vendor/bootstrap/js/bootstrap.bundle.min.js') ?>"></script>
	<script src="<?php echo $this->themePath('vendor/glightbox/js/glightbox.min.js') ?>"></script>
	<script src="<?php echo $this->themePath('vendor/isotope-layout/isotope.pkgd.min.js') ?>"></script>
	<script src="<?php echo $this->themePath('vendor/swiper/swiper-bundle.min.js') ?>"></script>
	<script src="<?php echo $this->themePath('vendor/waypoints/noframework.waypoints.js') ?>"></script> 
	<script src="<?php echo $this->themePath('js/main.js') ?>"></script> 
	<script type="text/javascript" src="<?php echo $this->themePath('js/active.js') ?>"></script>
	</body>
</html>