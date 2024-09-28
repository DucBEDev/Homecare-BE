// Models
const Request = require("../models/request.model");
const Location = require("../models/location.model");
const Service = require("../models/service.model");
const Helpers = require("../models/helper.model");
const Customer = require("../models/customer.model");

// Config 
const systemConfig = require("../config/system");

// Helpers
const formatDateHelper = require("../helpers/formatDate");

// Libs
const moment = require("moment");

function calculateRequestCost(request, service) {
    const daysDiff = Math.ceil((request.endTime.getTime() - request.startTime.getTime()) / (1000 * 3600 * 24));
    const hoursDiff = Math.ceil(request.endTime.getUTCHours() - request.startTime.getUTCHours());

    const baseCost = service.basicPrice * hoursDiff * daysDiff;
    
    const eightAM = 8;
    const sixPM = 18;
    const OTStartTime = Math.ceil(eightAM - request.startTime.getUTCHours());
    const OTEndTime = Math.ceil(sixPM - request.endTime.getUTCHours());
    let OTTotalHour = 0;
    if (OTStartTime > 0) {
        OTTotalHour += OTStartTime;
    }
    if (OTEndTime < 0) {
        OTTotalHour += Math.abs(OTEndTime);
    }
    const OTTotalCost = service.overTimePrice_Customer * 0.01 * service.basicPrice * OTTotalHour * daysDiff;

    return objectRequestCost = {
        baseCost: baseCost,
        OTTotalHour: OTTotalHour * daysDiff,
        OTTotalCost: OTTotalCost,
        negotiationCosts: request.negotiationCosts,
        TotalCost: baseCost + OTTotalCost + request.negotiationCosts
    };
}


// [GET] /admin/requests
module.exports.index = async (req, res) => {
    const undeterminedCosts = await Request.find({
        deleted: false,
        status: "pending"
    });

    const processingRequests = await Request.find({
        deleted: false,
        status: "notDone"
    });

    const historyRequests = await Request.find({
        deleted: false,
        status: "done"
    });

    processingRequests.map(request => {
        const startTime = moment(request.startTime).utc(); 
        const endTime = moment(request.endTime).utc(); 

        // Get the current time
        const now = moment().utc();
        now.add(7, 'hours');

        if (now.isBetween(startTime, endTime)) {
            request.status = "unconfirmed";
        }
        else if (now.isAfter(startTime, endTime)) {
            request.status = "done";
        }
        else if (request.helper_id) {
            request.status = "assigned";
        }
    });

    res.render('pages/requests/index', {
        pageTitle: "Quản lý đơn hàng",
        undeterminedCosts: undeterminedCosts,
        processingRequests: processingRequests,
        historyRequests: historyRequests,
    });
}

// [GET] /admin/requests/create
module.exports.create = async (req, res) => {
    const locations = await Location.find({});
    const services = await Service.find({
        deleted: false,
        status: "active"
    });

    res.render('pages/requests/create', {
        pageTitle: "Thêm đơn hàng",
        locations: locations,
        services: services
    });
}

// [POST] /admin/requests/create
module.exports.createPost = async (req, res) => {
    if (req.body.requestType == "shortTerm") {
        req.body.endDate = req.body.startDate;
    }

    let customerInfo = {
        fullName: req.body.fullName,
        phone: req.body.phone,
        address: req.body.address
    }
    req.body.customerInfo = customerInfo;

    let location = {
        province: req.body.province,
        district: req.body.district
    }
    req.body.location = location;

    const hasExtraFee = await Service.findOne(
        { _id: req.body.service_id }
    );
    if (hasExtraFee.extraFee == "yes") {
        req.body.status = "pending";
    }

    const startDate = moment(req.body.startDate);
    const startTime = moment(startDate);
    const startTimeTemp = parseInt(req.body.startTime);
    // Create time
    startTime.hour(Math.floor(startTimeTemp / 60))
            .minute(startTimeTemp % 60)
            .second(0)
            .millisecond(0);
    // Add 7 hours (VN is UTC +7)
    startTime.add(7, 'hours');
    // Convert to Date 
    req.body.startTime = startTime.toDate();
    
    const endDate = moment(req.body.endDate);
    const endTime = moment(endDate);
    const endTimeTemp = parseInt(req.body.endTime);
    // Create time
    endTime.hour(Math.floor(endTimeTemp / 60))
            .minute(endTimeTemp % 60)
            .second(0)
            .millisecond(0);
    // Add 7 hours (VN is UTC +7)
    endTime.add(7, 'hours');
    // Convert to Date 
    req.body.endTime = endTime.toDate();

    const request = new Request(req.body);
    await request.save();

    const customer = await Customer.findOne({ phone: req.body.phone });
    if (!customer) {
        const createCustomer = new Customer({
            fullName: req.body.customerInfo.fullName,
            phone: req.body.customerInfo.phone,
            addresses: [
                {
                    province: req.body.location.province,
                    district: req.body.location.district,
                    address: req.body.customerInfo.address
                }
            ],
            signedUp: false,
            points: [
                {
                    updateDate: new Date(),
                    point: 0
                }
            ]
        });
        await createCustomer.save();
    }

    req.flash("success", "Tạo đơn hàng thành công");
    res.redirect(`${systemConfig.prefixAdmin}/requests`);
}

// [DELETE] /admin/requests/delete/:id
module.exports.deleteItem = async (req, res) => {
    const id = req.params.id;

    await Request.updateOne(
        { _id: id },
        { deleted: true }
    )

    req.flash("success", "Xóa thành công");
    res.redirect("back");
}

// [GET] /admin/requests/edit/:id
module.exports.edit = async (req, res) => {
    let find = {
        _id: req.params.id,
        deleted: false
    };

    const request = await Request.findOne(find);
    const locations = await Location.find({});
    const services = await Service.find({
        deleted: false,
        status: "active"
    });

    const requestDate = {
        startDate: formatDateHelper(request.startTime),
        endDate: formatDateHelper(request.endTime)
    };

    res.render("pages/requests/edit", {
        pageTitle: "Chỉnh sửa thông tin đơn hàng",
        request: request,
        locations: locations,
        services: services,
        requestDate: requestDate
    })
}

// [PATCH] /admin/requests/edit/:id
module.exports.editPatch = async (req, res) => {
    if (req.body.requestType == "shortTerm") {
        req.body.endDate = req.body.startDate;
    }

    let customerInfo = {
        fullName: req.body.fullName,
        phone: req.body.phone,
        address: req.body.address
    }
    req.body.customerInfo = customerInfo;

    let location = {
        province: req.body.province,
        district: req.body.district
    }
    req.body.location = location;

    const hasExtraFee = await Service.findOne(
        { _id: req.body.service_id }
    );
    if (hasExtraFee.extraFee == "yes") {
        req.body.status = "pending";
    }

    const startDate = moment(req.body.startDate);
    const startTime = moment(startDate);
    const startTimeTemp = parseInt(req.body.startTime);
    // Create time
    startTime.hour(Math.floor(startTimeTemp / 60))
            .minute(startTimeTemp % 60)
            .second(0)
            .millisecond(0);
    // Add 7 hours (VN is UTC +7)
    startTime.add(7, 'hours');
    // Convert to Date 
    req.body.startTime = startTime.toDate();
    
    const endDate = moment(req.body.endDate);
    const endTime = moment(endDate);
    const endTimeTemp = parseInt(req.body.endTime);
    // Create time
    endTime.hour(Math.floor(endTimeTemp / 60))
            .minute(endTimeTemp % 60)
            .second(0)
            .millisecond(0);
    // Add 7 hours (VN is UTC +7)
    endTime.add(7, 'hours');
    // Convert to Date 
    req.body.endTime = endTime.toDate();

    await Request.updateOne(
        { _id: req.params.id },
        req.body
    );

    req.flash("success", "Cập nhật đơn hàng thành công");
    res.redirect(`${systemConfig.prefixAdmin}/requests`)
}

// [GET] /admin/requests/detail/:id
module.exports.detail = async (req, res) => {
    let find = {
        _id: req.params.id,
        deleted: false
    };

    const request = await Request.findOne(find);
    const service = await Service.findOne({ _id: request.service_id }).select("title basicPrice extraFee overTimePrice_Customer");
    const helpers = await Helpers.find({ deleted: false });

    // Calculate request cost
    const objectRequestCost = calculateRequestCost(request, service);
    // End Calculate request cost

    res.render("pages/requests/detail", {
        pageTitle: "Chi tiết thông tin đơn hàng",
        request: request,
        service: service,
        helpers: helpers,
        objectRequestCost: objectRequestCost
    })
}

// [GET] /admin/requests/updateRequestCost/:id
module.exports.updateRequestCost = async (req, res) => {
    const requestId = req.params.id;

    res.render("pages/requests/updateRequestCost", {
        pageTitle: "Thỏa thuận đơn hàng",
        requestId: requestId
    })
}

// [PATCH] /admin/requests/updateRequestCost/:id
module.exports.updateRequestCostPatch = async (req, res) => {
    const id = req.params.id;
    const negotiationCosts = req.body.negotiationCosts;

    await Request.updateOne(
        { _id: id },
        { 
            negotiationCosts: negotiationCosts,
            status: "notDone"
        }
    );

    req.flash("success", "Cập nhật chi phí thỏa thuận thành công");
    res.redirect(`${systemConfig.prefixAdmin}/requests`);
}

// [PATCH] /admin/requests/updateHelperToRequest/:id
module.exports.updateHelperToRequest = async (req, res) => {
    const id = req.params.id;
    
    await Request.updateOne(
        { _id: id },
        { helper_id: req.body.helper_id }
    );

    req.flash("success", "Giao việc thành công");
    res.redirect(`${systemConfig.prefixAdmin}/requests`);
}

// [GET] /admin/requests/updateRequestDone/:id
module.exports.updateRequestDone = async (req, res) => {
    const id = req.params.id;
    
    await Request.updateOne(
        { _id: id },
        { status: "done" }
    );

    req.flash("success", "Đã hoàn thành đơn hàng.");
    res.redirect(`${systemConfig.prefixAdmin}/requests`);
}