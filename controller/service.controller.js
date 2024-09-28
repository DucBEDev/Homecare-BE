// Models
const Service = require("../models/service.model");

// Config
const systemConfig = require("../config/system");

// Helpers
const filterStatusHelper = require("../helpers/filterStatus");
const searchHelper = require("../helpers/search");
const paginationHelper = require("../helpers/pagination");


// [GET] /admin/services
module.exports.index = async (req, res) => {
    let find = {
        deleted: false
    };

    // Filter Status
    const filterStatus = filterStatusHelper(req.query);
    if (req.query.status) {
        find.status = req.query.status;
    }
    // End Filter Status

    // Search
    const objectSearch = searchHelper(req.query);
    if (objectSearch.regex) {
        find.title = objectSearch.regex;
    }
    // End Search

    // Sort
    let sort = {};
    if (req.query.sortKey && req.query.sortValue) {
        sort[req.query.sortKey] = req.query.sortValue;
    }
    // End Sort

    // Pagination
    const countDocuments = await Service.countDocuments();
    let objectPagination = paginationHelper(
        {
            currentPage: 1,
            limitItems: 5
        },
        req.query,
        countDocuments
    );
    // End Pagination

    const services = await Service
                            .find(find)
                            .sort(sort)
                            .limit(objectPagination.limitItems)
                            .skip(objectPagination.skip);

    res.render('pages/services/index', {
        pageTitle: "Dịch vụ",
        services: services,
        filterStatus: filterStatus,
        keyword: objectSearch.keyword,
        pagination: objectPagination
    });
}

// [GET] /admin/services/create
module.exports.create = async (req, res) => {
    res.render('pages/services/create', {
        pageTitle: "Thêm dịch vụ"
    });
}

// [POST] /admin/services/create
module.exports.createPost = async (req, res) => {
    req.body.basicPrice = parseInt(req.body.basicPrice);
    req.body.overTimePrice_Helper = parseInt(req.body.overTimePrice_Helper);
    req.body.overTimePrice_Customer = parseInt(req.body.overTimePrice_Customer);

    const service = new Service(req.body);
    await service.save();

    req.flash("success", "Thêm dịch vụ thành công.");
    res.redirect(`${systemConfig.prefixAdmin}/services`);
}

// [PATCH] /admin/services/change-multi
module.exports.changeMulti = async (req, res) => {
    const type = req.body.type;
    const ids = req.body.ids.split(", ");

    switch (type) {
        case "active":
            await Service.updateMany(
                { _id: { $in: ids } },
                { status: "active" }
            );
            req.flash("success", "Cập nhật trạng thái thành công.");
            break;
        case "inactive":
            await Service.updateMany(
                { _id: { $in: ids } },
                { status: "inactive" }
            );
            req.flash("success", "Cập nhật trạng thái thành công.");
            break;
        case "delete-all":
            await Service.updateMany(
                { _id: { $in: ids } },
                { deleted: true }
            );
            req.flash("success", "Xóa thành công.");
            break;
        default:
            break;
    }

    res.redirect(`back`);
}

// [PATCH] /admin/services/change-status/:status/:id
module.exports.changeStatus = async (req, res) => {
    const status = req.params.status;
    const id = req.params.id;

    await Service.updateOne(
        { _id: id },
        { status: status }
    );

    req.flash("success", "Cập nhật trạng thái thành công.");
    res.redirect(`back`);
}

// [DELETE] /admin/services/delete/:id
module.exports.deleteItem = async (req, res) => {
    const id = req.params.id;

    await Service.updateOne(
        { _id: id },
        { deleted: true }
    );

    req.flash("success", "Xóa dịch vụ thành công.");
    res.redirect(`back`);
}

// [GET] /admin/services/edit/:id
module.exports.edit = async (req, res) => {
    const id = req.params.id;

    const service = await Service.findOne(
        { _id: id },
        { deleted: false }
    );

    res.render("pages/services/edit", {
        pageTitle: "Sửa dịch vụ",
        service: service
    })
}

// [PATCH] /admin/services/edit/:id
module.exports.editPatch = async (req, res) => {
    const id = req.params.id;

    req.body.basicPrice = parseInt(req.body.basicPrice);
    req.body.overTimePrice_Helper = parseInt(req.body.overTimePrice_Helper);
    req.body.overTimePrice_Customer = parseInt(req.body.overTimePrice_Customer);
    
    await Service.updateOne(
        { _id: id }, 
        req.body
    );

    req.flash("success", "Cập nhật dịch vụ thành công.");
    res.redirect(`${systemConfig.prefixAdmin}/services`);
}

// [GET] /admin/services/detail/:id
module.exports.detail = async (req, res) => {
    const id = req.params.id;

    const service = await Service.findOne(
        { _id: id },
        { deleted: false }
    );

    res.render("pages/services/detail", {
        pageTitle: "Chi tiết dịch vụ",
        service: service
    })
}