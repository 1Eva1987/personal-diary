const mongoose = require("mongoose");

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

module.exports = User;
