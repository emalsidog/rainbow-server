// Dependencies
const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
	text: {
		type: String,
		required: true,
	},
	timePosted: {
		type: Date,
		default: new Date(),
	},
	author: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
	},
    isPublic: {
        type: Boolean,
        default: true
    }
});

module.exports = Post = mongoose.model("Post", PostSchema);