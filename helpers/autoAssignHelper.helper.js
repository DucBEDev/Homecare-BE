const cron = require('node-cron');
const moment = require('moment-timezone');

const RequestDetail = require('../models/requestDetail.model');
const Helper = require('../models/helper.model');
const Request = require('../models/request.model');

const { helperBilling } = require('./helperBilling.helper');
const { notifyDetailStatusChange } = require('../config/notifications');
const { notifyHelperJobAssigned } = require('./helperNotifications');


cron.schedule('*/1 * * * *', async () => {
    console.log(`[${moment().format('HH:mm:ss')}] Đang quét đơn để gán helper...`);

    try {
        const now = moment.utc();
        const oneHourLater = moment.utc().add(1, "hour");

        const todayUTC = moment.utc().startOf("day").toDate();
        const tomorrowUTC = moment.utc().add(1, "day").startOf("day").toDate();

        // Tìm các đơn detail chưa làm, ngày làm việc là hôm nay
        // và startTime trong khoảng 30p tới 1h tính từ hiện tại
        const requestDetails = await RequestDetail.find({
            status: "pending",
            workingDate: { $gte: todayUTC, $lt: tomorrowUTC },
            startTime: { $gte: now.toDate(), $lte: oneHourLater.toDate() }
        });

        for (const detail of requestDetails) {
            const request = await Request.findOne({ scheduleIds: detail._id.toString() }).select("service scheduleIds customerInfo");
            // console.log(request);
            if (moment.utc(detail.startTime).diff(now, "minutes") < 30) {
                await RequestDetail.updateOne(
                    { _id: detail._id },
                    { $set: { status: "cancelled" } }
                );
                
                // Kiểm tra trạng thái request cha
                const remainingDetails = await RequestDetail.countDocuments({
                    _id: { $in: request.scheduleIds, $ne: detail._id },
                    status: "pending"
                });

                if (remainingDetails === 0) {
                    const totalDetails = request.scheduleIds.length;
                    if (totalDetails > 1) {
                        await Request.updateOne(
                            { _id: detail.requestId },
                            { $set: { status: "completed" } }
                        );
                    } else {
                        await Request.updateOne(
                            { _id: detail.requestId },
                            { $set: { status: "cancelled" } }
                        );
                    }
                }
            } else {
                const helper = await Helper.findOne({ workingStatus: "online", status: "active" }).select("baseFactor phone");

                if (helper) {
                    // console.log(request);
                    // console.log(detail.startTime, detail.endTime, request.service, helper.baseFactor);
                    const helperCost = await helperBilling(detail.startTime, detail.endTime, request.service, helper.baseFactor);
                    // console.log('helperCost:', helperCost);
                    // Gán helper vào đơn detail
                    await RequestDetail.updateOne(
                        { _id: detail._id },
                        { $set: { helper_id: helper._id, status: "assigned", helper_cost: helperCost } }
                    );
                    await Helper.updateOne(
                        { _id: helper._id },
                        { workingStatus: "working" }
                    );

                    await notifyDetailStatusChange(request, detail, "assigned");
                    await notifyHelperJobAssigned(request, helper);
                }
            }
        }

    } catch (error) {
        console.error('Lỗi auto assign helper:', error);
    }
});

console.log('Auto assign helpers cron job started...');
