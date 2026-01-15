// ------------------ Load environment variables ------------------
if (process.env.NODE_ENV !== "production") {
  require('dotenv').config();
}

// ------------------ Import packages ------------------
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const methodOverride = require("method-override");
const ejsMate = require('ejs-mate');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');

// ------------------ Import Models ------------------
const Listing = require('./models/listing.js');
const User = require('./models/user.js');

// ------------------ Utilities ------------------
const wrapAsync = require('./utils/wrapAsync.js');
const ExpressError = require('./utils/ExpressError.js');
const { listingSchema } = require('./schema.js');

// ------------------ Import Routes ------------------
const listingsRoute = require('./routes/listing');
const reviewsRoute = require('./routes/review');
const usersRoute = require('./routes/users');
const uploadRoute = require('./routes/upload');

// ------------------ Initialize app ------------------
const app = express();


// Support multiple env var names for DB URL (DB_URL, ATLASDB_URL, MONGO_URL)
const dbUrl = process.env.DB_URL || process.env.ATLASDB_URL || process.env.MONGO_URL;

// ------------------ MongoDB Connection ------------------
async function main() {
  await mongoose.connect(dbUrl);
}
main()
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ------------------ App Config ------------------
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// ------------------ SESSION CONFIG ------------------
const store = MongoStore.create({
  mongoUrl: process.env.DB_URL,
  touchAfter: 24 * 60 * 60,
  crypto: { secret: process.env.SESSION_SECRET || process.env.SECRET }
});

store.on("error", e => console.log("Session store error:", e));

const sessionOptions = {
  store,
  secret: process.env.SESSION_SECRET || process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7*24*60*60*1000,
    maxAge: 7*24*60*60*1000,
    httpOnly: true
  }
};


app.use(session(sessionOptions));
app.use(flash());

// ------------------ PASSPORT CONFIG ------------------
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ------------------ GLOBAL MIDDLEWARE ------------------
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

// ------------------ HOME PAGE ROUTE ------------------
app.get("/", (req, res) => {
  res.render("home");
});

// ------------------ Routes ------------------
app.use("/listings", listingsRoute);
app.use("/listings/:listingId/reviews", reviewsRoute);
app.use("/", usersRoute);

// ------------------ Cloudinary Upload Route ------------------
app.use('/api', uploadRoute);

// ------------------ LOGOUT ROUTE ------------------
app.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) return next(err);
    req.flash("success", "Logged out successfully!");
    return res.redirect("/exit");
  });
});


// ------------------ EXIT PAGE ROUTE ------------------
app.get("/exit", (req, res) => {
  res.render("exit"); // make sure views/exit.ejs exists
});

// ------------------ ERROR HANDLING ------------------
app.all(/.*/, (req, res, next) => {
  next(new ExpressError(404, "Page not found!"));
});

// Global error handler
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const message =
    typeof err.message === "string" && err.message.length
      ? err.message
      : "Something went wrong";

  res.status(statusCode).render("error", {
    err,
    message,
  });
});



// ------------------ Server ------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

