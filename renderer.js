function renderPersonalDiary(res, updatedUser, extraData = {}) {
  const data = {
    itemsList: updatedUser.todoList,
    usersName: updatedUser.name,
    usersEmail: updatedUser.email,
    postsList: updatedUser.postsList,
    ...extraData,
  };
  res.render("personalDiary", data);
}

module.exports = {
  renderPersonalDiary,
};
