// Models
const User = require("../models/User");

// Utils
const ErrorResponse = require("../utils/error-response");

exports.friendRequest = async (req, res, next) => {
	const { profileId } = req.body;

	try {
		const currentUser = await User.findById(req.user._id).select(
			"friendRequests friends"
		);
		if (!currentUser) {
			return next(new ErrorResponse("Account does not exist", 400));
		}

		const userToAddToFriends = await User.findOne({ profileId }).select(
			"friendRequests friends"
		);
		if (!userToAddToFriends) {
			return next(new ErrorResponse("Account does not exist", 400));
		}

		if (currentUser.friendRequests.includes(userToAddToFriends._id)) {
			return next(
				new ErrorResponse("This account is pending for your response")
			);
		}

		if (userToAddToFriends.friendRequests.includes(currentUser._id)) {
			return next(new ErrorResponse("Already waiting for user response"));
		}

		if (currentUser.friends.includes(userToAddToFriends._id)) {
			return next(
				new ErrorResponse(
					"This account is already in your friends list"
				)
			);
		}

		userToAddToFriends.friendRequests.push(currentUser._id);
		await userToAddToFriends.save();

		req.wss.clients.forEach((client) => {
			if (client.id.toString() === userToAddToFriends._id.toString()) {
				client.send(JSON.stringify({ bruh: "bruh" }));
			}
		});

		res.status(200).json({
			status: {
				isError: false,
				message: "Request sent",
			},
		});
	} catch (error) {
		next(error);
	}
};

exports.acceptFriendRequest = async (req, res, next) => {
	const { id } = req.body;
	try {
		const currentUser = await User.findById(req.user._id);

		console.log(currentUser.friendRequests);

		if (!currentUser.friendRequests.includes(id)) {
			return next(
				new ErrorResponse("Account is not in your pending requests")
			);
		}

		const userToAccept = await User.findById(id);
		if (!userToAccept) {
			return next(new ErrorResponse("Account does not exist"));
		}

		currentUser.friendRequests = currentUser.friendRequests.filter(
			(requestId) => requestId.toString() !== id.toString()
		);
		currentUser.friends.push(id);
		userToAccept.friends.push(currentUser._id);

		await currentUser.save();
		await userToAccept.save();

		res.status(200).json({
			status: {
				isError: false,
				message: "Request accepted",
			},
		});
	} catch (error) {
		next(error);
	}
};
