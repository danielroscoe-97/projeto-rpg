<?php if (!defined('FLUX_ROOT')) exit; ?>
</div>

<!--<div class="scroll-arrow">
	<a href="#newsupdates" title="Scroll Down"><img src="<?php echo $this->themePath('img/arrow_mouse.png'); ?>" /></a>
</div>-->
	
<main id="main">
	<!-- News FluxCP -->
	
	<section class="gameinfo content-wrap" id="gameinfo">
		<div class="container">
			<div class="section-title">
				<h2>Informações do Jogo</h2>
			</div>
			<div class="game-info row">
				<div class="col-lg-4" data-aos="fade-up" data-aos-delay="50">
					<div class="download-campaign mx-auto">
						<img src="<?php echo $this->themePath('img/ro-icon.png'); ?>" alt="ro-icon" /><br />
						<p>
						</p><a href="<?php echo $this->url('main','download'); ?>" title="Click to Download"><img src="<?php echo $this->themePath('img/download-icon.png'); ?>" alt="download-icon" /></a>
					</div>
				</div>
				<div class="col-lg-8">
					<div class="serverinfo mx-auto" data-aos="zoom-in" data-aos-delay="300">
					<table class="table info-table">
					<thead>
					<tr>
						<th colspan="2" class="active" width="50%">
							Informações Gerais:
						</th>
					</tr>
					</thead>
					<tr>
						<td class="fw-bold">
							Level Max
						</td>
						<td>
							999/255
						</td>
					</tr>
					<tr>
						<td class="fw-bold">
							Classes 3rd e 4th
						</td>
						<td class="text-danger">
							Inativo
						</td>
					</tr>
					<tr>
						<td class="fw-bold">
							Segurança
						</td>
						<td>
							Gepard Shield 3.0
						</td>
					<tr>
						<td class="fw-bold">
							Velocidade de Ataque Max
						</td>
						<td>
							197
						</td>
					</tr>
					<tr>
						<td class="fw-bold">
							Comandos
						</td>
						<td colspan="3">
							@status @autopot @afk @buff e mais!
						</td>
					</tr>
					</table>
					</div>
				</div>
			</div>
		</div>
	</section>
</main>