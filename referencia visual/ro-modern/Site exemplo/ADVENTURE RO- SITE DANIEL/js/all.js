;(function($, window, document, undefined) {
    "use strict";
    
	if ($('.accordions').length) {
	$('.accordions').zAccordion({
			startingSlide: 1,
			auto: false,
			tabWidth: "20%",
			width: "100%",
			height: "auto",
			trigger: "click",
		    speed: 800
	});
	
	}if ($('.accordions2').length) {
	$('.accordions2').zAccordion({
			startingSlide: 1,
			auto: false,
			tabWidth: "20%",
			width: "100%",
			height: "auto",
			trigger: "click",
		    speed: 800
	});
	}
	$('.acor-slide').on('click', function(){
	       $('.acor-slide').removeClass('anime');
		   $(this).addClass('anime');
	});
	
	
    /*============================*/
	/* SWIPER SLIDE */
	/*============================*/
	
	var swipers = [], winW, winH, winScr, _isresponsive, smPoint = 768, mdPoint = 992, lgPoint = 1200, addPoint = 1600, _ismobile = navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i) || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/iPod/i);

	function pageCalculations(){
		winW = $(window).width();
		winH = $(window).height();
	}

	pageCalculations();
	
	/*============================*/
	/* WINDOW LOAD */
	/*============================*/
	
	$(window).load(function(){
		if($('#map-canvas-contact').length==1){
		  initialize('map-canvas-contact');}
		$('.preloader').hide();
	});
	
	function updateSlidesPerView(swiperContainer){
		if(winW>=addPoint) return parseInt(swiperContainer.attr('data-add-slides'),10);
		else if(winW>=lgPoint) return parseInt(swiperContainer.attr('data-lg-slides'),10);
		else if(winW>=mdPoint) return parseInt(swiperContainer.attr('data-md-slides'),10);
		else if(winW>=smPoint) return parseInt(swiperContainer.attr('data-sm-slides'),10);
		else return parseInt(swiperContainer.attr('data-xs-slides'),10);
	}

	function resizeCall(){
		pageCalculations();

		$('.swiper-container.initialized[data-slides-per-view="responsive"]').each(function(){
			var thisSwiper = swipers['swiper-'+$(this).attr('id')], $t = $(this), slidesPerViewVar = updateSlidesPerView($t), centerVar = thisSwiper.params.centeredSlides;
			thisSwiper.params.slidesPerView = slidesPerViewVar;
			thisSwiper.reInit();
			if(!centerVar){
				var paginationSpan = $t.find('.pagination span');
				var paginationSlice = paginationSpan.hide().slice(0,(paginationSpan.length+1-slidesPerViewVar));
				if(paginationSlice.length<=1 || slidesPerViewVar>=$t.find('.swiper-slide').length) $t.addClass('pagination-hidden');
				else $t.removeClass('pagination-hidden');
				paginationSlice.show();
			}
		});
	}
	if(!_ismobile){
		$(window).resize(function(){
			resizeCall();
		});
	} else{
		window.addEventListener("orientationchange", function() {
			resizeCall();
		}, false);
	}

	/*=====================*/
	/* 07 - swiper sliders */
	/*=====================*/
	
	function initSwiper(){
		var initIterator = 0;
		$('.swiper-container').each(function(){								  
			var $t = $(this);								  

			var index = 'swiper-unique-id-'+initIterator;

			$t.addClass('swiper-'+index + ' initialized').attr('id', index);
			$t.find('.pagination').addClass('pagination-'+index);

			var autoPlayVar = parseInt($t.attr('data-autoplay'),10);

			var slidesPerViewVar = $t.attr('data-slides-per-view');
			if(slidesPerViewVar == 'responsive'){
				slidesPerViewVar = updateSlidesPerView($t);
			}
			else slidesPerViewVar = parseInt(slidesPerViewVar,10);

			var loopVar = parseInt($t.attr('data-loop'),10);
			var speedVar = parseInt($t.attr('data-speed'),10);
            var centerVar = parseInt($t.attr('data-center'),10);
			swipers['swiper-'+index] = new Swiper('.swiper-'+index,{
				speed: speedVar,
				pagination: '.pagination-'+index,
				loop: loopVar,
				paginationClickable: true,
				autoplay: autoPlayVar,
				slidesPerView: slidesPerViewVar,
				keyboardControl: true,
				calculateHeight: true, 
				simulateTouch: true,
				roundLengths: true,
				centeredSlides: centerVar,
				onSlideChangeStart: function(swiper){
					var activeIndex = (loopVar===true)?swiper.activeIndex:swiper.activeLoopIndex;
					if($t.closest('.testimonials-container').length){
						$t.closest('.testimonials-wrapper').find('.testimonials-icons .entry div.active').removeClass('active');
						$t.closest('.testimonials-wrapper').find('.testimonials-icons .entry div').eq(activeIndex).addClass('active');
					}
				},
				onSlideClick: function(swiper){
					if($t.closest('.circle-slide-box').length) swiper.swipeTo(swiper.clickedSlideIndex);
				}
			});
			swipers['swiper-'+index].reInit();
				if($t.attr('data-slides-per-view')=='responsive'){
					var paginationSpan = $t.find('.pagination span');
					var paginationSlice = paginationSpan.hide().slice(0,(paginationSpan.length+1-slidesPerViewVar));
					if(paginationSlice.length<=1 || slidesPerViewVar>=$t.find('.swiper-slide').length) $t.addClass('pagination-hidden');
					else $t.removeClass('pagination-hidden');
					paginationSlice.show();
				}
			initIterator++;
		});
		
       $('.swiper-container.connected-to-bottom-swiper').each(function(){
			var $t = $(this);
			if($t.closest('.testi-wrapper').find('.connected-to-top-swiper').length){
				swipers['swiper-'+$t.attr('id')].addCallback('SlideChangeStart', function(swiper){
					swipers['swiper-'+$t.closest('.testi-wrapper').find('.connected-to-top-swiper').attr('id')].swipeTo(swiper.activeIndex);
				});
			}
		});
	}

	initSwiper();

	//swiper arrows
	
	$('.swiper-arrow-left').on('click', function(){
		swipers['swiper-'+$(this).parent().parent().find('.swiper-container').attr('id')].swipePrev();
	});

	$('.swiper-arrow-right').on('click', function(){
		swipers['swiper-'+$(this).parent().parent().find('.swiper-container').attr('id')].swipeNext();
	});
	
    //testimonials
	
	$('.testimonials-icons .entry div').on('click', function(){
		if($(this).hasClass('active')) return false;
		var val = $(this).parent().parent().find('.entry').index($(this).parent());
		swipers['swiper-'+$(this).closest('.testimonials-wrapper').find('.testimonials-container .swiper-container').attr('id')].swipeTo(val);

		var parentSwiper = $(this).closest('.testimonials-wrapper').find('.testimonials-icons').parent();
		if(parentSwiper.hasClass('swiper-container')) swipers['swiper-'+parentSwiper.attr('id')].swipeTo(val);
		$(this).parent().parent().find('div.active').removeClass('active');
		$(this).addClass('active');
	});
	
	/*============================*/
	/* MOBILE MENU */
	/*============================*/
	
	$('.nav-menu-icon a').on('click', function() { 
	  if ($('nav').hasClass('slide-menu')){
		  $('nav').removeClass('slide-menu'); 
		  $(this).removeClass('active');
	  }else {
		   $('nav').addClass('slide-menu');
		  $(this).addClass('active');
	  }
		return false;
	 });
	
	if ($(window).width()<992){
	    $('.open-drop').on('click', function(){
		  if ($(this).parent().parent().find('.dropmenu').hasClass('active')){
			  $(this).removeClass('active');
		      $(this).parent().parent().find('.dropmenu').removeClass('active'); 
		  }else{
			  $(this).addClass('active');
			  $('.dropmenu').removeClass('active');
		      $(this).parent().parent().find('.dropmenu').addClass('active');
		  }
			return false;
		}); 
	}
	
	/***********************************/
	/*WINDOW SCROLL*/
	/**********************************/
	
	$('.feature-block').on('mouseover', function(){
	   $(this).closest('.feature').find('.monitor-img .clip .bg').attr('style', $(this).find('.clip-hide').attr('style'));
		$(this).closest('.feature').find('.monitor-img').addClass('scal-img');    
	});

	var hasCreatedObjects = false;
	$(window).scroll(function() {
	   if ($('.time-line').length) {
		 $('.time-line').not('.animated').each(function(){
		  if($(window).scrollTop() >= $(this).offset().top-$(window).height()*0.5)
		   {
			   $(this).addClass('animated').find('.timer').countTo();
			   if (!hasCreatedObjects) {
					hasCreatedObjects = true;
					$('#skill-circle-1').circliful(); 
					$('#skill-circle-2').circliful(); 
					$('#skill-circle-3').circliful(); 
					$('#skill-circle-4').circliful();
                }
		   }
		 });
		}
       
	});
	
    /***********************************/
	/*DROPDOWN LIST*/
	/**********************************/			 
				 
	$('.drop').on('click', function() {
			if($('.drop-list').hasClass('act')){
				$(this).find('.drop-list').removeClass('act');
				$(this).find('span').slideUp(300);
			}else{
               $('.drop span').slideUp(300);
				$(this).find('.drop-list').addClass('act');
				$(this).find('span').slideDown(300);
			}
			return false;
		});
		
    $('.drop span button').on('click', function() {
			$(this).parent().parent().find('b').text($(this).text());
			$('.drop').find('span').slideUp(300);
		});	
	
	/***********************************/
	/*GOOGLE MAP*/
	/**********************************/
	
	function initialize(obj) {
		var stylesArray = {
		'style-1' : {
    		'style': [{"featureType":"administrative","elementType":"labels.text.fill","stylers":[{"color":"#444444"}]},{"featureType":"landscape","elementType":"all","stylers":[{"color":"#f2f2f2"}]},{"featureType":"poi","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"road","elementType":"all","stylers":[{"saturation":-100},{"lightness":45}]},{"featureType":"road.highway","elementType":"all","stylers":[{"visibility":"simplified"}]},{"featureType":"road.arterial","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"transit","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"water","elementType":"all","stylers":[{"color":"#7f75b5"},{"visibility":"on"}]}]
		}
		}

		var lat = $('#'+obj).attr("data-lat");
        var lng = $('#'+obj).attr("data-lng");
		var contentString = $('#'+obj).attr("data-string");
		var myLatlng = new google.maps.LatLng(lat,lng);
		var map, marker, infowindow;
		var image = 'img/marker.png';
		var zoomLevel = parseInt($('#'+obj).attr("data-zoom"),10);
		var styles = stylesArray[$('#map-canvas-contact').attr("data-style")]['style'];
		var styledMap = new google.maps.StyledMapType(styles,{name: "Styled Map"});
	    
		var mapOptions = {
			zoom: zoomLevel,
			disableDefaultUI: true,
			center: myLatlng,
            scrollwheel: false,
			mapTypeControlOptions: {
            mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'map_style']
			}
		}
		
		map = new google.maps.Map(document.getElementById(obj), mapOptions);
	
		map.mapTypes.set('map_style', styledMap);
		map.setMapTypeId('map_style');
	
		infowindow = new google.maps.InfoWindow({
			content: contentString
		});
      
	    
        marker = new google.maps.Marker({
			position: myLatlng,
			map: map,
			icon: image
		});
	
		google.maps.event.addListener(marker, 'click', function() {
			infowindow.open(map,marker);
		});
	
	}

	//accordeon
	$('.accordeon-entry h5').on('click', function(){
		$(this).parent().toggleClass('active');
		$(this).next().toggleClass('active');
	});
	
	//tabs switch
	$('.tabs-desktop div').on('click', function(){
		var $t = $(this);
		var curVal = $t.parent().find('div').index(this);

		$t.closest('.tabs-wrapper').find('.tabs-container:visible').fadeOut(300, function(){
			$t.closest('.tabs-wrapper').find('.tabs-container').eq(curVal).fadeIn(300);	
		});
		
		$t.parent().find('.active').removeClass('active');
		$t.addClass('active');
		$t.parent().parent().find('.tabs-select-text .text').text($t.text());
	});

	$('.tabs-switch-box select').change(function(){
		var curValue = $(this).val();
		$(this).parent().find('.tabs-desktop div').filter(function (){return $(this).text() == curValue;}).on('click');
	});

	$('.faq-switcher .side-menu-item').on('click', function(){
		if($(this).hasClass('active')) return false;

		var $t = $(this);
		var curVal = $t.parent().find('.switch').index(this);

		$(this).closest('.row').find('.switch-container:visible').fadeOut(300, function(){
			$t.closest('.row').find('.switch-container').eq(curVal).fadeIn(300);	
		});

		$t.parent().find('.active').removeClass('active');
		$t.addClass('active');
	});

	
	//video player
	
	$(document).on('click', '.video-open', function(){
		$('.video-player').addClass('active');
		var videoSource = $(this).attr('data-src');
		setTimeout(function(){$('.video-player iframe').attr('src', videoSource);}, 1000);
	});

	$('.video-player .close-iframe').on('click', function(){
		$('.video-player iframe').attr('src', '');
		setTimeout(function(){$('.video-player').removeClass('active');}, 1000);
		
	});
		
	$('.checkbox-entry.checkbox label').on('click', function(){
		$(this).parent().toggleClass('active');
		$(this).parent().find('input').on('click');
	});

	$('.checkbox-entry.radio label').on('click', function(){
		$(this).parent().find('input').on('click');
		if(!$(this).parent().hasClass('active')){
			var nameVar = $(this).parent().find('input').attr('name');
			$('.checkbox-entry.radio input[name="'+nameVar+'"]').parent().removeClass('active');
			$(this).parent().addClass('active');
		}
	});
	
	$('[data-toggle="popover"]').popover();
	
	$('.alert-block span').on('click', function(){
	  $(this).parent().hide(); 
	});
	
})(jQuery, window, document);