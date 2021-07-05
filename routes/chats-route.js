// Dependencies
const router = require("express").Router();

// Controllers
const Chats = require("../controllers/chats-controller");

// Middleware
const authenticate = require("../middleware/authenticate");

router.post("/create", authenticate, Chats.createChat);

module.exports = router;