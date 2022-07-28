$(function () {
	var eventModal = $('#eventModal');

	var appointmentID = '';
	var appointment = null;
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
			appointment = event.event.extendedProps;
			appointmentID = appointment._id;

			var startTime = new Date(event.event.start).toLocaleTimeString('en-US');
			var createdDate = new Date(appointment.created).toLocaleString('en-US');
			var status = appointment.confirmed ? 'confirmed' : 'not confirmed';
			var statusColor = appointment.confirmed ? 'text-success' : 'text-danger';

			const name = (appointment.guest) ? appointment.name : appointment.account.name;
			const email = (appointment.guest) ? appointment.email : appointment.account.email;
			const phone = (appointment.guest) ? appointment.phone : appointment.account.phone;
			const age = (appointment.age) ? appointment.age : appointment.account.age;

			eventModal.find('#title').html(`${name}'s appointment` + ((appointment.guest) ? ' (manual)' : ''));

			// Customer fields
			eventModal.find('#age').html(age);
			eventModal.find('#phone').html(phone);
			eventModal.find('#email').html(email);

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

			if(appointment.confirmed) {
				showButton('#unconfirm_appointment')
				hideButton('#confirm_appointment')
			} else {
				showButton('#confirm_appointment');
				hideButton('#unconfirm_appointment')
			}

			if(appointment.guest) hideButton('#reject_appointment');
			else showButton('#reject_appointment');

			// Display the modal
			eventModal.modal('show');
		},
		eventSources: [
			{
				url: '/appointment/',
				extraParams: {
					'type': 'confirmed'
				},
				color: 'green',
			},
			{
				url: '/appointment/',
				extraParams: {
					'type': 'unconfirmed'
				},
				color: 'red',
			},
			{
				url: '/guest-appointment/',
				extraParams: {
					'type': 'confirmed'
				},
				color: 'green',
			},
			{
				url: '/guest-appointment/',
				extraParams: {
					'type': 'unconfirmed'
				},
				color: 'red',
			},
		],
		eventsSet: function() {
			// console.log(this.getEvents());
		},
		eventDidMount: function(info) {
			// Differentiate appointments made by admin and those made by user accounts
			var isGuest = (calendar.getEventById(info.event.id).extendedProps.account) ? false: true;
			calendar.getEventById(info.event.id).setExtendedProp('guest', isGuest);
		}
	});

	$('#confirm_appointment').on('click', function() {
		alertReset();
		showSpinner('#confirm_appointment', 'Confirming...');
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

		const url = (appointment.guest) ? '/guest-appointment/confirm' : '/appointment/confirm';

		new API().request(url, settings).then(response => {
			statusCode = response.status;
			statusText = response.msg;

			switch(statusCode) {
				case 200:
					calendar.getEventById(appointmentID).setProp('color', 'green');
					calendar.getEventById(appointmentID).setExtendedProp('confirmed', true);

					eventModal.find('#status').html('confirmed');
					eventModal.find('#status').attr('class', 'text-success');

					alertShow(statusText, 'alert-success');
					hideButton('#confirm_appointment');
					showButton('#unconfirm_appointment');
					break;
				default:
					alertShow(statusText, 'alert-danger');
					break
			}

			hideSpinner('#confirm_appointment', 'Confirm');
		})
	});

	$('#unconfirm_appointment').on('click', function() {
		alertReset();
		showSpinner('#unconfirm_appointment', 'Unconfirming...');
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

		const url = (appointment.guest) ? '/guest-appointment/unconfirm' : '/appointment/unconfirm';

		new API().request(url, settings)
			.then(response => {
				statusCode = response.status;
				statusText = response.msg;

				switch(statusCode) {
					case 200:
						calendar.getEventById(appointmentID).setProp('color', 'red');
						calendar.getEventById(appointmentID).setExtendedProp('confirmed', false);

						eventModal.find('#status').html('not confirmed');
						eventModal.find('#status').attr('class', 'text-danger');

						alertShow(statusText, 'alert-success');
						hideButton('#unconfirm_appointment');
						showButton('#confirm_appointment');
						break;
					default:
						alertShow(statusText, 'alert-danger');
						break
				}

				hideSpinner('#unconfirm_appointment', 'Unconfirm');
			})
	});

	// Delete appointment button
	$('#delete_appointment').on('click', function() {
		const modal = new Promise(function(resolve, reject){
			$('#confirm_delete_modal').modal('show');
			$('#confirm_delete_modal .btn-danger').on('click', function () {
				resolve("user clicked yes");
			});
			$('#confirm_delete_modal .btn-secondary').on('click', function () {
				reject("user clicked cancel");
			});
		}).then(function (val) {
			showSpinner('#confirm_delete', 'Deleting...');
			const settings = {
				method: 'DELETE',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					id: appointmentID,
				})
			}

			const url = (appointment.guest) ? '/guest-appointment/' : '/appointment/';

			new API().request(url, settings).then(response => {
				statusCode = response.status;
				statusText = response.msg;

				switch(statusCode) {
					case 200:
						// remove event from calendar
						calendar.getEventById(appointmentID).remove();
						$('#confirm_delete_modal').modal('toggle');
						break;
					default:
						alertShow(statusText, 'alert-danger', '#delete_alert');
						break
				}

				hideSpinner('#confirm_delete', 'Yes');
			})
		}).catch(function (err) {
			$('#confirm_delete_modal').modal('toggle');
			$("#eventModal").modal('toggle');
			// console.log(err)
		});
	});

	// Reject appointment button
	$('#reject_appointment').on('click', function() {
		const modal = new Promise(function(resolve, reject){
			$('#confirm_reject_modal').modal('show');
			$('#confirm_reject_modal .btn-danger').on('click', function () {
				resolve("user clicked reject");
			});
			$('#confirm_reject_modal .btn-ok').on('click', function () {
				reject("user clicked cancel");
			});
		}).then(function (val) {
			showSpinner('#confirm_reject', 'Rejecting...');
			const settings = {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					id: appointmentID,
					reason: $('#reason').val() || undefined
				})
			}

			const url = (appointment.guest) ? '/guest-appointment/reject' : '/appointment/reject';

			new API().request(url, settings).then(response => {
				statusCode = response.status;
				statusText = response.msg;

				switch(statusCode) {
					case 200:
						// remove event from calendar
						calendar.getEventById(appointmentID).remove();
						$('#confirm_reject_modal').modal('toggle');
						break;
					default:
						alertShow(statusText, 'alert-danger', '#reject_alert');
						break
				}

				hideSpinner('#confirm_reject', 'Yes');
			})

		}).catch(function (err) {
			$('#confirm_reject_modal').modal('toggle');
			$("#eventModal").modal('toggle');
			// console.log(err)
		});
	});

	// Reset button states when modal closes
	eventModal.on('hide.bs.modal', function() {
		enableButton('#confirm_appointment');
		enableButton('#unconfirm_appointment');
		alertReset('#delete_alert');
		alertReset('#reject_alert');
		alertReset();
	})

	calendar.render();
});