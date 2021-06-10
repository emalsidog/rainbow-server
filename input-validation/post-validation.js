// Dependencies
const { check } = require("express-validator");

const validatePost = (method) => {
	switch (method) {
		case "addPost": {
			return [
				check("postText")
					.not()
					.isEmpty()
					.withMessage("Text of the post can not be empty")
					.isLength({ min: 1, max: 500 })
					.withMessage("Max length is 500 symbols"),
			];
		}
	}
};

module.exports = validatePost;
