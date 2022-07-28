$(function () {
	var eventModal = $('#event_modal');

	var appointmentID = '';
	var calendarEl = document.getElementById('calendar');
	var calendar = new FullCalendar.Calendar(calendarEl, {
		initialView: 'dayGridMonth',
		// themeSystem: 'bootstrap',
		headerToolbar: {
			start: 'prev,next today',
			center: 'title',
			end: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
		},
		timeZone: 'local',
		views: {
			dayGridMonth: { buttonText: "Month" },
			timeGridWeek: { buttonText: "Week" },
			timeGridDay: { buttonText: "Day" },
			listMonth: { buttonText: "All" }
		},
		dayMaxEvents: true, // allow "more" link when too many events
		selectable: true,
		eventTimeFormat: {
			hour: 'numeric',
			minute: '2-digit',
			meridiem: 'short'
		},
		eventClick: function(event) {

			var appointment = event.event.extendedProps;
			appointmentID = appointment._id;

			
			// var startTime = new Date(event.event.start).toLocaleTimeString('en-US');
			const dateOptions = {year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit'};
			var startTime = new Date(event.event.start).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'});
			var createdDate = new Date(appointment.created).toLocaleString('en-US', dateOptions);
			var status = appointment.confirmed ? 'confirmed' : 'not confirmed';
			var statusColor = appointment.confirmed ? 'text-success' : 'text-danger';

			// Service fields
			eventModal.find('#service').html(appointment.service.name);
			eventModal.find('#service').attr('value', appointment._id);
			eventModal.find('#duration').html(appointment.service.duration);
			eventModal.find('#price').html('$' + appointment.service.price);
			eventModal.find('#description').html(appointment.service.description);

			// Appointment fields
			eventModal.find('#start').html(startTime);
			eventModal.find('#created').html(createdDate);

			// Confirmation info
			eventModal.find('#status').html(status);
			eventModal.find('#status').attr('class', statusColor);
			$('#status-info').popover({content: 'Appointments will be confirmed/unconfirmed by Edina and the customer will receive a notification.', html: true});

			// Display the modal
			eventModal.modal('show');
		},
		eventSources: [
			{
				url: '/appointment/',
				extraParams: {
					'type': 'confirmed'
				},
				color: 'green'
			},
			{
				url: '/appointment/',
				extraParams: {
					'type': 'unconfirmed'
				},
				color: 'red'
			}
		],
		eventsSet: function() {
			// console.log(this.getEvents());
		},
	});

	// Reset button states when modal closes
	$('.modal').on('hide.bs.modal', function() {
		enableButton('#confirm-appointment');
		enableButton('#unconfirm-appointment');
		enableButton('#confirm_cancel');
	})

	// Define modal button click behavior
	$('#cancel_appointment').on('click', function() {
		const modal = new Promise(function(resolve, reject){
			$('#confirm_cancel_modal').modal('show');
			$('#confirm_cancel_modal .btn-danger').on('click', function () {
				showSpinner('#confirm_cancel', 'Cancelling...');
				resolve("user clicked yes");
			});
			$('#confirm_cancel_modal .btn-ok').on('click', function () {
				reject("user clicked cancel");
			});
		}).then(function (val) {
			hideSpinner('#confirm_cancel', 'Yes');
			const settings = {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					id: appointmentID,
				})
			}

			new API().request('/appointment/cancel', settings).then(response => {
				statusCode = response.status;
				statusText = response.msg;

				switch(statusCode) {
					case 200:
						// remove event from calendar
						calendar.getEventById(appointmentID).remove();
						$('#confirm_cancel_modal').modal('toggle');
						break;
					default:
						alertShow(statusText, 'alert-danger');
						break
				}

				hideSpinner('#confirm_cancel', 'Yes');
			})

		}).catch(function (err) {
			// console.log(err)
		});
	});

	calendar.render();
});