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
        const { service, coefficient } = req.body;

        const costFactorType = await CostFactorType.findOne({ applyTo: "service" });
        if (!costFactorType) {
            return res.status(404).json({ message: "Server error" });
        }

        costFactorType.coefficientList.push({
            title: coefficient.title,
            description: coefficient.description,
            value: coefficient.value,
            status: "active"
        });
        await costFactorType.save();

        const newCoefficient = costFactorType.coefficientList[costFactorType.coefficientList.length - 1];

        const newService = await Service.create({
            title: service.title,
            basicPrice: service.basicPrice,
            coefficient_id: newCoefficient._id,
            description: service.description,
            status: service.status
        });

        return res.status(201).json({
            success: true,
        });
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

// [GET] /admin/services/edit/:serviceId
module.exports.edit = async (req, res) => {
    try {
        const { serviceId } = req.params;

        const service = await Service.findById(serviceId)
                                    .select("-deleted -createdBy -updatedBy -createdAt -updatedAt -__v")
                                    .lean();
        if (!service) {
            return res.status(404).json({ 
                success: false, 
                message: "Service not found" 
            });
        }

        // 2. Tìm coefficient tương ứng trong costFactorTypes
        const costFactorType = await CostFactorType.findOne(
            { applyTo: "service", "coefficientList._id": service.coefficient_id },
            { "coefficientList.$": 1 }
        )
        .select('-deleted')
        .lean();

        const coefficient = costFactorType ? costFactorType.coefficientList[0] : null;

        return res.json({
            success: true,
            result: {
                ...service,
                coefficient
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Server error' });   
    }
}

// [PATCH] /admin/services/edit/:serviceId
module.exports.editPatch = async (req, res) => {
    try {
        const { serviceId } = req.params; 
        const { service, coefficient } = req.body;

        const updatedService = await Service.findByIdAndUpdate(
            serviceId,
            {
                $set: {
                    title: service.title,
                    basicPrice: service.basicPrice,
                    description: service.description,
                    status: service.status
                }
            },
            { new: true }
        ).lean();

        if (!updatedService) {
            return res.status(404).json({ 
                success: false,
                message: "Service not found" 
            });
        }

        const updatedCostFactor = await CostFactorType.findOneAndUpdate(
            { applyTo: "service", "coefficientList._id": updatedService.coefficient_id },
            {
                $set: {
                    "coefficientList.$.title": coefficient.title,
                    "coefficientList.$.description": coefficient.description,
                    "coefficientList.$.value": coefficient.value,
                    "coefficientList.$.status": coefficient.status
                }
            },
            { new: true }
        ).lean();

        return res.json({
            success: true,
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });   
    }
}

// [GET] /admin/services/detail/:id
module.exports.detail = async (req, res) => {
    try {
        const { serviceId } = req.params;

        const service = await Service.findById(serviceId)
                                    .select("-deleted -createdBy -updatedBy -createdAt -updatedAt -__v")
                                    .lean();
        if (!service) {
            return res.status(404).json({ 
                success: false, 
                message: "Service not found" 
            });
        }

        const costFactorType = await CostFactorType.findOne(
            { applyTo: "service", "coefficientList._id": service.coefficient_id },
            { "coefficientList.$": 1 }
        )
        .select('-deleted')
        .lean();

        const coefficient = costFactorType ? costFactorType.coefficientList[0] : null;

        return res.json({
            success: true,
            result: {
                ...service,
                coefficient
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });   
    }
}