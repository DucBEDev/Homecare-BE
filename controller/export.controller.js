// Models
const Customer = require("../models/customer.model");
const Request = require("../models/request.model");
const RequestDetail = require("../models/requestDetail.model");
const Helper = require("../models/helper.model");
const Service = require("../models/service.model");

// Helpers
const { convertDate } = require("../helpers/convertDate.helper");

// Libraries
const ExcelJS = require('exceljs');
const moment = require('moment');
const mongoose = require('mongoose');

// Helper function to calculate customer points
function calculateCustomerPoint(points) {
    return points.reduce((total, point) => total + point.point, 0);
}

// [GET] /admin/export/data?startDate=&endDate=
module.exports.exportData = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const formatStartDate = convertDate(startDate);
        const formatEndDate = convertDate(endDate);
        
        if (!startDate || !endDate) {
            return res.status(400).json({ 
                success: false, 
                message: "startDate and endDate are required" 
            });
        }

        const start = moment(formatStartDate, 'YYYY-MM-DD').startOf('day').toDate();
        const end = moment(formatEndDate, 'YYYY-MM-DD').endOf('day').toDate();
        const previousStart = moment(start).subtract(moment(end).diff(moment(start), 'days') + 1, 'days').toDate();

        // Create workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Homecare Admin System';
        workbook.created = new Date();

        // Sheet 1: New Customers
        await createCustomerSheet(workbook, start, end);
        
        // Sheet 2: Orders
        await createOrderSheet(workbook, start, end);
        
        // Sheet 3: Revenue Analytics
        await createRevenueSheet(workbook, start, end, previousStart);
        
        // Sheet 4: Helper Performance
        await createHelperSheet(workbook, start, end);
        
        // Sheet 5: Service Performance
        await createServiceSheet(workbook, start, end);

        // Set response headers
        const fileName = `Homecare_Report_${moment(start).format('YYYY-MM-DD')}_to_${moment(end).format('YYYY-MM-DD')}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Export failed' });
    }
};

// Create Customer Sheet
async function createCustomerSheet(workbook, start, end) {
    const worksheet = workbook.addWorksheet('Khách Hàng Mới');

    // Get new customers data
    const customers = await Customer.aggregate([
        {
            $match: {
                createdAt: { $gte: start, $lte: end }
            }
        },
        {
            $lookup: {
                from: "requests",
                localField: "phone",
                foreignField: "customerInfo.phone",
                as: "orders"
            }
        },
        {
            $addFields: {
                totalOrders: { $size: "$orders" },
                totalSpent: { $sum: "$orders.totalCost" },
                totalPoints: { $sum: "$points.point" }
            }
        },
        {
            $project: {
                fullName: 1,
                phone: 1,
                email: 1,
                signedUp: 1,
                totalPoints: 1,
                totalOrders: 1,
                totalSpent: 1,
                registerDate: {
                    $dateToString: {
                        format: "%d/%m/%Y",
                        date: "$createdAt",
                        timezone: "Asia/Ho_Chi_Minh"
                    }
                }
            }
        }
    ]);

    // Headers
    const headers = [
        'Họ Tên', 'Số Điện Thoại', 'Email', 'Đã Đăng Ký', 
        'Điểm Tích Lũy', 'Số Đơn Hàng', 'Tổng Chi Tiêu', 'Ngày Đăng Ký'
    ];

    worksheet.addRow(headers);
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    // Data rows
    customers.forEach(customer => {
        worksheet.addRow([
            customer.fullName,
            customer.phone,
            customer.email || '',
            customer.signedUp ? 'Có' : 'Không',
            customer.totalPoints,
            customer.totalOrders,
            customer.totalSpent,
            customer.registerDate
        ]);
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
        column.width = 15;
    });
}

// Create Order Sheet
async function createOrderSheet(workbook, start, end) {
    const worksheet = workbook.addWorksheet('Đơn Hàng');

    const orders = await Request.aggregate([
        {
            $match: {
                orderDate: { $gte: start, $lte: end }
            }
        },
        {
            $project: {
                orderId: { $toString: "$_id" },
                orderDate: {
                    $dateToString: {
                        format: "%d/%m/%Y",
                        date: "$orderDate",
                        timezone: "Asia/Ho_Chi_Minh"
                    }
                },
                customerName: "$customerInfo.fullName",
                customerPhone: "$customerInfo.phone",
                customerAddress: "$customerInfo.address",
                serviceTitle: "$service.title",
                totalCost: 1,
                profit: 1,
                status: 1,
                usedPoint: "$customerInfo.usedPoint"
            }
        }
    ]);

    const headers = [
        'Mã Đơn', 'Ngày Đặt', 'Tên Khách Hàng', 'Số Điện Thoại', 
        'Địa Chỉ', 'Dịch Vụ', 'Tổng Tiền', 'Lợi Nhuận', 'Trạng Thái', 'Điểm Sử Dụng'
    ];

    worksheet.addRow(headers);
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    orders.forEach(order => {
        worksheet.addRow([
            order.orderId,
            order.orderDate,
            order.customerName,
            order.customerPhone,
            order.customerAddress,
            order.serviceTitle,
            order.totalCost,
            order.profit,
            order.status,
            order.usedPoint || 0
        ]);
    });

    worksheet.columns.forEach(column => {
        column.width = 15;
    });
}

// Create Revenue Sheet
async function createRevenueSheet(workbook, start, end, previousStart) {
    const worksheet = workbook.addWorksheet('Doanh Thu');

    // Current period revenue
    const currentRevenue = await Request.aggregate([
        {
            $match: {
                orderDate: { $gte: start, $lte: end },
                status: 'completed'
            }
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: "$totalCost" },
                totalProfit: { $sum: "$profit" },
                totalOrders: { $sum: 1 }
            }
        }
    ]);

    // Previous period revenue
    const previousRevenue = await Request.aggregate([
        {
            $match: {
                orderDate: { $gte: previousStart, $lt: start },
                status: 'completed'
            }
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: "$totalCost" },
                totalProfit: { $sum: "$profit" },
                totalOrders: { $sum: 1 }
            }
        }
    ]);

    // Daily revenue
    const dailyRevenue = await Request.aggregate([
        {
            $match: {
                orderDate: { $gte: start, $lte: end },
                status: 'completed'
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$orderDate",
                        timezone: "Asia/Ho_Chi_Minh"
                    }
                },
                dailyRevenue: { $sum: "$totalCost" },
                dailyProfit: { $sum: "$profit" },
                dailyOrders: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    const currentData = currentRevenue[0] || { totalRevenue: 0, totalProfit: 0, totalOrders: 0 };
    const previousData = previousRevenue[0] || { totalRevenue: 0, totalProfit: 0, totalOrders: 0 };

    const growthRate = previousData.totalRevenue > 0 
        ? ((currentData.totalRevenue - previousData.totalRevenue) / previousData.totalRevenue * 100).toFixed(2)
        : 'N/A';

    // Summary section
    worksheet.addRow(['TỔNG QUAN DOANH THU']);
    worksheet.getRow(worksheet.rowCount).font = { bold: true, size: 14 };
    worksheet.addRow([]);

    worksheet.addRow(['Tổng Doanh Thu:', currentData.totalRevenue]);
    worksheet.addRow(['Tổng Lợi Nhuận:', currentData.totalProfit]);
    worksheet.addRow(['Tổng Đơn Hàng:', currentData.totalOrders]);
    worksheet.addRow(['Tăng Trưởng So Với Kỳ Trước:', `${growthRate}%`]);
    worksheet.addRow([]);

    // Daily breakdown
    worksheet.addRow(['DOANH THU THEO NGÀY']);
    worksheet.getRow(worksheet.rowCount).font = { bold: true };
    worksheet.addRow(['Ngày', 'Doanh Thu', 'Lợi Nhuận', 'Số Đơn']);

    dailyRevenue.forEach(day => {
        worksheet.addRow([
            moment(day._id).format('DD/MM/YYYY'),
            day.dailyRevenue,
            day.dailyProfit,
            day.dailyOrders
        ]);
    });

    worksheet.columns.forEach(column => {
        column.width = 20;
    });
}

// Create Helper Sheet
async function createHelperSheet(workbook, start, end) {
    const worksheet = workbook.addWorksheet('Người Giúp Việc');

    const helpers = await RequestDetail.aggregate([
        {
            $match: {
                createdAt: { $gte: start, $lte: end },
                status: 'completed',
                helper_id: { $ne: 'notAvailable' }
            }
        },
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
                localField: "helperObjId",
                foreignField: "_id",
                as: "helper"
            }
        },
        { $unwind: "$helper" },
        {
            $group: {
                _id: "$helper_id",
                helperInfo: { $first: "$helper" },
                totalRevenue: { $sum: "$helper_cost" },
                totalOrders: { $sum: 1 }
            }
        },
        { $sort: { totalRevenue: -1 } }
    ]);

    const headers = [
        'Mã NV', 'Họ Tên', 'Số Điện Thoại', 'Giới Tính', 
        'Kinh Nghiệm (năm)', 'Doanh Thu', 'Số Đơn Đã Làm', 'Trạng Thái'
    ];

    worksheet.addRow(headers);
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    helpers.forEach(helper => {
        worksheet.addRow([
            helper.helperInfo.helper_id,
            helper.helperInfo.fullName,
            helper.helperInfo.phone,
            helper.helperInfo.gender,
            helper.helperInfo.yearOfExperience,
            helper.totalRevenue,
            helper.totalOrders,
            helper.helperInfo.workingStatus
        ]);
    });

    worksheet.columns.forEach(column => {
        column.width = 15;
    });
}

// Create Service Sheet
async function createServiceSheet(workbook, start, end) {
    const worksheet = workbook.addWorksheet('Dịch Vụ');

    const services = await Request.aggregate([
        {
            $match: {
                orderDate: { $gte: start, $lte: end },
                status: 'completed'
            }
        },
        {
            $group: {
                _id: "$service.title",
                totalRevenue: { $sum: "$totalCost" },
                totalOrders: { $sum: 1 },
                avgOrderValue: { $avg: "$totalCost" },
                serviceInfo: { $first: "$service" }
            }
        },
        { $sort: { totalRevenue: -1 } }
    ]);

    const headers = [
        'Tên Dịch Vụ', 'Doanh Thu', 'Số Đơn', 'Giá Trị Đơn TB', 
        'Giá Cơ Bản', 'Hệ Số Dịch Vụ'
    ];

    worksheet.addRow(headers);
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

    services.forEach(service => {
        worksheet.addRow([
            service._id,
            service.totalRevenue,
            service.totalOrders,
            Math.round(service.avgOrderValue),
            service.serviceInfo.cost,
            service.serviceInfo.coefficient_service
        ]);
    });

    worksheet.columns.forEach(column => {
        column.width = 15;
    });
}