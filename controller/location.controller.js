// Models
const Location = require("../models/location.model");

// Config
const systemConfig = require("../config/system");


// [GET] /admin/locations
module.exports.index = async (req, res) => {
    try {
        const locations = await Location.find({ status: "active" });

        res.json({
            success: true,
            data: locations
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}