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
			const user = await User.findById(req.user._id)
				.populate("posts", "isPublic timePosted postText")
				.populate("friends", "avatar givenName profileId")
				.populate("friendRequests", "avatar displayName bio profileId");

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
						givenName: req.user.givenName,
						familyName: req.user.familyName,
						
						birthday: req.user.birthday,
						registrationDate: req.user.registrationDate,

						posts,
						friends: user.friends,
						friendRequests: user.friendRequests
					},
					isCurrentUser: true,
				},
			});
		}

		const user = await User.findOne({ profileId: id })
			.select("-passwordData -email -provider")
			.populate("posts", "isPublic timePosted postText")
			.populate("friends", "avatar givenName profileId")
			.populate("friendRequests", "avatar displayName bio profileId");

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
					givenName: user.givenName,
					familyName: user.familyName,

					birthday: user.birthday,
					registrationDate: user.registrationDate,

					posts,
					friends: user.friends,
					friendRequests: user.friendRequests
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
	const { options, requestOptions } = req.body;

	const limit = 24;
	const skip = limit * (requestOptions.page - 1);
	const selectString = "-passwordData -email -provider";

	let users = [];
	try {	
		if (!options) {
			users = await User
				.find({ _id: { $ne: req.user._id } })
				.select(selectString)
				.skip(skip)
				.limit(limit);
			const [transformedUsers, hasMoreData] = transformUsers(users, limit);
			
			return res.status(200).json({
				status: {
					isError: false,
					message: "",
				},
				body: {
					users: transformedUsers,
					meta: {
						hasMoreData,
						hasMoreSearchedData: true
					}
				},
			});
		}

		const { displayName } = options;

		const filter = {
			displayName: {
				$regex: new RegExp(displayName.toLowerCase(), "i"),
			},
			_id: {
				$ne: req.user._id,
			},
		};

		users = await User
			.find(filter)
			.select(selectString)
			.skip(skip)
			.limit(limit);
		const [transformedUsers, hasMoreData] = transformUsers(users, limit);

		res.status(200).json({
			status: {
				isError: false,
				message: "",
			},
			body: {
				users: transformedUsers,
				meta: {
					hasMoreSearchedData: hasMoreData,
					hasMoreData: true
				}
			},
		});
	} catch (error) {
		next(error);
	}
};

const transformUsers = (users, limit) => {
	let hasMoreData = true;
	const tranformedUsers = users.map((user) => {

		return {
			...user._doc,
			avatar: user.avatar.linkToAvatar,
		}
	});

	if (tranformedUsers.length < limit) {
		hasMoreData = false;
	}
	
	return [tranformedUsers, hasMoreData];
}