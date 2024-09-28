// [GET] /admin/dashboard
module.exports.dashboard = (req, res) => {
    res.render('pages/dashboard/index', {
        pageTitle: "Admin dashboard"
    });
}