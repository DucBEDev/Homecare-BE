// Models
const Location = require("../models/location.model");
const Helper = require("../models/helper.model");
const Service = require("../models/service.model");
const CostFactorType = require("../models/costFactorType.model");

const moment = require("moment");
const bcrypt = require("bcrypt");

// [GET] /admin/helpers
module.exports.index = async (req, res) => {
    try {
        const { status = "all", search, page = 1, limit = 10 } = req.query;

        const matchStage = { deleted: false };

        if (status !== "all") {
            matchStage.workingStatus = status;
        }

        if (search) {
            matchStage.$or = [
                { helper_id: { $regex: search, $options: "i" } },
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
                $project: {
                    _id: 1,
                    helper_id: 1,
                    fullName: 1,
                    phone: 1,
                    avatar: 1,
                    workingStatus: 1,
                    status: 1,
                    gender: 1,
                    startDate: {
                        $dateToString: { format: "%d/%m/%Y", date: "$startDate", timezone: "Asia/Ho_Chi_Minh" }
                    }
                }
            }
        ];


        const helpers = await Helper.aggregate(pipeline);

        const totalAgg = await Helper.aggregate([
            { $match: matchStage },
            { $count: "total" }
        ]);
        const total = totalAgg[0]?.total || 0;

        res.json({
            success: true,
            totalHelpers: total,
            helpers
        });
    } catch (error) {
        console.error("Helper index error:", error);
        res.status(500).json({ error: 'Server error' });
    }
};

// [GET] /admin/helpers/create
module.exports.create = async (req, res) => {
    try {
        const services = await Service.find({ deleted: false })
                                    .select("title");      

        res.json({
            success: true,
            services: services
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
}

// [POST] /admin/helpers/create
module.exports.createPost = async (req, res) => {
    try {
        const { helper_id, phone } = req.body;
        console.log(req.body);

        if (helper_id) {
            const helperIdExist = await Helper.findOne({
                helper_id,
                deleted: false,  
            });
            if (helperIdExist) {
                return res.json({
                    success: false,
                    message: "Helper id existed"
                });
            }
        }

        if (phone) {
            const phoneExist = await Helper.findOne({
                phone,
                deleted: false, 
            });
            if (phoneExist) {
                return res.json({
                    success: false,
                    message: "Phone number existed"
                });
            }
        }
    
        if (req.body.avatar) {
            req.body.avatar = req.body.avatar[0];
        }

        const defaultPassword = "111111";
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        req.body.password = hashedPassword;
        
        const newHelper = new Helper(req.body);
        await newHelper.save();

        res.json({success: true}); 
    } catch (error) {
        console.error("Helper createPost error:", error);
        res.status(500).json({ error: 'Server error' });
    }
}

// [GET] /admin/helpers/detail/:id
module.exports.detail = async (req, res) => {
    try {
        const helper = await Helper.findOne(
            { _id: req.params.id, deleted: false }
        )
            .select("-workingArea -createdBy -updatedBy -createdAt -updatedAt -deleted -__v")
            .populate("jobs", "title")
            .lean(); 
        
        helper.startDate = moment(helper.startDate).format("DD/MM/YYYY");
        helper.birthDate = moment(helper.birthDate).format("DD/MM/YYYY");

        res.json({
            success: true,
            helper: helper
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Server error' });
    }
}

// [GET] /admin/helpers/edit/:id
module.exports.edit = async (req, res) => {
    try {
        const helper = await Helper.findOne(
            { _id: req.params.id },
            { deleted: false }
        )
            .select("-workingArea -createdBy -updatedBy -createdAt -updatedAt -deleted -__v")
            .populate("jobs", "title")
            .lean();
    
        const services = await Service.find({ deleted: false }).select("title");
        const costFactors = await CostFactorType.aggregate([
            {
              $match: {
                status: "active",
                applyTo: "helper"
              }
            },
            {
              $project: {
                coefficientList: {
                  $filter: {
                    input: "$coefficientList",
                    as: "item",
                    cond: { $eq: ["$$item.status", "active"] }
                  }
                }
              }
            }
        ]);

        helper.startDate = moment(helper.startDate).format("DD/MM/YYYY");
        helper.birthDate = moment(helper.birthDate).format("DD/MM/YYYY");

        res.json({
            success: true,
            helper: helper,
            services: services,
            coefficientList: costFactors[0].coefficientList
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Server error' });
    }
}

// [PATCH] /admin/helpers/edit/:id
module.exports.editPatch = async (req, res) => {
    try {
        const { id } = req.params;
        const { helper_id, phone, avatar, hasNewPassword, password } = req.body;

        if (helper_id) {
            const helperIdExist = await Helper.findOne({
                helper_id,
                deleted: false,
                _id: { $ne: id }   
            });
            if (helperIdExist) {
                return res.json({
                    success: false,
                    message: "Helper id existed"
                });
            }
        }

        if (phone) {
            const phoneExist = await Helper.findOne({
                phone,
                deleted: false,
                _id: { $ne: id }   
            });
            if (phoneExist) {
                return res.json({
                    success: false,
                    message: "Phone number existed"
                });
            }
        }

        if (avatar && Array.isArray(avatar)) {
            req.body.avatar = avatar[0];
        }

        if (hasNewPassword) {
            const hashedPassword = await bcrypt.hash(password, 10);
            req.body.password = hashedPassword;
        }

        await Helper.updateOne({ _id: id }, req.body);

        res.json({ success: true });
    } catch (error) {
        console.error("Helper editPatch error:", error);
        res.status(500).json({ error: 'Server error' });
    }
};
