const { sendEmail } = require('../utils/email');

// Hàng đợi đơn giản trong bộ nhớ RAM
const emailQueue = [];
let isProcessing = false;

const processQueue = async () => {
  if (isProcessing || emailQueue.length === 0) return;
  isProcessing = true;

  const task = emailQueue.shift();
  let retries = task.retries || 3;

  try {
    await sendEmail(task.mailOptions);
    console.log(`[Email] Đã gửi thành công tới: ${task.mailOptions.to}`);
  } catch (error) {
    retries--;
    if (retries > 0) {
      console.warn(`[Email] Gửi thất bại, còn thử lại ${retries} lần. Đưa lại vào hàng đợi...`);
      emailQueue.push({ ...task, retries });
    } else {
      console.error(`[Email] Thất bại hoàn toàn khi gửi tới: ${task.mailOptions.to}`);
    }
  }

  isProcessing = false;
  setTimeout(processQueue, 1000); // Chờ 1 giây rồi xử lý tiếp email tiếp theo
};

const addEmailToQueue = (mailOptions) => {
  emailQueue.push({ mailOptions, retries: 3 });
  processQueue();
};

module.exports = { addEmailToQueue };