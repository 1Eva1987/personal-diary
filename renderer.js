function renderPersonalDiary(res, updatedUser, extraData = {}) {
  const data = {
    usersName: updatedUser.name,
    usersEmail: updatedUser.email,
    postsList: updatedUser.postsList,
    errorMessage: "",
    ...extraData,
  };
  res.render("personalDiary", data);
}

function renderNotes(res, updatedUser, extraData = {}) {
  const data = {
    itemsList: updatedUser.todoList,
    usersName: updatedUser.name,
    usersEmail: updatedUser.email,
    ...extraData,
  };
  res.render("notes", data);
}

module.exports = {
  renderPersonalDiary,
  renderNotes,
};
