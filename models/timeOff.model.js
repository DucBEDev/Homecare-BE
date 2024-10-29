const mongoose = require("mongoose");

const TimeOffSchema = new mongoose.Schema({
    helper_id: String,
    date: Date, // Ngày nghỉ
    startTime: String, // Giờ bắt đầu
    endTime: String, // Giờ kết thúc
    reason: String,
    createdBy: {
        account_id: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    deletedAt: Date
}, {
    timestamps: true
});

const TimeOff = mongoose.model("TimeOff", TimeOffSchema, "timeOffs");

module.exports = TimeOff;