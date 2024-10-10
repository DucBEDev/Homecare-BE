// Models
const GeneralSetting = require("../models/generalSetting.model");

// Config
const systemConfig = require("../config/system");

// [GET] /admin/generalSettings
module.exports.index = async (req, res) => {
    res.render("pages/generalSetting/index", {
        pageTitle: "Cài đặt chung"
    })
}

// [POST] /admin/generalSettings/update
module.exports.update = async (req, res) => {
    const generalSetting = new GeneralSetting(req.body);
    await generalSetting.save();

    req.flash("success", "Tạo thành công!");
    res.redirect("back");
}