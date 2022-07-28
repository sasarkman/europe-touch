console.log('appointment.js');

// Module for credentials loading
require('dotenv').config();

var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var ObjectId = require('mongoose').Types.ObjectId;

// Load user input validator
const { body, validationResult } = require('express-validator');

// Load authentication middleware
const auth = require('../auth');

// Load Models
var AccountModel = require('../models/account-model');
var AppointmentModel = require('../models/appointment-model');

// Emailer
const nodemailer = require('nodemailer');
const emailer = nodemailer.createTransport({
	service: process.env.EMAIL_SERVICE,
	auth: {
		user: process.env.EMAIL_ADDR,
		pass: process.env.EMAIL_PASS
	}
});

// SMS
const texter = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

router.route('/viewAll').
	get(
		[
			auth.isLoggedIn
		],
		function(req, res) {
			var admin = req.session.user.admin;
			var HTML = `<< partials/appointment-viewAll >>`;
			
			if(admin) HTML = `<< partials/admin/appointment-viewAll >>`;

			return res.render('appointment-viewAll', { partial: HTML });
		}
	);

router.route('/schedule').
	get([
			auth.isLoggedIn
		],
		function(req, res) {
			return res.render('appointment-schedule', {});
		}
	);

router.route('/').
	get(
		[
			auth.isLoggedIn,
		],
		function(req, res) {
			const id = new mongoose.Types.ObjectId(req.session.user.id);

			// Final query output structure
			var project = {
				// Appointment data
					// Note: this gets consumed by fullcalendar in JSON object, not sure why
					'id': '$_id',
					'start': '$datetime',
					'confirmed': '$confirmed',
					'created': '$createdTimestamp',
				// Account data
					'account.email': 1,
					'account.name': 1,
					'account.phone': 1,
					'account.age': 1,
				// Service Data
					'service.name': 1,
					'service.duration': 1,
					'service.price': 1,
					'service.description': 1
			}

			var admin = req.session.user.admin;

			// Appointment type may come into request inside a query payload
			var type =  req.query.type;

			// Construct a different query based on user type
			if(admin) {
				// Return ALL appointments
				var query = {};

				// The 'title' field is used by fullcalendar and we want a different 
				// event title to display based on what kind of user this is, in this case title = '<name>: <service name>'
				project.title = {
					"$concat": ["$account.name", ": ", "$service.name"]
				}
			} else {
				// Just return appointments for this user
				var query = {account: id};

				project.title = {
					"$concat": ["$service.name", ": ", "$service.description"]
				}
			}

			// Define the type of appointment to retrieve
			switch(type) {
				// Query confirmed appointments
				case 'confirmed':
					query.confirmed = true;
					break;
				// Query unconfirmed appointments
				case 'unconfirmed':
					query.confirmed = false;
					break;
				default:
					break;
			}

			// Handle custom date ranges
			query.datetime = {};
			if(typeof req.query.start !== 'undefined') query.datetime['$gte'] = new Date(req.query.start);
			if(typeof req.query.end !== 'undefined') query.datetime['$lte'] = new Date(req.query.end);

			AppointmentModel.aggregate([
				{
					$match: query
				},
				// Join query with Accounts using foreign key 'account'
				{
					$lookup: {
						from: 'accounts',
						localField: 'account',
						foreignField: '_id',
						as: 'account'
					}
				},
				// Convert array to object
				{
					$unwind: '$account'
				},
				// Join query with Services using foreign key 'service'
				{
					$lookup: {
						from: 'services',
						localField: 'service',
						foreignField: '_id',
						as: 'service'
					}
				},
				// Convert array to object
				{
					$unwind: '$service'
				},
				// Define final output
				{
					$project: project
				}],
				function(err, result) {
					if(err) res.status(400).json(err)
					else return res.status(200).json(result);
				}
			);
		}
	).
	post(
		[
			auth.isLoggedIn,
			body('datetime').notEmpty().isISO8601(),
			body('service').notEmpty()
		],
		function(req, res) {
			const errors = validationResult(req);
			if(!errors.isEmpty()) {
				return res.status(422).json({ msg: 'Invalid input' });
			}

			// Get session info
			var id = new mongoose.Types.ObjectId(req.session.user.id);

			// Get body info
			var service = new mongoose.Types.ObjectId(req.body.service);
			var datetime = req.body.datetime;

			var newAppointment = new AppointmentModel({account:id, service, datetime});
			newAppointment.save(function(err, result) {
				if(err) return res.status(400).json({ msg: 'Failed to schedule appointment' })
				else return res.status(200).json({ msg: 'Appointment scheduled!' })
			});
		}
	)
	.delete(
		[
			auth.isLoggedIn,
			body('id').custom(value => {
				return ObjectId.isValid(value);
			}),
		], 
		function(req, res) {
			const errors = validationResult(req);
			if(!errors.isEmpty()) {
				return res.status(422).json({ msg: errors.array() });
			}

			// note: check that 'id' is this user's id?

			var admin = req.session.user.admin;
			var appointmentID = new mongoose.Types.ObjectId(req.body.id);

			var query = {
				_id: appointmentID
			};

			if(admin) {
				console.log(`Admin is deleting appointment ${appointmentID}`);
			} else {
				console.log(`User is deleting appointment ${appointmentID}`);
				var userID = new mongoose.Types.ObjectId(req.session.user.id);
				query.account = userID;
			}

			AppointmentModel.findOneAndDelete(query, function(err, result) {
				if(err || !result) return res.status(400).json({ msg: 'Failed to delete appointment.' })
				else {
					return res.status(200).json({ msg: 'Deleted appointment!', data: result })
				}
			});
		}
	)
;

router.route('/confirm')
	.post(
		[
			auth.isAdmin,
			body('id').custom(value => {
				return ObjectId.isValid(value);
			}),
		],
		function(req, res) {
			const errors = validationResult(req);
			if(!errors.isEmpty()) {
				return res.status(422).json({ msg: 'Invalid input' });
			}

			var id = new mongoose.Types.ObjectId(req.body.id);

			AppointmentModel.findOne(
				{
					_id: id,
					'confirmed': false
				},
				function(err, appointment) {
					if(err || !appointment) {
						return res.status(400).json({ msg: 'Failed to confirm appointment' })
					} else {
						const account = appointment.account;

						appointment.confirmed = true;
						appointment.updateOne(function(err, result) {
							if(err) {
								return res.status(400).json({ msg: 'Failed to confirm appointment' })
							} else {
								const datetime = new Date(appointment.datetime).toLocaleString('en-US');

								// Perform notification operations asynchronously
								AccountModel.findOne({ _id: account }, function(err, account) {
									if(err || !account) console.log(err);
									else {
										const body = `Hi ${account.name},\nYour appointment at ${datetime} has been confirmed!\n- Europe Touch Massage`

										const mailOptions = {
											from: process.env.EMAIL_FROM,
											to: account.email,
											subject: 'Appointment confirmation',
											text: body
										};
									
										// Send e-mail notification
										emailer.sendMail(mailOptions, function (error, info) {
											if (error) {
												console.log(error);
											} else {
												console.log('Email sent: ' + info.response);
											}
										});

										// Send SMS text
										texter.messages
										.create({
											to: account.phone,
											from: process.env.TWILIO_NUMBER,
											body: body
										})
										.then(message => console.log(message.sid));
									}
								})
								return res.status(200).json({ msg: 'Confirmed appointment!'})
							}
						})
					}
				}
			);
		}
	);

router.route('/unconfirm')
	.post(
		[
			auth.isAdmin,
			body('id').custom(value => {
				return ObjectId.isValid(value);
			}),
		],
		function(req, res) {
			const errors = validationResult(req);
			if(!errors.isEmpty()) {
				return res.status(422).json({ errors: errors.array() });
			}

			var id = new mongoose.Types.ObjectId(req.body.id);
			AppointmentModel.updateOne(
				{
					_id: id,
					'confirmed': true
				},
				{
					'confirmed': false
				},
				function(err, result) {
					if(err || !result || result.modifiedCount != 1) {
						return res.status(400).json({ msg: 'Failed to unconfirm appointment' })
					}
					else {
						return res.status(200).json({ msg: 'Unconfirmed appointment!'})
					}
				}
			);
			
		}
	);

router.route('/cancel')
	.post(
		[
			auth.isLoggedIn,
			body('id').custom(value => {
				return ObjectId.isValid(value);
			}),
		], 
		function(req, res) {
			const errors = validationResult(req);
			if(!errors.isEmpty()) {
				return res.status(422).json({ msg: errors.array() });
			}
			var appointmentID = new mongoose.Types.ObjectId(req.body.id);

			var query = {
				_id: appointmentID,
				account: req.session.user.id
			};

			AppointmentModel.findOneAndDelete(query, function(err, result) {
				if(err || !result) return res.status(400).json({ msg: 'Failed to cancel appointment.' })
				else {
					// If cancelled appointment was confirmed, need to notify admin
					if(result.confirmed) {
						const accountID = result.account;

						// Query database for account with this email
						AccountModel.findOne({'_id': accountID}, function(err, account) {
							if(err || !account) res.send(err);
							else {
								// Send notifications to admins
								AccountModel.find({ admin: true, notifications: true }, {'phone': 1}, function(err, docs) {
									var emails = [];
									docs.forEach(async function(doc) {
										emails.push(doc.email);

										// Send SMS text
										await texter.messages.create({
											to: doc.phone,
											from: process.env.TWILIO_NUMBER,
											body: `${account.name} has cancelled their appointment at ${result.datetime}. Their phone number is ${account.phone}. - Europe Touch Massage`
										})
										.then(message => console.log(`${message.sid}: ${message.status}`));
									});

									// Define email notification
									const mailOptions = {
										from: process.env.EMAIL_FROM,
										to: emails.join(','),
										// bcc: emails.join(','),
										subject: `Appointment cancelled: ${account.name}`,
										text: `
											${account.name} (${account.email}) has cancelled their appointment for ${result.datetime}
										`
									};
								
									// Send email notification
									emailer.sendMail(mailOptions, function (error, info) {
										if (error) {
											console.log(error);
										} else {
											console.log('Email sent: ' + info.response);
										}
									});
								});
							}
						});
					}
					return res.status(200).json({ msg: 'Cancelled appointment!', data: result })
				}
			});
		}
	)
;

router.route('/reject')
	.post(
		[
			auth.isLoggedIn,
			body('id').custom(value => {
				return ObjectId.isValid(value);
			}),
		], 
		function(req, res) {
			const errors = validationResult(req);
			if(!errors.isEmpty()) {
				return res.status(422).json({ msg: errors.array() });
			}
			var appointmentID = new mongoose.Types.ObjectId(req.body.id);
			
			// Rejection reason (optional)
			var reason = req.body.reason;

			var query = {
				_id: appointmentID,
			};

			AppointmentModel.findOneAndDelete(query, function(err, result) {
				if(err || !result) return res.status(400).json({ msg: 'Failed to reject appointment.' })
				else {
					const datetime = new Date(result.datetime).toLocaleString('en-US');
					const rejectionReason = (reason) ? ` Rejection reason: ${reason}.` : '';
					const body = `Hello ${result.name}, your appointment at Europe Touch Massage for ${datetime} has been rejected.${rejectionReason}`;

					texter.messages.create({
						to: result.phone,
						from: process.env.TWILIO_NUMBER,
						body: body
					})
					.then(message => console.log(`${message.sid}: ${message.status}`));

					// Define email notification
					const mailOptions = {
						from: process.env.EMAIL_FROM,
						to: result.email,
						subject: `Appointment rejected: ${result.name}`,
						text: body
					};
				
					// Send email notification
					emailer.sendMail(mailOptions, function (error, info) {
						if (error) {
							console.log(error);
						} else {
							console.log('Email sent: ' + info.response);
						}
					});

					return res.status(200).json({ msg: 'Rejected appointment!', data: result })
				}
			});
		}
	)
;

module.exports = router;