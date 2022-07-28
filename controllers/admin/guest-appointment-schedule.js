$(function() {
	// Initialize popover
	$('[data-bs-toggle="popover"]').popover();

	// Can't use jQuery here
	const phoneInputField = document.querySelector("#phone");
	const iti = window.intlTelInput(phoneInputField, {
		utilsScript: '/intl-tel-utils.js'
	});

	// Add phone validator
	$.validator.addMethod('phone_number', function() {
        return iti.isValidNumber();
    });

	// Service fields
	const durationField = $('#duration');
	const priceField = $('#price');
	const descriptionField = $('#description');
	const servicesSelector = $('#services');

	var validator = $('#main-form').validate({
		rules: {
			name: {
				required: true
			},
			email: {
				email: true,
				required: true
			},
			phone: {
				phone_number: true,
				required: true
			},
			age: {
				required: true
			},
			datetime: {
				required: true
			},
			datetime: {
				date: true,
				required: true
			},
		},
		messages: {
			email: 'Please enter the customer\'s e-mail address',
			name: 'Please enter the customer\'s name',
			phone: 'Please enter the customer\'s phone number',
			age: 'Please enter the customer\'s age',
			datetime: 'Please select a date and time',
		},
		errorElement: 'div',
		errorPlacement: function ( error, element ) {
			// Add the `help-block` class to the error element
			error.addClass( "invalid-feedback" );
			// If element has popover, insert after its parent
			if(element.parent('.input-group').length > 0 ) {
				error.insertAfter( element.parent(".input-group"));
			} else if(element.parent('.iti').length > 0) {
				error.insertAfter( element.parent(".iti"));
			} else {
				error.insertAfter( element );
			}
		}
	});

	$("#datetime").datetimepicker({
		inline:true,
		format:'Y-m-d',
		formatTime: 'h:i A', // hour: minute AM/PM
		minDate:'0',// 0 = today
		minTime:'9:00', // 9AM
		maxTime:'15:00', // 3PM
		defaultTime: '09:00',
		disabledWeekDays: [0, 4, 5, 6],
		step: 30
	});

	$('#services').on('change', (e) => {
		alertReset();
		validator.resetForm();
		$('.collapse').collapse('hide');

		var serviceID = e.target.value;

		const settings = {
			method: 'GET',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			},
		}

		var statusCode = '';
		var statusText = '';
		
		new API().request(`/service/?id=${serviceID}`, settings).then(response => {
			statusCode = response.status;
			statusText = response.msg;

			switch(statusCode) {
				case 200:
					// not ideal, but need delay here
					setTimeout(function() {
						$('.collapse').collapse('show');
					}, 500);

					const service = response.data[0];
					durationField.html(service.duration);
					priceField.val(service.price);
					descriptionField.html(service.description);
					break;
				default:
					alertShow(statusText, 'alert-danger');
					break
			}
		});
	})

	$('#schedule_button').on('click', function() {
		// reset alert if need be
		alertReset();

		// exit if input isn't valid
		if(!validator.form()) return;

		// show spinner
		showSpinner('#create_button', 'Creating...');

		var name = $('#name').val();
		var email = $('#email').val();
		var phone = iti.getNumber();
		var age = $('#age').val();
		var service = $('#services').val();
		var dateTime = $('#datetime').datetimepicker('getValue');
		var isoDateTime = new Date(dateTime).toISOString();

		const settings = {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				'name': name,
				'email': email,
				'phone': phone,
				'age': age,
				'service': service,
				'datetime': isoDateTime,
			})
		}

		var statusCode = '';
		var statusText = '';
		new API().request('/guest-appointment/', settings).
			then(response => {
				statusCode = response.status;
				statusText = response.msg;

				switch(statusCode) {
					case 200:
						statusText = `${statusText}`;
						alertShow(statusText, 'alert-success');
						break;
					default:
						alertShow(statusText, 'alert-danger');
						hideSpinner('#schedule_button', 'Schedule');
						break
				}
			})
	})

	const settings = {
		method: 'GET',
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
		},
	}

	var statusCode = '';
	var statusText = '';
	new API().request('/service/', settings).then(response => {
		statusCode = response.status;
		statusText = response.msg;

		switch(statusCode) {
			case 200:
				response.data.forEach(service => {
					const option = document.createElement('option');
					option.value = service._id;
					option.innerHTML = service.name;
					servicesSelector.append(option);
				});
				servicesSelector.trigger('change');
				break;
			default:
				alertShow(statusText, 'alert-danger');
				break
		}
	});
});