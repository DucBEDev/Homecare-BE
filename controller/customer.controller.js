// Models
const Customer = require("../models/customer.model");
const Request = require("../models/request.model");

// Config
const systemConfig = require("../config/system");


function calculateCustomerPoint(points) {
    const totalPoints = points.reduce((total, point) => {
        return total + point.point
    }, 0);
    
    return totalPoints;
}

// [GET] /admin/customers
module.exports.index = async (req, res) => {
    let find = {};

    const records = await Customer.find(find);

    // Calculate total points for each customer
    records.forEach(record => {
        const totalPoints = calculateCustomerPoint(record.points);
        record.totalPoints = totalPoints;
    });


    res.render('pages/customers/index', {
        pageTitle: "Quản lý khách hàng",
        records: records
    });
}

// [GET] /admin/customers/requestHistoryList/:phone
module.exports.requestHistoryList = async (req, res) => {
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

    res.render('pages/customers/requestHistory', {
        pageTitle: "Lịch sử đơn hàng",
        records: records
    });
}