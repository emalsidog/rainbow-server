// Dependencies
const { validationResult } = require("express-validator");
const ObjectId = require("mongoose").Types.ObjectId;

// Models
const User = require("../models/User");
const Post = require("../models/Post");

// Utils
const ErrorResponse = require("../utils/error-response");

// ADD POST

exports.addPost = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const message = errors.array()[0].msg;
		return next(new ErrorResponse(message, 422));
	}

	const { postText, isPublic } = req.body;

	if (typeof isPublic !== "boolean") {
		return next(new ErrorResponse("Invalid request", 400));
	}

	try {
		const user = await User.findById(req.user._id);
		if (!user) {
			return next(new ErrorResponse("Account does not exist", 400));
		}

		const newPost = new Post({
			postText,
			isPublic,
			author: req.user._id,
		});

		const post = {
			postText: newPost.postText,
			isPublic: newPost.isPublic,
			postId: newPost._id,
			timePosted: newPost.timePosted,
		};

		const webSocketPayload = {
			type: "NEW_POST_ADDED",
			payload: post,
		};

		user.posts.push(newPost._id);

		await user.save();
		await newPost.save();

		req.wss.clients.forEach((client) => {
			if (client.id.toString() !== req.user._id.toString()) {
				client.send(JSON.stringify(webSocketPayload));
			}
		});

		res.status(200).json({
			status: {
				isError: false,
				message: "Successfully added",
			},
			body: {
				post,
			},
		});
	} catch (error) {
		next(error);
	}
};

exports.deletePost = async (req, res, next) => {
	const { postId } = req.body;

	if (!checkMongooseId(postId)) {
		return next(new ErrorResponse("ID in invalid", 400));
	}

	try {
		const user = await User.findById(req.user._id)
			.select("posts")
			.populate("posts", "isPublic timePosted postText");

		if (!user) {
			return next(new ErrorResponse("Account does not exist", 400));
		}

		const newPostsArray = user.posts.filter(
			(post) => post._id.toString() !== postId.toString()
		);
		user.posts = newPostsArray;

		await Post.findByIdAndDelete(postId);
		await user.save();

		const webSocketPayload = {
			type: "DELETE_POST",
			payload: postId,
		};

		req.wss.clients.forEach((client) => {
			if (client.id.toString() !== req.user._id.toString()) {
				client.send(JSON.stringify(webSocketPayload));
			}
		});

		res.status(200).json({
			status: {
				isError: false,
				message: "Successfully deleted",
			},
			body: {
				postToDelete: postId,
			},
		});
	} catch (error) {
		next(error);
	}
};

exports.editPost = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const message = errors.array()[0].msg;
		return next(new ErrorResponse(message, 422));
	}

	const { postText, isPublic, postId } = req.body;

	if (!checkMongooseId(postId)) {
		return next(new ErrorResponse("ID in invalid", 400));
	}

	if (typeof isPublic !== "boolean") {
		return next(new ErrorResponse("Invalid request", 400));
	}

	try {
		const post = await Post.findByIdAndUpdate(
			postId,
			{
				postText,
				isPublic,
			},
			{ new: true }
		);

		const updatedPost = {
			postText: post.postText,
			isPublic: post.isPublic,
			postId: postId,
		};

		const webSocketPayload = {
			type: "POST_UPDATED",
			payload: updatedPost
		}

		req.wss.clients.forEach((client) => {
			if (client.id.toString() !== req.user._id.toString()) {
				client.send(JSON.stringify(webSocketPayload));
			}
		});

		res.status(200).json({
			status: {
				isError: false,
				message: "Successfully saved"
			}, 
			body: {
				updatedPost
			}
		})

	} catch (error) {
		next(error);
	}
};

const checkMongooseId = (id) => {
	if (!id) {
		return false;
	}

	if (typeof id !== "string") {
		return false;
	}

	if (!ObjectId.isValid(id)) {
		return false;
	}

	return true;
};
