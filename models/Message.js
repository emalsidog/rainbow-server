// Dependencies
const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
	_id: String,
	text: {
		type: String,
		required: true,
	},
	time: {
		type: Date,
		default: new Date(),
	},
	sender: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
	},
	chatId: {
		type: String,
		required: true,
	},
	messageId: {
		type: String,
		required: true,
	},
	isEdited: {
		type: Boolean,
		default: false,
	},
	timeEdited: {
		type: Date,
	},
	repliedToMessage: {
		type: String,
		ref: "Message",
	},
	isForwarded: {
		type: Boolean,
		default: false,
	},
});

module.exports = Message = mongoose.model("Message", MessageSchema);
