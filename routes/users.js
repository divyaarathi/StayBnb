const express = require("express");
const router = express.Router();
const passport = require("passport");

const UserController = require("../controllers/users");
const { saveRedirect } = require("../middleware");
const wrapAsync = require("../utils/wrapAsync");

// ------------------ HOME ------------------
router.get("/", (req, res) => {
  res.render("home");
});

// ------------------ SIGNUP ------------------
router
  .route("/signup")
  .get(UserController.signup)
  .post(wrapAsync(UserController.postSignup));

// ------------------ LOGIN ------------------
router
  .route("/login")
  .get(UserController.login)
  .post(
    saveRedirect,
    passport.authenticate("local", {
      failureFlash: true,
      failureRedirect: "/login",
    }),
    UserController.postLogin
  );

// ------------------ LOGOUT ------------------
router.get("/logout", UserController.logout);

module.exports = router;
