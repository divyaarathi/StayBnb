const User = require("../models/user.js");

// ------------------ SIGNUP FORM ------------------
module.exports.signup = (req, res) => {
  res.render("users/signup.ejs");
};

// ------------------ HANDLE SIGNUP ------------------
module.exports.postSignup = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const newUser = new User({ username, email });
    const registeredUser = await User.register(newUser, password);

    // Auto-login after signup
    req.login(registeredUser, (err) => {
      if (err) return next(err);

      req.flash("success", "Welcome to StayBnb!");
      res.redirect("/listings");
    });
  } catch (err) {
    req.flash("error", err.message);
    res.redirect("/signup");
  }
};

// ------------------ LOGIN FORM ------------------
module.exports.login = (req, res) => {
  res.render("users/login.ejs");
};

// ------------------ HANDLE LOGIN ------------------
module.exports.postLogin = (req, res) => {
  req.flash("success", "Welcome back to StayBnb!");

  const redirectUrl = res.locals.redirectUrl || "/listings";
  res.redirect(redirectUrl);
};

// ------------------ LOGOUT ------------------
module.exports.logout = (req, res, next) => {
  req.logout(function (err) {
    if (err) return next(err);

    req.flash("success", "Logged out successfully!");
    res.redirect("/listings");
  });
};
