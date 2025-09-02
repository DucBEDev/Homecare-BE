// controllers/dashboardController.js
const Customer = require("../models/customer.model");
const Request = require("../models/request.model");
const RequestDetail = require("../models/requestDetail.model");

const { convertDateObject } = require("../helpers/convertDate.helper");

// [GET /admin/dashboard
module.exports.dashboard = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const matchDate = {};
        if (startDate && endDate) {
            matchDate.$gte = convertDateObject(startDate);
            matchDate.$lte = convertDateObject(endDate);
        }

        // ---------- 1. Customers ----------
        const customerStats = await Customer.aggregate([
            {
                $facet: {
                    total: [{ $count: "count" }],
                    growth: [
                        { $match: startDate && endDate ? { createdAt: matchDate } : {} },
                        { $count: "count" },
                    ],
                },
            },
        ]);
        const totalCustomers = customerStats[0].total[0]?.count || 0;
        const growthCustomers = customerStats[0].growth[0]?.count || 0;
        const customerGrowthPercent = totalCustomers > 0 ? ((growthCustomers / totalCustomers) * 100).toFixed(2) : 0;

        // ---------- 2. Orders ----------
        const orderStats = await Request.aggregate([
            {
                $facet: {
                    total: [{ $count: "count" }],
                    growth: [
                        { $match: startDate && endDate ? { orderDate: matchDate } : {} },
                        { $count: "count" },
                    ],
                    status: [
                        {
                            $group: {
                                _id: "$status",
                                count: { $sum: 1 }
                            }
                        }
                    ]
                },
            },
        ]);
        const totalOrders = orderStats[0].total[0]?.count || 0;
        const growthOrders = orderStats[0].growth[0]?.count || 0;
        const orderGrowthPercent = totalOrders > 0 ? ((growthOrders / totalOrders) * 100).toFixed(2) : 0;

        const completedOrders = orderStats[0].status.find(s => s._id === "completed")?.count || 0;
        const cancelledOrders = orderStats[0].status.find(s => s._id === "cancelled")?.count || 0;
        const completionRate = totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(2) : 0;
        const cancelRate = totalOrders > 0 ? ((cancelledOrders / totalOrders) * 100).toFixed(2) : 0;

        // ---------- 3. Revenue ----------
        const revenueStats = await Request.aggregate([
            {
                $match: { status: "completed", ...(startDate && endDate ? { orderDate: matchDate } : {}) }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalCost" },
                    avgRevenue: { $avg: "$totalCost" }
                }
            }
        ]);
        const totalRevenue = revenueStats[0]?.totalRevenue || 0;
        const avgRevenuePerOrder = revenueStats[0]?.avgRevenue || 0;

        // ---------- 5. Top 5 Helpers ----------
        const topHelpers = await RequestDetail.aggregate([
            { $match: { status: "completed", ...(startDate && endDate ? { workingDate: matchDate } : {}) } },
            { $group: { _id: "$helper_id", totalOrders: { $sum: 1 } } },
            { $sort: { totalOrders: -1 } },
            { $limit: 5 },
            { $addFields: { helperObjectId: { $toObjectId: "$_id" } } },
            { $lookup: { from: "helpers", localField: "helperObjectId", foreignField: "_id", as: "helperInfo" } },
            { $unwind: "$helperInfo" },
            { $project: { helperId: "$_id", totalOrders: 1, fullName: "$helperInfo.fullName", phone: "$helperInfo.phone" } },
        ]);

        // ---------- 6. Revenue Breakdown by Service ----------
        const revenueBreakdown = await Request.aggregate([
            { $match: { status: "completed", ...(startDate && endDate ? { orderDate: matchDate } : {}) } },
            {
                $group: {
                    _id: "$service.title",
                    revenue: { $sum: "$totalCost" },
                    totalOrders: { $sum: 1 }
                }
            },
            { $sort: { revenue: -1 } },
            { $project: { _id: 0, serviceName: "$_id", revenue: 1, totalOrders: 1 } }
        ]);

        res.json({
            customers: { total: totalCustomers, growth: growthCustomers, growthPercent: customerGrowthPercent },
            orders: { total: totalOrders, growth: growthOrders, growthPercent: orderGrowthPercent, completionRate, cancelRate },
            revenue: { total: totalRevenue, avgPerOrder: avgRevenuePerOrder },
            topHelpers,
            revenueBreakdown
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

// [GET] /admin/dashboard/chart
module.exports.revenueTimeline = async (req, res) => {
    try {
        const { startDate, endDate, interval } = req.query;
        // interval: "day" | "month" | "year"
        const match = { status: "completed" };
        if (startDate && endDate) {
            match.orderDate = { $gte: convertDateObject(startDate), $lte: convertDateObject(endDate) };
        }

        // Group by date
        let groupId = {};
        switch (interval) {
            case "day":
                groupId = { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } };
                break;
            case "month":
                groupId = { $dateToString: { format: "%Y-%m", date: "$orderDate" } };
                break;
            case "year":
                groupId = { $dateToString: { format: "%Y", date: "$orderDate" } };
                break;
            default:
                groupId = { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } };
        }

        const revenueTimeline = await Request.aggregate([
            { $match: match },
            {
                $group: {
                    _id: groupId,
                    revenue: { $sum: "$totalCost" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } } 
        ]);

        res.json({ success: true, data: revenueTimeline });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

