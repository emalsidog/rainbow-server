// Dependencies
const jwt = require("jsonwebtoken");
const { v4 } = require("uuid");

exports.createAccessToken = (userId) => {
	return jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
		expiresIn: process.env.ACCESS_TOKEN_EXPIRE,
	});
};

exports.createRefreshToken = () => {
	const tokenId = v4();
	const refreshToken = jwt.sign(
		{ tokenId },
		process.env.REFRESH_TOKEN_SECRET,
		{
			expiresIn: REFRESH_TOKEN_EXPIRE,
		}
	);
	return {
		tokenId,
		refreshToken,
	};
};

exports.updateRefreshToken = async (tokenId, userId) => {
    await Token.findOneAndRemove({ userId });
    await Token.create({ tokenId, userId });
}