const cron = require('node-cron');
const moment = require('moment-timezone');

const RequestDetail = require('../models/requestDetail.model');
const Helper = require('../models/helper.model');
const Request = require('../models/request.model');

// Tăng thêm 7 tiếng cho các mốc thời gian
const oneHourLater = moment().add(1, "hour").add(7, "hours");
const thirtyMinLater = moment().add(30, "minutes").add(7, "hours");

const todayUTC = moment.utc().startOf("day").toDate();
const tomorrowUTC = moment.utc().add(1, "day").startOf("day").toDate();

console.log(oneHourLater.toDate());
console.log(thirtyMinLater.toDate());
console.log(todayUTC);
console.log(tomorrowUTC);

// Tìm các đơn detail chưa làm, ngày làm việc là hôm nay
// và startTime trong khoảng 30p tới 1h tính từ hiện tại
const a = async () => {
    const requestDetails = await RequestDetail.find({
        status: "pending",
        workingDate: { $gte: todayUTC, $lt: tomorrowUTC },
        startTime: {
            $gte: thirtyMinLater.toDate(),
            $lte: oneHourLater.toDate(),
        },
    });

    console.log(requestDetails);
};

a();

cron.schedule('*/1 * * * *', async () => {
    console.log(`[${moment().format('HH:mm:ss')}] Đang quét đơn để gán helper...`);

    try {
        const now = moment();
        const oneHourLater = moment().add(1, "hour");
        const thirtyMinLater = moment().add(30, "minutes");

        const todayUTC = moment.utc().startOf("day").toDate();
        const tomorrowUTC = moment.utc().add(1, "day").startOf("day").toDate();

        console.log(oneHourLater.toDate())
        console.log(thirtyMinLater.toDate())
        console.log(todayUTC)
        console.log(tomorrowUTC)

        // Tìm các đơn detail chưa làm, ngày làm việc là hôm nay
        // và startTime trong khoảng 30p tới 1h tính từ hiện tại
        const requestDetails = await RequestDetail.find({
            status: "pending",
            workingDate: { $gte: todayUTC, $lt: tomorrowUTC },
            startTime: { $gte: thirtyMinLater.toDate(), $lte: oneHourLater.toDate() }
        });

        console.log(requestDetails)

        for (const detail of requestDetails) {
            const helper = await Helper.findOne({ workingStatus: "online" });

            if (helper) {
                // Gán helper vào đơn detail
                await RequestDetail.updateOne(
                    { _id: detail._id },
                    { $set: { helper_id: helper._id, status: "assigned" } }
                );
            } else {
                // Nếu không tìm được helper và startTime còn < 30p thì huỷ đơn detail
                if (moment.utc(detail.startTime).diff(now, "minutes") < 30) {
                    await RequestDetail.updateOne(
                        { _id: detail._id },
                        { $set: { status: "cancelled" } }
                    );

                    // Kiểm tra trạng thái request cha
                    const remainingDetails = await RequestDetail.countDocuments({
                        requestId: detail.requestId,
                        status: "pending"
                    });

                    if (remainingDetails === 0) {
                        const totalDetails = await RequestDetail.countDocuments({ requestId: detail.requestId });
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
                }
            }
        }

    } catch (error) {
        console.error('Lỗi auto assign helper:', error);
    }
});

console.log('✅ Auto assign helpers cron job started...');
