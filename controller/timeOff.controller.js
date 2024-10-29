// Models
const TimeOff = require("../models/timeOff.model");
const Helper = require("../models/helper.model");
const Request = require("../models/request.model");

// Config
const systemConfig = require("../config/system");

// Lib
const moment = require("moment");


// [GET] /admin/timeOffs/:helperId
module.exports.index = async (req, res) => {
    try {
        const helperId = req.params.helperId;

        const helperInfo = await Helper.find({
            _id: helperId,
            deleted: false
        }).select("helper_id fullName birthDate phone workingArea");

        res.json({ helperInfo: helperInfo });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });   
    }
}

// [GET] /admin/timeOffs/detailSchedule/:helperId/:chosenDate
module.exports.detailSchedule = async (req, res) => {
    try {
        const helperId = req.params.helperId;
        const chosenDate = moment(req.params.chosenDate).format('YYYY-MM-DD');;
        const workingDateList = [];
        const busyDateList = [];

        const requestDetail = await Request.find({
            helper_id: helperId,
            workingDate: {
                $gte: new Date(chosenDate),
                $lt: new Date(chosenDate + 'T23:59:59.999Z')
            }
        }).select("");
        console.log(requestDetail)
        
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });   
    }
}

