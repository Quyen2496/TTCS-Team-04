const registerForm = document.getElementById('registerForm');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const registerButton = document.getElementById('registerButton');
const registerButtonText = document.getElementById('registerButtonText');
const message = document.getElementById('message');

function showMessage(text, type = 'error') {
    message.textContent = text;
    message.className = `hs-message hs-message-${type}`;
}

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!username || !email || !password || !confirmPassword) {
        showMessage('Vui lòng nhập đầy đủ thông tin.');
        return;
    }

    if (password.length < 6) {
        showMessage('Mật khẩu phải có ít nhất 6 ký tự.');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('Mật khẩu xác nhận không khớp.');
        return;
    }

    registerButton.disabled = true;
    registerButtonText.textContent = 'Đang đăng ký...';
    showMessage('', 'info');

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                email,
                password
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Đăng ký không thành công.');
        }

        showMessage(
            'Đăng ký thành công. Đang chuyển đến trang đăng nhập...',
            'success'
        );

        registerForm.reset();

        setTimeout(() => {
            window.location.href = '/login.html';
        }, 800);
    } catch (error) {
        showMessage(error.message || 'Không thể kết nối đến máy chủ.');
    } finally {
        registerButton.disabled = false;
        registerButtonText.textContent = 'Đăng ký';
    }
});
