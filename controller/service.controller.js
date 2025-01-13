// Models
const Service = require("../models/service.model");
const CostFactorType = require("../models/costFactorType.model");


// [GET] /admin/services
module.exports.index = async (req, res) => {
    try {
        let find = { deleted: false };

        const services = await Service.find(find);

        res.json({
            success: true,
            services: services
        })
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });      
    }
}

// [GET] /admin/services/create
module.exports.create = async (req, res) => {
    try {
        const records = await CostFactorType.findOne(
            { 
                deleted: false,
                applyTo: "service"
            }
        ).select("coefficientList");

        res.json({
            success: true,
            coefficientList: records.coefficientList
        })
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });   
    }
}

// [POST] /admin/services/create
module.exports.createPost = async (req, res) => {
    try {
        req.body.basicPrice = parseInt(req.body.basicPrice);

        const service = new Service(req.body);
        await service.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });   
    }
}

// [PATCH] /admin/services/change-multi
module.exports.changeMulti = async (req, res) => {
    try {
        const type = req.body.type;
        const ids = req.body.ids.split(", ");

        switch (type) {
            case "active":
                await Service.updateMany(
                    { _id: { $in: ids } },
                    { status: "active" }
                );
                res.json({ success: true });
                break;
            case "inactive":
                await Service.updateMany(
                    { _id: { $in: ids } },
                    { status: "inactive" }
                );
                res.json({ success: true });
                break;
            case "delete-all":
                await Service.updateMany(
                    { _id: { $in: ids } },
                    { deleted: true }
                );
                res.json({ success: true });
                break;
            default:
                break;
        }
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });   
    }
}

// [PATCH] /admin/services/change-status/:status/:id
module.exports.changeStatus = async (req, res) => {
    try {
        const status = req.params.status;
        const id = req.params.id;

        await Service.updateOne(
            { _id: id },
            { status: status }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });   
    }
}

// [DELETE] /admin/services/delete/:id
module.exports.deleteItem = async (req, res) => {
    try {
        const id = req.params.id;

        await Service.updateOne(
            { _id: id },
            { deleted: true }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });   
    }
}

// [GET] /admin/services/edit/:id
module.exports.edit = async (req, res) => {
    try {
        const id = req.params.id;

        const service = await Service.findOne(
            { _id: id },
            { deleted: false }
        );

        const records = await CostFactorType.findOne(
            { 
                deleted: false,
                applyTo: "service"
            }
        ).select("coefficientList");

        res.json({
            success: true,
            service: service,
            coefficientList: records.coefficientList
        })
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });   
    }
}

// [PATCH] /admin/services/edit/:id
module.exports.editPatch = async (req, res) => {
    try {
        const id = req.params.id;
        
        await Service.updateOne(
            { _id: id }, 
            req.body
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });   
    }
}

// [GET] /admin/services/detail/:id
module.exports.detail = async (req, res) => {
    try {
        const id = req.params.id;

        const service = await Service.findOne(
            { _id: id },
            { deleted: false }
        );

        res.json({
            success: true,
            service: service
        })
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });   
    }
}