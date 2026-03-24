/*-------------------------
    Real Time Update
----------------------------*/
var $dOut = $('#t-date'),
    $hOut = $('#t-hours'),
    $mOut = $('#t-minutes'),
    $sOut = $('#t-seconds');

var months = [
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
];

var days = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

function t_update() {
    var date = new Date();
    // Ajusta o fuso horário para UTC-3 (São Paulo)
    date.setTime(date.getTime() + date.getTimezoneOffset() * 60 * 1000 - 3 * 60 * 60 * 1000);

    var hours = date.getHours(); // Mantém o formato de 24 horas
    var minutes = date.getMinutes() < 10
        ? '0' + date.getMinutes()
        : date.getMinutes();

    var seconds = date.getSeconds() < 10
        ? '0' + date.getSeconds()
        : date.getSeconds();

    var dayOfWeek = days[date.getDay()];
    var month = months[date.getMonth()];
    var day = date.getDate();
    var year = date.getFullYear();

    var dateString = dayOfWeek + ', ' + month + ' ' + day + ', ' + year;

    $dOut.text(dateString);
    $hOut.text(hours);
    $mOut.text(minutes);
    $sOut.text(seconds);
}

t_update();
window.setInterval(t_update, 1000);

    /*-------------------------
		Carousel & Pop up
	----------------------------*/	
	$(document).ready(function() {

		var owlnews = $('.owl-carousel-news');
		owlnews.owlCarousel({
			items:1,
			loop:false,
			margin:0,
			autoplay:false,
			autoplayTimeout:1000,
			autoplayHoverPause:true
		});

		var owljobs = $('.jobs-carousel');
		owljobs.owlCarousel({
		  items: 1,
		  responsive: {
			  0: {
				  items: 1
			  },
			  576: {
				  items: 1
			  },					
			  992: {
				  items: 1
			  },
			  1200: {
				  items: 1
			  }
		  },
		  loop: true,
		  dots: true,
		  dotsData: true,
		  margin: 0,
		  dotsContainer: '.slider-nav .thumbs',
		  nav: true,
		  navText:["<div class='nav-btn prev-slide'></div>","<div class='nav-btn next-slide'></div>"],
		  autoplay: true,
		  autoplayTimeout: 2000,
		  autoplayHoverPause: true,
		});


		var owlfeat = $('.features-owl');
		owlfeat.owlCarousel({
		  items: 1.3,
		  center: true,
		  responsive: {
			  0: {
				  items: 1,
				  margin: 0
			  },
			  576: {
				  items: 1,
				  margin: 0
			  },					
			  992: {
				  items: 1.3,
				  margin: -75
			  },
			  1200: {
				  items: 1.3,
				  margin: -75
			  }
		  },
		  loop: true,
		  nav: true,
		  navText:["<div class='nav-btn prev-slide'></div>","<div class='nav-btn next-slide'></div>"],
		  autoplay: true,
		  autoplayTimeout: 2000,
		  autoplayHoverPause: true,
		});

	  });	
			
    /*-------------------------
		Collapsible
	----------------------------*/			
	var coll = document.getElementsByClassName("collapsible");
	var i;
	
	for (i = 0; i < coll.length; i++) {
	  coll[i].addEventListener("click", function() {
		this.classList.toggle("active");
		//var content = this.nextElementSibling;
		if (this.innerHTML === "Read more.") {
    		this.innerHTML = "Read less.";
  		} else {
    		this.innerHTML = "Read more.";
  		}
	
		var content = document.getElementById("collapse");
		if (content.style.display === "block") {
		  content.style.display = "none";
		} else {
		  content.style.display = "block";
		}
	  });
	};


	/*---------------------------
		Display toggle main container
	----------------------------*/	
	if ( $.trim( $('.global-container').text() ).length == 0 ) {
		document.getElementById("main-cont").style.display = 'none';
	}


	//------------------------- Audio Toggler  -------------------------		
	var audio = new Audio("themes/yanis/audio/12.mp3");
	var musicPL = document.getElementById("music-sign");
	audio.loop = true;
	audio.volume = 0.7;
	var img1 = "themes/yanis/img/music-stop.png",
		img2 = "themes/yanis/img/music-on.png";

	$('#play-pause-button').on("click",function(){
	if($(musicPL).hasClass('not-playing'))
	{
		$(musicPL).removeClass('not-playing');
		$(musicPL).addClass('playing');
		audio.play();

		musicPL.src = img2;
	}
	else
	{
		$(musicPL).removeClass('playing');
		$(musicPL).addClass('not-playing');
		audio.pause();

		musicPL.src = img1;
	}
	});

	audio.onended = function() {
		$(musicPL).removeClass('playing');
		$(musicPL).addClass('not-playing');

		musicPL.src = img1;
	};	