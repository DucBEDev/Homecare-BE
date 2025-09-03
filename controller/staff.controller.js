// Models
const Staff = require("../models/staff.model");
const Role = require("../models/role.model");

// Config
const bcrypt = require('bcrypt');
const moment = require('moment');
const { ObjectId } = require("mongodb");

// Helpers
const { convertDateObject } = require('../helpers/convertDate.helper');


// [GET] /admin/staffs
module.exports.index = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;

        const matchStage = { deleted: false };

        if (search) {
            matchStage.$or = [
                { staff_id: { $regex: search, $options: "i" } },
                { fullName: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);

        const pipeline = [
            { $match: matchStage },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: Number(limit) },
            {
                $lookup: {
                    from: "roles",
                    let: { roleId: "$role_id" },
                    pipeline: [
                        { 
                            $match: { 
                                $expr: { $eq: ["$_id", { $toObjectId: "$$roleId" }] } 
                            } 
                        },
                        { $project: { title: 1 } }
                    ],
                    as: "roleData"
                }
            },
            { $unwind: { path: "$roleData", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    staff_id: 1,
                    fullName: 1,
                    phone: 1,
                    avatar: 1,
                    role: "$roleData.title"
                }
            }
        ];

        const staffs = await Staff.aggregate(pipeline);

        const totalAgg = await Staff.aggregate([
            { $match: matchStage },
            { $count: "total" }
        ]);
        const total = totalAgg[0]?.total || 0;

        res.json({
            success: true,
            totalStaffs: total,
            staffs
        });
    } catch (error) {
        console.error("Staff index error:", error);
        res.status(500).json({ error: 'Server error' });
    }
};

// [GET] /admin/staffs/create
module.exports.create = async (req, res) => {
    try {
        const roles = await Role.find({
            deleted: false
        }).select("title");

        res.json({
            success: true,
            roles: roles
        })
    } catch (error) {
        res.status(500).json({ error: 'Server error' });   
    }
}

// [POST] /admin/staffs/create
module.exports.createPost = async (req, res) => {
    try {
        const emailExist = await Staff.findOne({
            email: req.body.email,
            deleted: false
        });
        const phoneExist = await Staff.findOne({
            phone: req.body.phone,
            deleted: false
        });
    
        if (emailExist) {
            res.json({
                success: false,
                message: 'Email existed'
            })
            return;
        }
        if (phoneExist) {
            res.json({
                success: false,
                message: 'Phone existed'
            })
            return;
        }

        // Replace md5 with bcrypt for password hashing
        req.body.password = await bcrypt.hash(req.body.password, 10);
        req.body.birthDate = convertDateObject(req.body.birthDate);

        const record = new Staff(req.body);
        await record.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });   
    }
}

// [GET] /admin/staffs/edit/:id
module.exports.edit = async (req, res) => {
    try {
        let find = {
            _id: req.params.id,
            deleted: false
        };
    
        const staff = await Staff.findOne(find)
                                .select("-createdBy -deleted -offDateList -updatedBy -createdAt -updatedAt -__v")
                                .lean();
    
        const roles = await Role.find({
            deleted: false
        }).select('title');

        staff.birthDate = moment(staff.birthDate).format("DD/MM/YYYY");
        staff.startDate = moment(staff.startDate).format("DD/MM/YYYY");

        res.json({
            success: true,
            staff: staff,
            roles: roles
        })
    } catch (error) {
        res.status(500).json({ error: 'Server error' });   
    }
}

// [PATCH] /admin/staffs/edit/:id
module.exports.editPatch = async (req, res) => {
    try {
        const staffIdExist = await Staff.findOne({
            _id: { $ne: req.params.id },
            email: req.body.staff_id,
            deleted: false
        });
        if (staffIdExist) {
            res.json({
                success: false,
                msg: 'Staff id existed'
            })
            return;
        }
    
        const phoneExist = await Staff.findOne({
            _id: { $ne: req.params.id },
            email: req.body.phone,
            deleted: false
        });
        if (phoneExist) {
            res.json({
                success: false,
                msg: 'Phone existed'
            })
            return;
        }
    
        const emailExist = await Staff.findOne({
            _id: { $ne: req.params.id },
            email: req.body.email,
            deleted: false
        });
        if (emailExist) {
            res.json({
                success: false,
                msg: 'Email existed'
            })
            return;
        }
    
        if (req.body.password) {
            req.body.password = await bcrypt.hash(req.body.password, 10);
        } else {
            delete req.body.password;
        }
        req.body.birthDate = convertDateObject(req.body.birthDate);
    
        await Staff.updateOne({ _id: req.params.id }, req.body);

        res.json({ success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Server error' });   
    }
}

// [GET] /admin/staffs/detail/:id
module.exports.detail = async (req, res) => {
    try {
        let find = {
            _id: req.params.id,
            deleted: false
        };
    
        const staff = await Staff.findOne(find)
                                .select("-password -createdBy -deleted -updatedBy -deletedBy -offDateList -createdAt -updatedAt -__v")
                                .lean();
    
        const role = await Role.findById(staff.role_id).where({ deleted: false }).select("title");

        staff.birthDate = moment(staff.birthDate).format("DD/MM/YYYY");
        staff.startDate = moment(staff.startDate).format("DD/MM/YYYY");
        staff.role = role.title

        res.json({
            success: true,
            staff: staff
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Server error' });   
    }
}

// [GET] /admin/staffs/setOffDate/:id
module.exports.setOffDate = async (req, res) => {
    const staff = await Staff.findOne({ _id: req.params.id }).select("avatar staff_id fullName birthDate phone birthPlace");
    
    const today = new Date();
    const todayInMonth = today.getDate() - 1;
    const numberOfDaysInMonth = new Date(today.getUTCFullYear(), today.getMonth() + 1, 0).getDate();
    
    // Set today to the first day of the month
    let currentTime = today.getTime();
    currentTime -= todayInMonth * 24 * 60 * 60 * 1000;
    today.setTime(currentTime);
    
    // Set today to Sunday before the first day of the month
    const startDayOfThisMonthInWeek = today.getDay();
    currentTime -= startDayOfThisMonthInWeek * 24 * 60 * 60 * 1000;
    today.setTime(currentTime);

    const numberOfDaysInCalendar = numberOfDaysInMonth + startDayOfThisMonthInWeek;
    const numberOfWeeks = numberOfDaysInCalendar / 7;

    const weekList = [];

    for (let i = 0; i < numberOfWeeks; i++) {
        const week = {
            name: i + "",
            dateList: []
        };

        for (let j = 0; j < 7 && (i * 7 + j) < numberOfDaysInCalendar; j++) {
            today.setTime(currentTime + ((i * 7 + j) * 24 * 60 * 60 * 1000));
            
            const day = new Date(today);
            const date = {
                value: today.getDate(),
                day: day,
                classType: "normalDate",
                icon: ""
            };
            
            week.dateList.push(date);
        }

        weekList.push(week);
    }

    for (let i = 0; i < todayInMonth + startDayOfThisMonthInWeek; i++) {
        const week = (i - (i % 7)) / 7;
        const day = i % 7;

        weekList[week].dateList[day].classType = "passedDate";
    }

    res.render("pages/staffs/setOffDate", {
        pageTitle: "Cập nhật ngày nghỉ nhân viên",
        staff: staff,
        weekList: weekList
    })
}