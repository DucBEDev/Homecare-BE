// Models
const Customer = require("../models/customer.model");
const Request = require("../models/request.model");
const Discount = require("../models/discount.model");
const Location = require("../models/location.model");


function calculateCustomerPoint(points) {
    const totalPoints = points.reduce((total, point) => {
        return total + point.point
    }, 0);
    
    return totalPoints;
}

// [GET] /admin/customer
module.exports.index = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;

        const matchStage = {};

        // Tìm kiếm
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
                            input: "$fullName",
                            regex: search,
                            options: "i"
                        }
                    },
                    {
                        $regexMatch: {
                            input: "$phone",
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
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: Number(limit) },

            // Unwind addresses để làm việc với từng address
            {
                $unwind: {
                    path: "$addresses",
                    preserveNullAndEmptyArrays: true
                }
            },

            {
                $addFields: {
                    "addresses.provinceObjId": {
                        $cond: [
                            { $and: [
                                { $ne: ["$addresses.province", null] },
                                { $ne: ["$addresses.province", ""] }
                            ]},
                            { $toObjectId: "$addresses.province" },
                            null
                        ]
                    },
                    "addresses.wardObjId": {
                        $cond: [
                            { $and: [
                                { $ne: ["$addresses.ward", null] },
                                { $ne: ["$addresses.ward", ""] }
                            ]},
                            { $toObjectId: "$addresses.ward" },
                            null
                        ]
                    }
                }
            },

            // Lookup provinces
            {
                $lookup: {
                    from: "locations",
                    localField: "addresses.provinceObjId",
                    foreignField: "_id",
                    as: "provinceData",
                    pipeline: [
                        { $project: { name: 1 } }
                    ]
                }
            },

            // Lookup ward
            {
                $lookup: {
                    from: "locations",
                    let: { wardId: "$addresses.wardObjId" },
                    pipeline: [
                        { $unwind: "$wards" },
                        {
                            $match: {
                                $expr: { $eq: ["$wards._id", "$$wardId"] }
                            }
                        },
                        { $project: { "wards.name": 1 } }
                    ],
                    as: "wardData"
                }
            },

            // Group lại addresses cho mỗi customer
            {
                $group: {
                    _id: "$_id",
                    fullName: { $first: "$fullName" },
                    phone: { $first: "$phone" },
                    createdAt: { $first: "$createdAt" },
                    points: { $first: "$points" },
                    addresses: {
                        $push: {
                            $cond: {
                                if: { $ne: ["$addresses", null] },
                                then: {
                                    province: { $arrayElemAt: ["$provinceData.name", 0] },
                                    ward: { $arrayElemAt: ["$wardData.wards.name", 0] },
                                    detailAddress: "$addresses.detailAddress"
                                },
                                else: null
                            }
                        }
                    }
                }
            },

            // Filter out null addresses
            {
                $addFields: {
                    addresses: {
                        $filter: {
                            input: "$addresses",
                            cond: { $ne: ["$$this", null] }
                        }
                    }
                }
            },

            // Final projection
            {
                $project: {
                    _id: 0,
                    customerId: { $toString: "$_id" },
                    fullName: 1,
                    phoneNumber: "$phone",
                    location: "$addresses",
                    points: 1,
                    registerDate: {
                        $dateToString: {
                            format: "%d/%m/%Y",
                            date: "$createdAt",
                            timezone: "Asia/Ho_Chi_Minh"
                        }
                    }
                }
            }
        ];

        let data = await Customer.aggregate(pipeline);

        // Tính điểm cho từng customer
        data = data.map(cus => ({
            ...cus,
            points: calculateCustomerPoint(cus.points || [])
        }));

        // Count total với cùng match condition
        const totalAgg = await Customer.aggregate([
            { $match: matchStage },
            { $count: "total" }
        ]);
        const total = totalAgg[0]?.total || 0;

        return res.status(200).json({
            success: true,
            totalCustomers: total,
            result: data
        });

    } catch (err) {
        console.error("index error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// [GET] /admin/customers/requestHistoryList/:phone
module.exports.requestHistoryList = async (req, res) => {
    try {
        const phone = req.params.phone;

        const records = await Request.find ( 
            { 
                "customerInfo.phone": phone,
            } 
        );

        res.json({
            success: true,
            records: records
        })
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [GET] /admin/customer/checkExist/:cusPhone
module.exports.checkCusExist = async (req, res) => {
    try {
        const { cusPhone } = req.params;
        const now = new Date();

        const customer = await Customer.findOne(
            { phone: cusPhone },
            { fullName: 1, phone: 1, addresses: 1 }
        );

        if (!customer) {
            return res.status(401).json({
                success: false,
                message: "Customer not found"
            });
        }

        // Collect all location IDs from addresses
        const locationIds = new Set();
        customer.addresses?.forEach(addr => {
            if (addr.province) locationIds.add(addr.province.toString());
            if (addr.ward) locationIds.add(addr.ward.toString());
        });

        // Get location data in one query
        const locations = await Location.find({
            $or: [
                { _id: { $in: Array.from(locationIds) } },
                { "wards._id": { $in: Array.from(locationIds) } },
            ]
        }).select("_id name wards");

        // Create lookup maps for fast access
        const provinceMap = new Map();
        const wardMap = new Map();

        locations.forEach(province => {
            provinceMap.set(province._id.toString(), province.name);

            province.wards?.forEach(ward => {
                wardMap.set(ward._id.toString(), ward.name);
            });
        });

        // Map addresses with location names
        const addresses = customer.addresses?.map(addr => ({
            province: provinceMap.get(addr.province?.toString()) || addr.province,
            provinceId: addr.province,
            ward: wardMap.get(addr.ward?.toString()) || addr.ward,
            wardId: addr.ward,
            detailAddress: addr.detailAddress
        })) || [];

        // Get discounts in parallel
        const discounts = await Discount.find({
            status: "active",
            deleted: false,
            applyStartDate: { $lte: now },
            applyEndDate: { $gte: now }
        }).select("title description applyStartDate applyEndDate rate");

        res.json({
            success: true,
            customer: {
                cusName: customer.fullName,
                phone: customer.phone,
                addresses
            },
            discounts
        });

    } catch (error) {
        console.error("checkCusExist error:", error);
        res.status(500).json({ error: "An error occurred while fetching requests" });
    }
};

// [GET] /admin/customer/detail/:cusPhone
module.exports.customerDetail = async (req, res) => {
    try {
        const { cusPhone } = req.params;
        
        // Get customer data first
        const customer = await Customer.findOne({ phone: cusPhone });
        
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        // Process addresses if they exist
        let processedAddresses = [];
        
        if (customer.addresses && customer.addresses.length > 0) {
            // Collect all location IDs
            const provinceIds = [];
            const wardIds = [];
            
            customer.addresses.forEach(addr => {
                if (addr.province) provinceIds.push(addr.province);
                if (addr.ward) wardIds.push(addr.ward);
            });

            // Get provinces
            const provinces = await Location.find({
                _id: { $in: provinceIds }
            }).select("_id name wards");

            // Create maps for quick lookup
            const provinceMap = new Map();
            const wardMap = new Map();

            provinces.forEach(province => {
                provinceMap.set(province._id.toString(), province.name);
                
                if (province.wards) {
                    province.wards.forEach(ward => {
                        wardMap.set(ward._id.toString(), ward.name);
                    });
                }
            });

            // Process addresses
            processedAddresses = customer.addresses.map(addr => ({
                province: provinceMap.get(addr.province?.toString()) || addr.province,
                ward: wardMap.get(addr.ward?.toString()) || addr.ward,
                detailAddress: addr.detailAddress
            }));
        }

        const cusPoints = calculateCustomerPoint(customer.points || []);
        
        res.json({
            success: true,
            customer: {
                _id: customer._id,
                fullName: customer.fullName,
                phone: customer.phone,
                points: cusPoints,
                addresses: processedAddresses[processedAddresses.length - 1] || {}
            }
        });
    } catch (error) {
        console.error("customerDetail error:", error);
        res.status(500).json({ error: "Server error" });
    }
};
