$(function () {
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

	var validator = $('#main-form').validate({
		rules: {
			email: {
				email: true,
				required: true
			},
			password: {
				required: true
			},
			password2: {
				equalTo: '#password',
				required: true
			},
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
			}
		},
		messages: {
			email: 'Please enter an e-mail address',
			password: 'Please enter a password',
			password2: 'Please enter a matching password',
			name: 'Please enter your full name',
			phone: 'Please enter a phone number',
			age: 'Please enter your age'
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

	$('#create_button').on('click', function() {
		// reset alert if need be
		alertReset();

		// exit if input isn't valid
		if(!validator.form()) return;

		// show spinner
		showSpinner('#create_button', 'Creating...');

		var email = $('#email').val();
		var password = $('#password').val();
		var name = $('#name').val();
		var phone = iti.getNumber();
		var age = $('#age').val();

		const settings = {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				'email': email,
				'password': password,
				'name': name,
				'phone': phone,
				'age': age
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
						$('#main-form').hide();
						alertShow(statusText, 'alert-success');
						break;
					default:
						alertShow(statusText, 'alert-danger');
						hideSpinner('#create_button', 'Create account');
						break
				}
			});
	});
});