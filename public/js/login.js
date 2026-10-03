const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const message = document.getElementById("message");

// Hiện / ẩn mật khẩu
togglePassword.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";

    passwordInput.type = isPassword ? "text" : "password";
    togglePassword.textContent = isPassword ? "🙈" : "👁";
});

// Xử lý đăng nhập
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        message.textContent = "Vui lòng nhập đầy đủ tài khoản và mật khẩu!";
        return;
    }

    message.textContent = "Đang đăng nhập...";

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username,
                password
            })
        });

        const result = await response.json();

        if (result.success) {
            message.textContent = result.message;

            console.log("Thông tin đăng nhập:", result.data);

            // TODO:
            // Chuyển sang trang chính sau khi hoàn thiện hệ thống
            // window.location.href = "/dashboard.html";
        } else {
            message.textContent = result.message;
        }

    } catch (error) {
        console.error("Login error:", error);
        message.textContent =
            "Không thể kết nối tới máy chủ. Vui lòng thử lại!";
    }
});
// ================================
// QUÊN MẬT KHẨU
// ================================

const forgotPassword = document.getElementById("forgotPassword");
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const sendOtpButton = document.getElementById("sendOtpButton");
const resetPasswordButton = document.getElementById("resetPasswordButton");

const resetEmail = document.getElementById("resetEmail");
const resetOtp = document.getElementById("resetOtp");
const newPassword = document.getElementById("newPassword");

const otpSection = document.getElementById("otpSection");
const forgotMessage = document.getElementById("forgotMessage");

// Hiện / ẩn form quên mật khẩu
forgotPassword.addEventListener("click", (event) => {
    event.preventDefault();

    forgotPasswordForm.style.display =
        forgotPasswordForm.style.display === "none"
            ? "block"
            : "none";

    forgotMessage.textContent = "";
});

// Gửi OTP
sendOtpButton.addEventListener("click", async () => {
    const email = resetEmail.value.trim();

    if (!email) {
        forgotMessage.textContent = "Vui lòng nhập email!";
        return;
    }

    forgotMessage.textContent = "Đang gửi mã OTP...";

    try {
        const response = await fetch("/api/auth/forgot-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email
            })
        });

        const result = await response.json();

        forgotMessage.textContent = result.message;

        if (result.success) {
            otpSection.style.display = "block";
        }

    } catch (error) {
        console.error("Forgot password error:", error);

        forgotMessage.textContent =
            "Không thể kết nối tới máy chủ. Vui lòng thử lại!";
    }
});

// Đặt lại mật khẩu
resetPasswordButton.addEventListener("click", async () => {
    const email = resetEmail.value.trim();
    const otp = resetOtp.value.trim();
    const password = newPassword.value;

    if (!email || !otp || !password) {
        forgotMessage.textContent =
            "Vui lòng nhập đầy đủ email, mã OTP và mật khẩu mới!";
        return;
    }

    if (password.length < 6) {
        forgotMessage.textContent =
            "Mật khẩu mới phải có ít nhất 6 ký tự!";
        return;
    }

    forgotMessage.textContent = "Đang đặt lại mật khẩu...";

    try {
        const response = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                otp,
                password
            })
        });

        const result = await response.json();

        forgotMessage.textContent = result.message;

        if (result.success) {
            otpSection.style.display = "none";
            resetEmail.value = "";
            resetOtp.value = "";
            newPassword.value = "";

            setTimeout(() => {
                forgotPasswordForm.style.display = "none";
                forgotMessage.textContent = "";
            }, 2000);
        }

    } catch (error) {
        console.error("Reset password error:", error);

        forgotMessage.textContent =
            "Không thể kết nối tới máy chủ. Vui lòng thử lại!";
    }
});