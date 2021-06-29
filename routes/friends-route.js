// Dependencies
const router = require ("express").Router();

// Controllers
const Friends = require("../controllers/friends-controller");

// Middleware
const authenticate = require("../middleware/authenticate");

router.post("/", authenticate, Friends.getPopulatedFriends);

router.post("/requests", authenticate, Friends.getPopulatedFriendRequests);

router.post("/friend-request", authenticate, Friends.friendRequest);

router.post("/accept-friend-request", authenticate, Friends.acceptFriendRequest);

router.post("/decline-friend-request", authenticate, Friends.declineFriendRequest);

router.post("/cancel-friend-request", authenticate, Friends.cancelFriendRequest);

router.post("/remove-friend", authenticate, Friends.removeFromFriends);

module.exports = router;