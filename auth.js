module.exports.isLoggedIn = function(req, res, next) {
	console.log("isLoggedIn middleware");
	if(req.session) {
		if(req.session.user) {
			return next();
		}
	}
	return res.redirect('/account/login');
}

module.exports.isNotLoggedIn = function(req, res, next) {
	console.log("isNotLoggedIn middleware");
	if(req.session) {
		if(req.session.user) {
			return res.redirect('/account/');
		}
	}
	return next();
}

module.exports.isAdmin = function(req, res, next) {
	console.log("isAdmin middleware");
	if(req.session) {
		if(req.session.user) {
			if(req.session.user.admin) {
				return next();
			}
		}
	} 
	return res.redirect('/account/login');
}