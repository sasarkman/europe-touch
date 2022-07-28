var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var SALT_WORK_FACTOR = 10;
var Schema = mongoose.Schema;

// Module for credentials loading
require('dotenv').config();

// SMS
const texter = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

var AccountModel = require('../models/account-model');

var AppointmentSchema = new mongoose.Schema({
	account: { 
		type: mongoose.SchemaTypes.ObjectId, 
		required: true,
		ref: 'accounts'
	},
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

AppointmentSchema.post('save', function(next) {
	const datetime = new Date(this.datetime).toLocaleString('en-US');

		// Find person that created this appointment
		AccountModel.findById(this.account, {'name': 1}, function(err, doc) {
			if(err || !doc) next();
			else {
				const name = doc.name;

				// Send SMS notification to admins
				AccountModel.find({ admin: true, notifications: true }, {'phone': 1}, function(err, docs) {
					docs.forEach(async function(doc) {
						// Send SMS text
						await texter.messages.create({
							// to: doc.phone,
							to: '+12085854971',
							from: process.env.TWILIO_NUMBER,
							body: `${name} has created an appointment for ${datetime}. Their phone number is ${doc.phone}. - Europe Touch Massage`
						})
						.then(message => console.log(`${message.sid}: ${message.status}`));
					});
				});
			}
		});
});

module.exports = mongoose.model('appointments', AppointmentSchema);

