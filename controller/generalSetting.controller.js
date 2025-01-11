// Models
const GeneralSetting = require("../models/generalSetting.model");


// [GET] /admin/generalSettings
module.exports.index = async (req, res) => {
    try {
        const generalSetting = await GeneralSetting.findOne({ id: "generalSetting" }).lean();

        res.json({ 
            success: true,
            generalSetting: {
                ...generalSetting,
                holidayStartDate: generalSetting.holidayStartDate.toISOString().split('T')[0],
                holidayEndDate: generalSetting.holidayEndDate.toISOString().split('T')[0]
            }
        })
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [PATCH] /admin/generalSettings/update
module.exports.update = async (req, res) => {
    try {
        req.body.holidayStartDate = new Date(req.body.holidayStartDate);
        req.body.holidayEndDate = new Date(req.body.holidayEndDate);

        await GeneralSetting.updateOne({ id: "generalSetting" }, req.body);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}