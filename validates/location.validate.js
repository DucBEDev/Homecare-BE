module.exports.createProvincePost = (req, res, next) => {
    if (!req.body.province) {
        req.flash("error", "Vui lòng nhập tên khu vực!");
        res.redirect("back");
        return;
    }

    next()
}

module.exports.createDistrictPost = (req, res, next) => {
    if (!req.body.district) {
        req.flash("error", "Vui lòng nhập tên quận!");
        res.redirect("back");
        return;
    }

    next()
}