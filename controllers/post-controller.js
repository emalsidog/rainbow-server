// Dependencies
const { validationResult } = require("express-validator");

// Models
const User = require("../models/User");
const Post = require("../models/Post");

// Utils
const ErrorResponse = require("../utils/error-response");
const checkMongooseId = require("../utils/check-id").checkMongooseId;

// GET POSTS

exports.getPosts = async (req, res, next) => {
	const { id, page, isCurrentUser } = req.body;

	const limit = 5;
	const skip = limit * (page - 1);

	let match = null;

	if (!isCurrentUser) {
		match = {
			isPublic: true,
		};
	}

	try {
		const user = await User.findById(id)
			.select("posts")
			.populate({
				path: "posts",
				select: "isPublic timePosted postText",
				skip,
				limit,
				match,
				options: {
					sort: { timePosted: -1 },
				},
			});

		const posts = user.posts.map((post) => {
			const { postText, isPublic, _id, timePosted } = post;
			return {
				postText,
				isPublic,
				postId: _id,
				timePosted,
			};
		});

		res.status(200).json({
			status: {
				isError: false,
				message: "Done",
			},
			body: {
				hasMorePosts: !(posts.length < limit),
				posts,
				isCurrentUser,
			},
		});
	} catch (error) {
		next(error);
	}
};

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
			timePosted: new Date(),
		});

		const post = {
			postText: newPost.postText,
			isPublic: newPost.isPublic,
			postId: newPost._id,
			timePosted: newPost.timePosted,
		};

		user.posts.push(newPost._id);

		await user.save();
		await newPost.save();

		if (isPublic) {
			const webSocketPayload = {
				type: "NEW_POST_ADDED",
				payload: post,
			};

			req.wss.clients.forEach((client) => {
				if (client.id.toString() !== req.user._id.toString()) {
					client.send(JSON.stringify(webSocketPayload));
				}
			});
		}

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

// DELETE POST

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

// EDIT POST

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
			timePosted: post.timePosted,
		};

		let payload;

		if (post.isPublic) {
			payload = {
				updatedPost,
				action: "UPDATE",
			};
		} else if (!post.isPublic) {
			payload = {
				postId,
				action: "REMOVE",
			};
		}

		const webSocketPayload = {
			type: "POST_UPDATED",
			payload,
		};

		req.wss.clients.forEach((client) => {
			if (client.id.toString() !== req.user._id.toString()) {
				client.send(JSON.stringify(webSocketPayload));
			}
		});

		res.status(200).json({
			status: {
				isError: false,
				message: "Successfully saved",
			},
			body: {
				updatedPost,
			},
		});
	} catch (error) {
		next(error);
	}
};
