<?php if (!defined('FLUX_ROOT')) exit; ?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
	"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
	<head>
		<meta charset="utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<meta name="description" content="">
		<meta name="author" content="">
		
		<?php if (isset($metaRefresh)): ?>
		<meta http-equiv="refresh" content="<?php echo $metaRefresh['seconds'] ?>; URL=<?php echo $metaRefresh['location'] ?>" />
		<?php endif ?>		
		<title><?php echo Flux::config('SiteTitle'); if (isset($title)) echo ": $title" ?></title>
		<link rel="icon" type="image/x-icon" href="./favicon.ico" />
		<!--<link rel="icon" type="image/png" href="<?php echo $this->themePath('img/favicon.png') ?>" />-->
		<link rel="stylesheet" href="<?php echo $this->themePath('css/flux.css') ?>" type="text/css" media="screen" title="" charset="utf-8" />
		<link href="<?php echo $this->themePath('css/flux/unitip.css') ?>" rel="stylesheet" type="text/css" media="screen" title="" charset="utf-8" />
		
		<?php if (Flux::config('EnableReCaptcha')): ?>
			<script src='https://www.google.com/recaptcha/api.js'></script>
		<?php endif ?>
		
		<!--[if IE]>
        <link rel="stylesheet" href="themes/yanis/css/flux/ie.css') ?>" type="text/css" media="screen" title="" charset="utf-8" />
        <![endif]--><!--[if lt IE 9]>
        <script src="themes/default/js/ie9.js" type="text/javascript') ?>"></script>
        <script type="text/javascript" src="themes/default/js/flux.unitpngfix.js') ?>"></script>
        <![endif]-->
		
		<link href="<?php echo $this->themePath('css/sticky-footer-navbar.css') ?>" rel="stylesheet">
		<link href="<?php echo $this->themePath('vendor/aos/aos.css') ?>" rel="stylesheet" />
		<link href="<?php echo $this->themePath('vendor/bootstrap/css/bootstrap.min.css') ?>" rel="stylesheet" />
		<link href="<?php echo $this->themePath('vendor/bootstrap-icons/bootstrap-icons.css') ?>" rel="stylesheet" />
		<link href="<?php echo $this->themePath('vendor/boxicons/css/boxicons.min.css') ?>" rel="stylesheet" />
		<link href="<?php echo $this->themePath('vendor/glightbox/css/glightbox.min.css') ?>" rel="stylesheet" />
		<link href="<?php echo $this->themePath('vendor/remixicon/remixicon.css') ?>" rel="stylesheet" />
		<link href="<?php echo $this->themePath('vendor/swiper/swiper-bundle.min.css') ?>" rel="stylesheet" />
		<link href="<?php echo $this->themePath('css/owl.carousel.min.css') ?>" rel="stylesheet" />
		<link href="<?php echo $this->themePath('css/owl.theme.default.min.css') ?>" rel="stylesheet" />
		<link rel='stylesheet' href='https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css' />
		<link href="<?php echo $this->themePath('css/style.css') ?>" rel="stylesheet" />
		
		<script type="text/javascript" src="<?php echo $this->themePath('js/jquery-1.8.3.min.js') ?>"></script>
		<script type="text/javascript" src="<?php echo $this->themePath('js/flux.datefields.js') ?>"></script>
		<script type="text/javascript" src="<?php echo $this->themePath('js/flux.unitip.js') ?>"></script>
		<script type="text/javascript">
			$(document).ready(function(){
				var inputs = 'input[type=text],input[type=password],input[type=file]';
				$(inputs).focus(function(){
					$(this).css({
						'background-color': '#f9f5e7',
						'border-color': '#dcd7c7',
						'color': '#726c58'
					});
				});
				$(inputs).blur(function(){
					$(this).css({
						'backgroundColor': '#ffffff',
						'borderColor': '#dddddd',
						'color': '#444444'
					}, 500);
				});
				$('.menuitem a').hover(
					function(){
						$(this).fadeTo(200, 0.85);
						$(this).css('cursor', 'pointer');
					},
					function(){
						$(this).fadeTo(150, 1.00);
						$(this).css('cursor', 'normal');
					}
				);
				$('.money-input').keyup(function() {
					var creditValue = parseInt($(this).val() / <?php echo Flux::config('CreditExchangeRate') ?>, 10);
					if (isNaN(creditValue))
						$('.credit-input').val('?');
					else
						$('.credit-input').val(creditValue);
				}).keyup();
				$('.credit-input').keyup(function() {
					var moneyValue = parseFloat($(this).val() * <?php echo Flux::config('CreditExchangeRate') ?>);
					if (isNaN(moneyValue))
						$('.money-input').val('?');
					else
						$('.money-input').val(moneyValue.toFixed(2));
				}).keyup();
				
				// In: js/flux.datefields.js
				processDateFields();
			});
			
			function reload(){
				window.location.href = '<?php echo $this->url ?>';
			}
		</script>
		
		<script type="text/javascript">
			function updatePreferredServer(sel){
				var preferred = sel.options[sel.selectedIndex].value;
				document.preferred_server_form.preferred_server.value = preferred;
				document.preferred_server_form.submit();
			}
			
			function updatePreferredTheme(sel){
				var preferred = sel.options[sel.selectedIndex].value;
				document.preferred_theme_form.preferred_theme.value = preferred;
				document.preferred_theme_form.submit();
			}

            function updatePreferredLanguage(sel){
                var preferred = sel.options[sel.selectedIndex].value;
                setCookie('language', preferred);
                reload();
            }

			// Preload spinner image.
			var spinner = new Image();
			spinner.src = '<?php echo $this->themePath('img/spinner.gif') ?>';
			
			function refreshSecurityCode(imgSelector){
				$(imgSelector).attr('src', spinner.src);
				
				// Load image, spinner will be active until loading is complete.
				var clean = <?php echo Flux::config('UseCleanUrls') ? 'true' : 'false' ?>;
				var image = new Image();
				image.src = "<?php echo $this->url('captcha') ?>"+(clean ? '?nocache=' : '&nocache=')+Math.random();
				
				$(imgSelector).attr('src', image.src);
			}
			function toggleSearchForm()
			{
				//$('.search-form').toggle();
				$('.search-form').slideToggle('fast');
			}

            function setCookie(key, value) {
                var expires = new Date();
                expires.setTime(expires.getTime() + expires.getTime()); // never expires
                document.cookie = key + '=' + value + ';expires=' + expires.toUTCString();
            }
		</script>
		
		<script type="text/javascript" src="<?php echo $this->themePath('js/jquery.min.js') ?>"></script>
		<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>
		<script type="text/javascript" src="<?php echo $this->themePath('js/owl.carousel.js') ?>"></script>
	
		<?php if (Flux::config('EnableReCaptcha')): ?>
			<script src='https://www.google.com/recaptcha/api.js'></script>
		<?php endif ?>	
		
	</head>
	
	<!-- AIDEN SERVICE -->
	<?php $AIDEN = include $this->themePath('main/AidenConfig.php', true); ?>
	<?php include $this->themePath('main/navbar.php', true); ?>
	
	<body>
		<div class="global-container" id="main-cont">
		
			<?php if (Flux::config('DebugMode') && @gethostbyname(Flux::config('ServerAddress')) == '127.0.0.1'): ?>
				<p class="notice">Please change your <strong>ServerAddress</strong> directive in your application config to your server's real address (e.g., myserver.com).</p>
			<?php endif ?>
						
								<!-- Messages -->
								<?php if ($message=$session->getMessage()): ?>
									<p class="message"><?php echo htmlspecialchars($message) ?></p>
								<?php endif ?>
								
								<!-- Sub menu -->
								<?php include $this->themePath('main/submenu.php', true) ?>
								
								<!-- Page menu -->
								<?php include $this->themePath('main/pagemenu.php', true) ?>
								
								<!-- Credit balance -->
								<?php //if (in_array($params->get('module'), array('donate', 'purchase'))) include 'main/balance.php' ?>
