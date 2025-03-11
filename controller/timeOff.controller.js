// Models
const TimeOff = require("../models/timeOff.model");
const Helper = require("../models/helper.model");
const RequestDetail = require("../models/requestDetail.model");

// Config
const systemConfig = require("../config/system");

// Lib
const moment = require("moment");
const cron = require("node-cron");

// Function
function convertTimeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
};

// Run every hour to check and update status
cron.schedule('0 * * * *', async () => {
    try {
        const currentTime = moment().format('YYYY-MM-DD');
        const totalMinutes = 800 || moment().hour() * 60 + moment().minute();
      
        // Find all inactive helpers
        const helpers = await Helper.find( { deleted: false } );
        
        for (const helper of helpers) {
            // Check if the helper has any active dateOff
            const hasActiveBusySchedule = await TimeOff.findOne({
                helper_id: helper._id,
                dateOff: {
                    $gte: new Date(currentTime),
                    $lt: new Date(currentTime + 'T23:59:59.999Z')
                },
                $or: [
                    { startTime: { $eq: totalMinutes } },
                    { endTime: { $eq: totalMinutes } }
                ],
                status: "approved"  
            });
        
            // If not, convert helper status to active
            if (hasActiveBusySchedule) {
                if (helper.status == "inactive") {
                    if (totalMinutes == hasActiveBusySchedule.endTime) {
                        await TimeOff.updateOne(
                            { 
                                helper_id: helper._id,
                                dateOff: {
                                    $gte: new Date(currentTime),
                                    $lt: new Date(currentTime + 'T23:59:59.999Z')
                                } 
                            },
                            { status: "done" }
                        );
                    }
                    await Helper.updateOne(
                        { _id: helper._id },
                        { status: "active" }
                    );
                }
                else {
                    await Helper.updateOne(
                        { _id: helper._id },
                        { status: "inactive" }
                    );
                }
            }
        }
        console.log("Update helper status if exists date off every hour");
    } catch (error) {
        console.error('Error in schedule service:', error);
    }
});

// [GET] /admin/timeOffs/:helperId
module.exports.index = async (req, res) => {
    try {
        const helperId = req.params.helperId;

        const helperInfo = await Helper.findOne({
            _id: helperId,
            deleted: false
        }).select("helper_id fullName birthDate phone workingArea");
        console.log(helperInfo)

        if (!helperInfo) {
            return res.status(404).json({ error: 'Helper not found' });
        }

        const startOfMonth = moment().startOf('month').startOf('day');
        const endOfMonth = moment().endOf('month').endOf('day');

        const timeOffs = await TimeOff.find({
            helper_id: helperId,
            dateOff: {
                $gte: startOfMonth.toDate(),
                $lte: endOfMonth.toDate()
            }
        }).select("dateOff startTime endTime status");

        const formattedTimeOffs = timeOffs.map(timeOff => ({
            ...timeOff.toObject(),
            dateOff: moment(timeOff.dateOff).format('YYYY-MM-DD'),
            startTime: moment().startOf('day').add(timeOff.startTime, 'minutes').format('HH:mm'),
            endTime: moment().startOf('day').add(timeOff.endTime, 'minutes').format('HH:mm')
        }));

        res.json({ 
            helperInfo: helperInfo,
            timeOffs: formattedTimeOffs
        });
    } catch (error) {
        console.error('Error in index function:', error);
        res.status(500).json({ error: 'An error occurred while fetching helper information and time offs' });   
    }
}

// [GET] /admin/timeOffs/detailSchedule/:helperId/:chosenDate
module.exports.detailSchedule = async (req, res) => {
    try {
        const helperId = req.params.helperId;
        const chosenDate = moment(req.params.chosenDate).format('YYYY-MM-DD');

        const workingDateList = await RequestDetail.find({
            helper_id: helperId,
            workingDate: {
                $gte: new Date(chosenDate),
                $lt: new Date(chosenDate + 'T23:59:59.999Z')
            }
        }).select("workingDate startTime endTime");
        
        const busyDateList = await TimeOff.find({
            helper_id: helperId,
            dateOff: {
                $gte: new Date(chosenDate),
                $lt: new Date(chosenDate + 'T23:59:59.999Z')
            }
        }).select("dateOff startTime endTime");

        res.json({
            workingDateList: workingDateList,
            busyDateList: busyDateList
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });   
    }
}

// [POST] /admin/timeOffs/createDateOff
module.exports.createDateOff = async (req, res) => {
    try {
        req.body.dateOff = moment(req.params.chosenDate).format('YYYY-MM-DD');
        req.body.startTime = convertTimeToMinutes(req.body.startTime);
        req.body.endTime = convertTimeToMinutes(req.body.endTime);
        req.body.status = "approved";

        // Validate existing date off
        const startDay = new Date(req.body.dateOff);
        const endDay = new Date(req.body.dateOff + 'T23:59:59.999Z');
        const overlappingDateOff = await TimeOff.findOne({
            helper_id: req.body.helper_id,
            dateOff: {
                $gte: startDay,
                $lt: endDay
            },
            $or: [
                {
                    // The request time covers an existing record
                    $and: [
                        { startTime: { $gte: req.body.startTime } },
                        { endTime: { $lte: req.body.endTime } }
                    ]
                },
                {
                    // The existing record covers the request time
                    $and: [
                        { startTime: { $lte: req.body.startTime } },
                        { endTime: { $gte: req.body.endTime } }
                    ]
                },
                {
                    // The startTime's request time is in the existing record
                    $and: [
                        { startTime: { $lte: req.body.startTime } },
                        { endTime: { $gte: req.body.startTime } }
                    ]
                },
                {
                    // The endTime's request time is in the existing record
                    $and: [
                        { startTime: { $lte: req.body.startTime } },
                        { endTime: { $gte: req.body.endTime } }
                    ]
                },
            ]
        });
        if (overlappingDateOff != null) {
            res.status(400).json({ error: 'Date off time overlaps with existing date offs' });
            return;
        }

        const newTimeOff = new TimeOff(req.body);
        await newTimeOff.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching requests' });   
    }
}
