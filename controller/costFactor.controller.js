// Models
const CostFactor = require("../models/costFactor.model");
const CostFactorType = require("../models/costFactorType.model");

// Config
const systemConfig = require("../config/system");

// [GET] /admin/costFactors
module.exports.index = async (req, res) => {
    let find = {
        deleted: false
    };

    const costFactorTypes = await CostFactorType.find(find);
    
    const records = await CostFactor.find(find);
    for (const record of records) {
        const type = await CostFactorType.findOne(
            { 
                _id: record.coefficientType_id ,
                deleted: false
            }
        ).select("title");
        
        record.type = type;
    }

    res.render('pages/costFactors/index', {
        pageTitle: "Quản lý hệ số chi phí",
        records: records,
        costFactorTypes: costFactorTypes
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
    req.body.coefficient = parseFloat(req.body.coefficient);

    const costFactor = new CostFactor(req.body);
    await costFactor.save();

    req.flash('success', 'Tạo thành công!');
    res.redirect(`${systemConfig.prefixAdmin}/costFactors`);
}

// [GET] /admin/costFactors/edit/:id
module.exports.edit = async (req, res) => {
    const record = await CostFactor.findOne(
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
    await CostFactor.updateOne(
        { _id: req.params.id },
        req.body
    );

    req.flash("success", "Cập nhật thành công!");
    res.redirect(`${systemConfig.prefixAdmin}/costFactors`);
}

// [DELETE] /admin/costFactors/delete/:id
module.exports.deleteItem = async (req, res) => {
    await CostFactor.updateOne(
        { _id: req.params.id },
        { deleted: true }
    );

    req.flash("success", "Xóa thành công!");
    res.redirect(`${systemConfig.prefixAdmin}/costFactors`);
}

// [PATCH] /admin/costFactors/change-status/:status/:id
module.exports.changeStatus = async (req, res) => {
    const status = req.params.status;
    const id = req.params.id;

    await CostFactor.updateOne(
        { _id: id },
        { status: status }
    );

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
