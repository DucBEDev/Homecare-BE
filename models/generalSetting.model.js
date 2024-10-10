const mongoose = require("mongoose");

const GeneralSettingSchema = new mongoose.Schema({
    baseSalary: Number,
    openHour: Number, // Thời gian mở cửa, lưu đơn vị phút
    closeHour: Number, //Thời gian đóng cửa, lưu đơn vị phút
}, {
    timestamps: true
});

const GeneralSetting = mongoose.model("GeneralSetting", GeneralSettingSchema, "generalSettings");

module.exports = GeneralSetting;