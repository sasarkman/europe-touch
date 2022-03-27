console.log("service.js");

var express = require('express');
var router = express.Router();

const path = require('path');

var mongoose = require('mongoose');
var ObjectId = require('mongoose').Types.ObjectId;

// Load user input validator
const { body, validationResult } = require('express-validator');

// Load authentication middleware
const auth = require('../auth');

// Load Models
var AccountModel = require('../models/account-model');
var ServiceModel = require('../models/service-model');

router.route('/').
	get(
		[
			auth.isLoggedIn
		],
		function(req, res) {
			var query = {};
			var settings = '_id name'; // return only id and name for mass query

			// Was a service ID passed in?
			if(req.query.id) {
				// Is it a valid mongoose ObjectID?
				if(ObjectId.isValid(req.query.id)) {
					const id = new mongoose.Types.ObjectId(req.query.id);
					query = { _id: id };
					settings = { '_id': false}; // return everything but id for single query
				}
			}

			ServiceModel.find(query, settings).sort({'name': 1}).exec(function(err, result) {
				if(err || !result) return res.status(400).json({ msg: `Failed to retrieve services.`});
				else return res.status(200).json({ msg: 'Successfully retrieved services', data: result});
			});
		}
	).
	post(
		[
			auth.isAdmin,
			body(['name', 'duration', 'price']).notEmpty().isString(),
			body('description').optional().isString()
		], function(req, res) {
			const errors = validationResult(req);
			if(!errors.isEmpty()) {
				return res.status(422).json({ msg: 'Invalid input' });
			}

			var name = req.body.name;
			var duration = req.body.duration;
			var price = req.body.price;
			var description = req.body.description;

			var params = {name, duration, price, description};

			var new_service = new ServiceModel(params);
			new_service.save(function(err, result) {
				if(err) {
					if(err.code === 11000) {
						res.status(400).json({ msg: 'This service already exists.'});
					} else {
						res.status(400).json({ msg: 'Bad request'});
					}
				} else {
					return res.status(200).json({ msg: `Service created!` });
				}
			});
		}
	).
	put(
		[
			auth.isAdmin,
			body('id').custom(value => {
				return ObjectId.isValid(value);
			}),
			body(['name', 'duration', 'price', 'description']).notEmpty(),
		],
		function(req, res) {
			const errors = validationResult(req);
			if(!errors.isEmpty()) {
				return res.status(422).json({ msg: 'Invalid input' });
			}

			const id = new mongoose.Types.ObjectId(req.body.id);
			const name = req.body.name;
			const duration = req.body.duration;
			const price = req.body.price;
			const description = req.body.description;

			const query = {
				name: name,
				duration: duration,
				price: price,
				description: description,
			}

			ServiceModel.findByIdAndUpdate(id, query, {new:true}, function (err, result) {
				if(err || !result) return res.status(400).json({ msg: 'Failed to save changes.'});
				else return res.status(200).json({ msg: 'Changes saved!'});
			})
		}
	).
	delete(
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

			const id = new mongoose.Types.ObjectId(req.body.id);
			const query = {
				_id: id,
			}

			ServiceModel.findByIdAndRemove(query, function(err, result) {
				if(err || !result) return res.status(400).json({ msg: `Failed to delete service.`});
				else return res.status(200).json({ msg: `Service deleted: ${result.name}`});
			});
		}
	)
;

router.route('/manage').
	get(
		[
			auth.isAdmin
		],
		function(req, res) {
			res.render('admin/service-manage', {});
		}
	)
;

router.route('/create').
	get(
		[
			auth.isAdmin
		],
		function(req, res) {
			res.render('service-create', {});
		}
	)
;

module.exports = router;