// Dependencies
const router = require ("express").Router();

// Controllers
const Post = require("../controllers/post-controller");

// Middleware
const authenticate = require("../middleware/authenticate");
const validate = require("../input-validation/post-validation");

router.post("/", authenticate, Post.getPosts)

router.post("/add-post", authenticate, validate("addPost"), Post.addPost);

router.post("/delete-post", authenticate, Post.deletePost);

router.post("/edit-post", authenticate, validate("editPost"), Post.editPost);

module.exports = router;