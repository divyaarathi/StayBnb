// ------------------ Load environment variables ------------------
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// ------------------ Import packages ------------------
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");

// ------------------ Import Models ------------------
const User = require("./models/user.js");

// ------------------ Utilities ------------------
const ExpressError = require("./utils/ExpressError.js");

// ------------------ Import Routes ------------------
const listingsRoute = require("./routes/listing");
const reviewsRoute = require("./routes/review");
const usersRoute = require("./routes/users");
const uploadRoute = require("./routes/upload");

// ------------------ Initialize app ------------------
const app = express();

// ------------------ App Config ------------------
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// ------------------ Database URL ------------------
const dbUrl = process.env.DB_URL || process.env.ATLASDB_URL || process.env.MONGO_URL;
if (!dbUrl) {
  throw new Error("❌ DB_URL environment variable is missing!");
}
if (!process.env.SESSION_SECRET) {
  throw new Error("❌ SESSION_SECRET environment variable is missing!");
}

// ------------------ MongoDB Connection ------------------
mongoose
  .connect(dbUrl)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// ------------------ SESSION CONFIG ------------------
const store = MongoStore.create({
  mongoUrl: dbUrl,
  touchAfter: 24 * 60 * 60, // 1 day
});

store.on("error", (e) => {
  console.error("SESSION STORE ERROR:", e);
});

app.set("trust proxy", 1); // For Render / HTTPS cookies
app.use(
  session({
    store,
    name: "staybnb-session",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production", // only over HTTPS
    },
  })
);

app.use(flash());

// ------------------ PASSPORT CONFIG ------------------
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ------------------ GLOBAL LOCALS ------------------
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

// ------------------ HOME ------------------
app.get("/", (req, res) => {
  res.render("home");
});

// ------------------ Routes ------------------
app.use("/listings", listingsRoute);
app.use("/listings/:listingId/reviews", reviewsRoute);
app.use("/", usersRoute);
app.use("/api", uploadRoute);

// ------------------ LOGOUT ------------------
app.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) return next(err);
    req.flash("success", "Logged out successfully!");
    res.redirect("/");
  });
});

// ------------------ 404 ------------------
app.use((req, res, next) => {
  next(new ExpressError(404, "Page not found!"));
});

// ------------------ ERROR HANDLER ------------------
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message && err.message.length ? err.message : "Something went wrong";

  if (res.headersSent) return;

  res.status(statusCode).render("error", { err, message });
});

// ------------------ SERVER ------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
