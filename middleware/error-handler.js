// Utils
const ErrorResponse = require("../utils/error-response");

const errorHandler = (err, req, res, next) => {
	let error = { ...err };

	error.message = err.message;

    // console.log(err);

	// Mongoose error code for duplicate key
	if (err.code === 11000) {
		const message = "Duplicated value";
		error = new ErrorResponse(message, 400);
	}

	res.status(error.statusCode || 500).json({
		status: {
			isError: true,
			message: error.message || "Something went wrong... Please, try again later",
		},
	});
};

module.exports = errorHandler;