require("dotenv").config();
const express = require("express");
const moment = require("moment");
const bodyParser = require("body-parser");
const mongoose = require("./dbConnection");
const User = require("./user");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const session = require("express-session");
const path = require("path");
const requireLogin = require("./authMiddlewere");
const emailUtils = require("./emailUtils");
const renderer = require("./renderer");
const { log } = require("console");
const app = express();
const port = process.env.PORT;

app.use(bodyParser.urlencoded({ extended: "true" }));
app.use(express.static("public"));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// GET routes
app.get("/", (req, res) => {
  res.render("home");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/createPost", requireLogin, (req, res) => {
  const sessioId = req.session.user._id;
  User.findOne({ _id: sessioId })
    .then((foundUser) => {
      res.render("createPost", {
        usersName: foundUser.name,
      });
    })
    .catch((err) => console.log(err));
});

app.get("/personalDiary", requireLogin, (req, res) => {
  const sessioId = req.session.user._id;
  User.findOne({ _id: sessioId })
    .then((foundUser) => {
      res.render("personalDiary", {
        usersName: foundUser.name,
        usersEmail: foundUser.email,
        postsList: foundUser.postsList,
      });
    })
    .catch((err) => console.log(err));
});

app.get("/editPost", requireLogin, (req, res) => {
  const postId = req.query.id;
  const sessionId = req.session.user._id;
  User.findOne({ _id: sessionId })
    .then((foundUser) => {
      const post = foundUser.postsList.id(postId);
      if (post) {
        const postTitle = post.title;
        const postText = post.text;
        res.render("editPost", {
          usersName: foundUser.name,
          postTitle: postTitle,
          postText: postText,
          postId: postId,
        });
      } else {
        console.log("Post not found");
        res.redirect("/personalDiary");
      }
    })
    .catch((err) => console.log(err));
});

app.get("/posts/:postId", requireLogin, (req, res) => {
  const postId = req.params.postId;
  const sessionId = req.session.user._id;
  User.findOne({ _id: sessionId })
    .then((foundUser) => {
      const post = foundUser.postsList.id(postId);
      if (post) {
        const postTitle = post.title;
        const postText = post.text;
        res.render("post", {
          postTitle: postTitle,
          postText: postText,
          usersName: foundUser.name,
          // postId: post._id,
        });
      } else {
        console.log("post not found");
        res.redirect("/personalDiary");
      }
    })
    .catch((err) => console.log(err));
});

app.get("/notes", requireLogin, (req, res) => {
  const sessioId = req.session.user._id;
  User.findOne({ _id: sessioId })
    .then((foundUser) => {
      res.render("notes", {
        usersName: foundUser.name,
        usersEmail: foundUser.email,
        itemsList: foundUser.todoList,
      });
    })
    .catch((err) => console.log(err));
});

app.get("/forgotPassword", (req, res) => {
  res.render("forgotPassword", { message: "" });
});

app.get("/resetPassword", (req, res) => {
  const token = req.query.token;
  console.log(token);
  User.findOne({
    resetPasswordToken: crypto.createHash("sha256").update(token).digest("hex"),
    resetPasswordExpires: { $gt: Date.now() },
  })
    .then((foundUser) => {
      if (!foundUser) {
        console.log("expired or bad token");
        res.redirect("/forgotPassword");
      } else {
        res.render("resetPassword", { token: token });
      }
    })
    .catch((err) => console.log(err));
});
// POST routes:
// Register a new user
app.post("/register", (req, res) => {
  const usersName = req.body.name;
  const usersEmail = req.body.email;
  bcrypt.hash(req.body.password, saltRounds).then((hash) => {
    User.find({ email: usersEmail })
      .then((foundUser) => {
        if (foundUser.length > 0) {
          //   req.session.user = foundUser[0];
          res.redirect("/login");
        } else {
          const newUser = new User({
            name: usersName,
            email: usersEmail,
            password: hash,
          });
          newUser
            .save()
            .then(() => {
              req.session.user = newUser;
              req.session.loggedIn = true;
              res.redirect("/personalDiary");
            })
            .catch((err) => console.log(err));
        }
      })
      .catch((err) => console.log(err));
  });
});

// Login:
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
            res.redirect("/personalDiary");
          } else {
            console.log("password not matching");
            res.render("login", { errorMessage: "Invalid password!" });
          }
        })
        .catch((err) => console.log(err));
    } else {
      console.log("user not found");
      res.render("login", {
        errorMessage: "User not found. Please check your e-mail.",
      });
    }
  });
});

//TO DO list add item
app.post("/toDo", requireLogin, (req, res) => {
  const usersEmail = req.body.usersEmail;
  const newItem = req.body.todoItem;
  User.findOneAndUpdate(
    { email: usersEmail },
    { $push: { todoList: { listItem: newItem } } },
    { new: true }
  )
    .then((updatedUser) => {
      renderer.renderNotes(res, updatedUser);
    })
    .catch((err) => console.log(err));
});

// TO DO list delete item
app.post("/toDo/:id", requireLogin, (req, res) => {
  const idOfItemToDelete = req.params.id;
  const usersEmail = req.body.usersEmail;
  User.findOneAndUpdate(
    { email: usersEmail },
    { $pull: { todoList: { _id: idOfItemToDelete } } },
    { new: true }
  )
    .then((updatedUser) => {
      renderer.renderNotes(res, updatedUser);
    })
    .catch((err) => console.log(err));
});

// Create post
app.post("/compose", requireLogin, (req, res) => {
  const postTitle = req.body.title;
  const postText = req.body.text;
  const usersEmail = req.session.user.email;
  User.findOneAndUpdate(
    { email: usersEmail },
    {
      $push: {
        postsList: {
          $each: [
            {
              title: postTitle,
              text: postText,
              date: moment().format("ddd, Do MMM YYYY"),
            },
          ],
          $position: 0,
        },
      },
    },

    { new: true }
  )
    .then((updatedUser) => {
      renderer.renderPersonalDiary(res, updatedUser);
    })
    .catch((err) => console.log(err));
});

// Delete post
app.post("/deletePost", requireLogin, (req, res) => {
  const postId = req.body.id;
  const sessionId = req.session.user._id;
  User.findOneAndUpdate(
    { _id: sessionId },
    { $pull: { postsList: { _id: postId } } },
    { new: true }
  )
    .then((updatedUser) => {
      renderer.renderPersonalDiary(res, updatedUser);
    })
    .catch((err) => console.log(err));
});

// Edit post
app.post("/editPost", requireLogin, (req, res) => {
  const sessioId = req.session.user._id;
  const postId = req.body.id;
  const updatedTitle = req.body.title;
  const updatedText = req.body.text;
  const updatedDate = moment().format("ddd, Do MMM YYYY");
  User.findOneAndUpdate(
    { _id: sessioId, "postsList._id": postId },
    {
      $set: {
        "postsList.$.title": updatedTitle,
        "postsList.$.text": updatedText,
        "postsList.$.date": updatedDate,
      },
    },
    { new: true }
  )
    .then((updatedUser) => {
      renderer.renderPersonalDiary(res, updatedUser);
    })
    .catch((err) => console.log(err));
});

// Forgor password
app.post("/forgotPassword", (req, res) => {
  const userEmail = req.body.email;
  // findin user using provided email:
  User.findOne({ email: userEmail })
    .then((foundUser) => {
      if (!foundUser) {
        res.render("forgotPassword", {
          message: "User not found, please check your e-mail",
        });
      } else {
        // if user found generating reset token
        const resetToken = crypto.randomBytes(20).toString("hex");
        // saving hashed token to DB for safety
        foundUser.resetPasswordToken = crypto
          .createHash("sha256")
          .update(resetToken)
          .digest("hex");
        foundUser.resetPasswordExpires = Date.now() + 600000;
        foundUser
          .save()
          .then(() => {
            // sed email with resetToken (reset password link) to the user using nodemaler
            emailUtils.sendResetTokenEmail(userEmail, resetToken);
            res.render("forgotPassword", {
              message: "Check your email, don't forget to check spam folder.",
            });
          })
          .catch((err) => console.log(err));
      }
    })
    .catch((err) => console.log(err));
});

// Reset password
app.post("/resetPassword", (req, res) => {
  const token = req.body.token;
  const newPassword = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  if (newPassword !== confirmPassword) {
    console.log("passwors not matching");
    res.render("resetPassword", { token: token });
  } else {
    User.findOne({
      resetPasswordToken: crypto
        .createHash("sha256")
        .update(token)
        .digest("hex"),
      resetPasswordExpires: { $gt: Date.now() },
    })
      .then((foundUser) => {
        if (!foundUser) {
          console.log("expired token");
          res.redirect("/forgotPassword");
        } else {
          bcrypt.hash(newPassword, saltRounds).then((hash) => {
            foundUser.password = hash;
            foundUser.resetPasswordToken = undefined;
            foundUser.resetPasswordExpires = undefined;
            foundUser.save().then(() => {
              console.log("password reset successful");
              res.redirect("/");
            });
          });
        }
      })
      .catch((err) => console.log(err));
  }
});

// LOG OUT route
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

app.listen(port, () => console.log(`Server is running on port ${port}`));
