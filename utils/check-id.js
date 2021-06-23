const ObjectId = require("mongoose").Types.ObjectId;

exports.checkMongooseId = (id) => {
	if (!id) {
		return false;
	}

	if (typeof id !== "string") {
		return false;
	}

	if (!ObjectId.isValid(id)) {
		return false;
	}

	return true;
};