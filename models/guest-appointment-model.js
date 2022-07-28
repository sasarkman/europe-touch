var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var SALT_WORK_FACTOR = 10;
var Schema = mongoose.Schema;

var GuestAppointmentSchema = new mongoose.Schema({
	// Account section
	email: {
		type: String, 
		required: true, 
	},
	phone: {
		type: String,
		required: true
	},
	name: {
		type: String,
		required: true,
	},
	age: {
		type: Number,
		required: true
	},
	// Service
	service: {
		type: mongoose.SchemaTypes.ObjectId,
		required: true,
		ref: 'services'
	},
	datetime: {
		type: Date,
		required: true,
	},
	createdTimestamp: {
		type: Date,
		default: Date.now
	},
	confirmed: {
		type: Boolean,
		default: false
	}
});

module.exports = mongoose.model('guest_appointments', GuestAppointmentSchema);

