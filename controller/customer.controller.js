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

            // Lookup provinces
            {
                $lookup: {
                    from: "locations",
                    localField: "addresses.province",
                    foreignField: "_id",
                    as: "provinceData",
                    pipeline: [
                        { $project: { Name: 1 } }
                    ]
                }
            },

            // Lookup districts
            {
                $lookup: {
                    from: "locations",
                    let: { districtId: "$addresses.district" },
                    pipeline: [
                        { $unwind: "$Districts" },
                        {
                            $match: {
                                $expr: { $eq: ["$Districts._id", "$$districtId"] }
                            }
                        },
                        { $project: { "Districts.Name": 1 } }
                    ],
                    as: "districtData"
                }
            },

            // Lookup wards
            {
                $lookup: {
                    from: "locations",
                    let: { wardId: "$addresses.ward" },
                    pipeline: [
                        { $unwind: "$Districts" },
                        { $unwind: "$Districts.Wards" },
                        {
                            $match: {
                                $expr: { $eq: ["$Districts.Wards._id", "$$wardId"] }
                            }
                        },
                        { $project: { "Districts.Wards.Name": 1 } }
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
                    addresses: {
                        $push: {
                            $cond: {
                                if: { $ne: ["$addresses", null] },
                                then: {
                                    province: { $first: "$provinceData.Name" },
                                    district: { $first: "$districtData.Districts.Name" },
                                    ward: { $first: "$wardData.Districts.Wards.Name" },
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

        const data = await Customer.aggregate(pipeline);

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
                $or: [
                    { status: "done" },
                    { status: "cancelled" }
                ]
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
            if (addr.district) locationIds.add(addr.district.toString());
            if (addr.ward) locationIds.add(addr.ward.toString());
        });

        // Get location data in one query
        const locations = await Location.find({
            $or: [
                { _id: { $in: Array.from(locationIds) } },
                { "Districts._id": { $in: Array.from(locationIds) } },
                { "Districts.Wards._id": { $in: Array.from(locationIds) } }
            ]
        }).select("_id Name Districts");

        // Create lookup maps for fast access
        const provinceMap = new Map();
        const districtMap = new Map();
        const wardMap = new Map();

        locations.forEach(province => {
            provinceMap.set(province._id.toString(), province.Name);
            
            province.Districts?.forEach(district => {
                districtMap.set(district._id.toString(), district.Name);
                
                district.Wards?.forEach(ward => {
                    wardMap.set(ward._id.toString(), ward.Name);
                });
            });
        });

        // Map addresses with location names
        const addresses = customer.addresses?.map(addr => ({
            province: provinceMap.get(addr.province?.toString()) || addr.province,
            provinceId: addr.province,
            district: districtMap.get(addr.district?.toString()) || addr.district,
            districtId: addr.district,
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
        const customer = await Customer.aggregate([
            { $match: { phone: cusPhone } },
            { $unwind: "$addresses" },
          
            // Join Province
            {
              $lookup: {
                from: "locations",
                localField: "addresses.province",
                foreignField: "_id",
                as: "province"
              }
            },
            { $unwind: "$province" },
          
            // Join District
            {
              $lookup: {
                from: "locations",
                let: { districts: "$province.Districts", districtId: "$addresses.district" },
                pipeline: [
                  { $unwind: "$Districts" },
                  { $match: { $expr: { $eq: ["$Districts._id", "$$districtId"] } } },
                  { $replaceRoot: { newRoot: "$Districts" } }
                ],
                as: "district"
              }
            },
            { $unwind: "$district" },
          
            // Join Ward
            {
              $lookup: {
                from: "locations",
                let: { wards: "$district.Wards", wardId: "$addresses.ward" },
                pipeline: [
                  { $unwind: "$Districts" },
                  { $unwind: "$Districts.Wards" },
                  { $match: { $expr: { $eq: ["$Districts.Wards._id", "$$wardId"] } } },
                  { $replaceRoot: { newRoot: "$Districts.Wards" } }
                ],
                as: "ward"
              }
            },
            { $unwind: "$ward" },
          
            {
              $project: {
                fullName: 1,
                phone: 1,
                points: 1,
                addresses: {
                  detailAddress: "$addresses.detailAddress",
                  province: "$province.Name",
                  district: "$district.Name",
                  ward: "$ward.Name"
                }
              }
            }
        ]);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        const cusPoints = calculateCustomerPoint(customer.points || []);
        
        res.json({
            success: true,
            customer: {
                ...customer[0],
                points: cusPoints
            }
        });
    } catch (error) {
        console.error("customerDetail error:", error);
        res.status(500).json({ error: "Server error" });
    }
};