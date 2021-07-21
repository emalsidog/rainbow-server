// Dependencies
const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema({
	chatId: {
		type: String,
		required: true,
	},
	creator: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
	},
	participants: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
	],
	messages: [
		{
			type: String,
			ref: "Message",
		},
	],
});

module.exports = Chat = mongoose.model("Chat", ChatSchema);
