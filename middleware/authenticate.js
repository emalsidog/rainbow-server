// Dependencies
const jwt = require("jsonwebtoken");

// Model
const User = require("../models/User");

// Utils
const ErrorResponse = require("../utils/error-response");

const authenticate = async (req, res, next) => {
	const accessToken = req.cookies.accessToken;
	
	if (!accessToken) {
		return next(new ErrorResponse("Unauthorized", 401));
	}

	try {
		const { userId } = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
		
		const user = await User.findById(userId);
		if (!user) {
			return next(new ErrorResponse("Unauthorized", 401));
		}

		req.user = user;
		next();
	} catch (error) {
		if (error instanceof jwt.TokenExpiredError) {
			return next(new ErrorResponse("Unauthorized. Token has expired", 401));
		}
		if (error instanceof jwt.JsonWebTokenError) {
			return next(new ErrorResponse("Unauthorized. Token is invalid", 401))
		}
		next(error);
	}
};

module.exports = authenticate;