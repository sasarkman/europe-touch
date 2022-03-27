$(function () {
	const emailField = $('#email');
	const nameField = $('#name');
	const ageField = $('#age');
	const notificationsSelector = $('#notifications');

	// Initialize popover
	$('[data-bs-toggle="popover"]').popover();

	// Can't use jQuery here
	const phoneInputField = document.querySelector('#phone');
	const iti = window.intlTelInput(phoneInputField, {
		utilsScript: '/intl-tel-utils.js',
	});

	// Add phone validator
	$.validator.addMethod('phone_number', function() {
        return iti.isValidNumber();
    });

	var validator = $('#main-form').validate({
		rules: {
			name: {
				required: true
			},
			phone: {
				phone_number: true,
				required: true
			},
			age: {
				number: true,
				required: true
			},
			notifications: {
				required: true
			}
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

	$('#save_button').on('click', function() {
		// reset alert if need be
		alertReset();

		// exit if input isn't valid
		if(!validator.form()) return;

		// show spinner
		showSpinner('#save_button', 'Saving changes...');

		var password = $('#password').val();
		var name = $('#name').val();
		var phone = iti.getNumber();
		var age = $('#age').val();
		var notifications = $('#notifications').prop('checked');

		const settings = {
			method: 'PUT',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				'password': password,
				'name': name,
				'phone': phone,
				'age': age,
				'notifications': notifications
			})
		}

		var statusCode = '';
		var statusText = '';
		new API().request('/account/', settings)
			.then(response => {
				statusCode = response.status;
				statusText = response.msg;

				switch(statusCode) {
					case 200:
						alertShow(statusText, 'alert-success');
						break;
					default:
						alertShow(statusText, 'alert-danger');
						break
				}
				hideSpinner('#save_button', 'Save changes');
			})
	});

	var statusCode = '';
	var statusText = '';
	var data = {};
	new API().request('/account/', { method: 'GET' })
		.then(response => {
			statusCode = response.status;
			statusText = response.msg;
			data = response.data;

			console.log(data);

			switch(statusCode) {
				case 200:
					emailField.val(data.email);
					nameField.val(data.name);
					iti.setNumber(data.phone || '');
					ageField.val(data.age);
					notificationsSelector.prop('checked', data.notifications);

					break;
				default:
					alertShow(statusText, 'alert-danger');
					hideSpinner('#save_button', 'Save changes');
					break
			}
	})
});