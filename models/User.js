// Dependenices
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema({
	profileId: {
		type: String,
		required: true,
		unique: true,
	},
	givenName: {
		type: String,
		required: true,
	},
	familyName: {
		type: String,
		required: true,
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
	password: {
		type: String,
		required: true,
	},
	provider: {
		type: String,
		required: true,
	},
	registrationDate: {
		type: Date,
		default: new Date(),
	},
});

UserSchema.pre("save", async function (next) {
	if (!this.isModified("password")) {
		next();
	}

	const salt = await bcrypt.genSalt(10);
	this.password = await bcrypt.hash(this.password, salt);

	next();
});

UserSchema.methods.comparePasswords = async function (password) {
	return await bcrypt.compare(password, this.password);
};

module.exports = User = mongoose.model("User", UserSchema);
