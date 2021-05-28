module.exports = app => {
    app.use("/authentication", require("./authentication-routes"));
    app.use("/settings", require("./user-routes"));
}