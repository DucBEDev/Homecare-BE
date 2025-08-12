module.exports.convertDate = (data) => {
    const [day, month, year] = data.split('/');

    const date = new Date(year, month - 1, day);

    return date;
};
