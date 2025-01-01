// Models
const GeneralSetting = require("../models/generalSetting.model");


// [GET] /admin/generalSettings
module.exports.index = async (req, res) => {
    try {
        const generalSetting = await GeneralSetting.findOne({ id: "generalSetting" });

        res.json({ 
            success: true,
            generalSetting: generalSetting
        })
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}

// [PATCH] /admin/generalSettings/update
module.exports.update = async (req, res) => {
    try {
        await GeneralSetting.updateOne({ id: "generalSetting" }, req.body);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });
    }
}