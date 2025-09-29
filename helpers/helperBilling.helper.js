const GeneralSetting = require("../models/generalSetting.model");
const moment = require('moment');

module.exports.helperBilling = async (startTime, endTime, service_coeff, coefficient_helper) => {
    const generalSetting = await GeneralSetting.findOne({ id: "generalSetting" })
        .select("officeStartTime officeEndTime baseSalary");

    const officeStartHour = parseInt(moment(generalSetting.officeStartTime, "HH:mm").format("H"));
    const officeEndHour = parseInt(moment(generalSetting.officeEndTime, "HH:mm").format("H"));

    const startHour = startTime.getHours(); 
    const endHour = endTime.getHours();

    // Tính tổng giờ làm việc
    let totalHours = endHour - startHour;
    // Xử lý trường hợp qua ngày (endHour < startHour)
    if (totalHours <= 0) {
        totalHours = (24 - startHour) + endHour;
    }

    // Tính giờ OT và giờ thường
    let totalOtHours = 0;
    let totalNormalHours = 0;

    // Trường hợp 1: Hoàn toàn ngoài giờ hành chính
    if ((startHour >= officeEndHour && endHour >= officeEndHour) || 
        (startHour < officeStartHour && endHour <= officeStartHour)) {
        totalOtHours = totalHours;
        totalNormalHours = 0;
    }
    // Trường hợp 2: Hoàn toàn trong giờ hành chính
    else if (startHour >= officeStartHour && endHour <= officeEndHour) {
        totalOtHours = 0;
        totalNormalHours = totalHours;
    }
    // Trường hợp 3: Có cả giờ thường và OT
    else {
        // Tính phần giao với giờ hành chính
        const workStart = Math.max(startHour, officeStartHour);
        const workEnd = Math.min(endHour, officeEndHour);
        
        if (workStart < workEnd) {
            totalNormalHours = workEnd - workStart;
        }
        totalOtHours = totalHours - totalNormalHours;
    }

    // Tính lương
    const totalCost =
        generalSetting.baseSalary *
        service_coeff.coefficient_service *
        coefficient_helper *
        (
            (service_coeff.coefficient_ot * service_coeff.coefficient_other * totalOtHours) +
            (service_coeff.coefficient_other * totalNormalHours)
        );

    return totalCost;
};
