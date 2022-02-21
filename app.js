// Load HTTP module
const express = require('express');
const bodyParser = require('body-parser');

// HTTPS
const https = require('https');

// Initialize express
const app = express();
//app.use(express.urlencoded({extended:true}));

app.use(bodyParser.urlencoded({
	extended: true
 }));
app.use(bodyParser.json());

// Module for credentials loading
require('dotenv').config();

// Load path module for filepaths
const path = require('path');

// File system module
const fs = require('fs');

// Cookie module
const session = require('express-session');

// Filestore for cookies
const session_store = require('session-file-store')(session);

app.use(session({
	name:'session_id',
	secret: process.env.SESSION_SECRET,
	saveUninitialized: false,
	resave: false,
	cookie: {
		expires: new Date(Date.now() + (1000 * 60 * 60 * 5)), // 5 hours
		// secure: true // https only
	},
	store: new session_store()
}));

// Initialize and load router middleware
const router = express.Router();
app.use(router);

// Load routes
const accountRouter = require('./routes/account');
const serviceRouter = require('./routes/service');
const appointmentRouter = require('./routes/appointment');

// Load logging module
const logger = require('morgan');

// For log files
const rfs = require('rotating-file-stream');
const accessLogStream = rfs.createStream('access.log', {
	interval: '1d',
	path: path.join(__dirname, 'logs')
})
const errorLogStream = rfs.createStream('error.log', {
	interval: '1d',
	path: path.join(__dirname, 'logs')
})

// Load object relational model module
const mongoose = require('mongoose');

// Load template engine package
const sprightly = require('sprightly');

// Load authorization module
// const auth = require('jsonwebtoken');
const isLoggedIn = require('./auth').isLoggedIn;

// Load user input validator
const { check, validationResult } = require('express-validator');

// Load password hashing module
const bcrypt = require('bcrypt');

// Define custom logging tokens
logger.token('timestamp', function(req, res) { return timestamp });
logger.token('request-body', (req, res) => {return req.body});
logger.token('request-params', (req, res) => {return req.params});
logger.token('request-query', (req, res) => {return req.query});

// Initialize logging settings
var loggingSettings = function(tokens, req, res) {
	// Log email if known
	var email = '';
	if(req.session) {
		if(req.session.user) {
		email = `(${req.session.user.name}: ${req.session.user.email})`;
		}
	}

	// Timestamp
	var today = new Date();
	const timestamp = '[' + (today.getMonth()+1) + '/' + today.getDate() + '/' + today.getFullYear().toString().slice(2,4) + ' ' + today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds() + ']';

	var output = `${timestamp} ${tokens['remote-addr'](req,res)} ${email}: ${tokens.method(req,res)} ${tokens.url(req,res)} ${tokens.status(req,res)} - ${tokens['response-time'](req,res)}ms`;

	const body = tokens['request-body'](req,res) || {};
	const params = tokens['request-params'](req,res) || {};
	const query = tokens['request-query'](req,res) || {};

	// Body if exists
	if(Object.keys(body).length != 0) output = output.concat('\nbody: ' + JSON.stringify(body, null, '\t'));

	// Query if exists
	if(Object.keys(params).length != 0) output = output.concat('\nparams: ' + JSON.stringify(params, null, '\t'));

	// Params if exists
	if(Object.keys(query).length != 0) output = output.concat('\nquery: ' + JSON.stringify(query, null, '\t'));

	return output;
};

// Skip requests that aren't for the homepage
const skipSuccess = (req, res) => res.statusCode < 400;
const skipError = (req, res) => res.statusCode >= 400;

// Console logging
app.use(logger(loggingSettings, { 
	stream: process.stdout,
}));

// Access logging
app.use(logger(loggingSettings, { 
	stream: accessLogStream,
	skip: skipError
}));

// Error logging
app.use(logger(loggingSettings, { 
	stream: errorLogStream,
	skip: skipSuccess
}));

// Initialize routes
app.use('/account', accountRouter);
app.use('/service', serviceRouter);
app.use('/appointment', appointmentRouter);

// Define and initialize templating engine
app.engine('spy', sprightly);
app.set('view engine', 'spy');
app.set('views', path.join(__dirname, 'views'));

// Expose directories
app.use('/controllers', express.static(path.join(__dirname, 'controllers')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use('/img', express.static(path.join(__dirname, 'img')));

// Expose modules
app.use('/jquery.js', express.static(path.join(__dirname, 'node_modules/jquery/dist/jquery.js')));
app.use('/jquery-ui.js', express.static(path.join(__dirname, 'node_modules/jquery-ui-dist/jquery-ui.js')));
app.use('/jquery-validation.js', express.static(path.join(__dirname, 'node_modules/jquery-validation/dist/jquery.validate.js')));

app.use('/bootstrap.js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js/bootstrap.bundle.js')));
app.use('/bootstrap.css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css/bootstrap.min.css')));

app.use('/font-awesome.css', express.static(path.join(__dirname, 'node_modules/font-awesome/css/font-awesome.css')));

app.use('/fullcalendar.js', express.static(path.join(__dirname, 'node_modules/fullcalendar/main.js')));
app.use('/fullcalendar.css', express.static(path.join(__dirname, 'node_modules/fullcalendar/main.css')));

app.use('/intl-tel-input.js', express.static(path.join(__dirname, 'node_modules/intl-tel-input/build/js/intlTelInput.min.js')));
app.use('/img/flags.png', express.static(path.join(__dirname, 'node_modules/intl-tel-input/build/img/flags.png')));
app.use('/intl-tel-input.css', express.static(path.join(__dirname, 'node_modules/intl-tel-input/build/css/intlTelInput.min.css')));

app.use('/datetimepicker.js', express.static(path.join(__dirname, 'node_modules/jquery-datetimepicker/build/jquery.datetimepicker.full.min.js')));
app.use('/datetimepicker.css', express.static(path.join(__dirname, 'node_modules/jquery-datetimepicker/build/jquery.datetimepicker.min.css')));

// Expose pages
// app.use('/viewAppointments', express.static(path.join(__dirname, 'views/appointment-viewAll.spy')));
// app.use('/manageServices', express.static(path.join(__dirname, 'views/service-manage.spy')));

// Mongodb connection string
const mongo_url = process.env.MONGODB_URL;

// Express IP and port info
app.set('port', process.env.PORT);
app.set('ip', process.env.IP);

mongoose.connect(mongo_url, { useNewUrlParser:true, useUnifiedTopology:true }, (err) => {
	if (err) {
		console.log(err);
		console.log("Could not connect to database, exiting...");
		process.exit(0);
	}
	console.log("Connected to database: " + mongo_url);
});

app.get('/', isLoggedIn, function(req, res) {
	return res.redirect('/account');
});

module.exports = app;

app.listen(app.get('port'), app.get('ip'), function() {
	console.log(`Example app listening on port ${app.get('ip')}:${app.get('port')}`);
});

// https
// 	.createServer(
// 		{
// 		key: fs.readFileSync("server.key"),
// 		cert: fs.readFileSync("server.cert"),
// 		},
// 		app
// 	).
// 	listen(app.get('port'), app.get('ip'), function () {
// 		console.log(`Example app listening on port ${app.get('ip')}:${app.get('port')}`);
// 	});