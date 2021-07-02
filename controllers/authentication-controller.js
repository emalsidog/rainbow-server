// Dependencies
const jwt = require("jsonwebtoken");
const customAlphabet = require("nanoid").customAlphabet;
const { validationResult } = require("express-validator");
const WebServiceClient = require("@maxmind/geoip2-node").WebServiceClient;

// Models
const User = require("../models/User");

// Utils
const sendMail = require("../utils/send-mail");
const ErrorResponse = require("../utils/error-response");
const transformName = require("../utils/transform-name");

// IP CLIENT
const client = new WebServiceClient("559966", "XFgENwGMXSK6XRBD", {
	host: "geolite.info",
});

// Client url
const clientUrl =
	process.env.NODE_ENV === "development"
		? "http://localhost:3000"
		: "https://rainbow-client.herokuapp.com";

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
		return next(new ErrorResponse("Passwords do not match", 400));
	}

	try {
		const user = await User.findOne({ "email.address": email });
		if (user) {
			return next(new ErrorResponse("Email is already registered", 400));
		}

		const transformedGivenName = transformName(givenName)
		const transformedFamilyName = transformName(familyName)

		const newUser = {
			givenName: transformedGivenName,
			familyName: transformedFamilyName,
			displayName: `${transformedGivenName} ${transformedFamilyName}`,
			email: { address: email },
			passwordData: { password },
		};

		const activationToken = createToken(
			newUser,
			process.env.ACTIVATION_TOKEN_SECRET,
			process.env.ACTIVATION_TOKEN_EXPIRE
		);

		const url = `${clientUrl}/users/activate/${activationToken}`;
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
								href="${url}"
						>
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
				message:
					"To complete registration process, please, confirm your email",
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
					"Your activation link is invalid or has expired. Please, start the process again",
					400
				)
			);
		}

		const { givenName, familyName, displayName, email, passwordData } =
			user;

		// Check if user already exists
		const existingUser = await User.findOne({
			"email.address": email.address,
		});
		if (existingUser) {
			return next(
				new ErrorResponse("Account has been already activated", 400)
			);
		}

		// Generating unique profileId
		const nanoid = customAlphabet(
			"0123456789abcdefghijklmnopqrstuvwxyz",
			14
		);

		const newUser = new User({
			profileId: nanoid(),
			givenName,
			familyName,
			displayName,
			email: {
				address: email.address,
			},
			passwordData,
			provider: "local",
		});
		await newUser.save();

		res.status(201).json({
			status: {
				isError: false,
				message:
					"Account has been successfully activated. Please, login now",
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
		const user = await User.findOne({ "email.address": email }).populate({
			path: "posts",
			select: "isPublic timePosted postText _id",
			options: {
				sort: { timePosted: -1 },
			},
		});

		if (!user) {
			return next(
				new ErrorResponse("Email or password is incorrect", 400)
			);
		}

		const isMatch = await user.comparePasswords(password);
		if (!isMatch) {
			return next(
				new ErrorResponse("Email or password is incorrect", 400)
			);
		}

		const posts = user.posts.map((post) => ({
			postText: post.postText,
			isPublic: post.isPublic,
			postId: post._id,
			timePosted: post.timePosted,
		}));

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

		if (process.env.NODE_ENV === "production") {
			// Getting IP from where was request
			const ip =
				req.headers["x-forwarded-for"] || req.connection.remoteAddress;

			// Looking for country with the help of web client of MAX MIND
			const city = await client.city(ip);

			const newDate = new Date();

			const date = newDate.getUTCDate();
			const month = newDate.getUTCMonth();
			const year = newDate.getUTCFullYear();

			const hours = newDate.getUTCHours();
			const minutes = newDate.getUTCMinutes();
			const seconds = newDate.getUTCSeconds();

			const formattedDate = `${date}/${month}/${year}`;
			const formattedTime = `${hours}:${minutes}:${seconds} UTC`;

			emailOptions = {
				to: email,
				subject: "A new login to your account | Rainbow",
				html: `
					<div>
						<b>New login.</b> Dear ${user.givenName}, we detected a login into your account
						on ${formattedDate} at ${formattedTime}.
					</div>
					<div>
						Location: ${city.city.names.en}, ${city.country.names.en} (IP = ${ip})
					</div>
				`,
			};

			sendMail(emailOptions);
		}

		// Save tokens in locals in order to establish socket connection
		res.locals.accessToken = accessToken;
		res.locals.refreshToken = refreshToken;

		// Send Access token to the client
		res.cookie("accessToken", accessToken, {
			secure: true,
			httpOnly: true,
			sameSite: "none",
		}).cookie("refreshToken", refreshToken, {
			secure: true,
			httpOnly: true,
			sameSite: "none",
		});

		const { avatar, email: emailData, passwordData } = user;

		res.status(200).json({
			status: {
				isError: false,
				message: "Successfully logged in",
			},
			body: {
				user: {
					...user._doc,
					avatar: avatar.linkToAvatar,
					email: emailData.address,
					lastTimeChanged: passwordData.lastTimeChanged,
					posts,
				},
				changingEmailProcess: {
					timeToNextEmail: emailData.nextEmailAvailableIn,
					isChangingProcess: emailData.isChangingProcess,
					newEmail: emailData.newEmail,
				},
				requestsCounter: user.friendRequests.length,
			},
		});

		// Call next middleware (socket connection)
		next();
	} catch (error) {
		console.log(error);
		return next(error);
	}
};

// REFRESH

exports.refresh = async (req, res, next) => {
	const refreshToken = req.cookies.refreshToken;

	if (!refreshToken) {
		return next(new ErrorResponse("Unauthorized", 401));
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
			secure: true,
			httpOnly: true,
			sameSite: "none",
		}).cookie("refreshToken", newRefreshToken, {
			secure: true,
			httpOnly: true,
			sameSite: "none",
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
				new ErrorResponse("Unauthorized. Token has expired", 401)
			);
		}
		if (error instanceof jwt.JsonWebTokenError) {
			return next(
				new ErrorResponse("Unauthorized. Token is invalid", 401)
			);
		}
		next(error);
	}
};

// FORGOT

exports.forgot = async (req, res, next) => {
	const { email, timeToNextEmail = undefined } = req.body;

	if (timeToNextEmail === undefined) {
		return next(new ErrorResponse("Request is invalid", 400));
	}

	const currentTime = new Date().getTime();

	try {
		const user = await User.findOne({ "email.address": email });
		if (!user) {
			return next(new ErrorResponse("Account does not exist", 400));
		}

		if (currentTime < timeToNextEmail) {
			return next(new ErrorResponse("Please, try again later", 400));
		}

		const payload = {
			userId: user._id,
			hash: user.passwordData.password.substr(6, 13),
		};

		const resetToken = createToken(
			payload,
			process.env.RESET_TOKEN_SECRET,
			process.env.RESET_TOKEN_EXPIRE
		);

		const url = `${clientUrl}/users/reset/${resetToken}`;
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
				message: "Your request is successful. Check your inbox",
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
			return next(new ErrorResponse("Account does not exist", 400));
		}

		if (hash !== user.passwordData.password.substr(6, 13)) {
			return next(
				new ErrorResponse("Your reset link has been already used", 400)
			);
		}

		user.passwordData.password = password;
		await user.save();

		res.status(200).json({
			status: {
				isError: false,
				message: "Password has been successfully changed",
			},
		});
	} catch (error) {
		if (error instanceof jwt.TokenExpiredError) {
			return next(new ErrorResponse("Token has expired", 400));
		}
		if (error instanceof jwt.JsonWebTokenError) {
			return next(new ErrorResponse("Token is invalid", 400));
		}
		next(error);
	}
};

// GET CURRENT USER

exports.getCurrentUser = async (req, res, next) => {
	try {
		const user = await User.findById(req.user._id).populate({
			path: "posts",
			select: "isPublic timePosted postText",
			options: {
				sort: { timePosted: -1 },
			},
		});

		const posts = user.posts.map((post) => ({
			postText: post.postText,
			isPublic: post.isPublic,
			postId: post._id,
			timePosted: post.timePosted,
		}));

		const { avatar, email, passwordData } = user;

		res.status(200).json({
			status: {
				isError: false,
				message: "Done",
			},
			body: {
				user: {
					...user._doc,
					avatar: avatar.linkToAvatar,
					email: email.address,
					lastTimeChanged: passwordData.lastTimeChanged,
					posts,
				},
				changingEmailProcess: {
					timeToNextEmail: email.nextEmailAvailableIn,
					isChangingProcess: email.isChangingProcess,
					newEmail: email.newEmail,
				},
				requestsCounter: user.friendRequests.length,
			},
		});

		// Got to the next middleware (socket connection)
		next();
	} catch (error) {
		next(error);
	}
};

// LOGOUT

exports.logout = (req, res) => {

	req.wss.clients.forEach((client) => {
		if (client.id.toString() === req.user._id.toString()) {
			client.close();
		}
	});

	res.clearCookie("accessToken", {
		path: "/",
		sameSite: "none",
		secure: true,
		httpOnly: true,
	}).clearCookie("refreshToken", {
		path: "/",
		sameSite: "none",
		secure: true,
		httpOnly: true,
	});

	res.json({
		status: {
			isError: false,
			message: "Successfully logged out",
		},
	});
};

const createToken = (payload, secretKey, expireTime) => {
	return jwt.sign(payload, secretKey, {
		expiresIn: expireTime,
	});
};
