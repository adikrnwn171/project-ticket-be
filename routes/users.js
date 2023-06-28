const router = require("express").Router();

// controller
const User = require("../controller/usersController");

// middleware
const Authentication = require("../middlewares/authenticate");

// API
router.post("/register", User.register);
router.post("/login", User.login);
router.post("/verify", User.verifyOTP);
router.put("/update", Authentication, User.updateUser);
router.post("/generate-password", User.generateLink);
router.put("/reset-password", User.resetPassword);
router.delete("/:id", User.deleteUser);
router.get("/", User.getAllUsers);
router.get("/user-info", Authentication, User.getUserByToken);

module.exports = router;
