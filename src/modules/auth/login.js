const express = require('express');
const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Vui lòng nhập đầy đủ tài khoản và mật khẩu!' 
        });
    }

    // TODO: Bổ sung logic kiểm tra với cơ sở dữ liệu MongoDB ở các bước sau
    return res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công!',
        data: {
            username: username,
            role: 'admin'
        }
    });
});

module.exports = router;