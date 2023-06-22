// If user is not logedin and manualy tries to navigate to an unauthorised page the user is send to login
const requireLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
};

module.exports = requireLogin;
