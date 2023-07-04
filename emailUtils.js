const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});
// function to send email with reset token
function sendResetTokenEmail(userEmail, resetToken) {
  // const resetLink = `http://localhost:3000/resetPassword?token=${resetToken}`;
  const resetLink = `https://personal-diary-o49e.onrender.com/resetPassword?token=${resetToken}`;
  const mailOptions = {
    from: process.env.EMAIL,
    to: userEmail,
    subject: "Reset Your Password",
    html: `Please click on the following link to reset your password: <a href="${resetLink}">Reset Password</a>`,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Error sending email:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });
}

module.exports = {
  sendResetTokenEmail,
};
