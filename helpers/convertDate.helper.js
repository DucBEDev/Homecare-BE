module.exports.convertDate = (data) => {
    let [day, month, year] = data.split('/');

    if (!year || !month || !day) {
        [day, month, year] = data.split('-');
    }

    if (year && month && day) {
        return `${year}-${month.padStart(2,"0")}-${day.padStart(2,"0")}`;
    }
    return data;
};
