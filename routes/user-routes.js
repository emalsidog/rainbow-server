// Dependencies
const router = require ("express").Router();

// Controllers
const Settings = require("../controllers/user-controller");

// Middleware
const authenticate = require("../middleware/authenticate");
const validate = require("../input-validation/user-settings-validation");

router.post("/change-name", authenticate, validate("changeDisplayName"), Settings.changeDisplayName);

router.post("/change-profileId", authenticate, validate("changeProfileId"), Settings.changeProfileId);

router.post("/change-email-request", authenticate, validate("changeEmailRequest"), Settings.changeEmailRequest);

router.post("/change-email", authenticate, validate("changeEmail"), Settings.changeEmail);

router.get("/change-email-abort", authenticate, Settings.changeEmailAbort);

router.post("/delete", authenticate, validate("deleteAccount"), Settings.deleteAccount);

router.post("/change-password", authenticate, validate("changePassword"), Settings.changePassword);

module.exports = router;