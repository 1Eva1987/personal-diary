require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const session = require("express-session");
const app = express();

const port = process.env.PORT;

app.use(bodyParser.urlencoded({ extended: "true" }));
app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// connecting to mongoDB
mongoose
  .connect(process.env.MONGO_CONNECTION)
  .then(() => console.log("Connected to mongoDB"))
  .catch((err) => console.log(`Not connected: ${err}`));

const userSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  todoList: [
    {
      type: String,
    },
  ],
});

const User = new mongoose.model("User", userSchema);
const requireLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
};
// GET
app.get("/", (req, res) => {
  res.render("home");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/toDo", requireLogin, (req, res) => {
  res.render("toDo", { usersEmail: req.session.user.email });
});
app.post("/toDo", requireLogin, (req, res) => {
  console.log(req.session.user.email);
  console.log(req.body);
});

// POST

// Register a new user and adding to DB, if user already exists redirecting to login page
app.post("/register", (req, res) => {
  bcrypt.hash(req.body.password, saltRounds).then((hash) => {
    User.find({ email: req.body.email })
      .then((foundUser) => {
        if (foundUser.length > 0) {
          req.session.user = foundUser;
          res.redirect("/login");
        } else {
          const newUser = new User({
            name: req.body.name,
            email: req.body.email,
            password: hash,
          });
          newUser
            .save()
            .then(() => {
              req.session.loggedIn = true;
              res.render("personalDiary", { usersName: req.body.name });
            })
            .catch((err) => console.log(err));
        }
      })
      .catch((err) => console.log(err));
  });
});

// Checking if the user exists in darabase and if so takes to the personalDiary page else to register page
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  User.findOne({ email: email }).then((foundUser) => {
    if (foundUser) {
      bcrypt
        .compare(password, foundUser.password)
        .then((result) => {
          if (result) {
            req.session.user = foundUser;
            req.session.loggedIn = true;
            res.render("personalDiary", { usersName: foundUser.name });
          } else {
            console.log("password not matching");
            // ntify user to check login info as password doesnt match
            // res.render("login", { errorMessage: "Invalid password." });
          }
        })
        .catch((err) => console.log(err));
    } else {
      console.log("user not found");
      //   notify user that user with this email is not registered yet!
    }
  });
});

// LOG OUT button
app.get("/logout", (req, res) => {
  res.redirect("/");
});
app.listen(port, () => console.log(`Server is running on port ${port}`));
