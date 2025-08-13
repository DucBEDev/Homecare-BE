// Import the system file config
const systemConfig = require('../config/system');

// Import route
const dashboardRoutes = require("./dashboard.route");
const staffRoutes = require("./staff.route");
const locationRoutes = require("./location.route");
const helperRoutes = require("./helper.route");
const roleRoutes = require("./role.route");
const serviceRoutes = require("./service.route");
const requestRoutes = require("./request.route");
const costFactorTypeRoutes = require("./costFactorType.route");
const customerRoutes = require("./customer.route");
const generalSettingRoutes = require("./generalSetting.route");
const blogRoutes = require("./blog.route");
const timeOffRoutes = require("./timeOff.route");
const authRoutes = require("./auth.route");
const policyRoutes = require("./policy.route");
const questionRoutes = require("./question.route");

module.exports = (app) => {
    const PATH_ADMIN = systemConfig.prefixAdmin;

    app.use(PATH_ADMIN + '/dashboard', dashboardRoutes);
    app.use(PATH_ADMIN + '/staffs', staffRoutes);
    app.use(PATH_ADMIN + '/locations', locationRoutes);
    app.use(PATH_ADMIN + '/helpers', helperRoutes);
    app.use(PATH_ADMIN + '/roles', roleRoutes);
    app.use(PATH_ADMIN + '/services', serviceRoutes);
    app.use(PATH_ADMIN + '/requests', requestRoutes);
    app.use(PATH_ADMIN + '/costFactors', costFactorTypeRoutes);
    app.use(PATH_ADMIN + '/customer', customerRoutes);
    app.use(PATH_ADMIN + '/generalSettings', generalSettingRoutes);
    app.use(PATH_ADMIN + '/blogs', blogRoutes);
    app.use(PATH_ADMIN + '/timeOffs', timeOffRoutes);
    app.use(PATH_ADMIN + '/auth', authRoutes);
    app.use(PATH_ADMIN + '/policies', policyRoutes);
    app.use(PATH_ADMIN + '/questions', questionRoutes);
}