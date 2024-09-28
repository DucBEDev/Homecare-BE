// Models
const CostFactor = require("../models/costFactor.model");

// Config
const systemConfig = require("../config/system");

// [GET] /admin/costFactors
module.exports.index = async (req, res) => {
    let find = {
        deleted: false
    };

    const records = await CostFactor.find(find);

    res.render('pages/costFactors/index', {
        pageTitle: "Quản lý hệ số chi phí",
        records: records
    });
}

// [GET] /admin/costFactors/create
module.exports.create = async (req, res) => {
    res.render('pages/costFactors/create', {
        pageTitle: "Tạo hệ số chi phí"
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

    res.render('pages/costFactors/edit', {
        pageTitle: "Sửa hệ số chi phí",
        record: record
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