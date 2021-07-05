module.exports = (app) => {
	app.use("/authentication", require("./authentication-routes"));
	app.use("/settings", require("./settings-routes"));
	app.use("/posts", require("./post-routes"));
	app.use("/friends", require("./friends-route"));
	app.use("/chats", require("./chats-route"));
	app.use("/users", require("./users-routes"));
};
