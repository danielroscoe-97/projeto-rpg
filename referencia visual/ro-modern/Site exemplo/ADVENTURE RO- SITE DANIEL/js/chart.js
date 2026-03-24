    /***********************************/
	/*CANVAS CHARTS*/
	/**********************************/
	
	
;(function($, window, document, undefined) {
    "use strict";	
	
	  var getCnvsId = '';
		var dtaPoint,dtaPoint2,dtaPoint3=[];
		dtaPoint=[ { y: 20}, { y: 15}, { y: 65} ];
		dtaPoint2=[{ y: 30, label: ""}, { y: 35, label: "" },{ y: 35, label: "" } ];
		dtaPoint3=[{ y: 45, label: ""},{ y: 5, label: "" },{ y: 50, label: "" }];

		function getRandm(x,y){
			return Math.floor((Math.random() * y) + x);		
		}
		window.onload = function() {
			//intilizing first time
			createChart('chartContainer',dtaPoint,"color1");
			createChart('chartContainer2',dtaPoint2,"color1");
			createChart('chartContainer3',dtaPoint,"color1");
		}
		CanvasJS.addColorSet("color1",
			 [
						"#f04d4e",
						"#1593d0",
						"#fecc17"
			]);
	function createChart(getCnvsId,dtaPoint,colorTheme) {
		var s='',c='',t='',t2='',z;
		var drwChart = new CanvasJS.Chart(getCnvsId, {
			title: {
				verticalAlign: 'top',
				horizontalAlign: 'center'
			},
			colorSet: colorTheme,
			data: [{
				lineThickness: 1,
				type: "doughnut",
				startAngle: 145,
				toolTipContent: "{label}: #percent%",
				click: function(e) {
					s=$('#'+getCnvsId).attr("data-serial");		//getting data-serial attribute here
					c=$('#'+getCnvsId).attr("class");			//getting class attribute vlaue here
					z=0;
					$('.main > div').each(function(i){
						t=$(this).attr('data-serial');
						t2=$(this).attr('id');
						console.log(t2);
						if(t==s){
							$('.'+c).animate({left:'0px'},0,'linear');	//animating clicked pie to left

						}
						else{
							z++;
							$(this).empty();					//clearing rest div
							if(z==1){
								$(this).css({'left':'35%'});
								createChart(t2,dtaPoint2,"color1");		//creating 1st pie 
							}
							else{
								$(this).css({'left':'69%'});
								createChart(t2,dtaPoint3,"color1");		//creating second pie
							}
						}
					});
				},
				dataPoints: dtaPoint
			}]
		});
		drwChart.render();
	}
	
	})(jQuery, window, document);