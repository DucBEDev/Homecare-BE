// Models
const CostFactorType = require("../models/costFactorType.model");


// [GET] /admin/costFactors
module.exports.index = async (req, res) => {    
    try {
        // const pipeline = [
        //     { $unwind: "$coefficientList" },
        //     { $match: { "coefficientList.deleted": false } },
        //     { 
        //         $group: {
        //             _id: "$_id",
        //             applyTo: { $first: "$applyTo" },
        //             newCoefficientList: { $push: "$coefficientList" }
        //         }
        //     }
        // ];
        
        const pipeline = [
            { $match: { deleted: false } },
            {
                $project: {
                    _id: 1,
                    applyTo: 1,
                    title: 1,
                    description: 1,
                    status: 1,
                    newCoefficientList: {
                        $filter: {
                            input: "$coefficientList",
                            as: "coeff",
                            cond: { $or: [{ $eq: ["$$coeff", null] }, { $eq: ["$$coeff.deleted", false] }] }
                        }
                    }
               }
            }
        ];
    
        const costFactorLists = await CostFactorType.aggregate(pipeline);

        res.json({
            success: true,
            costFactorLists: costFactorLists
        })
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [GET] /admin/costFactors/create
module.exports.create = async (req, res) => {
    try {
        let find = {
            deleted: false
        };
    
        const costFactorTypes = await CostFactorType.find(find);
        
        res.json({
            success: true,
            costFactorTypes: costFactorTypes
        })
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

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
            { applyTo: req.body.applyTo }, 
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
        const record = await CostFactorType.findOne(
            { 
                _id: req.params.id,
                deleted: false
        
            }
        );
        
        const costFactorTypes = await CostFactorType.find({ deleted: false });

        res.json({
            success: true,
            record: record,
            costFactorTypes: costFactorTypes
        })
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [PATCH] /admin/costFactors/edit/:id
module.exports.editPatch = async (req, res) => {
    try {
        req.body.value = parseFloat(req.body.value);

        await CostFactorType.updateOne(
            {
              applyTo: req.body.applyTo,
              "coefficientList._id": req.params.id  
            },
            {
              $set: {
                "coefficientList.$": req.body  
              }
            }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [DELETE] /admin/costFactors/delete/:id
module.exports.deleteItem = async (req, res) => {
    try {
        const id = req.params.id;

        const deleted = await CostFactorType.updateOne(
            { _id: id },
            { deleted: true }
        );

        if (!deleted.matchedCount) {
            const records = await CostFactorType.find({ deleted: false });

            for (const record of records) {    
                await CostFactorType.updateOne(
                    { _id: record.id },
                    { $set: { "coefficientList.$[element].deleted": true } },
                    { arrayFilters: [ { "element._id": id } ] }
                );
            }
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [PATCH] /admin/costFactors/change-status/:status/:id
module.exports.changeStatus = async (req, res) => {
    try {
        const status = req.params.status;
        const id = req.params.id;

        const changeStatus = await CostFactorType.updateOne(
            { _id: id },
            { status: status }
        );
        if (!changeStatus.matchedCount) {
            const records = await CostFactorType.find({ deleted: false });

            for (const record of records) {    
                await CostFactorType.updateOne(
                    { _id: record.id },
                    { $set: { "coefficientList.$[element].status": status } },
                    { arrayFilters: [ { "element._id": id } ] }
                );
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [POST] /admin/costFactors/addType
module.exports.addTypePost = async (req, res) => {
    try {
        const costFactor = new CostFactorType(req.body);
        await costFactor.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}
