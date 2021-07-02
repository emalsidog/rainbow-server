// Models
const User = require("../models/User");

// Utils
const ErrorResponse = require("../utils/error-response");
const checkMongooseId = require("../utils/check-id").checkMongooseId;

// GET FRIENDS

exports.getPopulatedFriends = async (req, res, next) => {
	const { options, requestOptions } = req.body;
	
	const limit = 24;
	const skip = limit * (requestOptions.page - 1);

	try {
		if (!options) {
			const { friends } = await User.findById(req.user._id)
				.select("friends")
				.populate({
					path: "friends",
					select: "-passwordData -email -provider -posts -__v",
					limit,
					skip
				});
	
			const transformedFriends = friends.map((friend) => {
				return {
					...friend._doc,
					avatar: friend.avatar.linkToAvatar,
				};
			});
			
			return res.status(200).json({
				status: {
					isError: false,
					message: "Done",
				},
				body: {
					friends: transformedFriends,
					meta: {
						hasMoreData: !(transformedFriends.length < limit),
						hasMoreSearchedData: true,
						usersNeedToBeCleared: requestOptions.page === 1
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

		const { friends } = await User
			.findById(req.user._id)
			.select("friends")
			.populate({
				path: "friends",
				select: "-passwordData -email -provider -posts -__v",
				limit,
				skip,
				match: filter
			});

		const transformedFriends = friends.map((friend) => {
			return {
				...friend._doc,
				avatar: friend.avatar.linkToAvatar,
			};
		});

		res.status(200).json({
			status: {
				isError: false,
				message: "",
			},
			body: {
				friends: transformedFriends,
				meta: {
					hasMoreSearchedData: !(transformedFriends.length < limit),
					hasMoreData: true,
					usersNeedToBeCleared: requestOptions.page === 1
				}
			},
		});
	} catch (error) {
		next(error);
	}	
};

// GET FRIEND REQUESTS

exports.getPopulatedFriendRequests = async (req, res, next) => {

	const { requestOptions } = req.body;

	const limit = 24;
	const skip = limit * (requestOptions.page - 1);

	try {
		const { friendRequests } = await User.findById(req.user._id)
			.select("friendRequests")
			.populate({
				path: "friendRequests",
				select: "-passwordData -email -provider -posts -__v",
				skip,
				limit
			});

		const transformedRequests = friendRequests.map((friend) => {
			return {
				...friend._doc,
				avatar: friend.avatar.linkToAvatar,
			};
		});

		res.status(200).json({
			status: {
				isError: false,
				message: "Done",
			},
			body: {
				friendRequests: transformedRequests,
				hasMoreData: !(transformedRequests.length < limit)
			},
		});
	} catch (error) {
		next(error);
	}
};

// FRIEND REQUEST

exports.friendRequest = async (req, res, next) => {
	const { profileId } = req.body;

	try {
		const currentUser = await User.findById(req.user._id).select(
			"friendRequests friends profileId displayName"
		);

		if (!currentUser) {
			return next(new ErrorResponse("Account does not exist", 400));
		}

		const userToAddToFriends = await User.findOne({ profileId }).select(
			"friendRequests friends givenName"
		);

		if (currentUser.friendRequests.includes(userToAddToFriends._id)) {
			return next(
				new ErrorResponse(
					`${userToAddToFriends.givenName} is pending for your response`,
					400
				)
			);
		}

		if (currentUser.friends.includes(userToAddToFriends._id)) {
			return next(
				new ErrorResponse(
					"This account is already in your friends list",
					400
				)
			);
		}

		if (!userToAddToFriends) {
			return next(new ErrorResponse("Account does not exist", 400));
		}

		if (userToAddToFriends.friendRequests.includes(currentUser._id)) {
			return next(
				new ErrorResponse(
					`Already waiting for ${userToAddToFriends.givenName}'s response`,
					400
				)
			);
		}

		userToAddToFriends.friendRequests.push(currentUser._id);
		await userToAddToFriends.save();

		const webSocketPayload = {
			type: "FRIEND_REQUEST",
			payload: {
				notification: {
					type: "FRIEND_REQUEST",
					data: {
						profileId: currentUser.profileId,
						displayName: currentUser.displayName,
					},
				},
				serverData: {
					currentUserId: currentUser._id,
					requestsCount: userToAddToFriends.friendRequests.length
				},
			},
		};

		console.log("========================");
		req.wss.clients.forEach((client) => {
			console.log(client.id)
			if (client.id.toString() === userToAddToFriends._id.toString()) {
				client.send(JSON.stringify(webSocketPayload));
			}
		});
		console.log("========================");

		res.status(200).json({
			status: {
				isError: false,
				message: "Request sent",
			},
			body: {
				newRequestId: currentUser._id,
				idOfUserToUpdate: userToAddToFriends._id,
			},
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

		const webSocketPayload = {
			type: "FRIEND_REQUEST_ACCEPTED",
			payload: {
				notification: {
					type: "FRIEND_REQUEST_ACCEPTED",
					data: {
						displayName: currentUser.displayName,
					},
				},
				serverData: {
					idOfUserWhoAccepted: currentUser._id,
					acceptedUserId: userToAccept._id,
				},
			},
		};

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
				requestsCount: currentUser.friendRequests.length
			},
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
			return next(
				new ErrorResponse(
					"This user is not waiting for your response",
					400
				)
			);
		}

		user.friendRequests = user.friendRequests.filter(
			(pendingId) => id.toString() !== pendingId.toString()
		);
		await user.save();

		const webSocketPayload = {
			type: "FRIEND_REQUEST_DECLINED",
			payload: {
				serverData: {
					declinedRequestId: id,
					idOfUserWhoDeclined: user._id,
				},
			},
		};

		req.wss.clients.forEach((client) => {
			if (client.id.toString() === id.toString()) {
				client.send(JSON.stringify(webSocketPayload));
			}
		});

		res.status(200).json({
			status: {
				isError: false,
				message: "Request declined",
			},
			body: {
				declinedRequestId: id,
				requestsCount: user.friendRequests.length
			},
		});
	} catch (error) {
		next(error);
	}
};

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
			return next(
				new ErrorResponse(
					"You are not waiting for response from this user",
					400
				)
			);
		}

		user.friendRequests = user.friendRequests.filter(
			(requestId) => requestId.toString() !== req.user._id.toString()
		);
		await user.save();

		const webSocketPayload = {
			type: "FRIEND_REQUEST_CANCELLED",
			payload: {
				serverData: {
					idOfUserWhoCancelled: req.user._id,
					requestsCount: user.friendRequests.length
				},
			},
		};

		req.wss.clients.forEach((client) => {
			if (client.id.toString() === id.toString()) {
				client.send(JSON.stringify(webSocketPayload));
			}
		});

		res.status(200).json({
			status: {
				isError: false,
				message: "Request cancelled",
			},
			body: {
				idOfUserWhoCancelled: req.user._id,
				userWhoHasRequest: id,
			},
		});
	} catch (error) {
		next(error);
	}
};

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
			return next(
				new ErrorResponse("You are not this users's friend", 400)
			);
		}

		currentUser.friends = currentUser.friends.filter(
			(friendId) => friendId.toString() !== id.toString()
		);
		userToRemove.friends = userToRemove.friends.filter(
			(friendId) => friendId.toString() !== currentUser._id.toString()
		);

		await currentUser.save();
		await userToRemove.save();

		const webSocketPayload = {
			type: "FRIEND_REMOVED",
			payload: {
				serverData: {
					idOfUserWhoHasFriend: userToRemove._id,
					idOfUserToRemove: currentUser._id,
				},
			},
		};

		req.wss.clients.forEach((client) => {
			if (client.id.toString() === id.toString()) {
				client.send(JSON.stringify(webSocketPayload));
			}
		});

		res.status(200).json({
			status: {
				isError: false,
				message: "Removed :(",
			},
			body: {
				idOfUserToRemove: userToRemove._id,
				idOfUserWhoHasFriend: currentUser._id,
			},
		});
	} catch (error) {
		next(error);
	}
};
