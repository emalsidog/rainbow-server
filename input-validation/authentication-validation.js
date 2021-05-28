// Dependencies
const { check } = require("express-validator");

const validateAuthentication = (method) => {
	switch (method) {
		case "register": {
			return [
				check("givenName")
					.not()
					.isEmpty()
					.withMessage("Given name can not be empty")
					.isLength({ min: 2, max: 15 })
					.withMessage(
						"Given name should be between 2 and 15 characters long"
					)
					.matches(/^[A-zА-я]+$/)
					.withMessage("Given name must be alphabetic."),
				check("familyName")
					.not()
					.isEmpty()
					.withMessage("Family name can not be empty")
					.isLength({ min: 2, max: 15 })
					.withMessage(
						"Family name should be between 2 and 15 characters long"
					)
					.matches(/^[A-zА-я]+$/)
					.withMessage("Family name must be alphabetic."),
				check("email")
					.not()
					.isEmpty()
					.withMessage("Email can not be empty")
					.matches(
						/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
					)
					.withMessage("Email is invalid"),
				check("password")
					.not()
					.isEmpty()
					.withMessage("Password can not be empty")
					.isLength({ min: 6, max: 15 })
					.withMessage(
						"Password should be between 6 and 15 characters long."
					)
					.matches(/^[A-Za-z0-9\-\_]*$/)
					.withMessage(
						"Password should contain only letters, numbers special characters (_, -)"
					),
				check("confirmPassword")
					.not()
					.isEmpty()
					.withMessage("Password can not be empty"),
			];
		}
		case "login": {
			return [
				check("email")
					.not()
					.isEmpty()
					.withMessage("Email can not be empty")
					.matches(
						/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
					)
					.withMessage("Email is invalid"),
				check("password")
					.not()
					.isEmpty()
					.withMessage("Password can not be empty")
					.isLength({ min: 6, max: 15 })
					.withMessage(
						"Password should be between 6 and 15 characters long."
					)
					.matches(/^[A-Za-z0-9\-\_]*$/)
					.withMessage(
						"Password should contain only letters, numbers special characters (_, -)"
					),
			];
		}
	}
};

module.exports = validateAuthentication;
