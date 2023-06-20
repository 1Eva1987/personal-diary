require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const app = express();

const port = process.env.PORT;

app.use(bodyParser.urlencoded({ extended: "true" }));
app.use(express.static("public"));
app.set("view engine", "ejs");

// connecting to mongoDB
mongoose
  .connect(process.env.MONGO_CONNECTION)
  .then(() => console.log("Connected to mongoDB"))
  .catch((err) => console.log(`Not connected: ${err}`));

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});

const User = new mongoose.model("User", userSchema);

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

// POST
// register a new user and adding to DB, if user already exists redirecting to login page
app.post("/register", (req, res) => {
  bcrypt.hash(req.body.password, saltRounds).then((hash) => {
    User.find({ email: req.body.email })
      .then((foundUser) => {
        if (foundUser.length > 0) {
          console.log(foundUser);
          res.redirect("/login");
        } else {
          const newUser = new User({
            email: req.body.email,
            password: hash,
          });
          newUser
            .save()
            .then(() => {
              res.render("personalDiary");
            })
            .catch((err) => console.log(err));
        }
      })
      .catch((err) => console.log(err));
  });
});

// LOG OUT button
app.get("/logout", (req, res) => {
  res.redirect("/");
});
app.listen(port, () => console.log(`Server is running on port ${port}`));