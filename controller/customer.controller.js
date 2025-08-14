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
        }).select("title description applyStartDate applyEndDate");

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
