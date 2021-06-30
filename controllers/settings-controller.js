// Dependencies
const { validationResult } = require("express-validator");
const customAlphabet = require("nanoid").customAlphabet;
const fs = require("fs");

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
		).select("givenName familyName");

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
			return next(new ErrorResponse("This id is already link to another account", 400));
		}

		const user = await User.findByIdAndUpdate(
			req.user._id,
			{
				profileId: profileId.toLowerCase(),
			},
			{ new: true }
		).select("profileId");

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
		
		if (emailExists?.email.address === req.user.email.address) {
			return next(new ErrorResponse("This email is already linked to this account", 400));
		}

		if (emailExists) {
			return next(new ErrorResponse("This email is already linked to another account", 400));
		}

		const user = await User.findById(req.user._id);
		if (currentTime < user.email.nextEmailAvailableIn) {
			return next(new ErrorResponse("Please, try again later", 400));
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

		sendMail(emailOptions);

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
		const user = await User.findById(req.user._id).select("email");
		if (!user) {
			return next(new ErrorResponse("Account does not exist", 400));
		}

		if (user.email.otp !== otp) {
			return next(new ErrorResponse("One time password is incorrect", 400));
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
		).select("email");

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
					message: "Your account was successfully deleted. Good bye!",
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
			return next(new ErrorResponse("Account password is incorrect", 400));
		}

		user.passwordData.password = newPassword;
		user.passwordData.lastTimeChanged = new Date();
		await user.save();

		res.status(200).json({
			status: {
				isError: false,
				message: "Saved",
			},
			body: {
				lastTimeChanged: user.passwordData.lastTimeChanged,
			},
		});
	} catch (error) {
		next(error);
	}
};

// CHANGE PHOTO

exports.changeAvatar = async (req, res, next) => {
	const protocol = req.secure ? "https://" : "http://";

	try {
		const user = await User.findById(req.user._id);
		if (!user) {
			return next(new ErrorResponse("Account does not exist", 400));
		}

		const oldImageName = user.avatar.fileName;

		user.avatar.linkToAvatar = `${protocol}${req.headers.host}/avatars/${req.file.filename}`;
		
		user.avatar.fileName = req.file.filename;
		await user.save();

		if (oldImageName !== "default.png") {
			fs.unlink(`public/avatars/${oldImageName}`, (error) => {
				if (error) console.log(error);
			});
		}

		res.status(200).json({
			status: {
				isError: false,
				message: "Saved",
			},
			body: {
				avatar: user.avatar.linkToAvatar,
			},
		});
	} catch (error) {
		next(error);
	}
};

// CHANGE BIO

exports.changeBio = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const message = errors.array()[0].msg;
		return next(new ErrorResponse(message, 422));
	}

	const { bio } = req.body;

	if (typeof bio !== "string") {
		return next(new ErrorResponse("Please, provide a valid bio text", 400));
	}

	try {
		const user = await User.findById(req.user._id);
		if (!user) {
			return next(new ErrorResponse("Account does not exist", 400));
		}

		user.bio = bio.replace(/\s+/g, " ");
		await user.save();

		res.status(200).json({
			status: {
				isError: false,
				message: "Saved",
			},
			body: {
				bio: user.bio,
			},
		});
	} catch (error) {
		next(error);
	}
};

// CHANGE BIRTHDAY

exports.changeBirthday = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const message = errors.array()[0].msg;
		return next(new ErrorResponse(message, 422));
	}

	const months = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	];

	const day = parseInt(req.body.day);
	const month = parseInt(req.body.month);
	const year = parseInt(req.body.year);

	// Basic verification
	if (month > 11 || month < 0) {
		return next(new ErrorResponse(`Incorrect month value`, 400));
	}

	if (year < 1920) {
		return next(
			new ErrorResponse(
				"Years of 1920 and higher are only acceptable",
				400
			)
		);
	}

	if (day < 1) {
		return next(new ErrorResponse("Incorrect day value", 400));
	}

	// Getting leap years
	let leapYears = [];
	for (let leapYear = 1920; leapYear <= year; leapYear += 4) {
		leapYears.push(leapYear);
	}

	// Arrays witn month's numbers
	const monthsWith31Days = [0, 2, 4, 6, 7, 9, 11];
	const monthsWith30Days = [3, 5, 8, 10];

	// Day verification
	if (monthsWith31Days.includes(month) && day > 31) {
		return next(
			new ErrorResponse(`${months[month]} has only 31 days`, 400)
		);
	}

	if (monthsWith30Days.includes(month) && day > 30) {
		return next(
			new ErrorResponse(`${months[month]} has only 30 days`, 400)
		);
	}

	const isLeapYear = leapYears.includes(year);

	if (month === 1 && isLeapYear && day > 29) {
		return next(
			new ErrorResponse(
				`${months[month]} (${year}) has only 29 days`,
				400
			)
		);
	}

	if (month === 1 && !isLeapYear && day > 28) {
		return next(
			new ErrorResponse(
				`${months[month]} (${year}) has only 28 days`,
				400
			)
		);
	}

	// Verification if users's date is not bigger than the current one
	const currentDate = new Date();
	const birthdayDate = new Date(Date.UTC(year, month, day));

	if (currentDate - birthdayDate < 0) {
		return next(
			new ErrorResponse(
				"Your date of birth cannot be higher than the current date",
				400
			)
		);
	}

	try {
		const user = await User.findById(req.user._id).select("birthday");
		if (!user) {
			return next(new ErrorResponse("Account does not exist", 400));
		}

		user.birthday = birthdayDate;
		await user.save();

		res.status(200).json({
			status: {
				isError: false,
				message: "Saved",
			},
			body: {
				birthday: user.birthday,
			},
		});
	} catch (error) {
		next(error);
	}
};
