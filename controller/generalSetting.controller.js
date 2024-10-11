// Models
const GeneralSetting = require("../models/generalSetting.model");

// Config
const systemConfig = require("../config/system");

// [GET] /admin/generalSettings
module.exports.index = async (req, res) => {
    const generalSetting = await GeneralSetting.findOne({ id: "generalSetting" });

    res.render("pages/generalSetting/index", {
        pageTitle: "Cài đặt chung",
        generalSetting: generalSetting
    })
}

// [POST] /admin/generalSettings/update
module.exports.update = async (req, res) => {
    await GeneralSetting.updateOne({ id: "generalSetting" }, req.body);

    req.flash("success", "Cập nhật thành công!");
    res.redirect("back");
}