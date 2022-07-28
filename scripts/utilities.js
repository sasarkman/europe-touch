function showButton(element) {
	$(element).removeClass('d-none');
}

function hideButton(element) {
	$(element).addClass('d-none');
}

function enableButton(element) {
	$(element).prop('disabled', false);
}

function disableButton(element) {
	$(element).prop('disabled', true);
}

function showSpinner(element, text) {
	var spinner = `<span class="spinner-border spinner-border-sm" role="status"></span>${text}`;
	$(element).html(spinner);
	$(element).prop('disabled', true);
}

function hideSpinner(element, text) {
	$(element).html(text);
	$(element).prop('disabled', false);
}

function alertShow(text, css, id='#alert') {
	var alert = $(id);

	// set classes
	alert.attr('class', `alert ${css}`);

	// set text
	alert.html(text);
}

function alertReset(id='#alert') {
	var alert = $(id);

	// set classes
	alert.attr('class', 'alert d-none');

	// set text
	alert.html('');
}