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
var GuestAppointmentModel = require('../models/guest-appointment-model');

router.route('/schedule').
	get([
			auth.isLoggedIn
		],
		function(req, res) {
			return res.render('admin/guest-appointment-schedule', {});
		}
	);

router.route('/').
	get(
		[
			auth.isAdmin,
		],
		function(req, res) {
			// Final query output structure
			var project = {
				// Appointment data
					// Note: this gets consumed by fullcalendar in JSON object, not sure why
					'id': '$_id',
					'email': 1,
					'phone': 1,
					'name': 1,
					'age': 1,
					'start': '$datetime',
					'created': '$createdTimestamp',
					'confirmed': 1,
				// Service Data
					'service.name': 1,
					'service.duration': 1,
					'service.price': 1,
					'service.description': 1
			}


			// Appointment type may come into request inside a query payload
			var type =  req.query.type;

			// Return ALL guest appointments
			var query = {};

			// The 'title' field is used by fullcalendar and we want a different 
			// event title to display based on what kind of user this is, in this case title = '<name>: <service name>'
			project.title = {
				"$concat": ["$name", ": ", "$service.name"]
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

			GuestAppointmentModel.aggregate([
				{
					$match: query
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
			body('service').custom(value => {
				return ObjectId.isValid(value);
			}),
			body('email').isEmail(),
			body(['phone', 'name', 'age']).notEmpty()
		],
		function(req, res) {
			const errors = validationResult(req);
			if(!errors.isEmpty()) {
				return res.status(422).json({ msg: 'Invalid input' });
			}

			// Get body info
			var query = {
				'email': req.body.email,
				'phone': req.body.phone,
				'name': req.body.name,
				'age': req.body.age,
				'service': new mongoose.Types.ObjectId(req.body.service),
				'datetime': req.body.datetime,
				'confirmed': true
			}

			var newAppointment = new GuestAppointmentModel(query);
			newAppointment.save(function(err) {
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

			GuestAppointmentModel.findOneAndDelete(query, function(err, result) {
				if(err || !result) return res.status(400).json({ msg: 'Failed to cancel appointment.' })
				else {
					return res.status(200).json({ msg: 'Cancelled appointment!', data: result })
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
			GuestAppointmentModel.updateOne(
				{
					_id: id,
					'confirmed': false
				},
				{
					'confirmed': true
				},
				function(err, result) {
					if(err || !result || result.modifiedCount != 1) {
						return res.status(400).json({ msg: 'Failed to confirm appointment' })
					}
					else {
						return res.status(200).json({ msg: 'Confirmed appointment!'})
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
			GuestAppointmentModel.updateOne(
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

module.exports = router;