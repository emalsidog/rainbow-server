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

	for (let participantId of participants) {
		if (!req.user.friends.includes(participantId))
			return next(
				new ErrorResponse(
					`User with id ${participantId} is not your friend`
				),
				400
			);
	}

	const nanoid = customAlphabet(alphabet, 30);

	const newChat = new Chat({
		chatId: nanoid(),
		creator: req.user._id,
		participants,
	});

	try {
		await newChat.save();

		return res.status(200).json({
			status: {
				isError: false,
				message: "Done",
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
			});

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
