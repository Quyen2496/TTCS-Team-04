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