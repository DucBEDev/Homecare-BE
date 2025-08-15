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

// Libs
const moment = require("moment");
const md5 = require('md5');

// Helpers
const { convertDate } = require("../helpers/convertDate.helper");
const { default: mongoose } = require("mongoose");

// Function 
async function calculateCost(startTime, endTime, coefficient_service, coefficient_OT, coefficient_other, coefficient_helper) {
    const generalSetting = await GeneralSetting.findOne({ id: generalSetting_id }).select("officeStartTime officeEndTime baseSalary");

    const hoursDiff = Math.ceil(endTime.getUTCHours() - startTime.getUTCHours());
    const officeStartTime = moment(generalSetting.officeStartTime, "HH:mm").hours();
    const officeEndTime = moment(generalSetting.officeEndTime, "HH:mm").hours();
    const OTStartTime = officeStartTime - startTime.getUTCHours() >= 0 ? officeStartTime - startTime.getUTCHours() : 0;
    const OTEndTime = endTime.getUTCHours() - officeEndTime >= 0 ? endTime.getUTCHours() - officeStartTime : 0;
    const OTTotalHour = OTStartTime + OTEndTime;

    const totalCost = generalSetting.baseSalary * coefficient_service * coefficient_helper * ((coefficient_OT * OTTotalHour) + (coefficient_other * (hoursDiff - OTTotalHour)));

    return totalCost;
}

function convertMinuteToHour(minute) {
    const duration = moment.duration(minute, 'minutes');
    return duration.asHours().toFixed(2).replace('.', ':');
}

// [GET] /admin/requests
module.exports.index = async (req, res) => {
    try {
        const { status = "all", search, fromDate, toDate, page = 1, limit = 10 } = req.query;

        const matchStage = {};

        if (status !== "all") {
            matchStage.status = status;
        }

        if (fromDate && toDate) {
            const from = convertDate(fromDate);
            const to = convertDate(toDate);

            to.setHours(23, 59, 59, 999);
            matchStage.orderDate = { $gte: from, $lte: to };
        }

        if (search) {
            matchStage.$expr = {
                $or: [
                    {
                        $regexMatch: {
                            input: { $toString: "$_id" },
                            regex: search,
                            options: "i"
                        }
                    },
                    {
                        $regexMatch: {
                            input: "$customerInfo.phone",
                            regex: search,
                            options: "i"
                        }
                    },
                    {
                        $regexMatch: {
                            input: "$customerInfo.fullName",
                            regex: search,
                            options: "i"
                        }
                    }
                ]
            };
        }

        const skip = (Number(page) - 1) * Number(limit);

        const pipeline = [
            { $match: matchStage },

            {
                $addFields: {
                    scheduleIdsObj: {
                        $cond: [
                            { $isArray: "$scheduleIds" },
                            {
                                $map: {
                                    input: "$scheduleIds",
                                    as: "id",
                                    in: {
                                        $convert: {
                                            input: "$$id",
                                            to: "objectId",
                                            onError: "$$id",
                                            onNull: "$$id"
                                        }
                                    }
                                }
                            },
                            []
                        ]
                    }
                }
            },

            {
                $lookup: {
                    from: "requestDetails",
                    localField: "scheduleIdsObj",
                    foreignField: "_id",
                    as: "requestDetails"
                }
            },

            {
                $addFields: {
                    cost: {
                        $sum: {
                            $map: {
                                input: "$requestDetails",
                                as: "d",
                                in: { $ifNull: ["$$d.cost", 0] }
                            }
                        }
                    }
                }
            },

            { $sort: { orderDate: -1 } },
            { $skip: skip },
            { $limit: Number(limit) },

            {
                $project: {
                    _id: 0,
                    orderId: { $toString: "$_id" },
                    orderDate: {
                        $dateToString: {
                            format: "%d/%m/%Y %H:%M:%S",
                            date: "$orderDate",
                            timezone: "Asia/Ho_Chi_Minh"
                        }
                    },
                    status: 1,
                    phoneNumberCustomers: "$customerInfo.phone",
                    serviceCategory: "$service.title",
                    cost: 1
                }
            }
        ];

        const data = await Request.aggregate(pipeline);

        const totalAgg = await Request.aggregate([{ $match: matchStage }, { $count: "total" }]);
        const total = totalAgg[0]?.total || 0;

        return res.status(200).json({ 
            success: true,
            totalOrders: total, 
            result: data 
        });
    } catch (err) {
        console.error("index error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

// [GET] /admin/requests/create
module.exports.create = async (req, res) => {
    try {
        const generalSetting = await GeneralSetting
                                        .findOne({ id: "generalSetting" })
                                        .select("baseSalary openHour closeHour officeStartTime officeEndTime");

        const pipeline = [
            {
                $match: { status: "active", deleted: false }
            },
            {
                $addFields: {
                    coefficientObjId: {
                        $convert: {
                            input: "$coefficient_id",
                            to: "objectId",
                            onError: null,
                            onNull: null
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: "costFactorTypes",
                    let: { coeffId: "$coefficientObjId" },
                    pipeline: [
                        { $match: { status: "active", deleted: false } },
                        { $unwind: "$coefficientList" },
                        {
                            $match: {
                                $expr: { $eq: ["$coefficientList._id", "$$coeffId"] },
                                "coefficientList.status": "active",
                                "coefficientList.deleted": false
                            }
                        },
                        {
                            $project: {
                                _id: "$coefficientList._id",
                                title: "$coefficientList.title",
                                description: "$coefficientList.description",
                                value: "$coefficientList.value",
                            }
                        }
                    ],
                    as: "costFactorType"
                }
            },
            {
                $addFields: {
                    costFactorType: { $arrayElemAt: ["$costFactorType", 0] }
                }
            },
            {
                $project: {
                    _id: 0,
                    serviceId: { $toString: "$_id" },
                    title: 1,
                    basicPrice: 1,
                    description: 1,
                    costFactorType: 1
                }
            }
        ];                                                                                               
        const serviceList = await Service.aggregate(pipeline);

        const coeffOther = await CostFactorType
                                    .findOne({
                                        applyTo: "other",
                                        status: "active",
                                        deleted: false
                                    })
                                    .select("title coefficientList")

        res.json({
            success: true,
            result: {
                serviceList: serviceList,
                systemSetting: generalSetting,
                coefficientOther: coeffOther
            }
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'An error occurred while fetching data' });
    }
}

// [POST] /admin/requests/create
module.exports.createPost = async (req, res) => {
    try {
        const serviceTitle = req.body.serviceTitle;
        const serviceBasePrice = parseInt(req.body.serviceBasePrice);
        const coefficient_service = parseFloat(req.body.coefficient_service);
        const coefficient_other = parseFloat(req.body.coefficient_other);
        const coefficient_ot = parseFloat(req.body.coefficient_ot);
 
        req.body.startTime = moment(`${req.body.startDate} ${req.body.startTime}`, 'YYYY-MM-DD HH:mm').toDate();
        req.body.endTime = moment(`${req.body.endDate} ${req.body.endTime}`, 'YYYY-MM-DD HH:mm').toDate();

        req.body.totalCost = parseInt(req.body.totalCost);
        
        let service = {
            title: serviceTitle, 
            coefficient_service: coefficient_service,
            coefficient_other: coefficient_other,
            coefficient_ot: coefficient_ot,
            cost: serviceBasePrice 
        };
        req.body.service = service;
        
        let customerInfo = {
            fullName: req.body.fullName,
            phone: req.body.phone,
            address: `${req.body.address}, ${req.body.ward}, ${req.body.district}, ${req.body.province}`,
            usedPoint: Math.floor(req.body.totalCost * 1 / 100)
        }
        req.body.customerInfo = customerInfo;

        const scheduleIds = [];
        const requestDetailList = req.body.detailCost;

        for (let i = 0; i < requestDetailList.length; i++) {
            let objectData = {
                workingDate: moment.utc(requestDetailList[i].date, "YYYY-MM-DD").toDate(),
                startTime: req.body.startTime,
                endTime: req.body.endTime,
                helper_id: "notAvailable",
                status: "pending",
                helper_cost: 0,
                cost: parseFloat(requestDetailList[i].cost)
            };

            const requestDetail = new RequestDetail(objectData);
            await requestDetail.save();
            
            scheduleIds.push(requestDetail.id);
        }
        
        req.body.scheduleIds = scheduleIds;
        const request = new Request(req.body);
        await request.save();

        const cusExist = req.body.isCusHasAcc;
        if (!cusExist) {
            const createCustomer = new Customer({
                fullName: req.body.customerInfo.fullName,
                phone: req.body.customerInfo.phone,
                password: md5("111111"),
                addresses: [
                    {
                        province: req.body.provinceCode,
                        district: req.body.districtCode,
                        ward: req.body.wardCode,
                        detailAddress: req.body.address
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
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [DELETE] /admin/requests/delete/:id
module.exports.deleteItem = async (req, res) => {
    try {
        const id = req.params.id;
        const scheduleIds = req.body.scheduleIds;

        for (const id of scheduleIds) {
            await RequestDetail.updateOne(
                { _id: id },
                { 
                    status: "cancelled",
                    helper_cost: 0,
                    helper_id: "notAvailable"
                }
            );
        }

        await Request.updateOne(
            { _id: id },
            { 
                deleted: true,
                status: "cancelled"
            }
        )

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [GET] /admin/requests/detail/:requestId
module.exports.detail = async (req, res) => {
    try {
        const { requestId } = req.params;
    
        const pipeline = [
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(requestId)
                }
            },
            {
                $lookup: {
                    from: "requestDetails",
                    let: { ids: { $map: { input: "$scheduleIds", as: "id", in: { $toObjectId: "$$id" } } } },
                    pipeline: [
                        { $match: { $expr: { $in: ["$_id", "$$ids"] } } },
                        {
                            $addFields: {
                                helperObjId: {
                                    $cond: [
                                        { $regexMatch: { input: "$helper_id", regex: /^[0-9a-fA-F]{24}$/ } },
                                        { $toObjectId: "$helper_id" },
                                        null
                                    ]
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: "helpers",
                                let: { helperId: "$helperObjId" },
                                pipeline: [
                                    { $match: { $expr: { $eq: ["$_id", "$$helperId"] } } },
                                    {
                                        $project: {
                                            _id: 1,           
                                            fullName: 1,      
                                            phone: 1,         
                                        }
                                    }
                                ],
                                as: "helper"
                            }
                        },
                        { $unwind: { path: "$helper", preserveNullAndEmptyArrays: true } }
                    ],
                    as: "requestDetails"
                }
            },
            {
                $project: {
                    _id: 0,
                    request: {
                        orderId: { $toString: "$_id" },
                        orderDate: {
                            $dateToString: {
                                format: "%d/%m/%Y %H:%M:%S",
                                date: "$orderDate",
                                timezone: "Asia/Ho_Chi_Minh"
                            }
                        },
                        status: "$status",
                        customerInfo: "$customerInfo",
                        service: "$service",
                        totalCost: "$totalCost"
                    },
                    requestDetails: {
                        $map: {
                            input: "$requestDetails",
                            as: "rd",
                            in: {
                                detailId: { $toString: "$$rd._id" },
                                workingDate: {
                                    $dateToString: {
                                        format: "%d/%m/%Y",
                                        date: "$$rd.workingDate",
                                        timezone: "Asia/Ho_Chi_Minh"
                                    }
                                },
                                startTime: {
                                    $dateToString: {
                                        format: "%H:%M",
                                        date: "$$rd.startTime",
                                        timezone: "Asia/Ho_Chi_Minh"
                                    }
                                },
                                endTime: {
                                    $dateToString: {
                                        format: "%H:%M",
                                        date: "$$rd.endTime",
                                        timezone: "Asia/Ho_Chi_Minh"
                                    }
                                },
                                status: "$$rd.status",
                                cost: "$$rd.cost",
                                helper_cost: "$$rd.helper_cost",
                                helper: "$$rd.helper"
                            }
                        }
                    }
                }
            }
        ];
        
        

        const result = await Request.aggregate(pipeline);

        res.json({
            success: true,
            request: result[0]?.request || {},
            requestDetails: result[0]?.requestDetails || []
        });
    } catch (err) {
        console.error("getRequestDetail error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

// [PATCH] /admin/requests/detail/assignSubRequest/:requestDetailId
module.exports.assignSubRequest = async (req, res) => {
    try {
        const requestDetailId = req.params.requestDetailId;
        const helper_id = req.body.helper_id;
        const startTime = moment(`${moment().format('YYYY-MM-DD')} ${req.body.startTime}`, 'YYYY-MM-DD HH:mm').add(7, 'hours').toDate();
        const endTime = moment(`${moment().format('YYYY-MM-DD')} ${req.body.endTime}`, 'YYYY-MM-DD HH:mm').add(7, 'hours').toDate();
        const helper_baseFactor = parseFloat(req.body.helper_baseFactor);
        const coefficient_OT = parseFloat(req.body.coefficient_ot);
        const coefficient_other = parseFloat(req.body.coefficient_other);
        const coefficient_service = parseFloat(req.body.coefficient_service);
        const oldHelperCost = parseFloat(req.body.helperCost);
        const newHelperCost = await calculateCost(startTime, endTime, coefficient_service, coefficient_OT, coefficient_other, helper_baseFactor);

        
        await RequestDetail.updateOne(
            { _id: requestDetailId },
            { 
                helper_id: helper_id,
                helper_cost: newHelperCost,
                status: "assigned"
            }
        ); 

        const parentRequest = await Request.findOne({ 
            scheduleIds: requestDetailId,
            status: { $nin: ["done", "cancelled"] } 
        });
        const profit = (parentRequest.profit == 0 ? parentRequest.totalCost : parentRequest.profit) + oldHelperCost - newHelperCost;
        
        if (parentRequest) {
            await Request.updateOne(
                { _id: parentRequest._id },
                { 
                    status: "assigned",
                    profit: profit
                }
            );
        }

        res.json({ 
            success: true,
            totalCost: newHelperCost, 
            profit: profit
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [PATCH] /admin/requests/detail/assignFullRequest
module.exports.assignFullRequest = async (req, res) => {
    try {
        const helper_id = req.body.helper_id;
        const startTime = moment(`${moment().format('YYYY-MM-DD')} ${req.body.startTime}`, 'YYYY-MM-DD HH:mm').add(7, 'hours').toDate();
        const endTime = moment(`${moment().format('YYYY-MM-DD')} ${req.body.endTime}`, 'YYYY-MM-DD HH:mm').add(7, 'hours').toDate();
        const helper_baseFactor = req.body.baseFactor;
        const coefficient_OT = req.body.coefficient_ot;
        const coefficient_other = req.body.coefficient_other;
        const coefficient_service = req.body.coefficient_service;
        const scheduleIds = req.body.scheduleIds;
        let helperCostList = {};
        let helperTotalCost = 0;

        for (const scheduleId of scheduleIds) {
            const findDetail = await RequestDetail.findOne({ _id: scheduleId });

            if (findDetail.status == "notDone" || findDetail.status == "assigned") {
                const totalCost = await calculateCost(startTime, endTime, coefficient_service, coefficient_OT, coefficient_other, helper_baseFactor);
                helperTotalCost += totalCost;

                await RequestDetail.updateOne(
                    { 
                        _id: scheduleId
                    },
                    { 
                        helper_id: helper_id,
                        helper_cost: totalCost,
                        status: "assigned"
                    }
                );
                helperCostList[scheduleId] = totalCost;
            }
            else {
                helperTotalCost += findDetail.helper_cost;
                helperCostList[scheduleId] = findDetail.helper_cost;
            }
        }
        
        const parentRequest = await Request.findOne({ 
            scheduleIds: { $in: scheduleIds },
            status: { $nin: ["done", "cancelled"] } 
        });

        if (parentRequest) {
            await Request.updateOne(
                { _id: parentRequest._id },
                { 
                    status: "assigned",
                    profit: parentRequest.totalCost - helperTotalCost
                }
            );
        }

        res.json({ 
            success: true,
            helperCostList: helperCostList
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [PATCH] /admin/requests/detail/cancel/:requestDetailId
module.exports.cancel = async (req, res) => {
    try {
        const id = req.params.requestDetailId;

        const oldDetail = await RequestDetail.findOne({ _id: id }).select("cost helper_cost");
        
        await RequestDetail.updateOne(
            { _id: id },
            { 
                status: "cancelled",
                helper_cost: 0,
                helper_id: "notAvailable"
            }
        );
        
        const request = (await Request.findOne({ "scheduleIds": id }).select("scheduleIds totalCost profit"));
        const newRequestCost = request.totalCost - oldDetail.cost;
        const newProfit = newRequestCost - (request.totalCost - request.profit - oldDetail.helper_cost);
        const objectUpdate = {
            totalCost: newRequestCost,
            profit: newProfit
        }

        const isRemainingDetail = await RequestDetail.findOne({ 
            _id: { $in: request.scheduleIds },
            status: { $ne: "cancelled" }
        });
        if (isRemainingDetail == null) {
            objectUpdate.status = "cancelled";
        }

        await Request.updateOne(
            { _id: request.id },
            objectUpdate
        )

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [PATCH] /admin/requests/detail/changeTime/:requestDetailId
module.exports.changeTime = async (req, res) => {
    try {
        const id = req.params.requestDetailId;
        const startTime = moment(`${moment().format('YYYY-MM-DD')} ${req.body.startTime}`, 'YYYY-MM-DD HH:mm').add(7, 'hours').toDate();
        const endTime = moment(`${moment().format('YYYY-MM-DD')} ${req.body.endTime}`, 'YYYY-MM-DD HH:mm').add(7, 'hours').toDate();
        const helper_baseFactor = parseFloat(req.body.helper_baseFactor);
        const coefficient_OT = parseFloat(req.body.coefficient_OT);
        const coefficient_other = parseFloat(req.body.coefficient_other);
        const coefficient_service = parseFloat(req.body.coefficient_service);
        const newDetailCost = parseFloat(req.body.totalCost);
        const oldDetailRequest = await RequestDetail.findOne({ _id: id }).select("cost helper_cost");
        const newHelperCost = await calculateCost(startTime, endTime, coefficient_service, coefficient_OT, coefficient_other, helper_baseFactor);

        await RequestDetail.updateOne(
            { _id: id },
            { 
                startTime: startTime,
                endTime: endTime,
                helper_cost: newHelperCost,
                cost: newDetailCost    
            }
        );

        const request = await Request.findOne({ "scheduleIds": id });
        const updateRequestCost = request.totalCost - oldDetailRequest.cost + newDetailCost;
        let newProfit = 0;
        if (request.profit != 0) {
            const oldHelperCost = request.totalCost - request.profit;
            newProfit = updateRequestCost - (oldHelperCost - oldDetailRequest.helper_cost + newHelperCost)
        }

        await Request.updateOne(
            { _id: request.id },
            { totalCost: updateRequestCost, profit: newProfit }
        )

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [GET] /admin/requests/updateRequestDetailDone/:requestDetailId
module.exports.updateRequestDetailDone = async (req, res) => {
    try {
        const id = req.params.requestDetailId;
        const helper_cost = await RequestDetail.findOne({ _id: id }).select("helper_cost");

        res.json({ 
            success: true,
            helper_cost: helper_cost.helper_cost 
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [PATCH] /admin/requests/updateRequestDetailDone/:requestDetailId
module.exports.updateRequestDetailDonePatch = async (req, res) => {
    try {
        const id = req.params.requestDetailId;
        const comment = {
            review: req.body.review,
            loseThings: req.body.loseThings,
            breakThings: req.body.breakThings
        };
        
        await RequestDetail.updateOne(
            { _id: id },
            { 
                status: "done",
                comment: comment
            }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [PATCH] /admin/requests/updateRequestDone/:requestId
module.exports.updateRequestDonePatch = async (req, res) => {
    try {
        const id = req.params.requestId;
        const request = await Request.findOne({ _id: id }).select("scheduleIds startTime endTime customerInfo service totalCost");

        const isDone = await RequestDetail.findOne({
            _id: request.scheduleIds,
            status: { $nin: "done" }
        });
        
        if (isDone != null) {
            return res.status(400).json({ error: 'done request error' });
        }

        const requestDetail = await RequestDetail.find({ _id: { $in: request.scheduleIds } });
        let helperCost = 0;
        for (const detail of requestDetail) {
            helperCost += detail.helper_cost;
        }

        const profit = request.totalCost - helperCost;
        
        await Request.updateOne(
            { _id: id },
            { 
                status: "done",
                profit: profit 
            }
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [GET] /admin/requests/detail/history/:requestDetailId
module.exports.history = async (req, res) => {
    try {
        const id = req.params.requestDetailId;

        const record = await RequestDetail.findOne( { _id: id } ).select("comment");
        res.json({
            success: true,
            comment: record.comment
        })
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [PATCH] /admin/requests/updateDetailWaitPayment/:requestDetailId
module.exports.updateRequestWaitPaymentPatch = async (req, res) => {
    try {
        const id = req.params.requestDetailId;
        await RequestDetail.updateOne(
            { _id: id },
            { 
                status: "waitPayment"
            }
        );
        return res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [PATCH] /admin/requests/updateRequestProcessing/:requestDetailId
module.exports.updateRequestProcessing = async (req, res) => {
    try {
        const id = req.params.requestDetailId;

        await RequestDetail.updateOne(
            { _id: id },
            { 
                status: "processing"
            }
        );
        return res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}