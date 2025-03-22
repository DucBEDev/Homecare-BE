const Staff = require("../models/staff.model");
const Role = require("../models/role.model");

const md5 = require("md5");
const jwt = require("jsonwebtoken");

// [POST] /admin/auth/login
module.exports.login = async (req, res) => {
    try {
        const phone = req.body.phone;
        const password = md5(req.body.password);
        const data = await Staff.findOne(
            {
                phone: phone,
                password: password
            }
        );

        if (data == null) {
            res.status(401).json({ error: 'Invalid phone or password' });
            return;
        }
        if (data.status != "active") {
            res.status(404).json({ error: 'Account has been blocked' });
            return;
        }

        const token = jwt.sign({ _id: data._id }, "login");
        res.cookie("token", token, { maxAge: 24 * 60 * 60 * 1000 , httpOnly: true });

        const role = await Role.findOne({ _id: data.role_id }).select("permissions");
    
        res.json({
            message: "Login successful",
            token: token,
            role: role
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [GET] /admin/auth/verify
module.exports.verify = async (req, res) => {
    try {
        const token = req.cookies.token;
        const res = jwt.verify(token, "login");

        if (res) {
            res.status(200).json({ message: "Login successful" });
        }
     } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [GET] /admin/auth/logout
module.exports.logout = async (req, res) => {
    try {
        res.clearCookie('token');
        
        res.status(200).json({ message: "Logout successful" });
     } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}