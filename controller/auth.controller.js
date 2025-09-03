const Staff = require("../models/staff.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// [POST] /admin/auth/login
module.exports.login = async (req, res) => {
    const { hmrId, password } = req.body;

    try {
        const staff = await Staff.findOne({
            staff_id: hmrId,
            status: "active"
        }).select("password staff_id fullName role_id").lean();

        if (!staff || !(await bcrypt.compare(password, staff.password))) {
            return res.status(401).json({
                message: "UserId or password is not correct!"
            });
        }

        const staffData = await Staff.aggregate([
            {
                $match: {
                    staff_id: hmrId,
                    status: "active"
                }
            },
            {
                $addFields: {
                    roleIdObj: { $toObjectId: "$role_id" }
                }
            },
            {
                $lookup: {
                    from: "roles",
                    localField: "roleIdObj",
                    foreignField: "_id",
                    as: "roleData"
                }
            },
            {
                $unwind: {
                    path: "$roleData",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 0,
                    staff_id: 1,
                    fullName: 1,
                    role_id: 1,
                    roleTitle: "$roleData.title",
                    rolePermissions: "$roleData.permissions"
                }
            },
            { $limit: 1 }
        ]);

        const user = staffData[0];

        const token = jwt.sign(
            {
                staff_id: user.staff_id,
                fullName: user.fullName,
                role: user.roleTitle,
                permissionList: user.rolePermissions
            },
            process.env.SECRET_KEY,
            { expiresIn: "1h" }
        );

        res.cookie("admin_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
        });

        return res.status(200).json({
            success: true,
            fullName: user.fullName,
            role: user.roleTitle,
            permissionList: user.rolePermissions
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
};

// [GET] /admin/auth/logout
module.exports.logout = async (req, res) => {
    try {
        res.clearCookie('admin_token', {
            httpOnly: true,
            sameSite: 'none',
            secure: process.env.NODE_ENV === 'production'
        });
    
        return res.status(200).json({
            message: 'Logout successful'
        });
     } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({ message: "Server error!" });
    }
}

// [GET] /admin/auth/validate
module.exports.validate = async (req, res) => {
    try {
        return res.status(200).json({
            message: 'Authenticated',
            user: req.user
        })
     } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Server error!" });
    }
}