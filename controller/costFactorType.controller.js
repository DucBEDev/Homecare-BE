// Models
const CostFactorType = require("../models/costFactorType.model");

// Config
const systemConfig = require("../config/system");

// [GET] /admin/costFactors
module.exports.index = async (req, res) => {    
    let find = {
        deleted: false
    };
    
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

    res.render('pages/costFactors/index', {
        pageTitle: "Quản lý hệ số chi phí",
        costFactorLists: costFactorLists
    });
}

// [GET] /admin/costFactors/create
module.exports.create = async (req, res) => {
    let find = {
        deleted: false
    };

    const costFactorTypes = await CostFactorType.find(find);

    res.render('pages/costFactors/create', {
        pageTitle: "Tạo hệ số chi phí",
        costFactorTypes: costFactorTypes
    });
}

// [POST] /admin/costFactors/create
module.exports.createPost = async (req, res) => {
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

    req.flash('success', 'Tạo thành công!');
    res.redirect(`${systemConfig.prefixAdmin}/costFactors`);
}

// [GET] /admin/costFactors/edit/:id
module.exports.edit = async (req, res) => {
    const record = await CostFactorType.findOne(
        { 
            _id: req.params.id,
            deleted: false
        }
    );

    let find = {
        deleted: false
    };

    const costFactorTypes = await CostFactorType.find(find);

    res.render('pages/costFactors/edit', {
        pageTitle: "Sửa hệ số chi phí",
        record: record,
        costFactorTypes: costFactorTypes
    });
}

// [PATCH] /admin/costFactors/edit/:id
module.exports.editPatch = async (req, res) => {
    req.body.coefficient = parseFloat(req.body.coefficient);
    await CostFactorType.updateOne(
        { _id: req.params.id },
        req.body
    );

    req.flash("success", "Cập nhật thành công!");
    res.redirect(`${systemConfig.prefixAdmin}/costFactors`);
}

// [DELETE] /admin/costFactors/delete/:id
module.exports.deleteItem = async (req, res) => {
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

    req.flash("success", "Xóa thành công!");
    res.redirect(`${systemConfig.prefixAdmin}/costFactors`);
}

// [PATCH] /admin/costFactors/change-status/:status/:id
module.exports.changeStatus = async (req, res) => {
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

    req.flash("success", "Cập nhật trạng thái thành công.");
    res.redirect(`back`);
}

// [GET] /admin/costFactors/addType
module.exports.addType = async (req, res) => {
    res.render('pages/costFactors/addType', {
        pageTitle: "Quản lý loại hệ số chi phí"
    });
}

// [POST] /admin/costFactors/addType
module.exports.addTypePost = async (req, res) => {
    const costFactor = new CostFactorType(req.body);
    await costFactor.save();

    req.flash('success', 'Tạo thành công!');
    res.redirect(`${systemConfig.prefixAdmin}/costFactors`);
}
