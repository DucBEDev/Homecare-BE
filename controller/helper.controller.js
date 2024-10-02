// Models
const Location = require("../models/location.model");
const Helper = require("../models/helper.model");
const Service = require("../models/service.model");
const CostFactorType = require("../models/costFactorType.model");

// Config
const systemConfig = require("../config/system");

// Helper
const filterStatusHelper = require("../helpers/filterStatus");
const searchHelper = require("../helpers/search");
const paginationHelper = require("../helpers/pagination");
const formatDateHelper = require("../helpers/formatDate");


// [GET] /admin/helpers
module.exports.index = async (req, res) => {
    let find = {
        deleted: "false"
    };

    // Filter status
    const filterStatus = filterStatusHelper(req.query);
    if (req.query.status) {
        find.status = req.query.status;
    }
    // End Filter status

    // Search
    const objectSearch = searchHelper(req.query);
    if (objectSearch.regex) {
        find.fullName = objectSearch.regex
    }
    // End Search

    // Sort
    let sort = {};
    if (req.query.sortKey && req.query.sortValue) {
        sort[req.query.sortKey] = req.query.sortValue;
    }
    // End Sort

    // Pagination
    const countHelpers = await Helper.countDocuments(find);
    let objectPagination = paginationHelper(
        {
            currentPage: 1,
            limitItems: 5
        },
        req.query,
        countHelpers
    );
    // End Pagination

    const helpers = await Helper
                            .find(find)
                            .sort(sort)
                            .limit(objectPagination.limitItems)
                            .skip(objectPagination.skip);

    res.render('pages/helpers/index', {
        pageTitle: "Quản lý người giúp việc",
        helpers: helpers,
        filterStatus: filterStatus,
        keyword: objectSearch.keyword,
        pagination: objectPagination
    });
}

// [GET] /admin/helpers/create
module.exports.create = async (req, res) => {
    const locations = await Location.find({});
    const services = await Service.find({ deleted: false });
    const costFactors = await CostFactorType.findOne(
        { 
            status: "active",
            applyTo: "helper" 
        }
    ).select("coefficientList");

    res.render('pages/helpers/create', {
        pageTitle: "Thêm người giúp việc",
        locations: locations,
        services: services,
        coefficientList: costFactors.coefficientList
    });
}

// [POST] /admin/helpers/create
module.exports.createPost = async (req, res) => {
    const helperIdExist = await Helper.findOne(
        { 
            helper_id: req.body.helper_id,
            deleted: false
        }
    );
    if (helperIdExist) {
        req.flash("error", "CMND người giúp việc đã tồn tại");
        res.redirect(`${systemConfig.prefixAdmin}/helpers/create`);
        return;
    }

    const phoneExist = await Helper.findOne(
        { 
            phone: req.body.phone,
            deleted: false
        }
    );
    if (phoneExist) {
        req.flash("error", "Số điện thoại người giúp việc đã tồn tại");
        res.redirect(`${systemConfig.prefixAdmin}/helpers/create`);
        return;
    }

    if (typeof(req.body.districts) === "string") {
        req.body.districts = [req.body.districts];
    }
    let districts = req.body.districts.map(district => district.split(",").join(" "));
    req.body.workingArea = {
        province: req.body.province,
        districts: districts
    }

    if (typeof(req.body.jobs) === "string") {
        req.body.jobs = [req.body.jobs];
    }

    if (req.body.avatar) {
        req.body.avatar = req.body.avatar[0];
    }

    const newHelper = new Helper(req.body);
    await newHelper.save();

    req.flash("success", "Thêm người giúp việc thành công");
    res.redirect(`${systemConfig.prefixAdmin}/helpers`);
}

// [PATCH] /admin/helpers/change-multi
module.exports.changeMulti = async (req, res) => {
    const type = req.body.type;
    const ids = req.body.ids.split(", ");

    switch (type) {
        case "active":
            await Helper.updateMany(
                { _id: { $in: ids } },
                { status: "active"}
            );
            req.flash("success", "Cập nhật trạng thái cho người giúp việc thành công.");
            break;
        case "inactive":
            await Helper.updateMany(
                { _id: { $in: ids } },
                { status: "inactive"}
            );
            req.flash("success", "Cập nhật trạng thái cho người giúp việc thành công.");
            break;
        case "delete-all":
            await Helper.updateMany(
                { _id: { $in: ids } },
                { deleted: true }
            );
            req.flash("success", `Xóa ${ids.length} người giúp việc thành công!`);
            break;
        default:
            break;
    }

    res.redirect("back");
}

// [PATCH] /admin/helpers/change-status/:status/:id
module.exports.changeStatus = async (req, res) => {
    const status = req.params.status;
    const id = req.params.id;

    await Helper.updateOne(
        { _id: id },
        { status: status }
    )
    req.flash("success", "Cập nhật thành công");
    res.redirect("back");
}

// [DELETE] /admin/helpers/delete/:id
module.exports.deleteItem = async (req, res) => {
    const id = req.params.id;

    await Helper.updateOne(
        { _id: id },
        { deleted: true }
    )

    req.flash("success", "Xóa thành công");
    res.redirect("back");
}

// [GET] /admin/helpers/detail/:id
module.exports.detail = async (req, res) => {
    const helper = await Helper.findOne(
        { _id: req.params.id },
        { deleted: false }
    );

    let services = [];
    for (const job of helper.jobs) {
        const service = await Service.findOne(
            { _id: job },
            { deleted: false }
        );
        services.push(service);
    }

    res.render("pages/helpers/detail", {
        pageTitle: "Thông tin người giúp việc",
        helper: helper,
        services: services
    })
}

// [GET] /admin/helpers/edit/:id
module.exports.edit = async (req, res) => {
    const helper = await Helper.findOne(
        { _id: req.params.id },
        { deleted: false }
    );

    const locations = await Location.find({});
    const newBirthDate = formatDateHelper(helper.birthDate);
    const services = await Service.find({ deleted: false });
    const costFactors = await CostFactorType.findOne(
        { 
            status: "active",
            applyTo: "helper" 
        }
    ).select("coefficientList");

    res.render("pages/helpers/edit", {
        pageTitle: "Chỉnh sửa thông tin người giúp việc",
        helper: helper,
        newBirthDate: newBirthDate,
        locations: locations,
        services: services,
        coefficientList: costFactors.coefficientList
    })
}

// [PATCH] /admin/helpers/edit/:id
module.exports.editPatch = async (req, res) => {
    const helperIdExist = await Helper.findOne(
        { 
            _id: { $ne: req.params.id },
            helper_id: req.body.helper_id,
            deleted: false
        }
    );
    if (helperIdExist) {
        req.flash("error", "CMND người giúp việc đã tồn tại");
        res.redirect(`${systemConfig.prefixAdmin}/helpers/edit`);
        return;
    }

    const phoneExist = await Helper.findOne(
        { 
            _id: { $ne: req.params.id },
            phone: req.body.phone,
            deleted: false
        }
    );
    if (phoneExist) {
        req.flash("error", "Số điện thoại người giúp việc đã tồn tại");
        res.redirect(`${systemConfig.prefixAdmin}/helpers/edit`);
        return;
    }
    
    if (typeof(req.body.districts) === "string") {
        req.body.districts = [req.body.districts];
    }
    
    let districts = req.body.districts.map(district => district.split(",").join(" "));

    req.body.workingArea = {
        province: req.body.province,
        districts: districts
    }

    if (req.body.avatar) {
        req.body.avatar = req.body.avatar[0];
    }

    await Helper.updateOne({ _id: req.params.id }, req.body);
    req.flash("success", "Cập nhật thông tin người giúp việc thành công");
    res.redirect(`${systemConfig.prefixAdmin}/helpers`);
}