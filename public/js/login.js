const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const loginButton = document.getElementById("loginButton");
const loginButtonText = document.getElementById("loginButtonText");
const message = document.getElementById("message");
const rememberMe = document.getElementById("rememberMe");

const forgotPassword = document.getElementById("forgotPassword");
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const closeForgotPassword = document.getElementById("closeForgotPassword");

const sendOtpButton = document.getElementById("sendOtpButton");
const sendOtpButtonText = document.getElementById("sendOtpButtonText");

const resetPasswordButton = document.getElementById("resetPasswordButton");
const resetPasswordButtonText = document.getElementById("resetPasswordButtonText");

const resetEmail = document.getElementById("resetEmail");
const resetOtp = document.getElementById("resetOtp");
const newPassword = document.getElementById("newPassword");

const otpSection = document.getElementById("otpSection");
const forgotMessage = document.getElementById("forgotMessage");

const eyeIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
            d="M2.5 12s3.5-5.5 9.5-5.5S21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
        />
        <circle
            cx="12"
            cy="12"
            r="2.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
        />
    </svg>
`;

const eyeOffIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
            d="M3 3l18 18"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
        />
        <path
            d="M10.6 6.7A10.7 10.7 0 0 1 12 6.5c6 0 9.5 5.5 9.5 5.5a17.6 17.6 0 0 1-3.2 3.5M6.2 8.1C3.9 9.7 2.5 12 2.5 12S6 17.5 12 17.5c1.5 0 2.8-.3 4-.8"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
        />
    </svg>
`;

// ================================
// HIỆN / ẨN MẬT KHẨU
// ================================

togglePassword.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";

    passwordInput.type = isPassword ? "text" : "password";
    togglePassword.innerHTML = isPassword ? eyeOffIcon : eyeIcon;

    togglePassword.setAttribute(
        "aria-label",
        isPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"
    );

    togglePassword.setAttribute(
        "title",
        isPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"
    );
});

// ================================
// HIỂN THỊ MESSAGE
// ================================

function showMessage(element, text, type = "info") {
    element.textContent = text;
    element.className = `hs-message hs-message-${type}`;
}

function clearMessage(element) {
    element.textContent = "";
    element.className = "hs-message";
}

// ================================
// REDIRECT THEO ROLE
// ================================

function redirectByRole(role) {
    switch (role) {
        case "admin":
            window.location.href = "/modules/rooms/";
            break;

        case "staff":
            window.location.href = "/";
            break;

        case "customer":
            window.location.href = "/modules/lookup/";
            break;

        default:
            showMessage(
                message,
                "Đăng nhập thành công nhưng tài khoản chưa có quyền truy cập phù hợp.",
                "error"
            );
            break;
    }
}

// ================================
// ĐĂNG NHẬP
// ================================

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    clearMessage(message);

    if (!username || !password) {
        showMessage(
            message,
            "Vui lòng nhập đầy đủ tài khoản và mật khẩu!",
            "error"
        );
        return;
    }

    loginButton.disabled = true;
    loginButtonText.textContent = "Đang đăng nhập...";

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

        if (!response.ok || !result.success) {
            showMessage(
                message,
                result.message || "Đăng nhập không thành công.",
                "error"
            );
            return;
        }

        const { token, user } = result.data || {};

        if (!token || !user || !user.role) {
            showMessage(
                message,
                "Phản hồi đăng nhập không hợp lệ từ máy chủ.",
                "error"
            );
            return;
        }

        /*
         * Ghi nhớ đăng nhập:
         * - rememberMe: localStorage
         * - không ghi nhớ: sessionStorage
         */
        const storage = rememberMe.checked
            ? localStorage
            : sessionStorage;

        storage.setItem("authToken", token);
        storage.setItem("authUser", JSON.stringify(user));

        showMessage(
            message,
            result.message || "Đăng nhập thành công.",
            "success"
        );

        setTimeout(() => {
            redirectByRole(user.role);
        }, 300);

    } catch (error) {
        console.error("Login error:", error);

        showMessage(
            message,
            "Không thể kết nối tới máy chủ. Vui lòng thử lại!",
            "error"
        );

    } finally {
        loginButton.disabled = false;
        loginButtonText.textContent = "Đăng nhập";
    }
});

// ================================
// QUÊN MẬT KHẨU
// ================================

forgotPassword.addEventListener("click", () => {
    const isHidden = forgotPasswordForm.hidden;

    forgotPasswordForm.hidden = !isHidden;

    clearMessage(forgotMessage);

    if (isHidden) {
        resetEmail.focus();
        forgotPasswordForm.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
});

closeForgotPassword.addEventListener("click", () => {
    forgotPasswordForm.hidden = true;

    clearMessage(forgotMessage);

    otpSection.hidden = true;

    resetEmail.value = "";
    resetOtp.value = "";
    newPassword.value = "";
});

// ================================
// GỬI OTP
// ================================

sendOtpButton.addEventListener("click", async () => {
    const email = resetEmail.value.trim();

    clearMessage(forgotMessage);

    if (!email) {
        showMessage(
            forgotMessage,
            "Vui lòng nhập email!",
            "error"
        );
        resetEmail.focus();
        return;
    }

    if (!resetEmail.checkValidity()) {
        showMessage(
            forgotMessage,
            "Vui lòng nhập đúng định dạng email!",
            "error"
        );
        resetEmail.focus();
        return;
    }

    sendOtpButton.disabled = true;
    sendOtpButtonText.textContent = "Đang gửi...";

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

        if (!response.ok || !result.success) {
            showMessage(
                forgotMessage,
                result.message || "Không thể gửi mã OTP.",
                "error"
            );
            return;
        }

        showMessage(
            forgotMessage,
            result.message || "Mã OTP đã được gửi tới email của bạn.",
            "success"
        );

        otpSection.hidden = false;
        resetOtp.focus();

    } catch (error) {
        console.error("Forgot password error:", error);

        showMessage(
            forgotMessage,
            "Không thể kết nối tới máy chủ. Vui lòng thử lại!",
            "error"
        );

    } finally {
        sendOtpButton.disabled = false;
        sendOtpButtonText.textContent = "Gửi mã OTP";
    }
});

// ================================
// ĐẶT LẠI MẬT KHẨU
// ================================

resetPasswordButton.addEventListener("click", async () => {
    const email = resetEmail.value.trim();
    const otp = resetOtp.value.trim();
    const password = newPassword.value;

    clearMessage(forgotMessage);

    if (!email || !otp || !password) {
        showMessage(
            forgotMessage,
            "Vui lòng nhập đầy đủ email, mã OTP và mật khẩu mới!",
            "error"
        );
        return;
    }

    if (!/^\d{6}$/.test(otp)) {
        showMessage(
            forgotMessage,
            "Mã OTP phải gồm đúng 6 chữ số!",
            "error"
        );
        resetOtp.focus();
        return;
    }

    if (password.length < 6) {
        showMessage(
            forgotMessage,
            "Mật khẩu mới phải có ít nhất 6 ký tự!",
            "error"
        );
        newPassword.focus();
        return;
    }

    resetPasswordButton.disabled = true;
    resetPasswordButtonText.textContent = "Đang xử lý...";

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

        if (!response.ok || !result.success) {
            showMessage(
                forgotMessage,
                result.message || "Không thể đặt lại mật khẩu.",
                "error"
            );
            return;
        }

        showMessage(
            forgotMessage,
            result.message || "Đặt lại mật khẩu thành công.",
            "success"
        );

        otpSection.hidden = true;

        resetEmail.value = "";
        resetOtp.value = "";
        newPassword.value = "";

        setTimeout(() => {
            forgotPasswordForm.hidden = true;
            clearMessage(forgotMessage);
        }, 2000);

    } catch (error) {
        console.error("Reset password error:", error);

        showMessage(
            forgotMessage,
            "Không thể kết nối tới máy chủ. Vui lòng thử lại!",
            "error"
        );

    } finally {
        resetPasswordButton.disabled = false;
        resetPasswordButtonText.textContent = "Đặt lại mật khẩu";
    }
});
