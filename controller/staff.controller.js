// Models
const Staff = require("../models/staff.model");
const Role = require("../models/role.model");

// Config
const md5 = require('md5');

// Helpers
const { convertDateObject } = require('../helpers/convertDate.helper');


// [GET] /admin/staffs
module.exports.index = async (req, res) => {
    try {
        let find = { deleted: false };
    
        const records = await Staff.find(find).select('staff_id fullName phone role_id avatar');
        const newStaffList = [];
        
        for (let record of records) {
            const role = await Role.findOne({ _id: record.role_id });
            record = {
                ...record._doc,
                role: role.title
            };
           
            newStaffList.push(record);
        }

        res.json({
            success: true,
            staffs: newStaffList
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Server error' });   
    }
}

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
        req.body.password = md5(req.body.password);
        req.body.birthDate = convertDateObject(req.body.birthDate);

        const record = new Staff(req.body);
        await record.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });   
    }
}

// [PATCH] /admin/staffs/change-multi
module.exports.changeMulti = async (req, res) => {
    try {
        const type = req.body.type;
        const ids = req.body.ids.split(", ");

        switch (type) {
            case "active":
                await Helper.updateMany(
                    { _id: { $in: ids } },
                    { status: "active"}
                );
                res.json({ success: true })
                break;
            case "inactive":
                await Helper.updateMany(
                    { _id: { $in: ids } },
                    { status: "inactive"}
                );
                res.json({ success: true })
                break;
            case "delete-all":
                await Helper.updateMany(
                    { _id: { $in: ids } },
                    { deleted: true }
                );
                res.json({ success: true })
                break;
            default:
                break;
    }
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
}

// [PATCH] /admin/staffs/change-status/:status/:id
module.exports.changeStatus = async (req, res) => {
    try {
        const status = req.params.status;
        const id = req.params.id;

        await Staff.updateOne(
            { _id: id },
            { status: status }
        )

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });   
    }
}

// [DELETE] /admin/staffs/delete/:id
module.exports.deleteItem = async (req, res) => {
    try {
        const id = req.params.id;

        await Staff.updateOne(
            { _id: id },
            { deleted: true }
        )

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
    
        const staff = await Staff.findOne(find).select("-password");
    
        const roles = await Role.find({
            deleted: false
        });

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
                msg: 'CMND đã tồn tại'
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
                msg: 'Số điện thoại đã tồn tại'
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
                msg: 'Email đã tồn tại'
            })
            return;
        }
    
        if (req.body.password) {
            req.body.password = md5(req.body.password);
        }
        else {
            delete req.body.password;
        }
    
        await Staff.updateOne({ _id: req.params.id }, req.body);

        res.json({ success: true });
    } catch (error) {
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
    
        const staff = await Staff.findOne(find).select("-password");
    
        staff.role = await Role.findOne({
            _id: staff.role_id,
            deleted: false
        });

        res.json({
            success: true,
            staff: staff
        })
    } catch (error) {
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