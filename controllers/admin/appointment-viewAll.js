$(function () {
	var eventModal = $('#eventModal');

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
			
			var startTime = new Date(event.event.start).toLocaleTimeString('en-US');
			var createdDate = new Date(appointment.created).toLocaleString('en-US');
			var status = appointment.approved ? 'confirmed' : 'not confirmed';
			var statusColor = appointment.approved ? 'text-success' : 'text-danger';

			eventModal.find('#title').html(`${appointment.account.name}'s appointment`);

			// Customer fields
			eventModal.find('#age').html(appointment.account.age);
			eventModal.find('#phone').html(appointment.account.phone);
			eventModal.find('#email').html(appointment.account.email);

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

			if(appointment.approved) {
				showButton('#unconfirm-appointment')
				hideButton('#confirm-appointment')
			} else {
				showButton('#confirm-appointment');
				hideButton('#unconfirm-appointment')
			}

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

	// TODO: define button click behavior HERE
	$('#confirm-appointment').on('click', function() {
		alertReset();
		showSpinner('#confirm-appointment', 'Confirming...');
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

		new API().request('/appointment/confirm', settings).then(response => {
			statusCode = response.status;
			statusText = response.msg;

			switch(statusCode) {
				case 200:
					calendar.getEventById(appointmentID).setProp('color', 'green');
					calendar.getEventById(appointmentID).setExtendedProp('approved', true);

					eventModal.find('#status').html('confirmed');
					eventModal.find('#status').attr('class', 'text-success');

					alertShow(statusText, 'alert-success');
					hideButton('#confirm-appointment');
					showButton('#unconfirm-appointment');
					break;
				default:
					alertShow(statusText, 'alert-danger');
					break
			}

			hideSpinner('#confirm-appointment', 'Confirm appointment');
		})
	});

	$('#unconfirm-appointment').on('click', function() {
		alertReset();
		showSpinner('#unconfirm-appointment', 'Unconfirming...');
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

		new API().request('/appointment/unconfirm', settings)
			.then(response => {
				statusCode = response.status;
				statusText = response.msg;

				switch(statusCode) {
					case 200:
						calendar.getEventById(appointmentID).setProp('color', 'red');
						calendar.getEventById(appointmentID).setExtendedProp('approved', false);

						eventModal.find('#status').html('not confirmed');
						eventModal.find('#status').attr('class', 'text-danger');

						alertShow(statusText, 'alert-success');
						hideButton('#unconfirm-appointment');
						showButton('#confirm-appointment');
						break;
					default:
						alertShow(statusText, 'alert-danger');
						break
				}

				hideSpinner('#unconfirm-appointment', 'Unconfirm appointment');
			})
	});

	// Reset button states when modal closes
	eventModal.on('hide.bs.modal', function() {
		enableButton('#confirm-appointment');
		enableButton('#unconfirm-appointment');
		alertReset();
	})

	calendar.render();
});