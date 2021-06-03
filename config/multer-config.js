// Dependencies
const multer = require("multer");

// Utils
const ErrorResponse = require("../utils/error-response");

// Storage
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, "public/avatars");
	},
	filename: function (req, file, cb) {
		cb(null, new Date().getTime() + file.originalname);
	},
});

// File filter
const fileFilter = (req, file, cb) => {
	if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
		return cb(null, true);
	}
	cb(new ErrorResponse("Wrong file format", 400), false);
};

exports.upload = multer({
	storage: storage,
	limits: {
		fileSize: 1024 * 1024 * 3,
	},
	fileFilter: fileFilter,
});
