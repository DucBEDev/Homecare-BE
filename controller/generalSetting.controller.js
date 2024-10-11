// Models
const GeneralSetting = require("../models/generalSetting.model");

// Config
const systemConfig = require("../config/system");

// [GET] /admin/generalSettings
module.exports.index = async (req, res) => {
    const generalSetting = await GeneralSetting.findOne({ _id: "6707dc930db8d4059e0bbd65" });

    res.render("pages/generalSetting/index", {
        pageTitle: "Cài đặt chung",
        generalSetting: generalSetting
    })
}

// [POST] /admin/generalSettings/update
module.exports.update = async (req, res) => {
    await GeneralSetting.updateOne({ _id: "6707dc930db8d4059e0bbd65" }, req.body);

    req.flash("success", "Cập nhật thành công!");
    res.redirect("back");
}