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

    const newChat = new Chat({
        participants
    });

    try {
        const user = await User.findById(req.user._id);
        user.chats.push(newChat._id);
    
        await user.save();
        await newChat.save();
    
        return res.status(200).json({
            status: {
                isError: false,
                message: "Done"
            }
        });
    } catch (error) {
        next(error);   
    }
};

exports.getChats = async (req, res, next) => {
    
};