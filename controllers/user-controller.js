// Dependencies
const { validationResult } = require("express-validator");
const customAlphabet = require("nanoid").customAlphabet;

// Models
const User = require("../models/User");

// Utils
const ErrorResponse = require("../utils/error-response");
const sendMail = require("../utils/send-mail");

// CHANGE DISPLAY NAME

exports.changeDisplayName = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const message = errors.array()[0].msg;
		return next(new ErrorResponse(message, 422));
	}

	const { givenName, familyName } = req.body;
	try {
		const user = await User.findByIdAndUpdate(
			req.user._id,
			{
				givenName,
				familyName,
			},
			{ new: true }
		);

		res.status(200).json({
			status: {
				isError: false,
				message: "Saved",
			},
			body: {
				givenName: user.givenName,
				familyName: user.familyName,
			},
		});
	} catch (error) {
		console.error(error);
		next(error);
	}
};

// CHANGE PROFILE ID

exports.changeProfileId = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const message = errors.array()[0].msg;
		return next(new ErrorResponse(message, 422));
	}

	const { profileId } = req.body;

	try {
		const users = await User.find({ profileId });
		if (users.length > 0) {
			return next(new ErrorResponse("This id is already taken", 400));
		}

		const user = await User.findByIdAndUpdate(
			req.user._id,
			{
				profileId: profileId.toLowerCase(),
			},
			{ new: true }
		);

		res.status(200).json({
			status: {
				isError: false,
				message: "Saved",
			},
			body: {
				profileId: user.profileId,
			},
		});
	} catch (error) {
		next(error);
	}
};

// CHANGE EMAIL REQUEST

exports.changeEmailRequest = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const message = errors.array()[0].msg;
		return next(new ErrorResponse(message, 422));
	}

	const { email } = req.body;
	const currentTime = new Date().getTime();
	const awaitingTime = 60 * 1000 * 0.5;

	try {
		const emailExists = await User.findOne({ "email.address": email });
		if (emailExists) {
			return next(new ErrorResponse("Email is already in use", 400));
		}

		const user = await User.findById(req.user._id);
		if (currentTime < user.email.nextEmailAvailableIn) {
			return next(new ErrorResponse("Wait", 400));
		}

		const nanoid = customAlphabet("0123456789", 6);
		const timeToNextEmail = currentTime + awaitingTime;

		user.email.otp = nanoid();
		user.email.nextEmailAvailableIn = timeToNextEmail;
		user.email.isChangingProcess = true;
		user.email.newEmail = email;
		await user.save();

		const emailOptions = {
			to: email,
			subject: "Verify your email | Rainbow",
			html: `<p>${user.email.otp}</p>`,
		};
		console.log(user.email.otp);
		// sendMail(emailOptions);

		res.status(200).json({
			status: {
				isError: false,
				message: "One time password was sent to your new email",
			},
			body: {
				timeToNextEmail: user.email.nextEmailAvailableIn,
				isChangingProcess: user.email.isChangingProcess,
				newEmail: user.email.newEmail,
			},
		});
	} catch (error) {
		next(error);
	}
};

// CHANGE EMAIL

exports.changeEmail = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const message = errors.array()[0].msg;
		return next(new ErrorResponse(message, 422));
	}

	const { otp } = req.body;

	try {
		const user = await User.findById(req.user._id);
		if (!user) {
			return next(new ErrorResponse("User does not exist", 400));
		}

		if (user.email.otp !== otp) {
			return next(new ErrorResponse("Wrong code", 400));
		}

		user.email.address = user.email.newEmail;
		user.email.otp = undefined;
		user.email.isChangingProcess = false;
		user.email.newEmail = undefined;
		user.email.nextEmailAvailableIn = undefined;
		await user.save();

		res.status(200).json({
			status: {
				isError: false,
				message: "Saved",
			},
			body: {
				email: user.email.address,
				changingEmailProcess: {
					timeToNextEmail: user.email.nextEmailAvailableIn,
					isChangingProcess: user.email.isChangingProcess,
					newEmail: user.email.newEmail,
				},
			},
		});
	} catch (error) {
		next(error);
	}
};

// ABORT CHANGING

exports.changeEmailAbort = async (req, res, next) => {
	try {
		const user = await User.findByIdAndUpdate(
			req.user._id,
			{
				"email.otp": undefined,
				"email.isChangingProcess": false,
				"email.newEmail": undefined,
				"email.nextEmailAvailableIn": undefined,
			},
			{ new: true }
		);

		res.status(200).json({
			status: {
				isError: false,
				message: "Aborted",
			},
			body: {
				timeToNextEmail: user.email.nextEmailAvailableIn,
				isChangingProcess: user.email.isChangingProcess,
				newEmail: user.email.newEmail,
			},
		});
	} catch (error) {
		next(error);
	}
};

// DELETE ACCOUNT

exports.deleteAccount = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const message = errors.array()[0].msg;
		return next(new ErrorResponse(message, 422));
	}

	const { password } = req.body;
	try {
		const user = await User.findById(req.user._id);

		if (!user) {
			return next(new ErrorResponse("Account does not exist", 400));
		}

		const isMatch = await user.comparePasswords(password);
		if (!isMatch) {
			return next(new ErrorResponse("Password is incorrect", 400));
		}

		await user.remove();

		res.clearCookie("accessToken")
			.clearCookie("refreshToken")
			.status(200)
			.json({
				status: {
					isError: false,
					message: "Your account was successfully deleted",
				},
			});
	} catch (error) {
		next(error);
	}
};

// CHANGE PASSWORD

exports.changePassword = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const message = errors.array()[0].msg;
		return next(new ErrorResponse(message, 422));
	}

	const { oldPassword, newPassword, confirmNewPassword } = req.body;

	try {
		if (newPassword !== confirmNewPassword) {
			return next(new ErrorResponse("Passwords do not match", 400));
		}

		const user = await User.findById(req.user._id);
		if (!user) {
			return next(new ErrorResponse("Account does not exist", 400));
		}

		const isMatch = await user.comparePasswords(oldPassword);
		if (!isMatch) {
			return next(new ErrorResponse("Password is incorrect", 400));
		}

		user.password = newPassword;
		await user.save();

		res.status(200).json({
			status: {
				isError: false,
				message: "Saved",
			},
		});
	} catch (error) {
		next(error);
	}
};
