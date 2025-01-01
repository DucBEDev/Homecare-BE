// Models
const Location = require("../models/location.model");
const Helper = require("../models/helper.model");
const Service = require("../models/service.model");
const CostFactorType = require("../models/costFactorType.model");


// [GET] /admin/helpers
module.exports.index = async (req, res) => {
    try {
        let find = { deleted: "false" };

        const helpers = await Helper.find(find);
        res.json({
            success: true,
            helpers: helpers
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [GET] /admin/helpers/create
module.exports.create = async (req, res) => {
    try {
        const locations = await Location.find({});
        const services = await Service.find({ deleted: false });
        const costFactors = await CostFactorType.findOne(
            { 
                status: "active",
                applyTo: "helper" 
            }
        ).select("coefficientList");

        res.json({
            success: true,
            locations: locations,
            services: services,
            coefficientList: costFactors.coefficientList
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
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
                msg: "CMND người giúp việc đã tồn tại"
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
                msg: "Số điện thoại người giúp việc đã tồn tại"
            })
            return;
        }
    
        if (typeof(req.body.districts) === "string") {
            req.body.districts = [req.body.districts];
        }
        let districts = req.body.districts.map(district => district.split(",").join(" "));
        req.body.workingArea = {
            province: req.body.province,
            districts: districts
        }
    
        if (typeof(req.body.jobs) === "string") {
            req.body.jobs = [req.body.jobs];
        }
    
        if (req.body.avatar) {
            req.body.avatar = req.body.avatar[0];
        }
    
        const newHelper = new Helper(req.body);
        await newHelper.save();
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [PATCH] /admin/helpers/change-multi
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
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [PATCH] /admin/helpers/change-status/:status/:id
module.exports.changeStatus = async (req, res) => {
    try {
        const status = req.params.status;
        const id = req.params.id;

        await Helper.updateOne(
            { _id: id },
            { status: status }
        )

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [DELETE] /admin/helpers/delete/:id
module.exports.deleteItem = async (req, res) => {
    try {
        const id = req.params.id;

        await Helper.updateOne(
            { _id: id },
            { deleted: true }
        )

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [GET] /admin/helpers/detail/:id
module.exports.detail = async (req, res) => {
    try {
        const helper = await Helper.findOne(
            { _id: req.params.id },
            { deleted: false }
        );
    
        let services = [];
        for (const job of helper.jobs) {
            const service = await Service.findOne(
                { _id: job },
                { deleted: false }
            );
            services.push(service);
        }

        res.json({
            success: true,
            helper: helper,
            services: services
        })
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [GET] /admin/helpers/edit/:id
module.exports.edit = async (req, res) => {
    try {
        const helper = await Helper.findOne(
            { _id: req.params.id },
            { deleted: false }
        );
    
        const locations = await Location.find({});
        const services = await Service.find({ deleted: false });
        const costFactors = await CostFactorType.findOne(
            { 
                status: "active",
                applyTo: "helper" 
            }
        ).select("coefficientList");

        res.json({
            success: true,
            helper: helper,
            locations: locations,
            services: services,
            coefficientList: costFactors.coefficientList
        })
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [PATCH] /admin/helpers/edit/:id
module.exports.editPatch = async (req, res) => {
    try {
        const helperIdExist = await Helper.findOne(
            { 
                _id: { $ne: req.params.id },
                helper_id: req.body.helper_id,
                deleted: false
            }
        );
        if (helperIdExist) {
            res.json({
                success: false,
                msg: "CMND người giúp việc đã tồn tại"
            });
            return;
        }
    
        const phoneExist = await Helper.findOne(
            { 
                _id: { $ne: req.params.id },
                phone: req.body.phone,
                deleted: false
            }
        );
        if (phoneExist) {
            res.json({
                success: false,
                msg: "Số điện thoại người giúp việc đã tồn tại"
            });
            return;
        }
        
        if (typeof(req.body.districts) === "string") {
            req.body.districts = [req.body.districts];
        }
        
        let districts = req.body.districts.map(district => district.split(",").join(" "));
    
        req.body.workingArea = {
            province: req.body.province,
            districts: districts
        }
    
        if (req.body.avatar) {
            req.body.avatar = req.body.avatar[0];
        }
    
        await Helper.updateOne({ _id: req.params.id }, req.body);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}