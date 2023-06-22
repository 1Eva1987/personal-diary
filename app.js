require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const session = require("express-session");
const path = require("path");
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

// Connecting to mongoDB
mongoose
  .connect(process.env.CONNECTION_STRING)
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
      listItem: String,
    },
  ],
  postsList: [
    {
      title: String,
      text: String,
    },
  ],
});

const User = new mongoose.model("User", userSchema);

// If user is not logedin and manualy tries to navigate to an unauthorised page the user is send to login
const requireLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
};

// GET routes
app.get("/", (req, res) => {
  res.render("home");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/createPost", requireLogin, (req, res) => {
  res.render("createPost");
});

// POST
// Register a new user and adding to DB
app.post("/register", (req, res) => {
  bcrypt.hash(req.body.password, saltRounds).then((hash) => {
    User.find({ email: req.body.email })
      .then((foundUser) => {
        if (foundUser.length > 0) {
          //   req.session.user = foundUser[0];
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
              req.session.user = newUser;
              req.session.loggedIn = true;
              res.render("personalDiary", {
                usersName: req.body.name,
                usersEmail: req.body.email,
                itemsList: [],
                postsList: [],
              });
            })
            .catch((err) => console.log(err));
        }
      })
      .catch((err) => console.log(err));
  });
});

// Login: Checking if the user exists in darabase and if so takes to the personalDiary page else to register page
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
            res.render("personalDiary", {
              usersName: foundUser.name,
              usersEmail: foundUser.email,
              itemsList: foundUser.todoList,
              postsList: foundUser.postsList,
            });
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

//TO DO list add item
app.post("/toDo", requireLogin, (req, res) => {
  User.findOneAndUpdate(
    { email: req.body.usersEmail },
    { $push: { todoList: { listItem: req.body.todoItem } } },
    { new: true }
  )
    .then((updatedUser) => {
      res.render("personalDiary", {
        itemsList: updatedUser.todoList,
        usersName: updatedUser.name,
        usersEmail: updatedUser.email,
        postsList: updatedUser.postsList,
      });
    })
    .catch((err) => console.log(err));
});

// TO DO list delete item
app.post("/toDo/:id", requireLogin, (req, res) => {
  const idOfItemToDelete = req.params.id;
  User.findOneAndUpdate(
    { email: req.body.usersEmail },
    { $pull: { todoList: { _id: idOfItemToDelete } } },
    { new: true }
  )
    .then((updatedUser) => {
      res.render("personalDiary", {
        itemsList: updatedUser.todoList,
        usersName: updatedUser.name,
        usersEmail: updatedUser.email,
        postsList: updatedUser.postsList,
      });
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
    { $push: { postsList: { title: postTitle, text: postText } } },
    { new: true }
  )
    .then((updatedUser) => {
      res.render("personalDiary", {
        itemsList: updatedUser.todoList,
        usersName: updatedUser.name,
        usersEmail: updatedUser.email,
        postsList: updatedUser.postsList,
      });
    })
    .catch((err) => console.log(err));
});

// Delete post
app.post("/deletePost", requireLogin, (req, res) => {
  const postId = req.body.id;
  const sessionID = req.session.user._id;
  User.findOneAndUpdate(
    { _id: sessionID },
    { $pull: { postsList: { _id: postId } } },
    { new: true }
  )
    .then((updatedUser) => {
      res.render("personalDiary", {
        itemsList: updatedUser.todoList,
        usersName: updatedUser.name,
        usersEmail: updatedUser.email,
        postsList: updatedUser.postsList,
      });
    })
    .catch((err) => console.log(err));
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
