const GeneralSetting = require("../models/generalSetting.model");


module.exports.helperBilling = async (startTime, endTime, coefficient_service, coefficient_OT, coefficient_other, coefficient_helper) => {
    const generalSetting = await GeneralSetting.findOne({ id: "generalSetting" }).select("officeStartTime officeEndTime baseSalary");

    const hoursDiff = Math.ceil(endTime.getUTCHours() - startTime.getUTCHours());
    const officeStartTime = moment(generalSetting.officeStartTime, "HH:mm").hours();
    const officeEndTime = moment(generalSetting.officeEndTime, "HH:mm").hours();
    const OTStartTime = officeStartTime - startTime.getUTCHours() >= 0 ? officeStartTime - startTime.getUTCHours() : 0;
    const OTEndTime = endTime.getUTCHours() - officeEndTime >= 0 ? endTime.getUTCHours() - officeStartTime : 0;
    const OTTotalHour = OTStartTime + OTEndTime;

    const totalCost = generalSetting.baseSalary * coefficient_service * coefficient_helper * ((coefficient_OT * OTTotalHour) + (coefficient_other * (hoursDiff - OTTotalHour)));

    return totalCost;
}