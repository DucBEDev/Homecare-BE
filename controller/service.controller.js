// Models
const Service = require("../models/service.model");
const CostFactorType = require("../models/costFactorType.model");


// [GET] /admin/services
module.exports.index = async (req, res) => {
    try {
        let find = { deleted: false };

        const services = await Service.aggregate([
            { $match: find },
            {
                $lookup: {
                    from: "costFactorTypes",
                    let: { coefficientId: "$coefficient_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$applyTo", "service"] }, deleted: false } },
                        { $unwind: "$coefficientList" },
                        {
                            $addFields: {
                                "coefficientList._id": { $toString: "$coefficientList._id" } // Chuyển _id thành string
                            }
                        },
                        {
                            $match: {
                                $expr: { $eq: ["$coefficientList._id", "$$coefficientId"] }
                            }
                        },
                        {
                            $project: {
                                coefficientValue: "$coefficientList.value",
                                coefficientTitle: "$coefficientList.title"
                            }
                        }
                    ],
                    as: "coefficientData"
                }
            },
            {
                $unwind: { path: "$coefficientData", preserveNullAndEmptyArrays: true }
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    basicPrice: 1,
                    description: 1,
                    status: 1,
                    coefficient_id: 1,
                    coefficientValue: "$coefficientData.coefficientValue",
                    coefficientTitle: "$coefficientData.coefficientTitle"
                }
            }
        ]);

        res.json({
            success: true,
            services: services,
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// [POST] /admin/services/create
module.exports.createPost = async (req, res) => {
    try {
        req.body.basicPrice = parseInt(req.body.basicPrice);

        const service = new Service(req.body);
        await service.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });   
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
        res.status(500).json({ error: 'Server error' });   
    }
}

// [GET] /admin/services/edit/:id
module.exports.edit = async (req, res) => {
    try {
        const id = req.params.id;

        let find = { 
            deleted: false,
            _id: id
        };

        const serviceDetail = await Service.aggregate([
            { $match: find },
            {
                $lookup: {
                    from: "costFactorTypes",
                    let: { coefficientId: "$coefficient_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$applyTo", "service"] }, deleted: false } },
                        { $unwind: "$coefficientList" },
                        {
                            $addFields: {
                                "coefficientList._id": { $toString: "$coefficientList._id" } // Chuyển _id thành string
                            }
                        },
                        {
                            $match: {
                                $expr: { $eq: ["$coefficientList._id", "$$coefficientId"] }
                            }
                        },
                        {
                            $project: {
                                coefficientValue: "$coefficientList.value",
                                coefficientTitle: "$coefficientList.title"
                            }
                        }
                    ],
                    as: "coefficientData"
                }
            },
            {
                $unwind: { path: "$coefficientData", preserveNullAndEmptyArrays: true }
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    basicPrice: 1,
                    description: 1,
                    status: 1,
                    coefficient_id: 1,
                    coefficientValue: "$coefficientData.coefficientValue",
                    coefficientTitle: "$coefficientData.coefficientTitle"
                }
            }
        ]);

        res.json({
            success: true,
            serviceDetail
        })
    } catch (error) {
        res.status(500).json({ error: 'Server error' });   
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
        res.status(500).json({ error: 'Server error' });   
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
        res.status(500).json({ error: 'Server error' });   
    }
}