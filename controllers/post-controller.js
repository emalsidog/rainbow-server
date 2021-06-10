// Dependencies
const { validationResult } = require("express-validator");

// Models
const User = require("../models/User");
const Post = require("../models/Post");

// Utils
const ErrorResponse = require("../utils/error-response");
const sendMail = require("../utils/send-mail");

// ADD POST

exports.addPost = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const message = errors.array()[0].msg;
		return next(new ErrorResponse(message, 422));
	}

	const { text, isPublic } = req.body;

	if (typeof isPublic !== "boolean") {
		return next(new ErrorResponse("Invalid request", 400));
	}

	try {

        const user = await User.findById(req.user._id);
        if (!user) {
            return next(new ErrorResponse("Account does not exist", 400));
        }

		const newPost = new Post({
			text,
			isPublic,
			author: req.user._id,
		});

        user.posts.push(newPost._id);

        await user.save();
		await newPost.save();

		req.wss.clients.forEach(client => {
			if (client.id.toString() !== req.user._id.toString()) {
				client.send(JSON.stringify(newPost));
			}
		});

		res.status(200).json({
			status: {
				isError: false,
				message: "Successfully added",
			},
			body: {
				newPost,
			},
		});
	} catch (error) {
		next(error);
	}
};
