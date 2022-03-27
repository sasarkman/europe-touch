$(function () {
	// Bind enter key to trigger login attempt
	$(document).on( "keydown", function(e){
		if (e.key == "Enter"){
			$("#login_button").trigger('click');
		}
	});

	var validator = $('#main-form').validate({
		rules: {
			email: {
				email: true,
				required: true
			},
			password: {
				required: true
			}
		},
		messages: {
			email: 'Please enter an e-mail address',
			password: 'Please enter a password'
		},
		errorElement: 'div',
		errorPlacement: function ( error, element ) {
			// Add the `help-block` class to the error element
			error.addClass( "invalid-feedback" );

			error.insertAfter( element );
		}
	});

	$('#login_button').on('click', function() {
		console.log('clicked');

		// reset alert if need be
		alertReset();

		// exit if input isn't valid
		if(!validator.form()) return;

		// show spinner
		showSpinner('#login_button', 'Logging in...');

		var email = $('#email').val();
		var password = $('#password').val();

		const settings = {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				'email': email,
				'password': password,
			})
		}

		var statusCode = '';
		var statusText = '';
		new API().request('/account/login', settings).then(response => {
			statusCode = response.status;
			statusText = response.msg;

			switch(statusCode) {
				case 200:
					window.location.replace('/account/index');
					break;
				default:
					alertShow(statusText, 'alert-danger');
					hideSpinner('#login_button', 'Login');
					break
			}
		})
	});
});