// Models
const Role = require("../models/role.model");

// Config
const systemConfig = require("../config/system");

// [GET] /admin/roles
module.exports.index = async (req, res) => {
    let find = {
        deleted: false
    };

    const records = await Role.find(find);

    res.render('pages/roles/index', {
        pageTitle: "Nhóm quyền",
        records: records
    });
}

// [GET] /admin/roles/create
module.exports.create = async (req, res) => {
    res.render('pages/roles/create', {
        pageTitle: "Tạo nhóm quyền"
    });
}

// [POST] /admin/roles/create
module.exports.createPost = async (req, res) => {
    const newRole = new Role(req.body);
    await newRole.save();

    req.flash('success', 'Thêm nhóm quyền thành công!');
    res.redirect(`${systemConfig.prefixAdmin}/roles`);
}

// [GET] /admin/roles/detail/:id
module.exports.detail = async (req, res) => {
    const record = await Role.findOne(
        { 
            _id: req.params.id,
            deleted: false
        }
    );

    res.render('pages/roles/detail', {
        pageTitle: "Chi tiết nhóm quyền",
        record: record
    });
}

// [GET] /admin/roles/edit/:id
module.exports.edit = async (req, res) => {
    const record = await Role.findOne(
        { 
            _id: req.params.id,
            deleted: false
        }
    );

    res.render('pages/roles/edit', {
        pageTitle: "Sửa nhóm quyền",
        record: record
    });
}

// [PATCH] /admin/roles/edit/:id
module.exports.editPatch = async (req, res) => {
    await Role.updateOne(
        { _id: req.params.id },
        req.body
    );

    req.flash("success", "Cập nhật thành công!");
    res.redirect(`${systemConfig.prefixAdmin}/roles`);
}

// [DELETE] /admin/roles/delete/:id
module.exports.deleteItem = async (req, res) => {
    await Role.updateOne(
        { _id: req.params.id },
        { deleted: true }
    );

    req.flash("success", "Xóa thành công!");
    res.redirect(`${systemConfig.prefixAdmin}/roles`);
}

// [GET] /admin/roles/permissions
module.exports.permissions = async (req, res) => {
    let find = {
        deleted: false
    };
    const records = await Role.find(find);

    res.render('pages/roles/permissions', {
        pageTitle: "Phân quyền",
        records: records
    });
}

// [PATCH] /admin/roles/permissions
module.exports.permissionsPatch = async (req, res) => {
    const permissions = JSON.parse(req.body.permissions);

    for (const item of permissions) {
        const id = item.id;
        const permissions = item.permissions;

        await Role.updateOne(
            { _id: id },
            { permissions: permissions }
        );
    }

    req.flash("success", "Cập nhật phân quyền thành công!");
    res.redirect("back");
}