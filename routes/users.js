const express = require("express");
const wrapAsync = require("../utils/wrapAsync.js");
const router = express.Router();
const User = require("../models/user.js");
const passport = require("passport");
const { saveRedirect } = require("../middleware.js");
const UserController = require("../controllers/users.js");

router.get("/", (req, res) => {
  res.render("home");
});


router.route("/signup")
.get(UserController.signup)
.post(
  wrapAsync(UserController.postSignup),
);

router.route("/login")
.get(UserController.login)
.post(
  saveRedirect,
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  UserController.postLogin
);

router.get("/logout", UserController.logout);

module.exports = router;
