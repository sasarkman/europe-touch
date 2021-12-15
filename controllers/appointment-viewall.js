console.log("hi");


	

$(document).ready(function () {

	"use strict";

	var options = {
		events_source: function() { return [] },
		view: 'month',
		tmpl_path: '/tmpls/',
		tmpl_cache: false,
		// day: '2013-03-12',
		// onAfterEventsLoad: function(events) {
		// 	if(!events) {
		// 		return;
		// 	}
		// 	var list = $('#eventlist');
		// 	list.html('');

		// 	$.each(events, function(key, val) {
		// 		$(document.createElement('li'))
		// 			.html('<a href="' + val.url + '">' + val.title + '</a>')
		// 			.appendTo(list);
		// 	});
		// },
		onAfterViewLoad: function(view) {
			$('.page-header h3').text(this.getTitle());
			$('.btn-group button').removeClass('active');
			$('button[data-calendar-view="' + view + '"]').addClass('active');
		},
		classes: {
			months: {
				general: 'label'
			}
		}
	};

	$('.btn-group button[data-calendar-nav]').each(function() {
		var $this = $(this);
		$this.click(function() {
			calendar.navigate($this.data('calendar-nav'));
		});
	});

	$('.btn-group button[data-calendar-view]').each(function() {
		var $this = $(this);
		$this.click(function() {
			calendar.view($this.data('calendar-view'));
		});
	});

	var calendar = $('#calendar').calendar(options);
});