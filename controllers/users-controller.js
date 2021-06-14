// Models
const User = require("../models/User");

// Utils
const ErrorResponse = require("../utils/error-response");

// Get user
exports.getUser = async (req, res, next) => {
	const { id } = req.params;

	if (!id) {
		return next(new ErrorResponse("ID is not specified", 400));
	}

	if (id.length > 15 || id.length < 5) {
		return next(new ErrorResponse("ID is invalid", 400));
	}

	if (!id.match(/^[a-z0-9]+$/)) {
		return next(new ErrorResponse("ID is invalid", 400));
	}

	try {
		if (req.user.profileId === id) {
			const user = await User.findById(req.user._id).populate(
				"posts",
				"isPublic timePosted postText"
			);

			const posts = user.posts.map((post) => ({
				postText: post.postText,
				isPublic: post.isPublic,
				postId: post._id,
				timePosted: post.timePosted,
			}));

			return res.status(200).json({
				status: {
					isError: false,
					message: "Done",
				},
				body: {
					user: {
						_id: req.user._id,
						profileId: req.user.profileId,
						avatar: req.user.avatar.linkToAvatar,
						bio: req.user.bio,
						birthday: req.user.birthday,
						givenName: req.user.givenName,
						familyName: req.user.familyName,
						registrationDate: req.user.registrationDate,
						posts,
					},
					isCurrentUser: true,
				},
			});
		}

		const user = await User.findOne({ profileId: id })
			.select("avatar givenName familyName registrationDate bio birthday")
			.populate("posts", "isPublic timePosted postText");

		if (!user) {
			return next(
				new ErrorResponse("Account with such ID does not exist", 400)
			);
		}

		const posts = user.posts.map((post) => ({
			postText: post.postText,
			isPublic: post.isPublic,
			postId: post._id,
			timePosted: post.timePosted,
		}));

		res.status(200).json({
			status: {
				isError: false,
				message: "Done",
			},
			body: {
				user: {
					_id: user._id,
					profileId: user.profileId,
					avatar: user.avatar.linkToAvatar,
					bio: user.bio,
					birthday: user.birthday,
					givenName: user.givenName,
					familyName: user.familyName,
					registrationDate: user.registrationDate,
					posts,
				},
				isCurrentUser: false,
			},
		});
	} catch (error) {
		next(error);
	}
};

// Search for user
exports.searchUser = async (req, res, next) => {
	const { displayName } = req.body;
	const regExp = { $regex: new RegExp(displayName.toLowerCase(), "i") };

	try {
		const DBusers = await User.find({ displayName: regExp }).select(
			"avatar bio registrationDate profileId givenName familyName birthday"
		);

		const users = DBusers.map(user => ({
			_id: user._id,
			avatar: user.avatar.linkToAvatar,
			bio: user.bio,
			registrationDate: user.registrationDate,
			profileId: user.profileId,
			givenName: user.givenName,
			familyName: user.familyName,
			birthday: user.birthday
		}))

		res.status(200).json({ 
			status: {
				isError: false,
				message: "Done"
			},
			body: {
				users
			}
		});
	} catch (error) {
		next(error);
	}
};
