const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER, // Email gửi đi
    pass: process.env.EMAIL_PASS  // App Password của Gmail
  }
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"Homestay System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Lỗi gửi email:', error.message);
    throw error;
  }
};

module.exports = { sendEmail };