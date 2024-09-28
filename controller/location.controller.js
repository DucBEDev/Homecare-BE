// Models
const Location = require("../models/location.model");

// Config
const systemConfig = require("../config/system");


// [GET] /admins/locations
module.exports.index = async (req, res) => {
    const locations = await Location.find();

    res.render("pages/locations/index", {
        pageTitle: "Danh sách địa điểm",
        locations: locations
    })
}

// [GET] /admins/locations/fetch
module.exports.fetchData = async (req, res) => {
    const locations = await Location.find({ province: req.query.province });

    res.json(locations);
}

// [GET] /admin/locations/createProvince
module.exports.createProvince = async (req, res) => {
    res.render("pages/locations/createProvince", {
        pageTitle: "Thêm khu vực"
    })
}

// [POST] /admin/locations/createProvince
module.exports.createProvincePost = async (req, res) => {
    const location = new Location(req.body);
    location.save();

    res.redirect("back");
}

// [GET] /admin/locations/createDistrict
module.exports.createDistrict = async (req, res) => {
    const locations = await Location.find();

    res.render("pages/locations/createDistrict", {
        pageTitle: "Thêm quận",
        locations: locations
    })
}

// [POST] /admin/locations/createDistrict
module.exports.createDistrictPost = async (req, res) => {
    const objectDistrict = {
        district: req.body.district
    };

    await Location.updateOne(
        { province: req.body.province },
        { $push: { districts: objectDistrict } }
    );
    req.flash("success", "Cập nhật thành công!");
    res.redirect("back");
}

// [DELETE] /admin/locations/deleteProvince/:id
module.exports.deleteProvince = async (req, res) => {
    const id = req.params.id;

    await Location.deleteOne({ _id: id });

    req.flash("success", "Xóa thành công.");
    res.redirect("back");
}

// [DELETE] /admin/locations/deleteDistrict/:id/:districtId
module.exports.deleteDistrict = async (req, res) => {
    const id = req.params.id;
    const districtId = req.params.districtId;
    
    await Location.updateOne(
        { _id: id },
        { $pull: { districts: { _id: districtId } } }
    );
    
    res.redirect("back");
}