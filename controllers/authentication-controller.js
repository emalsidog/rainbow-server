// Dependencies
const jwt = require("jsonwebtoken");
const customAlphabet = require("nanoid").customAlphabet;
const { validationResult } = require("express-validator");

// Models
const User = require("../models/User");

// Utils
const sendMail = require("../utils/send-mail");
const ErrorResponse = require("../utils/error-response");

// REGISTER

exports.register = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const message = errors.array()[0].msg;
		return next(new ErrorResponse(message, 422));
	}

	const { givenName, familyName, email, password, confirmPassword } =
		req.body;

	if (password !== confirmPassword) {
		return next(new ErrorResponse("Passwords do not match.", 400));
	}

	try {
		const user = await User.findOne({ "email.address": email });
		if (user) {
			return next(new ErrorResponse("Email is already registered.", 400));
		}

		const newUser = {
			givenName,
			familyName,
			email: {
				address: email,
			},
			password,
		};

		const activationToken = createToken(
			newUser,
			process.env.ACTIVATION_TOKEN_SECRET,
			process.env.ACTIVATION_TOKEN_EXPIRE
		);

		const url = `http://localhost:3000/users/activate/${activationToken}`;
		const emailOptions = {
			to: email,
			subject: "Verify your identity | Rainbow",
			html: `
			<div style="max-width: 1000px;
						margin: 0 auto;
						padding: 10px;"
			>
				<img style="width: 100%;
							max-width: 300px;
							text-align: center;
							display: block;
							margin: 1rem auto;" 
					 src="https://lh3.googleusercontent.com/F8J7NXygfWhoNd9rt5Lv0RQlRJhcnpvtwZkVx-JsliQRMYiSyfIRfMPesgROrSwlTUqO6uOKgrbVNHG_f6A5BdsCV2qUrXVqiz5BMcuG4qOhSjoy92GNw06KdMYBIogsM_pGjFF5T9X9zrYFvW125ydHVtinwj3BEMPKebL0qRG49cvufs4BLOUCleNyceaY0Eh9_Yk9lsVbLVpMLWkX9V7_pT8huFnZFi0otJd0CL2z7cMajqU8RSyv_Ov3ZRMWOcYlerGKd7he2c7EH0K6k0xgA1GNpxnaoJHd_-MFiHLNLKoGIcMus3BBHu6yrDjToX-t7ZVZFV4rQ-MPjhOdfU_w3e6OV5SODtbQUPx4HjabJTZMcP3YMqbYOU8buAaeqk2FtpyeSoYqmyNYR4jREVq8q8sL01tP2WTCNmhKuQgitUujVgmn4oYpTYRuert7XQ42ulp5ctueKvAQ-gvBghYl-wORcMpClpaVvZFug9wQZpel1GgqQYLIYnDVChdsjYxdBxbMeBcFUX8kXm5GRtgjMkQ0OTNrlyiSR-hCS47yx49-QYCJ3L9pidMq0J9pKW1F1bHdoIs1v-xzEyLxxVFXuz6VFcyJYjTcMdcoBlsR3_9K4UiwYRccxAzf1-ew8FmT8Ss43NB3x2uh2isa6NL3lgU8Gg2Lxywtr66z3fEL-NlLc4EZsgm9BD2FtDCG7S5mx0X3y7DuuaN6TR2OD70I=w1920-h690-no?authuser=0"
				/>
				<hr />
				<div style="font-size: 30px;
							padding: 10px 0;"
				>
					Welcome to Rainbow!
				</div>
				<p style="margin-top: 0;
						  margin-bottom: 40px;
						  font-size: 20px;"
				>
					To complete your registration process, please, confirm your
					email address.
				</p>
				<div style="text-align: center;">
					<a style="padding: 10px 15px;
							background-color: #17beec;
							color: white;
							text-align: center;
							text-decoration: none;
							font-size: 20px;" 
					href="${url}">
						Confirm your emaill address
					</a>
				</div>
			</div>
			`,
		};

		sendMail(emailOptions);

		res.status(200).json({
			status: {
				isError: false,
				message: "Verify your email!",
			},
		});
	} catch (error) {
		next(error);
	}
};

// ACTIVATE

exports.activate = async (req, res, next) => {
	const { activationToken } = req.body;
	try {
		const user = jwt.verify(
			activationToken,
			process.env.ACTIVATION_TOKEN_SECRET
		);

		if (!user) {
			return next(
				new ErrorResponse(
					"Your activation token is invalid or has expired.",
					400
				)
			);
		}

		const { givenName, familyName, email, password } = user;

		const existingUser = await User.findOne({
			"email.address": email.address,
		});
		if (existingUser) {
			return next(
				new ErrorResponse("Account has been already activated.", 400)
			);
		}

		const nanoid = customAlphabet(
			"0123456789abcdefghijklmnopqrstuvwxyz",
			14
		);

		const newUser = new User({
			profileId: nanoid(),
			givenName,
			familyName,
			email: {
				address: email.address,
			},
			password,
			provider: "local",
		});

		await newUser.save();

		res.status(201).json({
			status: {
				isError: false,
				message: "Account has been successfully activated.",
			},
		});
	} catch (error) {
		next(error);
	}
};

// LOGIN

exports.login = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const message = errors.array()[0].msg;
		return next(new ErrorResponse(message, 422));
	}
	const { email, password } = req.body;

	try {
		const user = await User.findOne({ "email.address": email });
		if (!user) {
			return next(
				new ErrorResponse("Email or password is incorrect.", 400)
			);
		}

		const isMatch = await user.comparePasswords(password);
		if (!isMatch) {
			return next(
				new ErrorResponse("Email or password is incorrect.", 400)
			);
		}

		// Access token
		const accessToken = createToken(
			{ userId: user._id },
			process.env.ACCESS_TOKEN_SECRET,
			process.env.ACCESS_TOKEN_EXPIRE
		);

		// Refresh token
		const refreshToken = createToken(
			{ userId: user._id },
			process.env.REFRESH_TOKEN_SECRET,
			process.env.REFRESH_TOKEN_EXPIRE
		);

		// Create user to send
		const userToSend = {
			givenName: user.givenName,
			familyName: user.familyName,
			email: user.email.address,
			profileId: user.profileId,
		};

		// Send Access token to the client
		res.cookie("accessToken", accessToken, {
			// secure: true,
			httpOnly: true,
			// sameSite: "none",
		}).cookie("refreshToken", refreshToken, {
			// secure: true,
			httpOnly: true,
			// sameSite: "none",
		});

		res.status(200).json({
			status: {
				isError: false,
				message: "Successfully logged in.",
			},
			body: {
				user: userToSend,
				changingEmailProcess: {
					timeToNextEmail: user.email.nextEmailAvailableIn,
					isChangingProcess: user.email.isChangingProcess,
					newEmail: user.email.newEmail
				},
			},
		});
	} catch (error) {
		return next(error);
	}
};

// REFRESH

exports.refresh = async (req, res, next) => {
	const refreshToken = req.cookies.refreshToken;

	if (!refreshToken) {
		return next(new ErrorResponse("Unauthorized.", 401));
	}

	try {
		const { userId } = jwt.verify(
			refreshToken,
			process.env.REFRESH_TOKEN_SECRET
		);

		const newAccessToken = createToken(
			{ userId },
			process.env.ACCESS_TOKEN_SECRET,
			process.env.ACCESS_TOKEN_EXPIRE
		);
		const newRefreshToken = createToken(
			{ userId },
			process.env.REFRESH_TOKEN_SECRET,
			process.env.REFRESH_TOKEN_EXPIRE
		);

		res.cookie("accessToken", newAccessToken, {
			// secure: true,
			httpOnly: true,
			// sameSite: "none",
		}).cookie("refreshToken", newRefreshToken, {
			// secure: true,
			httpOnly: true,
			// sameSite: "none",
		});

		res.status(200).json({
			status: {
				isError: false,
				message: "Done.",
			},
		});
	} catch (error) {
		if (error instanceof jwt.TokenExpiredError) {
			return next(
				new ErrorResponse("Unauthorized. Token has expired.", 401)
			);
		}
		if (error instanceof jwt.JsonWebTokenError) {
			return next(
				new ErrorResponse("Unauthorized. Token is invalid.", 401)
			);
		}
		next(error);
	}
};

// FORGOT

exports.forgot = async (req, res, next) => {
	const { email, timeToNextEmail = undefined } = req.body;

	if (timeToNextEmail === undefined) {
		return next(new ErrorResponse("Invalid request", 400));
	}

	const currentTime = new Date().getTime();

	try {
		const user = await User.findOne({ "email.address": email });
		if (!user) {
			return next(new ErrorResponse("Email does not exist", 400));
		}

		if (currentTime < timeToNextEmail) {
			return next(new ErrorResponse("Please, try again later", 400));
		}

		const payload = {
			userId: user._id,
			hash: user.password.substr(6, 13),
		};

		const resetToken = createToken(
			payload,
			process.env.RESET_TOKEN_SECRET,
			process.env.RESET_TOKEN_EXPIRE
		);

		const url = `http://localhost:3000/users/reset/${resetToken}`;
		const emailOptions = {
			to: email,
			subject: "Reset password request | Rainbow",
			html: `
				<div style="max-width: 1000px;
					margin: 0 auto;
					padding: 10px;"
				>
					<img style="width: 100%;
								max-width: 300px;
								text-align: center;
								display: block;
								margin: 1rem auto;" 
						src="https://lh3.googleusercontent.com/F8J7NXygfWhoNd9rt5Lv0RQlRJhcnpvtwZkVx-JsliQRMYiSyfIRfMPesgROrSwlTUqO6uOKgrbVNHG_f6A5BdsCV2qUrXVqiz5BMcuG4qOhSjoy92GNw06KdMYBIogsM_pGjFF5T9X9zrYFvW125ydHVtinwj3BEMPKebL0qRG49cvufs4BLOUCleNyceaY0Eh9_Yk9lsVbLVpMLWkX9V7_pT8huFnZFi0otJd0CL2z7cMajqU8RSyv_Ov3ZRMWOcYlerGKd7he2c7EH0K6k0xgA1GNpxnaoJHd_-MFiHLNLKoGIcMus3BBHu6yrDjToX-t7ZVZFV4rQ-MPjhOdfU_w3e6OV5SODtbQUPx4HjabJTZMcP3YMqbYOU8buAaeqk2FtpyeSoYqmyNYR4jREVq8q8sL01tP2WTCNmhKuQgitUujVgmn4oYpTYRuert7XQ42ulp5ctueKvAQ-gvBghYl-wORcMpClpaVvZFug9wQZpel1GgqQYLIYnDVChdsjYxdBxbMeBcFUX8kXm5GRtgjMkQ0OTNrlyiSR-hCS47yx49-QYCJ3L9pidMq0J9pKW1F1bHdoIs1v-xzEyLxxVFXuz6VFcyJYjTcMdcoBlsR3_9K4UiwYRccxAzf1-ew8FmT8Ss43NB3x2uh2isa6NL3lgU8Gg2Lxywtr66z3fEL-NlLc4EZsgm9BD2FtDCG7S5mx0X3y7DuuaN6TR2OD70I=w1920-h690-no?authuser=0"
					/>
					<hr />
					<div style="font-size: 30px;
								padding: 10px 0;"
					>
						Password reset
					</div>
					<p style="margin-top: 0;
							margin-bottom: 40px;
							font-size: 20px;"
					>
						Dear ${user.givenName}. You have requested a process to change your password. To do that, click on the button below and follow the instructions.
					</p>
					<p style="margin-top: 0;
							margin-bottom: 40px;
							font-size: 20px;">
						If you did not request the process - ignore this message.
					</p>
					<div style="text-align: center;">
						<a style="padding: 10px 15px;
								background-color: #17beec;
								color: white;
								text-align: center;
								text-decoration: none;
								font-size: 20px;" 
							href="${url}">
							Reset my password
						</a>
					</div>
				</div>
			`,
		};

		sendMail(emailOptions);

		res.status(200).json({
			status: {
				isError: false,
				message: "Your request is successful. Check your inbox.",
			},
			body: {
				timeToNextEmail: currentTime + 1000 * 60 * 2,
			},
		});
	} catch (error) {
		next(error);
	}
};

// RESET

exports.reset = async (req, res, next) => {
	const { resetToken, password, confirmPassword } = req.body;

	if (password !== confirmPassword) {
		return next(new ErrorResponse("Passwords do not match", 400));
	}

	try {
		const { userId, hash } = jwt.verify(
			resetToken,
			process.env.RESET_TOKEN_SECRET
		);

		const user = await User.findById(userId);
		if (!user) {
			return next(new ErrorResponse("User does not exist.", 400));
		}

		if (hash !== user.password.substr(6, 13)) {
			return next(new ErrorResponse("Token has been already used.", 400));
		}

		user.password = password;
		await user.save();

		res.status(200).json({
			status: {
				isError: false,
				message: "Password has been successfully changed.",
			},
		});
	} catch (error) {
		if (error instanceof jwt.TokenExpiredError) {
			return next(new ErrorResponse("Token has expired.", 400));
		}
		if (error instanceof jwt.JsonWebTokenError) {
			return next(new ErrorResponse("Token is invalid.", 400));
		}
		next(error);
	}
};

// GET CURRENT USER

exports.getCurrentUser = (req, res, next) => {
	res.status(200).json({
		status: {
			isError: false,
			message: "Done",
		},
		body: {
			user: {
				givenName: req.user.givenName,
				familyName: req.user.familyName,
				email: req.user.email.address,
				profileId: req.user.profileId,
			},
			changingEmailProcess: {
				timeToNextEmail: req.user.email.nextEmailAvailableIn,
				isChangingProcess: req.user.email.isChangingProcess,
				newEmail: req.user.email.newEmail
			},
		},
	});
};

// LOGOUT

exports.logout = (req, res) => {
	res.clearCookie("accessToken")
		.clearCookie("refreshToken")
		.status(200)
		.json({
			status: {
				isError: false,
				message: "Successfully logged out.",
			},
		});
};

const createToken = (payload, secretKey, expireTime) => {
	return jwt.sign(payload, secretKey, {
		expiresIn: expireTime,
	});
};
