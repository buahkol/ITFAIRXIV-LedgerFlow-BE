const jwt = require("jsonwebtoken");

exports.loginUser = (req, res) => {
    const { email, password } = req.body;

    const VALID_EMAIL = "user1@email.com";
    const VALID_PASSWORD = "password123";

    if (!email || !password) {
        return res.status(400).json({ error: "Email dan password wajib diisi." });
    }

    if (email !== VALID_EMAIL || password !== VALID_PASSWORD) {
        return res.status(401).json({ error: "Email atau password salah." });
    }

    const userId = 1;

    const token = jwt.sign(
        { userId, email },
        process.env.JWT_SECRET,
        { expiresIn: "6h" }
    );

    return res.json({
        message: "Login berhasil",
        userId,
        email,
        token
    });
};
