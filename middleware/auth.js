// middleware/auth.js
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    // Ambil token dari header Authorization (Bearer <token>)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ error: "Access denied. Token missing." });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            // Token tidak valid atau kedaluwarsa
            return res.status(403).json({ error: "Invalid or expired token." });
        }
        
        // Data user berhasil diverifikasi, simpan di req object
        req.user = user; 
        
        // Lanjut ke controller
        next();
    });
}

// Fungsi dummy untuk membuat token (Hanya untuk keperluan testing, ganti dengan login/registrasi sebenarnya)
function generateAuthToken(userId) {
    // Di aplikasi nyata, Anda bisa menyimpan lebih banyak data user di sini
    const payload = { userId: userId };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}


module.exports = { authenticateToken, generateAuthToken };