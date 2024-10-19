// Models
const Request = require("../models/request.model");
const RequestDetail = require("../models/requestDetail.model");
const Location = require("../models/location.model");
const Service = require("../models/service.model");
const Helper = require("../models/helper.model");
const Customer = require("../models/customer.model");
const CostFactorType = require("../models/costFactorType.model");
const GeneralSetting = require("../models/generalSetting.model");

// Global variables
const generalSetting_id = "generalSetting";

// Config 
const systemConfig = require("../config/system");

// Helpers
const formatDateHelper = require("../helpers/formatDate");

// Libs
const moment = require("moment");

// Function 
async function calculateCost(startTime, endTime, coefficient_service, coefficient_OT, coefficient_helper = 0, basicPrice = 0) {
    const generalSetting = await GeneralSetting.findOne({ id: generalSetting_id }).select("officeStartTime officeEndTime baseSalary");

    const daysDiff = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 3600 * 24));
    const hoursDiff = Math.ceil(endTime.getUTCHours() - startTime.getUTCHours());
    const officeStartTime = generalSetting.officeStartTime / 60;
    const officeEndTime = generalSetting.officeEndTime / 60;
    const OTStartTime = Math.ceil(officeStartTime - startTime.getUTCHours());
    const OTEndTime = Math.ceil(officeEndTime - endTime.getUTCHours());
    let OTTotalHour = 0;
    
    if (OTStartTime > 0) {
        OTTotalHour += OTStartTime;
    }
    if (OTEndTime < 0) {
        OTTotalHour += Math.abs(OTEndTime);
    }
    
    let TotalCost = 0;
    if (coefficient_helper) {
        const baseCost = Math.floor(generalSetting.baseSalary * coefficient_helper * (hoursDiff - OTTotalHour) * coefficient_service);
        const OTTotalCost = Math.floor(generalSetting.baseSalary * coefficient_helper * OTTotalHour * coefficient_OT * coefficient_service);
        TotalCost = baseCost + OTTotalCost; // Tiền lương của người giúp việc
    }
    else {
        const baseCost = Math.floor(basicPrice * (hoursDiff - OTTotalHour) * daysDiff * coefficient_service);
        const OTTotalCost = Math.floor(basicPrice * OTTotalHour * daysDiff * coefficient_OT * coefficient_service);
        TotalCost = baseCost + OTTotalCost; // Tiền khách hàng trả
    }

    return TotalCost;
}


function convertDateTime(queryDate, queryTime) {
    const time = moment(queryDate);
    const timeTemp = parseInt(queryTime);
    // Create time
    time.hour(Math.floor(timeTemp / 60))
            .minute(timeTemp % 60)
            .second(0)
            .millisecond(0);
    // Add 7 hours (VN is UTC +7)
    time.add(7, 'hours');
    // Convert to Date 
    return time.toDate();
} 


// [GET] /admin/requests
// module.exports.index = async (req, res) => {
//     const undeterminedCosts = await Request.find({
//         deleted: false,
//         status: "pending"
//     });

//     const processingRequests = await Request.find({
//         deleted: false,
//         status: "notDone"
//     });

//     const historyRequests = await Request.find({
//         deleted: false,
//         status: "done"
//     });

//     processingRequests.map(request => {
//         const startTime = moment(request.startTime).utc(); 
//         const endTime = moment(request.endTime).utc(); 

//         // Get the current time
//         const now = moment().utc();
//         now.add(7, 'hours');

//         if (now.isBetween(startTime, endTime)) {
//             request.status = "unconfirmed";
//         }
//         else if (now.isAfter(startTime, endTime)) {
//             request.status = "done";
//         }
//         else if (request.helper_id) {
//             request.status = "assigned";
//         }
//     });

//     res.render('pages/requests/index', {
//         pageTitle: "Quản lý đơn hàng",
//         undeterminedCosts: undeterminedCosts,
//         processingRequests: processingRequests,
//         historyRequests: historyRequests,
//     });
// }

module.exports.index = async (req, res) => {
    try {
        const status = req.query.status;

        const records = await Request.find({
            deleted: false,
            status: status
        });

        records.forEach((request) => {
            // Auto update status in real-time
            const startTime = moment(request.startTime).utc();
            const endTime = moment(request.endTime).utc();
            const now = moment().utc().add(7, 'hours');

            if (now.isBetween(startTime, endTime)) {
                request.status = "unconfirmed";
            } 
            else if (now.isAfter(endTime)) {
                request.status = "done";
            } 
            // End Auto update status in real-time
        });

        res.json({records});
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [GET] /admin/requests/create
// module.exports.create = async (req, res) => {
//     const locations = await Location.find({});
//     const services = await Service.find({
//         deleted: false,
//         status: "active"
//     });
//     const records = await CostFactorType.find(
//         { 
//             deleted: false,
//             applyTo: { $in: ["service", "other"] } 
//         }
//     ).select("coefficientList applyTo");
    
//     res.render('pages/requests/create', {
//         pageTitle: "Thêm đơn hàng",
//         locations: locations,
//         services: services,
//         coefficientLists: records
//     });
// }

module.exports.create = async (req, res) => {
    try {
        const locations = await Location.find({});
        const services = await Service.find({
            deleted: false,
            status: "active"
        });
        const coefficientLists = await CostFactorType.find(
            { 
                deleted: false,
                applyTo: { $in: ["service", "other"] } 
            }
        ).select("coefficientList applyTo");
        
        res.json({
            locations,
            services,
            coefficientLists
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching data' });
    }
}

// [POST] /admin/requests/create
module.exports.createPost = async (req, res) => {
    const serviceList = req.body.service.split("-");
    const serviceTitle = serviceList[0];
    const serviceBasePrice = parseInt(serviceList[1]);

    req.body.startTime = convertDateTime(moment(req.body.startDate), req.body.startTime);
    req.body.endTime = convertDateTime(moment(req.body.endDate), req.body.endTime);

    const TotalCost = await calculateCost(req.body.startTime, req.body.endTime, parseFloat(req.body.coefficient_service), parseFloat(req.body.coefficient_other), serviceBasePrice);
    req.body.totalCost = TotalCost;

    let service = {
        title: serviceTitle, 
        coefficient_service: parseFloat(req.body.coefficient_service),
        coefficient_other: parseFloat(req.body.coefficient_other),
        cost: serviceBasePrice 
    };
    req.body.service = service;

    if (req.body.requestType == "shortTerm") {
        req.body.endDate = req.body.startDate;
    }

    let customerInfo = {
        fullName: req.body.fullName,
        phone: req.body.phone,
        address: req.body.address,
        usedPoint: Math.floor(TotalCost * 1 / 100)
    }
    req.body.customerInfo = customerInfo;

    let location = {
        province: req.body.province,
        district: req.body.district
    }
    req.body.location = location;

    
    const scheduleIds = [];
    let curr = moment(req.body.startTime);
    const end = moment(req.body.endTime);
    while (curr <= end) {
        let objectDate = {
            workingDate: curr.toDate(),
            helper_id: "null",
            status: "notDone",
            helper_cost: 0
        };

        const requestDetail = new RequestDetail(objectDate);
        await requestDetail.save();
        
        curr = curr.add(1, 'days');
        scheduleIds.push(requestDetail.id);
    }
    req.body.scheduleIds = scheduleIds;

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
    const request = await Request.findOne({
        _id: req.params.id,
        deleted: false
    });
    const locations = await Location.find({});
    const services = await Service.find({
        deleted: false,
        status: "active"
    });
    const records = await CostFactorType.find(
        { 
            deleted: false,
            applyTo: { $in: ["service", "other"] } 
        }
    ).select("coefficientList applyTo");

    const requestDate = {
        startDate: formatDateHelper(request.startTime),
        endDate: formatDateHelper(request.endTime)
    };

    res.render("pages/requests/edit", {
        pageTitle: "Chỉnh sửa thông tin đơn hàng",
        request: request,
        locations: locations,
        services: services,
        requestDate: requestDate,
        coefficientLists: records
    })
}

// [PATCH] /admin/requests/edit/:id
module.exports.editPatch = async (req, res) => {
    const serviceList = req.body.service.split("-");
    const serviceTitle = serviceList[0];
    const serviceBasePrice = parseInt(serviceList[1]);

    req.body.startTime = convertDateTime(moment(req.body.startDate), req.body.startTime);
    req.body.endTime = convertDateTime(moment(req.body.endDate), req.body.endTime);

    const TotalCost = await calculateCost(req.body.startTime, req.body.endTime, parseFloat(req.body.coefficient_service), parseFloat(req.body.coefficient_other), serviceBasePrice);
    req.body.totalCost = TotalCost;

    let service = {
        title: serviceTitle, 
        coefficient_service: parseFloat(req.body.coefficient_service),
        coefficient_other: parseFloat(req.body.coefficient_other),
        cost: serviceBasePrice 
    };
    req.body.service = service;

    if (req.body.requestType == "shortTerm") {
        req.body.endDate = req.body.startDate;
    }

    let customerInfo = {
        fullName: req.body.fullName,
        phone: req.body.phone,
        address: req.body.address,
        usedPoint: Math.floor(TotalCost * 1 / 100)
    }
    req.body.customerInfo = customerInfo;

    let location = {
        province: req.body.province,
        district: req.body.district
    }
    req.body.location = location;

    
    const scheduleIds = [];
    let curr = moment(req.body.startTime);
    const end = moment(req.body.endTime);
    while (curr <= end) {
        let objectDate = {
            workingDate: curr.toDate(),
            helper_id: "null",
            status: "notDone",
            helper_cost: 0
        };

        const requestDetail = new RequestDetail(objectDate);
        await requestDetail.save();
        
        curr = curr.add(1, 'days');
        scheduleIds.push(requestDetail.id);
    }
    req.body.scheduleIds = scheduleIds;

    await Request.updateOne(
        { _id: req.params.id },
        req.body
    );

    req.flash("success", "Cập nhật đơn hàng thành công");
    res.redirect(`${systemConfig.prefixAdmin}/requests`)
}

// [GET] /admin/requests/detail/:id
// module.exports.detail = async (req, res) => {
//     let find = {
//         _id: req.params.id,
//         deleted: false
//     };

//     const request = await Request.findOne(find);
//     const helpers = await Helper.find({ deleted: false });


//     res.render("pages/requests/detail", {
//         pageTitle: "Chi tiết thông tin đơn hàng",
//         request: request,
//         helpers: helpers
//     })
// }

module.exports.detail = async (req, res) => {
    try {
        let find = {
            _id: req.params.id,
            deleted: false
        };
    
        const request = await Request.findOne(find);
        const helpers = await Helper.find({ deleted: false }).select("fullName");
        const scheduleRequest = [];

        for (const id of request.scheduleIds) {
            const record = await RequestDetail.findOne({ _id: id });
            const helperName = await Helper.findOne({ _id: record.helper_id }).select("fullName");
            record.helperName = helperName.fullName;
            scheduleRequest.push(record);
        }
    
        res.json({
            request: request,
            helpers: helpers,
            scheduleRequest: scheduleRequest
        })
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}


// [PATCH] /admin/requests/updateHelperToRequest/:id
module.exports.updateHelperToRequest = async (req, res) => {
    const id = req.params.id;
    const helper_id = req.body.helper_id;
    
    const request = await Request.findOne({ _id: id }).select("scheduleIds startTime endTime service");
    const helper_baseFactor = await Helper.findOne({ _id: helper_id }).select("baseFactor");

    for (const scheduleId of request.scheduleIds) {
        const totalCost = await calculateCost(request.startTime, request.endTime, request.service.coefficient_service, request.service.coefficient_other, helper_baseFactor.baseFactor);
        const record = await RequestDetail.updateOne(
            { _id: scheduleId },
            { 
                helper_id: helper_id,
                helper_cost: totalCost,
                status: "processing"
            }
        );
    }

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