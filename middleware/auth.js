// middleware/auth.js
const jwt = require('jsonwebtoken');

const verifyToken = async (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(400).json({ msg: 'No token provided' });
    }

    try {
        let decoded;
        try {
            decoded = await jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            decoded = await jwt.verify(token, process.env.JWT_SECRET_ADMIN);
        }

        // Attach the decoded user information to the request object
        req.user = decoded.user;
        next();
    } catch (error) {
        res.status(401).json({ msg: 'Invalid or expired token' });
    }
};

module.exports = verifyToken;
