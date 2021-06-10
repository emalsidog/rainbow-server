// Dependencies
const router = require ("express").Router();

// Controllers
const Settings = require("../controllers/settings-controller");

// Middleware
const authenticate = require("../middleware/authenticate");
const validate = require("../input-validation/user-settings-validation");

// Multer config
const upload = require("../config/multer-config").upload;

router.post("/change-name", authenticate, validate("changeDisplayName"), Settings.changeDisplayName);

router.post("/change-profileId", authenticate, validate("changeProfileId"), Settings.changeProfileId);

router.post("/change-email-request", authenticate, validate("changeEmailRequest"), Settings.changeEmailRequest);

router.post("/change-email", authenticate, validate("changeEmail"), Settings.changeEmail);

router.get("/change-email-abort", authenticate, Settings.changeEmailAbort);

router.post("/delete", authenticate, validate("deleteAccount"), Settings.deleteAccount);

router.post("/change-password", authenticate, validate("changePassword"), Settings.changePassword);

router.post("/change-avatar", authenticate, upload.single("avatar"), Settings.changeAvatar);

router.post("/change-bio", authenticate, validate("changeBio"), Settings.changeBio);

router.post("/change-birthday", authenticate, validate("changeBirthday"), Settings.changeBirthday);

module.exports = router;