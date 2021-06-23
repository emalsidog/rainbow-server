// Models
const User = require("../models/User");

// Utils
const ErrorResponse = require("../utils/error-response");
const checkMongooseId = require("../utils/check-id").checkMongooseId;

// FRIEND REQUEST

exports.friendRequest = async (req, res, next) => {
	const { profileId } = req.body;

	try {
		const currentUser = await User
			.findById(req.user._id)
			.select("friendRequests friends profileId displayName");

		if (!currentUser) {
			return next(new ErrorResponse("Account does not exist", 400));
		}

		const userToAddToFriends = await User
			.findOne({ profileId })
			.select("friendRequests friends givenName");

		if (currentUser.friendRequests.includes(userToAddToFriends._id)) {
			return next(new ErrorResponse(`${userToAddToFriends.givenName} is pending for your response`, 400));
		}

		if (currentUser.friends.includes(userToAddToFriends._id)) {
			return next(new ErrorResponse("This account is already in your friends list", 400));
		}

		if (!userToAddToFriends) {
			return next(new ErrorResponse("Account does not exist", 400));
		}

		if (userToAddToFriends.friendRequests.includes(currentUser._id)) {
			return next(new ErrorResponse(`Already waiting for ${userToAddToFriends.givenName}'s response`, 400));
		}

		userToAddToFriends.friendRequests.push(currentUser._id);
		await userToAddToFriends.save();

		// Notification payload
		const payload = {
			notification: {
				type: "FRIEND_REQUEST",
				data: {
					profileId: currentUser.profileId,
					displayName: currentUser.displayName
				}
			},
			serverData: {
				currentUserId: currentUser._id
			}
		}

		const webSocketPayload = {
			type: "FRIEND_REQUEST",
			payload
		}

		req.wss.clients.forEach((client) => {
			if (client.id.toString() === userToAddToFriends._id.toString()) {
				client.send(JSON.stringify(webSocketPayload));
			}
		});

		res.status(200).json({
			status: {
				isError: false,
				message: "Request sent",
			},
			body: {
				newRequestId: currentUser._id,
				idOfUserToUpdate: userToAddToFriends._id
			}
		});
	} catch (error) {
		next(error);
	}
};

// ACCEPT FRIEND REQUEST

exports.acceptFriendRequest = async (req, res, next) => {
	const { id } = req.body;

	if (!checkMongooseId(id)) {
		return next(new ErrorResponse("ID in invalid", 400));
	}

	try {
		const currentUser = await User.findById(req.user._id);

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

		const payload = {
			notification: {
				type: "FRIEND_REQUEST_ACCEPTED",
				data: {
					displayName: currentUser.displayName
				}
			},
			serverData: {
				idOfUserWhoAccepted: currentUser._id,
				acceptedUserId: userToAccept._id
			},
		}

		const webSocketPayload = {
			type: "FRIEND_REQUEST_ACCEPTED",
			payload
		}
		
		req.wss.clients.forEach((client) => {
			if (client.id.toString() === userToAccept._id.toString()) {
				client.send(JSON.stringify(webSocketPayload));
			}
		});

		res.status(200).json({
			status: {
				isError: false,
				message: "Request accepted",
			},
			body: {
				newFriendId: userToAccept._id,
			}
		});
	} catch (error) {
		next(error);
	}
};

// DECLINE FRIEND REQUEST

exports.declineFriendRequest = async (req, res, next) => {
	const { id } = req.body;

	if (!checkMongooseId(id)) {
		return next(new ErrorResponse("ID in invalid", 400));
	}

	try {
		const user = await User.findById(req.user._id).select("friendRequests");
		if (!user) {
			return next(new ErrorResponse("Account does not exist"));
		}

		if (!user.friendRequests.includes(id)) {
			return next(new ErrorResponse("This user is not waiting for your response", 400));
		}

		user.friendRequests = user.friendRequests.filter(pendingId => id.toString() !== pendingId.toString());
		await user.save();

		res.status(200).json({
			status: {
				isError: false,
				message: "Request declined"
			}
		})

	} catch (error) {
		next(error);
	}
}

// CANCEL FRIEND REQUEST

exports.cancelFriendRequest = async (req, res, next) => {
	const { id } = req.body;

	if (!checkMongooseId(id)) {
		return next(new ErrorResponse("ID in invalid", 400));
	}

	try {
		const user = await User.findById(id).select("friendRequests");
		if (!user) {
			return next(new ErrorResponse("Account does not exist", 400));
		}

		if (!user.friendRequests.includes(req.user._id)) {
			return next(new ErrorResponse("You are not waiting for response from this user", 400));
		}

		user.friendRequests = user.friendRequests.filter(requestId => requestId.toString() !== req.user._id.toString());
		await user.save();

		res.status(200).json({
			status: {
				isError: false,
				message: "Request cancelled"
			}
		});
	} catch (error) {
		next(error);
	}
}

// REMOVE FROM FRIENDS

exports.removeFromFriends = async (req, res, next) => {
	const { id } = req.body;

	if (!checkMongooseId(id)) {
		return next(new ErrorResponse("ID in invalid", 400));
	}

	try {
		const currentUser = await User.findById(req.user._id).select("friends");
		if (!currentUser) {
			return next(new ErrorResponse("Account does not exist", 400));
		}

		if (!currentUser.friends.includes(id)) {
			return next(new ErrorResponse("This user is not your friend", 400));
		}

		const userToRemove = await User.findById(id).select("friends");
		if (!userToRemove) {
			return next(new ErrorResponse("Account does not exist", 400));
		}

		if (!userToRemove.friends.includes(currentUser._id)) {
			return next(new ErrorResponse("You are not this users's friend", 400));
		}

		currentUser.friends = currentUser.friends.filter(friendId => friendId.toString() !== id.toString());
		userToRemove.friends = userToRemove.friends.filter(friendId => friendId.toString() !== currentUser._id.toString());

		await currentUser.save();
		await userToRemove.save();

		res.status(200).json({
			status: {
				isError: false,
				message: "Removed :("
			}
		});
	} catch (error) {
		next(error);
	}
}