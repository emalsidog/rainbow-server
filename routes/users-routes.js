// Dependencies
const router = require("express").Router();

// Controllers
const Users = require("../controllers/users-controller");

// Middleware
const authenticate = require("../middleware/authenticate");

router.get("/:id", authenticate, Users.getUser);

router.post("/search", authenticate, Users.searchUser);

router.post("/last-seen", Users.getLastSeen);

module.exports = router;
