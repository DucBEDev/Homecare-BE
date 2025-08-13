// Models
const Customer = require("../models/customer.model");
const Request = require("../models/request.model");


function calculateCustomerPoint(points) {
    const totalPoints = points.reduce((total, point) => {
        return total + point.point
    }, 0);
    
    return totalPoints;
}

// [GET] /admin/customers
module.exports.index = async (req, res) => {
    try {
        let find = {};

        const records = await Customer.find(find);

        // Calculate total points for each customer
        records.forEach(record => {
            const totalPoints = calculateCustomerPoint(record.points);
            record.totalPoints = totalPoints;
        });

        res.json({ 
            success: true,
            records: records
        })
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

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

// [GET] /admin/customers/checkExist/:cusPhone
module.exports.checkCusExist = async (req, res) => {
    try {
        const { cusPhone } = req.params;

        const cusData = await Customer.findOne({
            phone: cusPhone
        }).select('fullName phone addresses');

        res.json({ 
            success: true,
            customer: cusData
        })
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}