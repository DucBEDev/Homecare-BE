// Models
const CostFactorType = require("../models/costFactorType.model");

// [GET] /admin/costFactors
module.exports.index = async (req, res) => {    
    try {
        const { applyTo = "service", search, page = 1, limit = 10 } = req.query;

        const matchStage = { deleted: false };

        if (applyTo) {
            matchStage.applyTo = applyTo;
        }

        const skip = (Number(page) - 1) * Number(limit);

        const pipeline = [
            { $match: matchStage },
            { $unwind: "$coefficientList" },
            { $match: { "coefficientList.deleted": false } },

            ...(search
                ? [
                    {
                        $match: {
                            $or: [
                                { "coefficientList._id": { $regex: search, $options: "i" } },
                                { "coefficientList.title": { $regex: search, $options: "i" } }
                            ]
                        }
                    }
                ]
                : []),

            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: Number(limit) },

            {
                $group: {
                    _id: "$_id",
                    title: { $first: "$title" },
                    description: { $first: "$description" },
                    applyTo: { $first: "$applyTo" },
                    status: { $first: "$status" },
                    coefficientList: { $push: "$coefficientList" }
                }
            }
        ];

        const costFactorLists = await CostFactorType.aggregate(pipeline);

        const totalAgg = await CostFactorType.aggregate([
            { $match: matchStage },
            { $unwind: "$coefficientList" },
            { $match: { "coefficientList.deleted": false } },
            ...(search
                ? [
                    {
                        $match: {
                            $or: [
                                { "coefficientList._id": { $regex: search, $options: "i" } },
                                { "coefficientList.title": { $regex: search, $options: "i" } }
                            ]
                        }
                    }
                ]
                : []),
            { $count: "total" }
        ]);
        const total = totalAgg[0]?.total || 0;

        res.json({
            success: true,
            totalCostFactors: total,
            costFactorLists
        });
    } catch (error) {
        console.error("CostFactorType index error:", error);
        res.status(500).json({ 
            success: false,
            message: "Server error"
        });
    }
};

// [POST] /admin/costFactors/create
module.exports.createPost = async (req, res) => {
    try {
        const coefficient = {
            title: req.body.title,
            description: req.body.description,
            value: parseFloat(req.body.value),
            status: req.body.status
        };
    
        await CostFactorType.updateOne(
            { applyTo: "helper" }, 
            { $push: { coefficientList: coefficient } }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [GET] /admin/costFactors/edit/:id
module.exports.edit = async (req, res) => {
    try {
        const { id } = req.params;

        const record = await CostFactorType.findOne({
            _id: id,
            deleted: false
        })
        .select("-createdBy -updatedBy -createdAt -updatedAt -__v -deleted");

        if (!record) {
            return res.status(404).json({ success: false, message: 'Coefficient not found' });
        }

        res.json({
            success: true,
            result: record,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

// [PATCH] /admin/costFactors/edit/:id
module.exports.editPatch = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        let costFactorType = await CostFactorType.findById(id);
        if (!costFactorType) {
            return res.status(404).json({ success: false, message: "Coefficient not found" });
        }

        if (data.title !== undefined) costFactorType.title = data.title;
        if (data.description !== undefined) costFactorType.description = data.description;
        if (data.status !== undefined) costFactorType.status = data.status;

        if (Array.isArray(data.coefficientList)) {
            data.coefficientList.forEach(item => {
                const index = costFactorType.coefficientList.findIndex(el => el._id.toString() === item._id);
                if (index !== -1) {
                    Object.assign(costFactorType.coefficientList[index], item);
                }
            });
        }

        await costFactorType.save();

        res.json({
            success: true
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
}
