// Dependencies
const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
});

module.exports = Chat = mongoose.model("Chat", ChatSchema);