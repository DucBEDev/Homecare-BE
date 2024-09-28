module.exports = (date) => {
    return date.toISOString().split('T')[0];
}