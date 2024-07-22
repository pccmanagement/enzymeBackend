// middleware/auth.js
const jwt = require('jsonwebtoken');

const verifyTokenAdmin = async (req, res, next) => {

    const token = req.headers['authorization'];
    if (!token) {
        return res.status(400).json({ msg: 'No token provided' });
    }

    try {
        const decoded = await jwt.verify(token, process.env.JWT_SECRET_ADMIN);
        // console.log('inside verify decoded token ', decoded.user)

        req.user = decoded.user; // You can attach the decoded user information to the request object
        next();
    } catch (error) {
        res.status(401).json({ msg: 'Invalid or expired token' });
    }
};

module.exports = verifyTokenAdmin;
