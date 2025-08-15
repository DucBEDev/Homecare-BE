const GeneralSetting = require("../models/generalSetting.model");
const moment = require('moment');

module.exports.helperBilling = async (startTime, endTime, service_coeff, coefficient_helper) => {
    const generalSetting = await GeneralSetting.findOne({ id: "generalSetting" })
        .select("officeStartTime officeEndTime baseSalary");

    const officeStartHour = parseInt(moment(generalSetting.officeStartTime, "HH:mm").format("H"));
    const officeEndHour = parseInt(moment(generalSetting.officeEndTime, "HH:mm").format("H"));

    const startHour = startTime.getHours(); 
    const endHour = endTime.getHours();

    const totalHours = endHour - startHour; 

    // Số giờ OT đầu ca
    const otStartHours = startHour < officeStartHour
        ? officeStartHour - startHour
        : 0;

    // Số giờ OT cuối ca
    const otEndHours = endHour > officeEndHour
        ? endHour - officeEndHour
        : 0;

    // Tổng giờ OT
    const totalOtHours = otStartHours + otEndHours;

    // Tổng giờ thường
    const totalNormalHours = totalHours - totalOtHours;

    // Tính lương
    const totalCost =
        generalSetting.baseSalary *
        service_coeff.coefficient_service *
        coefficient_helper *
        (
            (service_coeff.coefficient_ot * totalOtHours) +
            (service_coeff.coefficient_other * totalNormalHours)
        );

    return totalCost;
};
