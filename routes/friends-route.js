// Dependencies
const router = require ("express").Router();

// Controllers
const Friends = require("../controllers/friends-controller");

// Middleware
const authenticate = require("../middleware/authenticate");

router.post("/friend-request", authenticate, Friends.friendRequest);

router.post("/accept-friend-request", authenticate, Friends.acceptFriendRequest);

module.exports = router;