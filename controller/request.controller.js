// Models
const Request = require("../models/request.model");
const RequestDetail = require("../models/requestDetail.model");
const Location = require("../models/location.model");
const Service = require("../models/service.model");
const Helper = require("../models/helper.model");
const Customer = require("../models/customer.model");
const CostFactorType = require("../models/costFactorType.model");
const GeneralSetting = require("../models/generalSetting.model");

// Libs
const moment = require("moment");
const md5 = require('md5');

// Helpers
const { convertDate } = require("../helpers/convertDate.helper");
const { default: mongoose } = require("mongoose");


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
                                    .lean();

        if (coeffOther) {
            coeffOther.coefficientList = coeffOther.coefficientList.filter(c => (c.status === "active" && c.deleted === false));
        }

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

        req.body.startTime = moment(`${convertDate(req.body.startDate)} ${req.body.startTime}`, 'YYYY-MM-DD HH:mm').toDate();
        req.body.endTime = moment(`${convertDate(req.body.endDate)} ${req.body.endTime}`, 'YYYY-MM-DD HH:mm').toDate();

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
                workingDate: moment.utc(convertDate(requestDetailList[i].date), "YYYY-MM-DD").toDate(),
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
        console.log(error)
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [PATCH] /admin/requests/cancelAll/:requestId
module.exports.cancelAll = async (req, res) => {
    try {
        const requestId = req.params.requestId;

        const request = await Request.findById(requestId).select("scheduleIds");
        if (!request) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }

        const detailCount = await RequestDetail.countDocuments({
            _id: { $in: request.scheduleIds },
            status: { $in: ["pending", "assigned"] }
        });

        if (detailCount === request.scheduleIds.length) {
            await Promise.all([
                RequestDetail.updateMany(
                    { _id: { $in: request.scheduleIds } },
                    { $set: { status: "cancelled" } }
                ),
                Request.updateOne(
                    { _id: requestId },
                    { $set: { status: "cancelled" } }
                )
            ]);
            res.status(200).json({ 
                success: true ,
                message: "Request cancelled successfully!"
            });
        }
        else {
            res.status(409).json({
                success: false,
                message: "Request cancelled fail!"
            })
        }
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

// [PATCH] /admin/requests/cancelDetail/:requestDetailId
module.exports.cancelDetail = async (req, res) => {
    try {
        const id = req.params.requestDetailId;

        // Lấy detail cần cancel + request chứa nó
        const oldDetail = await RequestDetail.findById(id).select("cost helper_cost status");
        if (!oldDetail) {
            return res.status(404).json({ success: false, message: "RequestDetail not found" });
        }

        // Chỉ cho phép cancel khi status là pending hoặc assigned
        if (!["pending", "assigned"].includes(oldDetail.status)) {
            return res.status(400).json({
                success: false,
                message: `RequestDetail cancelled fail!`
            });
        }

        const request = await Request.findOne({ scheduleIds: id }).select("scheduleIds totalCost profit");
        if (!request) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }

        // Cập nhật detail thành cancelled
        await RequestDetail.updateOne(
            { _id: id },
            { $set: { status: "cancelled", helper_cost: 0, helper_id: "notAvailable", cost: 0 } }
        );

        // Tính lại cost & profit
        const newRequestCost = request.totalCost - oldDetail.cost;
        // const newProfit = request.profit - (oldDetail.cost - oldDetail.helper_cost);

        const objectUpdate = {
            totalCost: newRequestCost,
            // profit: newProfit
        };

        // Nếu tất cả detail bị cancel => cancel request
        const isRemainingDetail = await RequestDetail.exists({
            _id: { $in: request.scheduleIds },
            status: { $ne: "cancelled" }
        });

        if (!isRemainingDetail) {
            objectUpdate.status = "cancelled";
        }

        await Request.updateOne(
            { _id: request._id },
            { $set: objectUpdate }
        );

        res.status(200).json({ 
            success: true,
            message: "RequestDetail cancelled successfully!"
        });
    } catch (error) {
        console.error("cancelDetail error:", error);
        res.status(500).json({ error: "An error occurred while cancelling detail" });
    }
};

// [PATCH] /admin/requests/changeStatus/:id?status=&type=
module.exports.changeStatus = async (req, res) => {
    try {
        const id = req.params.id;
        const { status, type } = req.query;

        if (type === 'request') {
            await Request.updateOne(
                { _id: id },
                { $set: { status: status } }
            );
        } else if (type === 'requestDetail') {
            const updatedDetail = await RequestDetail.findByIdAndUpdate(
                id,
                { $set: { status: status } },
                { new: true } // return new document after proceeding update
            );

            if (!updatedDetail) {
                return res.status(404).json({ 
                    success: false, 
                    message: "RequestDetail not found" 
                });
            }

            const request = await Request.findOne({
                scheduleIds: { $in: [id] }
            });

            if (!request) {
                return res.status(404).json({ 
                    success: false, 
                    message: "Request not found" 
                });
            }

            const allDetails = await RequestDetail.find({
                _id: { $in: request.scheduleIds }
            });

            if (status === 'inProgress') {
                const inProgressDetails = allDetails.filter(detail => 
                    detail.status === 'inProgress'
                );
                
                if (inProgressDetails.length === 1) {
                    await Request.updateOne(
                        { _id: request._id },
                        { $set: { status: 'inProgress' } }
                    );
                }
            } else if (status === 'completed') {
                const remainingDetails = allDetails.filter(detail => 
                    detail._id.toString() !== id && 
                    detail.status !== 'completed' && 
                    detail.status !== 'cancelled'
                );

                if (remainingDetails.length === 0) {
                        await Request.updateOne(
                        { _id: request._id },
                        { $set: { status: 'waitPayment' } }
                    );
                }
            }
        }

        res.status(200).json({
            success: true,
            message: "Status updated successfully!"
        });
    } catch (error) {
        console.error("error:", error);
        res.status(500).json({ 
            success: false,
            error: "An error occurred while updating status" 
        });
    }
};