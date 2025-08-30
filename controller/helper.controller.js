// Models
const Location = require("../models/location.model");
const Helper = require("../models/helper.model");
const Service = require("../models/service.model");
const CostFactorType = require("../models/costFactorType.model");

const moment = require("moment");


// [GET] /admin/helpers
module.exports.index = async (req, res) => {
    try {
        let find = { deleted: "false" };

        const helpers = await Helper.find(find)
                                    .select("helper_id fullName phone avatar workingStatus");
        
        res.json({
            success: true,
            helpers: helpers
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
}

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
        const helperIdExist = await Helper.findOne(
            { 
                helper_id: req.body.helper_id,
                deleted: false
            }
        );
        if (helperIdExist) {
            res.json({
                success: false,
                message: "Helper id existed"
            })
            return;
        }
    
        const phoneExist = await Helper.findOne(
            { 
                phone: req.body.phone,
                deleted: false
            }
        );
        if (phoneExist) {
            res.json({
                success: false,
                message: "Phone number existed"
            })
            return;
        }
    
        if (req.body.avatar) {
            req.body.avatar = req.body.avatar[0];
        }
        
        const newHelper = new Helper(req.body);
        await newHelper.save();

        res.json({success: true}); 
    } catch (error) {
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
        const helperIdExist = await Helper.findOne(
            { 
                helper_id: req.body.helper_id,
                deleted: false
            }
        );
        if (helperIdExist) {
            res.json({
                success: false,
                message: "Helper id existed"
            })
            return;
        }
    
        const phoneExist = await Helper.findOne(
            { 
                phone: req.body.phone,
                deleted: false
            }
        );
        if (phoneExist) {
            res.json({
                success: false,
                message: "Phone number existed"
            })
            return;
        }
    
        if (req.body.avatar) {
            req.body.avatar = req.body.avatar[0];
        }
    
        await Helper.updateOne({ _id: req.params.id }, req.body);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
}