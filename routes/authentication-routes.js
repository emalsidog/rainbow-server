// Dependencies
const router = require ("express").Router();

// Controllers
const Authentication = require("../controllers/authentication-controller");

// Middleware
const validate = require("../input-validation/authentication-validation");
const authenticate = require("../middleware/authenticate");

router.post("/register", validate("register"), Authentication.register);

router.post("/activate", Authentication.activate);

router.post("/login", validate("login"), Authentication.login);

router.get("/refresh", Authentication.refresh);

router.post("/forgot", Authentication.forgot);

router.post("/reset", Authentication.reset);

router.get("/current-user", authenticate, Authentication.getCurrentUser);

router.get("/logout", authenticate, Authentication.logout);

module.exports = router;