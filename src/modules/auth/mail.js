const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
  }
});

async function sendResetPasswordEmail(email, otp) {
  await transporter.sendMail({
    from: process.env.MAIL_USER,
    to: email,
    subject: 'Mã xác nhận đặt lại mật khẩu - TTCS Team 04',
    html: `
      <h2>Đặt lại mật khẩu</h2>

      <p>Bạn đã yêu cầu đặt lại mật khẩu.</p>

      <p>Mã xác nhận của bạn là:</p>

      <h1 style="letter-spacing: 8px;">${otp}</h1>

      <p>Mã có hiệu lực trong <strong>15 phút</strong>.</p>

      <p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
    `
  });
}

module.exports = {
  sendResetPasswordEmail
};