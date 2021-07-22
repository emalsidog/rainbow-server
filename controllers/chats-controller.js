// Dependencies
const { customAlphabet } = require("nanoid");
const alphabet = "0123456789";

// Models
const Chat = require("../models/Chat");
const User = require("../models/User");

// Utils
const ErrorResponse = require("../utils/error-response");

exports.createChat = async (req, res, next) => {
	const { participants } = req.body;

	const currentUserId = req.user._id;

	for (let participantId of participants) {
		if (!req.user.friends.includes(participantId))
			return next(
				new ErrorResponse(
					`User with id ${participantId} is not your friend`
				),
				400
			);
	}

	const chat = await Chat.findOne({
		$or: [
			{
				creator: currentUserId,
				participants,
			},
			{
				participants: { $in: [currentUserId] },
			},
		],
	}).select("-__v -_id");

	if (chat) {
		return res.status(200).json({
			status: {
				isError: false,
				message: "Redirecting...",
			},
			body: {
				chatId: chat.chatId,
			},
		});
	}

	const nanoid = customAlphabet(alphabet, 30);

	const createdChat = {
		chatId: nanoid(),
		creator: req.user._id,
		participants,
		messages: [],
	};

	const newChat = new Chat(createdChat);

	try {
		const chat = await newChat.save();
		const popualtedChat = await chat
			.populate({
				path: "participants",
				select: "avatar.linkToAvatar givenName familyName profileId _id",
			})
			.populate({
				path: "creator",
				select: "avatar.linkToAvatar givenName familyName profileId _id",
			})
			.execPopulate();

		req.wss.clients.forEach((client) => {
			if (participants.includes(client.id)) {
				client.send(
					JSON.stringify({
						type: "NEW_CHAT_CREATED",
						payload: popualtedChat,
					})
				);
			}
		});

		return res.status(200).json({
			status: {
				isError: false,
				message: "Chat created",
			},
			body: {
				chatId: createdChat.chatId,
			},
		});
	} catch (error) {
		next(error);
	}
};

exports.getChats = async (req, res, next) => {
	const currentUserId = req.user._id;
	const selectString =
		"avatar.linkToAvatar givenName familyName profileId _id";

	try {
		const chats = await Chat.find({
			$or: [
				{ creator: currentUserId },
				{ participants: { $in: [currentUserId] } },
			],
		})
			.select("-_id -__v")
			.populate({
				path: "participants",
				select: selectString,
			})
			.populate({
				path: "creator",
				select: selectString,
			})
			.populate({
				path: "messages",

				populate: {
					path: 'repliedToMessage',
					model: 'Message'
				}
			})

		res.status(200).json({
			status: {
				isError: false,
				message: "Done",
			},
			body: {
				chats,
			},
		});
	} catch (error) {
		next(error);
	}
};
