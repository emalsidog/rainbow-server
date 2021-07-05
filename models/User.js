// Dependenices
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema({
	profileId: {
		type: String,
		required: true,
		unique: true,
	},
	avatar: {
		linkToAvatar: {
			type: String,
			default: process.env.NODE_ENV === "development" 
				? "http://localhost:4000/avatars/default.png" 
				: "https://rainbow-server-api.herokuapp.com/avatars/default.png",
		},
		fileName: {
			type: String,
			default: "default.png",
			required: true,
		},
	},
	bio: {
		type: String,
		default: "",
	},
	birthday: {
		type: Date,
		default: undefined,
	},
	givenName: {
		type: String,
		required: true,
	},
	familyName: {
		type: String,
		required: true,
	},
	displayName: {
		type: String,
		required: true
	},
	accountType: {
		type: String,
		enum: ["DEVELOPER", "MEMBER", "VERIFIED"],
		default: "MEMBER"
	},
	lastSeenOnline: {
		type: Date,
	},
	email: {
		address: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
		},
		otp: {
			type: String,
			default: undefined,
		},
		isChangingProcess: {
			type: Boolean,
			default: false,
		},
		newEmail: {
			type: String,
			default: undefined,
		},
		nextEmailAvailableIn: {
			type: Number,
			default: undefined,
		},
	},
	passwordData: {
		password: {
			type: String,
			required: true,
		},
		lastTimeChanged: {
			type: Date,
			default: new Date(),
		},
	},
	provider: {
		type: String,
		required: true,
	},
	registrationDate: {
		type: Date,
		default: new Date(),
	},
	posts: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: "Post"
	}],
	friendRequests: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: "User"
	}],
	friends: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: "User"
	}]
});

UserSchema.pre("save", async function (next) {
	if (!this.isModified("passwordData.password")) {
		next();
	}

	const salt = await bcrypt.genSalt(10);
	this.passwordData.password = await bcrypt.hash(
		this.passwordData.password,
		salt
	);

	next();
});

UserSchema.methods.comparePasswords = async function (password) {
	return await bcrypt.compare(password, this.passwordData.password);
};

module.exports = User = mongoose.model("User", UserSchema);
