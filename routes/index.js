module.exports = (app) => {
	app.use("/authentication", require("./authentication-routes"));
	app.use("/settings", require("./settings-routes"));
	app.use("/users", require("./users-routes"));
	app.use("/posts", require("./post-routes"));
};
