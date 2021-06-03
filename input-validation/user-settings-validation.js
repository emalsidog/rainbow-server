// Dependencies
const { check } = require("express-validator");

const validateAuthentication = (method) => {
	switch (method) {
		case "changeDisplayName": {
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
					.withMessage("Family name must be alphabetic"),
			];
		}
		case "changeProfileId": {
			return [
				check("profileId")
					.not()
					.isEmpty()
					.withMessage("Given name can not be empty")
					.isLength({ min: 5, max: 15 })
					.withMessage(
						"Profile id should be between 5 and 15 characters long"
					)
					.matches(/^[a-z0-9]+$/)
					.withMessage(
						"Profile id name must contain letters, numbers or symbols"
					),
			];
		}
		case "changeEmailRequest": {
			return [
				check("email")
					.not()
					.isEmpty()
					.withMessage("Email can not be empty")
					.matches(
						/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
					)
					.withMessage("Email is invalid"),
			];
		}
		case "changeEmail": {
			return [
				check("otp")
					.not()
					.isEmpty()
					.withMessage("OTP must be provided")
					.isLength(6)
					.withMessage("OTP must be 6 characters long"),
			];
		}
		case "deleteAccount": {
			return [
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
		case "changePassword": {
			return [
				check("oldPassword")
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
				check("newPassword")
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
		case "changeBio": {
			return [
				check("bio")
					.isLength({ min: 0, max: 100 })
					.withMessage("The maximum number of characters is 100"),
			];
		}
		case "changeBirthday": {
			return [
				check("day")
					.not()
					.isEmpty()
					.withMessage("Day can not be empty")
					.matches(/^[0-9]*$/)
					.withMessage("Day can be only numeric"),
				check("month")
					.not()
					.isEmpty()
					.withMessage("Month can not be empty")
					.matches(/^[0-9]*$/)
					.withMessage("Month can be only numeric"),
				check("year")
					.not()
					.isEmpty()
					.withMessage("Year can not be empty")
					.matches(/^[0-9]*$/)
					.withMessage("Year can be only numeric"),
			];
		}
	}
};

module.exports = validateAuthentication;
