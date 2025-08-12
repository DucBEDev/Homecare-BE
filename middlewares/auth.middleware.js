const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY || 'jwtSecretKey';

module.exports.auth = (req, res, next) => {
    const token = req.cookies.admin_token;

    if (!token) {
        return res.status(401).json({
            error: "Unauthorized",
            message: "Session expired or invalid"
        });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(403).json({ message: 'Invalid or expired token' });
    }
}